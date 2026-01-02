/**
 * Invited User Restriction Middleware
 * 
 * Blocks invited users from performing any write operations (POST, PUT, DELETE, PATCH)
 * Only tenant admins can perform write operations.
 * 
 * Invited users can only:
 * - Read data (GET requests)
 * - Access applications assigned to them
 * 
 * All write operations require tenant admin privileges.
 */

import { db } from '../db/index.js';
import { tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * Check if user is an invited user
 */
async function isInvitedUser(userId, tenantId) {
  try {
    const [user] = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ))
      .limit(1);

    if (!user) {
      return false;
    }

    // Check if user is invited
    const isInvited = user.preferences?.userType === 'INVITED_USER' ||
                      user.preferences?.isInvitedUser === true ||
                      user.invitedBy !== null ||
                      user.invitedAt !== null;

    return isInvited && !user.isTenantAdmin;
  } catch (error) {
    console.error('Error checking if user is invited:', error);
    return false;
  }
}

/**
 * Middleware to restrict invited users from write operations
 * Only allows GET requests for invited users
 */
export async function restrictInvitedUsers(request, reply) {
  // Skip for public routes
  if (!request.userContext?.isAuthenticated) {
    return; // Let other middleware handle authentication
  }

  // Skip for GET requests (read-only operations)
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return;
  }

  // Allow tenant admins to perform all operations
  if (request.userContext?.isTenantAdmin === true) {
    return;
  }

  // Check if user is an invited user
  const userId = request.userContext?.internalUserId || request.userContext?.userId;
  const tenantId = request.userContext?.tenantId;

  if (!userId || !tenantId) {
    console.log('⚠️ [InvitedUserRestriction] Missing user context:', { userId, tenantId });
    return; // Let other middleware handle missing context
  }

  const userIsInvited = await isInvitedUser(userId, tenantId);

  if (userIsInvited) {
    console.log('🚫 [InvitedUserRestriction] Blocked write operation from invited user:', {
      method: request.method,
      url: request.url,
      userId,
      tenantId,
      email: request.userContext?.email
    });

    return reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: 'Invited users can only view data. Admin privileges required to perform this operation.',
      requiredPermission: 'tenant_admin'
    });
  }

  // User is not invited or is admin - allow operation
  console.log('✅ [InvitedUserRestriction] Allowing operation:', {
    method: request.method,
    url: request.url,
    userId,
    isTenantAdmin: request.userContext?.isTenantAdmin,
    isInvited: false
  });
}

/**
 * Middleware factory to require tenant admin for specific routes
 */
export function requireTenantAdminForWrites() {
  return async (request, reply) => {
    // Skip for GET requests
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return;
    }

    // Check if user is tenant admin
    if (!request.userContext?.isTenantAdmin) {
      console.log('🚫 [RequireTenantAdmin] Blocked write operation - user is not tenant admin:', {
        method: request.method,
        url: request.url,
        userId: request.userContext?.internalUserId || request.userContext?.userId,
        email: request.userContext?.email,
        isTenantAdmin: request.userContext?.isTenantAdmin
      });

      return reply.code(403).send({
        success: false,
        error: 'Forbidden',
        message: 'Tenant admin privileges required to perform this operation.',
        requiredPermission: 'tenant_admin'
      });
    }

    console.log('✅ [RequireTenantAdmin] Tenant admin verified for write operation:', {
      method: request.method,
      url: request.url,
      userId: request.userContext?.internalUserId || request.userContext?.userId
    });
  };
}

