import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../services/activityLogger.js';

/**
 * Activity Tracking Middleware
 * Automatically logs user activities based on request patterns
 */

/**
 * Main activity tracking middleware
 */
export const trackActivity = (options = {}) => {
  return (request, reply, done) => {
    // Skip tracking for certain routes or methods
    const skipPatterns = options.skipPatterns || [
      /\/health/,
      /\/metrics/,
      /\/favicon/,
      /\/static/,
      /\/api\/auth\/token/,
      /\/api\/activity/ // Skip activity logging for activity endpoints to avoid recursion
    ];

    const shouldSkip = skipPatterns.some(pattern => 
      pattern.test(request.url) || 
      (request.method === 'OPTIONS')
    );

    if (shouldSkip) {
      return done();
    }

    // Store original request info
    request.activityContext = {
      startTime: Date.now(),
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      sessionId: request.headers['x-session-id'] || request.user?.sessionId
    };

    // Store original reply.send method to track after response
    const originalSend = reply.send.bind(reply);
    reply.send = function(payload) {
      // Call original send method
      const result = originalSend(payload);
      
      // Track activity after response (non-blocking)
      setImmediate(() => {
        logRequestActivity(request, reply, options);
      });
      
      return result;
    };

    done();
  };
};

/**
 * Log activity based on request details
 */
async function logRequestActivity(request, reply, options = {}) {
  try {
    if (!request.user) return; // Skip if no authenticated user

    const { method, url, activityContext } = request;
    const { tenantId } = request.user;
    
    // Use internal user ID, not Kinde user ID
    const userId = request.user.internalUserId || request.user.userId;
    if (!userId) return; // Skip if no valid user ID
    
    // Determine activity type and details based on URL patterns
    const activityInfo = determineActivityType(method, url, request.body);
    
    if (!activityInfo) return; // Skip if not a trackable activity

    const requestContext = ActivityLogger.createRequestContext(request, activityContext.sessionId);
    
    // Log the activity
    await ActivityLogger.logActivity(
      userId,
      tenantId,
      activityInfo.appId,
      activityInfo.action,
      {
        method,
        url,
        responseStatus: reply.statusCode,
        duration: Date.now() - activityContext.startTime,
        ...activityInfo.metadata
      },
      requestContext
    );

  } catch (error) {
    console.error('❌ Failed to track request activity:', error);
    // Don't throw - logging failures shouldn't affect the main request
  }
}

/**
 * Determine activity type based on request patterns
 * Only returns activity types for meaningful operations (no views)
 */
