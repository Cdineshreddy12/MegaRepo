import { kindeService } from '../features/auth/index.js';
import { db, dbManager } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { RequestAnalyzer } from './request-analyzer.js';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/health',
  '/auth',
  '/logout',
  '/test-auth',
  '/api/auth',
  '/api/webhooks',
  '/api/subscriptions/webhook',
  '/api/subscriptions/test-webhook',
  '/api/subscriptions/debug-stripe-config',
  '/api/payments/webhook',
  '/api/credits/webhook',
  // Specific invitation routes that are public
  '/api/invitations/details',
  '/api/invitations/accept',
  '/api/invitations/accept-by-token',
  '/api/invitations/details-by-token',
  '/api/locations',
  '/docs',
  '/api/metrics/',
  '/api/credits/packages',
  '/api/credits/test-route',
  // Organization routes with fallback authentication
  '/api/organizations/parent',
  '/api/organizations/sub',
  '/api/organizations/bulk',
  // Removed: '/api/organizations/hierarchy' - now requires authentication
  'POST /api/organizations/sub',
  // Location routes with fallback authentication
  '/api/locations',
  // New unified entities routes with fallback authentication
  '/api/entities/hierarchy',
  '/api/entities/parent',
  '/api/entities/tenant',
  'POST /api/entities/organization',
  'POST /api/entities/location',
  // User tenant verification for CRM (public endpoint)
  '/api/user/tenant',
  '/api/user/test',
];

// Helper functions
async function findUserInDatabase(kindeUserId) {
  try {
    console.log('🔍 Looking up user:', kindeUserId);

    let userRecords;
    try {
      userRecords = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenantUsers.tenantId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.kindeUserId, kindeUserId),
          eq(tenantUsers.isActive, true)
        ));
    } catch (selectError) {
      console.log('⚠️ Falling back to raw SQL query');

      const result = await dbManager.getAppConnection().unsafe(
        `SELECT user_id as "userId", tenant_id as "tenantId", email, name,
                onboarding_completed as "onboardingCompleted", is_active as "isActive",
                is_tenant_admin as "isTenantAdmin"
         FROM tenant_users
         WHERE kinde_user_id = $1 AND is_active = true`,
        [kindeUserId]
      );

      userRecords = result || [];
    }

    if (!Array.isArray(userRecords) || userRecords.length === 0) {
      console.log('⚠️ No user records found');
      return null;
    }

    // Return completed onboarding user or first available
    const selectedUser = userRecords.find(u => u.onboardingCompleted) || userRecords[0];
    console.log('✅ Found user:', selectedUser.userId);
    return selectedUser;

  } catch (error) {
    console.error('❌ Database query error:', error.message);
    return null;
  }
}

async function findTenantByOrgCode(orgCode) {
  if (!orgCode) return null;

  try {
    console.log('🔍 Looking up tenant:', orgCode);

    let tenantResult;
    try {
      const [tenant] = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      tenantResult = tenant;
    } catch (selectError) {
      const result = await db.execute(
        `SELECT tenant_id as "tenantId" FROM tenants WHERE kinde_org_id = $1 LIMIT 1`,
        [orgCode]
      );
      tenantResult = result.rows?.[0] || null;
    }

    if (tenantResult?.tenantId) {
      console.log('✅ Found tenant:', tenantResult.tenantId);
      return tenantResult.tenantId;
    }

    console.log('⚠️ No tenant found');
    return null;
  } catch (error) {
    console.error('❌ Tenant lookup error:', error.message);
    return null;
  }
}

function determineOnboardingStatus(userRecord, tenantId) {
  if (!tenantId || !userRecord) {
    return { needsOnboarding: true, reason: 'no_tenant_or_user_record' };
  }

  const isTenantAdmin = userRecord.isTenantAdmin === true;
  const onboardingCompleted = userRecord.onboardingCompleted === true;

  if (isTenantAdmin && !onboardingCompleted) {
    return { needsOnboarding: true, reason: 'tenant_admin_incomplete_onboarding' };
  }

  if (!onboardingCompleted) {
    return { needsOnboarding: true, reason: 'non_admin_incomplete_onboarding' };
  }

  return { needsOnboarding: false, reason: 'fully_onboarded' };
}

