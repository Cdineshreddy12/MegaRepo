import { getConsumerManager } from '../services/CRMConsumerManager.js';
import jwt from 'jsonwebtoken';

/**
 * Tenant isolation middleware
 * Ensures all requests are properly scoped to a tenant
 */
class TenantMiddleware {
  constructor() {
    // Get consumer manager lazily to ensure it's properly initialized
    this.getConsumerManager = () => getConsumerManager();
  }

  /**
   * Extract tenant ID from request with enhanced fallback logic
   */
  extractTenantId(req) {
    // Priority order for tenant ID extraction:
    // 1. Header: X-Tenant-ID
    // 2. JWT token: tenantId claim
    // 3. Query parameter: tenantId
    // 4. Body: tenantId
    // 5. JWT token: primaryOrganizationId (fallback)
    // 6. Subdomain (if using subdomain-based tenancy)

    // 1. Check header
    if (req.headers['x-tenant-id']) {
      console.log(`🔍 Tenant ID from header: ${req.headers['x-tenant-id']}`);
      return req.headers['x-tenant-id'];
    }

    // 2. Check JWT token - decode if not already decoded
    if (req.user && req.user.tenantId) {
      console.log(`🔍 Tenant ID from req.user: ${req.user.tenantId}`);
      return req.user.tenantId;
    } else {
      // Try to decode JWT token if present and req.user not set
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          // Use auth service to decode token and extract tenant info
          const decoded = jwt.decode(token);
          if (decoded && decoded.tenantId) {
            console.log(`🔍 Tenant ID from JWT token: ${decoded.tenantId}`);
            // Set req.user temporarily so subsequent calls work
            req.user = decoded;
            return decoded.tenantId;
          }
        } catch (error) {
          console.log('⚠️ Failed to decode JWT token for tenant extraction:', error.message);
        }
      }
    }

    // 3. Check query parameter
    if (req.query.tenantId) {
      console.log(`🔍 Tenant ID from query: ${req.query.tenantId}`);
      return req.query.tenantId;
    }

    // 4. Check body
    if (req.body && req.body.tenantId) {
      console.log(`🔍 Tenant ID from body: ${req.body.tenantId}`);
      return req.body.tenantId;
    }

    // 5. Check JWT token for primaryOrganizationId as fallback
    if (req.user && req.user.primaryOrganizationId) {
      console.log(`🔍 Using primaryOrganizationId as fallback tenant: ${req.user.primaryOrganizationId}`);
      return req.user.primaryOrganizationId;
    } else if (req.headers.authorization) {
      // Try to decode JWT again for primaryOrganizationId
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const decoded = jwt.decode(token);
        if (decoded) {
          // Try multiple possible field names for primary organization
          const primaryOrgId = decoded.primaryOrganizationId || decoded.primaryOrgId || decoded.orgCode;
          if (primaryOrgId) {
            console.log(`🔍 PrimaryOrganizationId from JWT as fallback: ${primaryOrgId}`);
            if (!req.user) req.user = decoded;
            return primaryOrgId;
          }

          // Also check if we can use the tenantId from JWT as fallback
          if (decoded.tenantId) {
            console.log(`🔍 Using tenantId from JWT as fallback: ${decoded.tenantId}`);
            if (!req.user) req.user = decoded;
            return decoded.tenantId;
          }
        }
      } catch (error) {
        console.log('⚠️ Failed to decode JWT for primaryOrganizationId:', error.message);
      }
    }

    // 6. Check subdomain - but only as last resort for production domains
    const host = req.get('host');
    if (host && host.includes('.') && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'crm') {
        console.log(`🔄 Using subdomain '${subdomain}' as tenant ID from host: ${host}`);
        return subdomain;
      }
    }

    console.log('🔍 No tenant ID found in request');
    return null;
  }

  /**
   * Validate tenant ID format
   */
  validateTenantId(tenantId) {
    if (!tenantId) return false;

    // Basic validation: alphanumeric with hyphens and underscores, 3-50 characters
    const tenantIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,48}[a-zA-Z0-9]$/;
    return tenantIdRegex.test(tenantId);
  }

  /**
   * Resolve tenant issues by finding a valid tenant for the user
   */
  async resolveTenantForUser(user, requestedTenantId = null) {
    try {
      const Tenant = (await import('../models/Tenant.js')).default;

      // First, try the requested tenant ID if provided
      if (requestedTenantId) {
        const tenant = await Tenant.findOne({
          tenantId: requestedTenantId,
          status: 'active'
        });
        if (tenant) {
          console.log(`✅ Resolved tenant using requested ID: ${requestedTenantId}`);
          return { tenantId: requestedTenantId, tenant };
        }
      }

      // Fallback 1: Try primaryOrganizationId or orgCode
      const primaryOrgId = user.primaryOrganizationId || user.primaryOrgId || user.orgCode;
      if (primaryOrgId) {
        const tenant = await Tenant.findOne({
          tenantId: primaryOrgId,
          status: 'active'
        });
        if (tenant) {
          console.log(`✅ Resolved tenant using primary org (${primaryOrgId}): ${primaryOrgId}`);
          return { tenantId: primaryOrgId, tenant };
        }
      }

      // Fallback 1.5: Try the JWT tenantId directly
      if (user.tenantId && user.tenantId !== requestedTenantId) {
        const tenant = await Tenant.findOne({
          tenantId: user.tenantId,
          status: 'active'
        });
        if (tenant) {
          console.log(`✅ Resolved tenant using JWT tenantId: ${user.tenantId}`);
          return { tenantId: user.tenantId, tenant };
        }
      }

      // Fallback 2: Try entities from user
      if (user.entities && Array.isArray(user.entities)) {
        for (const entity of user.entities) {
          if (entity.id) {
            const tenant = await Tenant.findOne({
              tenantId: entity.id,
              status: 'active'
            });
            if (tenant) {
              console.log(`✅ Resolved tenant using entity ID: ${entity.id}`);
              return { tenantId: entity.id, tenant };
            }
          }
        }
      }

      // Fallback 3: Find any active tenant (development only)
      if (process.env.NODE_ENV === 'development') {
        const tenant = await Tenant.findOne({ status: 'active' });
        if (tenant) {
          console.log(`✅ Development fallback: resolved tenant ${tenant.tenantId}`);
          return { tenantId: tenant.tenantId, tenant };
        }
      }

      console.error('❌ Could not resolve any valid tenant for user');
      return null;
    } catch (error) {
      console.error('❌ Error resolving tenant for user:', error);
      return null;
    }
  }

  /**
   * Main tenant middleware
   */
  tenantIsolation() {
    return async (req, res, next) => {
      try {
        console.log(`🔍 Tenant middleware running for path: ${req.path}, originalUrl: ${req.originalUrl}, baseUrl: ${req.baseUrl}`);
        // Skip tenant isolation for auth routes that handle their own tenant resolution
        if (req.path && (req.path.startsWith('/api/auth/') || req.path === '/me' || req.path === '/api/auth/me')) {
          console.log(`🔄 Tenant middleware skipping auth route: ${req.path}`);
          return next();
        }

        // Extract tenant ID
        const tenantId = this.extractTenantId(req);

        if (!tenantId) {
          // If no tenant ID found and auth hasn't run yet (no req.user),
          // allow the request to continue to auth middleware
          if (!req.user) {
            console.log('🔄 Tenant middleware: No tenant ID found, deferring to auth middleware');
            return next();
          }

          return res.status(400).json({
            error: 'Tenant ID is required',
            message: 'Please provide tenant ID via X-Tenant-ID header, JWT token, query parameter, or subdomain'
          });
        }

        // Validate tenant ID format
        if (!this.validateTenantId(tenantId)) {
          return res.status(400).json({
            error: 'Invalid tenant ID format',
            message: 'Tenant ID must be alphanumeric with hyphens and underscores, 3-50 characters'
          });
        }

        // Add tenant ID to request
        req.tenantId = tenantId;

        // Get or create consumer for tenant
        try {
          const consumer = await this.getConsumerManager().getConsumer(tenantId);

          // Update consumer with latest token from request
          const authToken = req.headers.authorization?.replace('Bearer ', '');
          if (authToken) {
            consumer.setCurrentToken(authToken);
            console.log(`🔑 [TENANT] Updated consumer ${tenantId} with fresh token`);
          }

          req.crmConsumer = consumer;
        } catch (error) {
          console.error(`❌ Failed to get consumer for tenant ${tenantId}:`, error);
          return res.status(500).json({
            error: 'Tenant service unavailable',
            message: 'Unable to initialize tenant services'
          });
        }

        next();
      } catch (error) {
        console.error('❌ Tenant middleware error:', error);
        res.status(500).json({
          error: 'Tenant middleware error',
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * Tenant validation middleware with fallback logic
   */
  validateTenant() {
    return async (req, res, next) => {
      try {
        // Skip tenant validation for auth routes
        if (req.path && (req.path.startsWith('/api/auth/') || req.path === '/me' || req.path === '/api/auth/me')) {
          console.log(`🔄 Validate tenant middleware skipping auth route: ${req.path}`);
          return next();
        }

        let tenantId = req.tenantId;
        let consumer = req.crmConsumer;

        if (!consumer) {
          return res.status(400).json({
            error: 'Tenant not initialized',
            message: 'Tenant consumer not available'
          });
        }

        // Check if tenant is active (direct database query since we removed complex caching)
        const Tenant = (await import('../models/Tenant.js')).default;
        let tenant = await Tenant.findOne({ tenantId: tenantId });

        // If tenant not found, try fallback strategies
        if (!tenant) {
          console.warn(`⚠️ Tenant ${tenantId} not found, attempting fallback resolution...`);

          const resolvedTenant = await this.resolveTenantForUser(req.user, tenantId);
          if (resolvedTenant) {
            tenant = resolvedTenant.tenant;
            const newTenantId = resolvedTenant.tenantId;

            if (newTenantId !== tenantId) {
              console.log(`🔄 Switching tenant from ${tenantId} to ${newTenantId}`);
              tenantId = newTenantId;

              // Update request with corrected tenant ID
              req.tenantId = tenantId;

              // Get or create consumer for the correct tenant
              try {
                consumer = await this.getConsumerManager().getConsumer(tenantId);
                const authToken = req.headers.authorization?.replace('Bearer ', '');
                if (authToken) {
                  consumer.setCurrentToken(authToken);
                  console.log(`🔑 [TENANT] Updated consumer ${tenantId} with fresh token (resolved)`);
                }
                req.crmConsumer = consumer;
              } catch (consumerError) {
                console.error(`❌ Failed to get consumer for resolved tenant ${tenantId}:`, consumerError);
                return res.status(500).json({
                  error: 'Tenant service unavailable',
                  message: 'Unable to initialize tenant services with resolved tenant'
                });
              }
            }
          } else {
            // If still no tenant found after all fallbacks, return error
            console.error(`❌ No valid tenant found after all fallback attempts`);
            return res.status(404).json({
              error: 'Tenant not found',
              message: `Tenant ${req.tenantId} does not exist and no valid fallback tenant found. Please contact support.`,
              requestedTenantId: req.tenantId,
              availableFallbacks: {
                primaryOrganizationId: req.user?.primaryOrganizationId,
                entityCount: req.user?.entities?.length || 0,
                isDevelopment: process.env.NODE_ENV === 'development'
              }
            });
          }
        }

        if (tenant.status !== 'active') {
          return res.status(403).json({
            error: 'Tenant inactive',
            message: `Tenant ${tenantId} is not active`,
            status: tenant.status
          });
        }

        // Add tenant info to request
        req.tenantInfo = {
          tenantId,
          status: tenant.status,
          settings: tenant.settings || {},
          subscription: tenant.subscription || {}
        };

        next();
      } catch (error) {
        console.error('❌ Tenant validation error:', error);
        res.status(500).json({
          error: 'Tenant validation error',
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * User context middleware
   */
  userContext() {
    return async (req, res, next) => {
      try {
        console.log(`👤 User context middleware running for path: ${req.path}, originalUrl: ${req.originalUrl}`);
        // Skip user context for auth routes that handle their own user resolution
        if (req.path && (req.path.startsWith('/api/auth/') || req.path === '/me' || req.path === '/api/auth/me')) {
          console.log(`🔄 User context middleware skipping auth route: ${req.path}`);
          return next();
        }

        const consumer = req.crmConsumer;
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
          return res.status(401).json({
            error: 'User not authenticated',
            message: 'User ID is required'
          });
        }

        // Skip processing if userId looks like a Kinde ID (24 char hex without dashes)
        if (userId && userId.length === 24 && userId.match(/^[0-9a-f]{24}$/) && !userId.includes('-')) {
          console.log(`🔄 Skipping user context middleware for Kinde user ID: ${userId}`);
          return next();
        }

        // Update consumer with user permissions from JWT if available
        if (req.user?.permissions && Array.isArray(req.user.permissions)) {
          console.log('🔄 Updating consumer with JWT permissions for user:', userId);
          consumer.updatePermissionData({
            userId,
            permissions: req.user.permissions
          });
        }

        // Get user context
        const userContext = await consumer.getUserOrganizationContext(userId);
        if (!userContext) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in tenant'
          });
        }

        // Add user context to request
        req.userContext = userContext;

        next();
      } catch (error) {
        console.error('❌ User context error:', error);
        res.status(500).json({
          error: 'User context error',
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * Permission check middleware
   */
  requirePermission(permission) {
    return async (req, res, next) => {
      try {
        const consumer = req.crmConsumer;
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
          return res.status(401).json({
            error: 'User not authenticated',
            message: 'User ID is required'
          });
        }

        // Check permission
        const hasPermission = await consumer.checkUserPermission(userId, permission, req.user?.permissions);
        if (!hasPermission) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: `Permission '${permission}' is required`,
            requiredPermission: permission
          });
        }

        next();
      } catch (error) {
        console.error('❌ Permission check error:', error);
        res.status(500).json({
          error: 'Permission check error',
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * Activity logging middleware
   */
  logActivity(operation, entityType) {
    return async (req, res, next) => {
      try {
        const consumer = req.crmConsumer;
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
          return res.status(401).json({
            error: 'User not authenticated',
            message: 'User ID is required'
          });
        }

        // Store original methods
        const originalSend = res.send;
        const originalJson = res.json;

        // Override response methods to log activity
        res.send = function(data) {
          logActivityAfterResponse();
          return originalSend.call(this, data);
        };

        res.json = function(data) {
          logActivityAfterResponse();
          return originalJson.call(this, data);
        };

        async function logActivityAfterResponse() {
          try {
            const activityData = {
              userId,
              operation,
              entityType,
              entityId: req.params.id || req.body.id || 'unknown',
              entityName: req.body.name || req.body.title || 'unknown',
              entityStatus: req.body.status || 'unknown',
              sessionId: req.sessionID,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              deviceType: req.get('X-Device-Type') || 'unknown',
              status: res.statusCode < 400 ? 'success' : 'failure',
              message: res.statusCode < 400 ? 'Operation completed successfully' : 'Operation failed',
              errorCode: res.statusCode >= 400 ? `HTTP_${res.statusCode}` : null,
              metadata: {
                method: req.method,
                url: req.originalUrl,
                params: req.params,
                query: req.query,
                statusCode: res.statusCode
              },
              tags: [req.method.toLowerCase(), entityType, operation],
              priority: res.statusCode >= 500 ? 'high' : 'normal'
            };

            await consumer.logActivity(activityData);
          } catch (error) {
            console.error('❌ Failed to log activity:', error);
          }
        }

        next();
      } catch (error) {
        console.error('❌ Activity logging middleware error:', error);
        next(); // Continue even if logging fails
      }
    };
  }

  /**
   * Credit cost middleware
   */
  checkCreditCost(operationCode) {
    return async (req, res, next) => {
      try {
        const consumer = req.crmConsumer;
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
          return res.status(401).json({
            error: 'User not authenticated',
            message: 'User ID is required'
          });
        }

        // Get credit cost
        const creditCost = await consumer.getCreditCost(operationCode);
        
        // Add credit cost to request
        req.creditCost = creditCost;
        req.operationCode = operationCode;

        // Check if user has sufficient credits
        const userContext = await consumer.getUserOrganizationContext(userId);
        if (userContext && userContext.user.credits < creditCost) {
          return res.status(402).json({
            error: 'Insufficient credits',
            message: `Operation requires ${creditCost} credits, but user has ${userContext.user.credits}`,
            requiredCredits: creditCost,
            availableCredits: userContext.user.credits
          });
        }

        next();
      } catch (error) {
        console.error('❌ Credit cost check error:', error);
        res.status(500).json({
          error: 'Credit cost check error',
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * Organization scope middleware
   */
  requireOrganizationScope() {
    return async (req, res, next) => {
      try {
        const userContext = req.userContext;
        
        if (!userContext || !userContext.organization) {
          return res.status(400).json({
            error: 'Organization context required',
            message: 'User must be associated with an organization'
          });
        }

        // Add organization context to request
        req.organizationContext = userContext.organization;

        next();
      } catch (error) {
        console.error('❌ Organization scope error:', error);
        res.status(500).json({
          error: 'Organization scope error',
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * Rate limiting middleware (per tenant)
   */
  rateLimit(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // limit each IP to 100 requests per windowMs
      message = 'Too many requests from this IP, please try again later.'
    } = options;

    const requests = new Map();

    return (req, res, next) => {
      const tenantId = req.tenantId;
      const key = `${tenantId}:${req.ip}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [k, v] of requests.entries()) {
        if (v.timestamp < windowStart) {
          requests.delete(k);
        }
      }

      // Check current request
      const current = requests.get(key);
      if (!current) {
        requests.set(key, { count: 1, timestamp: now });
      } else if (current.timestamp < windowStart) {
        requests.set(key, { count: 1, timestamp: now });
      } else if (current.count >= max) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: Math.ceil((current.timestamp + windowMs - now) / 1000)
        });
      } else {
        current.count++;
      }

      next();
    };
  }
}

// Create singleton instance
const tenantMiddleware = new TenantMiddleware();

export default tenantMiddleware;