function determineActivityType(method, url, body = {}) {
  const patterns = [
    // Only meaningful operations - no view activities
    // Authentication activities
    {
      pattern: /\/api\/auth\/login/,
      action: ACTIVITY_TYPES.AUTH_LOGIN,
      appId: null
    },
    {
      pattern: /\/api\/auth\/logout/,
      action: ACTIVITY_TYPES.AUTH_LOGOUT,
      appId: null
    },

    // User management activities
    {
      pattern: /\/api\/tenants\/current\/users$/,
      method: 'POST',
      action: ACTIVITY_TYPES.USER_INVITED,
      appId: null,
      metadata: { invitedEmail: body?.email }
    },
    {
      pattern: /\/api\/tenants\/current\/users\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.USER_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/tenants\/current\/users\/(.+)\/promote/,
      method: 'POST',
      action: ACTIVITY_TYPES.USER_PROMOTED,
      appId: null
    },
    {
      pattern: /\/api\/tenants\/current\/users\/(.+)\/deactivate/,
      method: 'POST',
      action: ACTIVITY_TYPES.USER_DEACTIVATED,
      appId: null
    },

    // Role management activities
    {
      pattern: /\/api\/roles\/?$/,
      method: 'POST',
      action: ACTIVITY_TYPES.ROLE_CREATED,
      appId: null,
      metadata: { roleName: body?.name }
    },
    {
      pattern: /\/api\/roles\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.ROLE_UPDATED,
      appId: null,
      metadata: { roleId: extractIdFromUrl(url) }
    },
    {
      pattern: /\/api\/roles\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.ROLE_DELETED,
      appId: null,
      metadata: { roleId: extractIdFromUrl(url) }
    },

    // Permission-based role activities
    {
      pattern: /\/api\/permissions\/roles\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.ROLE_UPDATED,
      appId: null,
      metadata: { roleId: extractIdFromUrl(url) }
    },
    {
      pattern: /\/api\/permissions\/roles\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.ROLE_DELETED,
      appId: null,
      metadata: { roleId: extractIdFromUrl(url) }
    },

    // Application access
    {
      pattern: /\/api\/suite\/sso\/redirect/,
      method: 'POST',
      action: ACTIVITY_TYPES.APP_SSO_LOGIN,
      appId: null,
      metadata: { appCode: body?.appCode }
    },
    {
      pattern: /\/api\/suite\/applications/,
      method: 'GET',
      action: ACTIVITY_TYPES.APP_ACCESSED,
      appId: null
    },

    // Permission activities
    {
      pattern: /\/api\/permissions/,
      method: 'POST',
      action: ACTIVITY_TYPES.PERMISSION_GRANTED,
      appId: null
    },
    {
      pattern: /\/api\/permissions\/(.+)/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.PERMISSION_REVOKED,
      appId: null
    },

    // Data export/import
    {
      pattern: /\/api\/.*\/export/,
      method: 'POST',
      action: ACTIVITY_TYPES.DATA_EXPORT,
      appId: null
    },
    {
      pattern: /\/api\/.*\/import/,
      method: 'POST',
      action: ACTIVITY_TYPES.DATA_IMPORT,
      appId: null
    },

    // Bulk operations
    {
      pattern: /\/api\/.*\/bulk/,
      method: 'POST',
      action: ACTIVITY_TYPES.DATA_BULK_UPDATE,
      appId: null
    },

    // Tenant management activities (only meaningful operations)
    {
      pattern: /\/api\/tenants\/current\/settings$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.TENANT_SETTINGS_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/tenants\/current\/users$/,
      method: 'POST',
      action: ACTIVITY_TYPES.TENANT_USER_INVITED,
      appId: null
    },
    {
      pattern: /\/api\/tenants\/current\/users\/(.+)\/activate$/,
      method: 'POST',
      action: ACTIVITY_TYPES.TENANT_USER_ACTIVATED,
      appId: null
    },
    {
      pattern: /\/api\/tenants\/current\/users\/(.+)\/deactivate$/,
      method: 'POST',
      action: ACTIVITY_TYPES.TENANT_USER_DEACTIVATED,
      appId: null
    },

    // User profile activities (only updates)
    {
      pattern: /\/api\/users\/me$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.USER_PROFILE_UPDATED,
      appId: null
    },

    // Subscription activities (only meaningful operations)
    {
      pattern: /\/api\/subscriptions$/,
      method: 'POST',
      action: ACTIVITY_TYPES.SUBSCRIPTION_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/subscriptions\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.SUBSCRIPTION_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/subscriptions\/(.+)\/cancel$/,
      method: 'POST',
      action: ACTIVITY_TYPES.SUBSCRIPTION_CANCELLED,
      appId: null
    },

    // Payment activities (only meaningful operations)
    {
      pattern: /\/api\/payments$/,
      method: 'POST',
      action: ACTIVITY_TYPES.PAYMENT_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/payment-upgrade$/,
      method: 'POST',
      action: ACTIVITY_TYPES.PAYMENT_UPGRADED,
      appId: null
    },

    // Organization activities (only meaningful operations)
    {
      pattern: /\/api\/organizations$/,
      method: 'POST',
      action: ACTIVITY_TYPES.ORGANIZATION_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/organizations\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.ORGANIZATION_UPDATED,
      appId: null
    },

    // Entity activities (only meaningful operations)
    {
      pattern: /\/api\/entities$/,
      method: 'POST',
      action: ACTIVITY_TYPES.ENTITY_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/entities\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.ENTITY_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/entities\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.ENTITY_DELETED,
      appId: null
    },

    // Invitation activities (only meaningful operations)
    {
      pattern: /\/api\/invitations$/,
      method: 'POST',
      action: ACTIVITY_TYPES.INVITATION_SENT,
      appId: null
    },
    {
      pattern: /\/api\/invitations\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.INVITATION_CANCELLED,
      appId: null
    },

    // Location activities (only meaningful operations)
    {
      pattern: /\/api\/locations$/,
      method: 'POST',
      action: ACTIVITY_TYPES.LOCATION_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/locations\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.LOCATION_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/locations\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.LOCATION_DELETED,
      appId: null
    },

    // Credit activities (only meaningful operations)
    {
      pattern: /\/api\/credits$/,
      method: 'POST',
      action: ACTIVITY_TYPES.CREDIT_ALLOCATED,
      appId: null
    },

    // Demo activities (only meaningful operations)
    {
      pattern: /\/api\/demo/,
      method: 'POST',
      action: ACTIVITY_TYPES.DEMO_REQUESTED,
      appId: null
    },

    // DNS Management activities (only meaningful operations)
    {
      pattern: /\/api\/dns/,
      method: 'POST',
      action: ACTIVITY_TYPES.DNS_UPDATED,
      appId: null
    },

    // Trial activities (only meaningful operations)
    {
      pattern: /\/api\/trial/,
      method: 'POST',
      action: ACTIVITY_TYPES.TRIAL_EXTENDED,
      appId: null
    },

    // Admin activities (only meaningful operations)
    {
      pattern: /\/api\/admin\/tenants/,
      method: 'POST',
      action: ACTIVITY_TYPES.ADMIN_TENANT_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/admin\/tenants\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.ADMIN_TENANT_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/admin\/tenants\/(.+)\/activate$/,
      method: 'POST',
      action: ACTIVITY_TYPES.ADMIN_TENANT_ACTIVATED,
      appId: null
    },
    {
      pattern: /\/api\/admin\/tenants\/(.+)\/deactivate$/,
      method: 'POST',
      action: ACTIVITY_TYPES.ADMIN_TENANT_DEACTIVATED,
      appId: null
    },

    // Webhook activities (only meaningful operations)
    {
      pattern: /\/api\/webhooks/,
      method: 'POST',
      action: ACTIVITY_TYPES.WEBHOOK_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/webhooks\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.WEBHOOK_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/webhooks\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.WEBHOOK_DELETED,
      appId: null
    },

    // Custom role activities (only meaningful operations)
    {
      pattern: /\/api\/custom-roles$/,
      method: 'POST',
      action: ACTIVITY_TYPES.CUSTOM_ROLE_CREATED,
      appId: null
    },
    {
      pattern: /\/api\/custom-roles\/create-from-builder$/,
      method: 'POST',
      action: ACTIVITY_TYPES.CUSTOM_ROLE_CREATED,
      appId: null,
      metadata: { roleName: body?.roleName }
    },
    {
      pattern: /\/api\/custom-roles\/(.+)$/,
      method: 'PUT',
      action: ACTIVITY_TYPES.CUSTOM_ROLE_UPDATED,
      appId: null
    },
    {
      pattern: /\/api\/custom-roles\/(.+)$/,
      method: 'DELETE',
      action: ACTIVITY_TYPES.CUSTOM_ROLE_DELETED,
      appId: null
    },

    // Permission matrix activities (only meaningful operations)
    {
      pattern: /\/api\/permission-matrix/,
      method: 'POST',
      action: ACTIVITY_TYPES.PERMISSION_MATRIX_UPDATED,
      appId: null
    },

    // User sync activities (only meaningful operations)
    {
      pattern: /\/api\/user-sync/,
      method: 'POST',
      action: ACTIVITY_TYPES.USER_SYNC_TRIGGERED,
      appId: null
    },

    // User application activities (only meaningful operations)
    {
      pattern: /\/api\/user-applications/,
      method: 'POST',
      action: ACTIVITY_TYPES.USER_APPLICATION_UPDATED,
      appId: null
    },

    // Enhanced CRM integration activities (only meaningful operations)
    {
      pattern: /\/api\/enhanced-crm-integration/,
      method: 'POST',
      action: ACTIVITY_TYPES.CRM_INTEGRATION_UPDATED,
      appId: null
    }
  ];

  for (const pattern of patterns) {
    if (pattern.pattern.test(url)) {
      // Check method if specified
      if (pattern.method && pattern.method !== method) {
        continue;
      }

      return {
        action: pattern.action,
        appId: pattern.appId,
        metadata: pattern.metadata || {}
      };
    }
  }

  return null; // No matching pattern found
}