// Helper function for database connection setup
export async function setupDatabaseConnection(request, tenantId = null, userId = null) {
  const analysis = RequestAnalyzer.analyzeRequest(request);
  request.requestAnalysis = analysis;

  try {
    request.db = analysis.requiresBypass ?
      dbManager.getSystemConnection() :
      dbManager.getAppConnection();
  } catch (dbError) {
    console.error('❌ Failed to establish database connection:', dbError.message);
    request.db = null;
    return;
  }

  // Set tenant context for RLS if needed
  if (!analysis.requiresBypass && tenantId && request.db) {
    try {
      await request.db`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
      await request.db`SELECT set_config('app.user_id', ${userId || ''}, false)`;
    } catch (error) {
      console.error('❌ Failed to set tenant context:', error.message);
    }
  }
}

async function handleTokenRefresh(request, reply, refreshToken) {
  try {
    const tokens = await kindeService.refreshToken(refreshToken);

    // Set new tokens
    reply.setCookie('kinde_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/'
    });

    if (tokens.refresh_token) {
      reply.setCookie('kinde_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/'
      });
    }

    // Validate new token and continue
    const kindeUser = await kindeService.validateToken(tokens.access_token);
    if (!kindeUser?.userId) {
      throw new Error('Invalid refreshed token');
    }

    await processAuthenticatedUser(request, reply, kindeUser);
    return true;

  } catch (refreshError) {
    if (refreshError.message.includes('invalid_grant')) {
      reply.code(401).send({
        error: 'Token Expired',
        message: 'Your session has expired. Please sign in again.',
        requiresReauth: true
      });
      return false;
    }

    // Clear cookies for other refresh errors
    reply.clearCookie('kinde_token', { path: '/' })
         .clearCookie('kinde_refresh_token', { path: '/' });
    return false;
  }
}

async function processAuthenticatedUser(request, reply, kindeUser) {
  // Find user in database
  const userRecord = await findUserInDatabase(kindeUser.userId);
  let tenantId = null;

  // Try to find tenant by organization first
  if (kindeUser.organization?.id) {
    tenantId = await findTenantByOrgCode(kindeUser.organization.id);
  }

  // Fall back to user's tenant if no org tenant found
  if (!tenantId && userRecord?.tenantId) {
    tenantId = userRecord.tenantId;
  }


  // Determine onboarding status
  const { needsOnboarding } = determineOnboardingStatus(userRecord, tenantId);

  // Check if user is a Super Administrator
  let isSuperAdmin = false;
  if (userRecord?.userId && tenantId) {
    try {
      // Check for Super Administrator role across all tenants for admin users
      const userRoles = await db
        .select({
          roleName: customRoles.roleName,
          isSystemRole: customRoles.isSystemRole,
          organizationId: userRoleAssignments.organizationId
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, userRecord.userId));

      isSuperAdmin = userRoles.some(role => role.roleName === 'Super Administrator' && role.isSystemRole);
    } catch (error) {
      console.warn('⚠️ Failed to check super admin status:', error);
      // Default to false if check fails
    }
  }

  // Set user context
  const isTenantAdmin = userRecord?.isTenantAdmin || false;
  request.userContext = {
    userId: kindeUser.userId,
    kindeUserId: kindeUser.userId,
    internalUserId: userRecord?.userId || null,
    tenantId,
    kindeOrgId: kindeUser.organization?.id,
    email: userRecord?.email || kindeUser.email,
    name: userRecord?.name || kindeUser.name,
    isAuthenticated: true,
    needsOnboarding,
    onboardingCompleted: userRecord?.onboardingCompleted || false,
    isActive: userRecord?.isActive || false,
    isAdmin: isTenantAdmin,
    isTenantAdmin,
    isSuperAdmin
  };


  // Legacy compatibility - simplified
  request.user = {
    id: kindeUser.userId,
    userId: kindeUser.userId,
    internalUserId: userRecord?.userId || null,
    tenantId,
    email: request.userContext.email,
    name: request.userContext.name,
    isAuthenticated: true,
    isAdmin: isTenantAdmin,
    isTenantAdmin
  };

  // Set database connection and tenant context
  await setupDatabaseConnection(request, tenantId, request.userContext.internalUserId);

  console.log('✅ User authenticated:', {
    userId: kindeUser.userId,
    tenantId,
    needsOnboarding
  });
}

export async function authMiddleware(request, reply) {
  // Handle public routes
  if (isPublicRoute(request.url)) {
    await setupDatabaseConnection(request);
    return;
  }

  // Extract and validate token
  const token = extractToken(request);
  if (!token) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication token required'
    });
  }

  try {
    console.log('🔐 Authenticating user...');

    // Add timeout to prevent hanging requests
    const authPromise = kindeService.validateToken(token);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout')), 10000) // 10 second timeout
    );

    const kindeUser = await Promise.race([authPromise, timeoutPromise]);
    
    if (!kindeUser?.userId) {
      throw new Error('Invalid token response');
    }

    await processAuthenticatedUser(request, reply, kindeUser);
    console.log('✅ Authentication successful');

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);

    // Handle timeout specifically
    if (error.message === 'Authentication timeout') {
      return reply.code(408).send({
        error: 'Request Timeout',
        message: 'Authentication request timed out. Please try again.',
        retryable: true
      });
    }

    // Try token refresh
    const refreshToken = request.cookies?.kinde_refresh_token;
    if (refreshToken) {
      try {
        const refreshSuccess = await handleTokenRefresh(request, reply, refreshToken);
        if (refreshSuccess) return;
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.message);
      }
    }

    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
      retryable: true
    });
  }
}

// Alias for backward compatibility
export const authenticateToken = authMiddleware;

// Permission checking middleware
export function requirePermission(permission) {
  return async function(request, reply) {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Allow all authenticated users for now
    // TODO: Implement actual permission checking logic when needed
    return;
  };
}

function isPublicRoute(url) {
  // Routes ending with /current should not be treated as public
  if (url.endsWith('/current')) {
    return false;
  }

  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return url.startsWith(route.slice(0, -1));
    }

    // Handle parameterized routes like /api/entities/hierarchy/:tenantId
    if (route.includes(':')) {
      const pathPattern = route.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pathPattern.replace(/\//g, '\\/')}`);
      return regex.test(url);
    }

    return url.startsWith(route);
  });
}

function extractToken(request) {
  // First try to get token from new cookie format
  const cookieToken = request.cookies?.kinde_token;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Legacy cookie support
  return request.cookies?.token || null;
}