/**
 * Extract ID from URL path
 */
function extractIdFromUrl(url) {
  const matches = url.match(/\/([a-f0-9-]{36})\/?$/);
  return matches ? matches[1] : null;
}

/**
 * Middleware for tracking specific user actions (manual)
 */
export const trackUserAction = (action, options = {}) => {
  return async (request, reply, done) => {
    try {
      if (!request.user) {
        return done();
      }

      const { tenantId } = request.user;
      const userId = request.user.internalUserId || request.user.userId;
      
      if (!userId) {
        return done();
      }
      
      const requestContext = ActivityLogger.createRequestContext(request);

      // Add to request context for later use
      request.pendingActivity = {
        userId,
        tenantId,
        action,
        appId: options.appId || null,
        metadata: {
          ...options.metadata,
          url: request.url,
          method: request.method
        },
        requestContext
      };

      done();
    } catch (error) {
      console.error('❌ Failed to prepare activity tracking:', error);
      done(); // Continue even if tracking fails
    }
  };
};

/**
 * Middleware to complete tracked action (after successful operation)
 */
export const completeTrackedAction = () => {
  return async (request, reply, done) => {
    try {
      if (request.pendingActivity && reply.statusCode < 400) {
        const activity = request.pendingActivity;
        
        // Log the activity asynchronously
        setImmediate(async () => {
          await ActivityLogger.logActivity(
            activity.userId,
            activity.tenantId,
            activity.appId,
            activity.action,
            {
              ...activity.metadata,
              responseStatus: reply.statusCode,
              completedAt: new Date().toISOString()
            },
            activity.requestContext
          );
        });
      }
      done();
    } catch (error) {
      console.error('❌ Failed to complete activity tracking:', error);
      done();
    }
  };
};

/**
 * Middleware for tracking audit events (for data changes)
 */
export const trackAuditEvent = (resourceType, options = {}) => {
  return async (request, reply, done) => {
    try {
      if (!request.user) {
        return done();
      }

      const { tenantId } = request.user;
      const userId = request.user.internalUserId || request.user.userId;
      
      if (!userId) {
        return done();
      }
      
      const requestContext = ActivityLogger.createRequestContext(request);

      // Store original data for comparison (if applicable)
      if (options.captureChanges && request.params?.id) {
        // This would require the specific service to implement change tracking
        request.auditContext = {
          resourceType,
          resourceId: request.params.id,
          tenantId,
          userId,
          requestContext,
          captureChanges: true
        };
      }

      done();
    } catch (error) {
      console.error('❌ Failed to prepare audit tracking:', error);
      done();
    }
  };
};

/**
 * Helper function to manually log audit events from route handlers
 */
export const logAuditEvent = async (request, action, resourceId, changes = {}) => {
  try {
    if (!request.user || !request.auditContext) return;

    const { tenantId, userId, resourceType, requestContext } = request.auditContext;

    await ActivityLogger.logAuditEvent(
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      requestContext
    );
  } catch (error) {
    console.error('❌ Failed to log audit event:', error);
  }
};

/**
 * Track login activity specifically
 */
export const trackLogin = async (user, request, success = true) => {
  try {
    const requestContext = ActivityLogger.createRequestContext(request);
    
    // Use internal user ID if available, otherwise fall back to userId
    const userId = user.internalUserId || user.userId;
    if (!userId) {
      console.error('❌ trackLogin: No valid user ID found');
      return;
    }
    
    const action = success 
      ? ACTIVITY_TYPES.AUTH_LOGIN 
      : ACTIVITY_TYPES.AUTH_FAILED_LOGIN;

    await ActivityLogger.logActivity(
      userId,
      user.tenantId,
      null, // No specific app for login
      action,
      {
        email: user.email,
        success,
        loginMethod: 'kinde',
        timestamp: new Date().toISOString()
      },
      requestContext
    );

    // Also log as audit event for security tracking
    await ActivityLogger.logAuditEvent(
      user.tenantId,
      userId,
      success ? 'login' : 'login_failed',
      RESOURCE_TYPES.SESSION,
      request.headers['x-session-id'] || 'unknown',
      {
        details: {
          email: user.email,
          success,
          loginMethod: 'kinde'
        }
      },
      requestContext
    );

  } catch (error) {
    console.error('❌ Failed to track login activity:', error);
  }
};

/**
 * Track logout activity specifically
 */
export const trackLogout = async (user, request) => {
  try {
    const requestContext = ActivityLogger.createRequestContext(request);

    // Use internal user ID if available, otherwise fall back to userId
    const userId = user.internalUserId || user.userId;
    if (!userId) {
      console.error('❌ trackLogout: No valid user ID found');
      return;
    }

    await ActivityLogger.logActivity(
      userId,
      user.tenantId,
      null,
      ACTIVITY_TYPES.AUTH_LOGOUT,
      {
        email: user.email,
        logoutMethod: 'manual',
        timestamp: new Date().toISOString()
      },
      requestContext
    );

  } catch (error) {
    console.error('❌ Failed to track logout activity:', error);
  }
}; 