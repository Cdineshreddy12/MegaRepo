import { db } from '../db/index.js';
import { auditLogs, tenantUsers } from '../db/schema/users.js';
import { applications } from '../db/schema/suite-schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import Logger from '../utils/logger.js';

/**
 * Comprehensive Activity Logger Service
 * Tracks all user activities, system changes, and audit events
 */
class ActivityLogger {
  
  /**
   * Activity Types Constants
   */
  static ACTIVITY_TYPES = {
    // Authentication Activities
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    AUTH_TOKEN_REFRESH: 'auth.token_refresh',
    AUTH_PASSWORD_CHANGE: 'auth.password_change',
    AUTH_FAILED_LOGIN: 'auth.failed_login',
    
    // User Management Activities
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_INVITED: 'user.invited',
    USER_INVITATION_ACCEPTED: 'user.invitation_accepted',
    USER_ACTIVATED: 'user.activated',
    USER_DEACTIVATED: 'user.deactivated',
    USER_PROMOTED: 'user.promoted',
    USER_DEMOTED: 'user.demoted',
    USER_PROFILE_UPDATED: 'user.profile_updated',
    
    // Role Management Activities
    ROLE_CREATED: 'role.created',
    ROLE_UPDATED: 'role.updated',
    ROLE_DELETED: 'role.deleted',
    ROLE_ASSIGNED: 'role.assigned',
    ROLE_REMOVED: 'role.removed',
    ROLE_PERMISSIONS_CHANGED: 'role.permissions_changed',
    ROLE_CLONED: 'role.cloned',
    
    // Permission Activities
    PERMISSION_GRANTED: 'permission.granted',
    PERMISSION_REVOKED: 'permission.revoked',
    PERMISSION_MODIFIED: 'permission.modified',
    
    // Application Activities
    APP_ACCESSED: 'app.accessed',
    APP_SSO_LOGIN: 'app.sso_login',
    APP_ENABLED: 'app.enabled',
    APP_DISABLED: 'app.disabled',
    APP_SETTINGS_CHANGED: 'app.settings_changed',
    
    // System Activities
    SYSTEM_SETTINGS_CHANGED: 'system.settings_changed',
    SYSTEM_BACKUP_CREATED: 'system.backup_created',
    SYSTEM_MAINTENANCE: 'system.maintenance',
    
    // Billing Activities
    BILLING_SUBSCRIPTION_CREATED: 'billing.subscription_created',
    BILLING_SUBSCRIPTION_UPDATED: 'billing.subscription_updated',
    BILLING_SUBSCRIPTION_CANCELLED: 'billing.subscription_cancelled',
    BILLING_PAYMENT_SUCCESS: 'billing.payment_success',
    BILLING_PAYMENT_FAILED: 'billing.payment_failed',
    
    // Data Activities
    DATA_EXPORT: 'data.export',
    DATA_IMPORT: 'data.import',
    DATA_BULK_UPDATE: 'data.bulk_update',
    DATA_BULK_DELETE: 'data.bulk_delete',
    
    // Security Activities
    SECURITY_BREACH_ATTEMPT: 'security.breach_attempt',
    SECURITY_ACCESS_DENIED: 'security.access_denied',
    SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',

    // Tenant Activities
    TENANT_VIEWED: 'tenant.viewed',
    TENANT_SETTINGS_UPDATED: 'tenant.settings_updated',
    TENANT_USERS_VIEWED: 'tenant.users_viewed',
    TENANT_USER_INVITED: 'tenant.user_invited',
    TENANT_USER_ACTIVATED: 'tenant.user_activated',
    TENANT_USER_DEACTIVATED: 'tenant.user_deactivated',

    // Organization Assignment Activities
    USER_ORGANIZATION_ASSIGNED: 'user.organization_assigned',
    USER_ORGANIZATION_UPDATED: 'user.organization_updated',
    USER_ORGANIZATION_REMOVED: 'user.organization_removed',
    BULK_USER_ORGANIZATION_ASSIGNED: 'bulk.user.organization_assigned',

    // User Profile Activities
    USER_PROFILE_VIEWED: 'user.profile_viewed',
    USER_PROFILE_UPDATED: 'user.profile_updated',

    // Subscription Activities
    SUBSCRIPTION_VIEWED: 'subscription.viewed',
    SUBSCRIPTION_CREATED: 'subscription.created',
    SUBSCRIPTION_UPDATED: 'subscription.updated',
    SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

    // Payment Activities
    PAYMENT_VIEWED: 'payment.viewed',
    PAYMENT_CREATED: 'payment.created',
    PAYMENT_UPGRADED: 'payment.upgraded',

    // Organization Activities
    ORGANIZATION_VIEWED: 'organization.viewed',
    ORGANIZATION_CREATED: 'organization.created',
    ORGANIZATION_UPDATED: 'organization.updated',

    // Entity Activities
    ENTITY_VIEWED: 'entity.viewed',
    ENTITY_CREATED: 'entity.created',
    ENTITY_UPDATED: 'entity.updated',
    ENTITY_DELETED: 'entity.deleted',

    // Invitation Activities
    INVITATION_VIEWED: 'invitation.viewed',
    INVITATION_SENT: 'invitation.sent',
    INVITATION_CANCELLED: 'invitation.cancelled',

    // Location Activities
    LOCATION_VIEWED: 'location.viewed',
    LOCATION_CREATED: 'location.created',
    LOCATION_UPDATED: 'location.updated',
    LOCATION_DELETED: 'location.deleted',

    // Credit Activities
    CREDIT_VIEWED: 'credit.viewed',
    CREDIT_ALLOCATED: 'credit.allocated',

    // Analytics Activities
    ANALYTICS_VIEWED: 'analytics.viewed',

    // Demo Activities
    DEMO_VIEWED: 'demo.viewed',
    DEMO_REQUESTED: 'demo.requested',

    // DNS Management Activities
    DNS_VIEWED: 'dns.viewed',
    DNS_UPDATED: 'dns.updated',

    // Trial Activities
    TRIAL_VIEWED: 'trial.viewed',
    TRIAL_EXTENDED: 'trial.extended',

    // Admin Activities
    ADMIN_PANEL_VIEWED: 'admin.panel_viewed',
    ADMIN_TENANT_VIEWED: 'admin.tenant_viewed',
    ADMIN_TENANT_CREATED: 'admin.tenant_created',
    ADMIN_TENANT_UPDATED: 'admin.tenant_updated',
    ADMIN_TENANT_ACTIVATED: 'admin.tenant_activated',
    ADMIN_TENANT_DEACTIVATED: 'admin.tenant_deactivated',

    // Webhook Activities
    WEBHOOK_VIEWED: 'webhook.viewed',
    WEBHOOK_CREATED: 'webhook.created',
    WEBHOOK_UPDATED: 'webhook.updated',
    WEBHOOK_DELETED: 'webhook.deleted',

    // Custom Role Activities
    CUSTOM_ROLE_VIEWED: 'custom_role.viewed',
    CUSTOM_ROLE_CREATED: 'custom_role.created',
    CUSTOM_ROLE_UPDATED: 'custom_role.updated',
    CUSTOM_ROLE_DELETED: 'custom_role.deleted',

    // Permission Matrix Activities
    PERMISSION_MATRIX_VIEWED: 'permission_matrix.viewed',
    PERMISSION_MATRIX_UPDATED: 'permission_matrix.updated',

    // User Sync Activities
    USER_SYNC_VIEWED: 'user_sync.viewed',
    USER_SYNC_TRIGGERED: 'user_sync.triggered',

    // User Application Activities
    USER_APPLICATION_VIEWED: 'user_application.viewed',
    USER_APPLICATION_UPDATED: 'user_application.updated',

    // Activity Log Activities
    ACTIVITY_LOG_VIEWED: 'activity_log.viewed',

    // CRM Integration Activities
    CRM_INTEGRATION_VIEWED: 'crm_integration.viewed',
    CRM_INTEGRATION_UPDATED: 'crm_integration.updated',
  };

  /**
   * Resource Types Constants
   */
  static RESOURCE_TYPES = {
    USER: 'user',
    ROLE: 'role',
    PERMISSION: 'permission',
    APPLICATION: 'application',
    TENANT: 'tenant',
    SUBSCRIPTION: 'subscription',
    PAYMENT: 'payment',
    SYSTEM: 'system',
    SESSION: 'session',
    INVITATION: 'invitation',
  };

  /**
   * Log user activity (for general activities like app access, login, etc.)
   */
  async logActivity(userId, tenantId, appId, action, metadata = {}, requestContext = {}) {
    const requestId = Logger.generateRequestId('activity-log');
    
    try {
      Logger.activity.log(requestId, action, 'activity', `${userId}:${appId}`, {
        userId,
        tenantId,
        appId,
        action,
        metadata,
        requestContext: {
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          sessionId: requestContext.sessionId
        }
      });
      
      const activityData = {
        userId,
        tenantId,
        appId,
        action,
        resourceType: 'activity', // General activities don't have a specific resource type
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          sessionId: requestContext.sessionId,
          requestId: requestId
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      };

      await db.insert(auditLogs).values(activityData);

      console.log(`✅ [${requestId}] Activity logged successfully: ${action} for user ${userId}`);
      return { success: true, requestId };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to log activity:`, {
        error: error.message,
        userId,
        tenantId,
        action,
        stack: error.stack
      });
      // Don't throw - logging failures shouldn't break main operations
      return { success: false, error: error.message, requestId };
    }
  }

  /**
   * Log audit event (for system changes, data modifications, security events)
   */
  async logAuditEvent(tenantId, userId, action, resourceType, resourceId, changes = {}, requestContext = {}) {
    const requestId = Logger.generateRequestId('audit-log');
    
    try {
      Logger.activity.log(requestId, action, resourceType, resourceId, {
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        changes: {
          hasOldValues: !!changes.oldValues,
          hasNewValues: !!changes.newValues,
          detailsCount: Object.keys(changes.details || {}).length
        },
        requestContext: {
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          sessionId: requestContext.sessionId,
          source: requestContext.source || 'web'
        }
      });
      
      const auditData = {
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        oldValues: changes.oldValues || null,
        newValues: changes.newValues || null,
        details: {
          ...changes.details,
          timestamp: new Date().toISOString(),
          sessionId: requestContext.sessionId,
          source: requestContext.source || 'web',
          requestId: requestId
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      };

      await db.insert(auditLogs).values(auditData);

      console.log(`✅ [${requestId}] Audit event logged successfully: ${action} on ${resourceType}:${resourceId} by user ${userId}`);
      return { success: true, requestId };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to log audit event:`, {
        error: error.message,
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        stack: error.stack
      });
      return { success: false, error: error.message, requestId };
    }
  }

  /**
   * Get user activity logs with filtering and pagination
   */
  async getUserActivity(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        actionFilter,
        appFilter,
        includeMetadata = true
      } = options;

      // Define meaningful actions (no view activities)
      const meaningfulActions = [
        // Only create, update, delete operations
        'user.profile_updated',
        'tenant.settings_updated',
        'subscription.created',
        'subscription.updated',
        'subscription.cancelled',
        'payment.created',
        'organization.created',
        'organization.updated',
        'entity.created',
        'entity.updated',
        'entity.deleted',
        'location.created',
        'location.updated',
        'location.deleted',
        'webhook.created',
        'webhook.updated',
        'webhook.deleted',
        'role.created',
        'role.updated',
        'role.deleted',
        'custom_role.created',
        'custom_role.updated',
        'custom_role.deleted',
        'permission_matrix.updated',
        'user_application.updated',
        'crm_integration.updated',
        'dns.updated'
      ];

      let query = db
        .select({
          logId: auditLogs.logId,
          action: auditLogs.action,
          userId: auditLogs.userId,
          userName: tenantUsers.name,
          userEmail: tenantUsers.email,
          metadata: includeMetadata ? auditLogs.details : sql`NULL`,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt
        })
        .from(auditLogs)
        .leftJoin(tenantUsers, and(
          eq(auditLogs.userId, tenantUsers.userId),
          eq(auditLogs.tenantId, tenantUsers.tenantId)
        ))
        .where(and(
          eq(auditLogs.userId, userId),
          sql`${auditLogs.action} IN (${meaningfulActions.map(action => `'${action}'`).join(', ')})`
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Apply additional filters
      if (startDate) {
        query = query.where(gte(auditLogs.createdAt, startDate));
      }

      if (endDate) {
        query = query.where(lte(auditLogs.createdAt, endDate));
      }

      if (actionFilter) {
        query = query.where(eq(auditLogs.action, actionFilter));
      }

      const activities = await query;

      // Map actions to applications and add user info
      const enrichedActivities = activities.map(activity => {
        // Map action to application
        let appCode = 'system';
        let appName = 'System';

        if (activity.action.includes('tenant.') || activity.action.includes('admin.tenant')) {
          appCode = 'admin';
          appName = 'Admin Panel';
        } else if (activity.action.includes('user.')) {
          appCode = 'users';
          appName = 'User Management';
        } else if (activity.action.includes('role.') || activity.action.includes('custom_role.') || activity.action.includes('permission.')) {
          appCode = 'permissions';
          appName = 'Permissions';
        } else if (activity.action.includes('subscription.') || activity.action.includes('payment.')) {
          appCode = 'billing';
          appName = 'Billing';
        } else if (activity.action.includes('organization.') || activity.action.includes('entity.') || activity.action.includes('location.')) {
          appCode = 'organization';
          appName = 'Organization';
        } else if (activity.action.includes('invitation.')) {
          appCode = 'invitations';
          appName = 'Invitations';
        } else if (activity.action.includes('webhook.')) {
          appCode = 'webhooks';
          appName = 'Webhooks';
        } else if (activity.action.includes('credit.')) {
          appCode = 'credits';
          appName = 'Credits';
        } else if (activity.action.includes('demo.')) {
          appCode = 'demo';
          appName = 'Demo';
        } else if (activity.action.includes('dns.')) {
          appCode = 'dns';
          appName = 'DNS Management';
        } else if (activity.action.includes('trial.')) {
          appCode = 'trial';
          appName = 'Trial Management';
        } else if (activity.action.includes('user_sync.')) {
          appCode = 'sync';
          appName = 'User Sync';
        } else if (activity.action.includes('crm_integration.')) {
          appCode = 'crm';
          appName = 'CRM Integration';
        }

        return {
          ...activity,
          appCode,
          appName,
          userInfo: {
            id: activity.userId,
            name: activity.userName || 'Unknown User',
            email: activity.userEmail || 'unknown@example.com'
          }
        };
      });

      return {
        activities: enrichedActivities,
        pagination: {
          limit,
          offset,
          total: activities.length
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user activity:', error);
      throw error;
    }
  }

  /**
   * Get tenant audit logs with filtering and pagination
   */
  async getTenantAuditLogs(tenantId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        startDate,
        endDate,
        actionFilter,
        resourceTypeFilter,
        userFilter,
        includeDetails = true
      } = options;

      // Define meaningful actions (no view activities)
      const meaningfulActions = [
        // Only create, update, delete operations for audit logs
        'user.created', 'user.updated', 'user.deleted',
        'role.created', 'role.updated', 'role.deleted',
        'custom_role.created', 'custom_role.updated', 'custom_role.deleted',
        'tenant.created', 'tenant.updated', 'tenant.settings_updated',
        'subscription.created', 'subscription.updated', 'subscription.cancelled'
      ];

      const conditions = [
        eq(auditLogs.tenantId, tenantId),
        sql`${auditLogs.action} IN (${meaningfulActions.map(action => `'${action}'`).join(', ')})`
      ];

      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, startDate));
      }

      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, endDate));
      }

      if (actionFilter) {
        conditions.push(eq(auditLogs.action, actionFilter));
      }

      if (resourceTypeFilter) {
        conditions.push(eq(auditLogs.resourceType, resourceTypeFilter));
      }

      if (userFilter) {
        conditions.push(eq(auditLogs.userId, userFilter));
      }

      const logs = await db
        .select({
          logId: auditLogs.logId,
          userId: auditLogs.userId,
          userName: tenantUsers.name,
          userEmail: tenantUsers.email,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          oldValues: includeDetails ? auditLogs.oldValues : sql`NULL`,
          newValues: includeDetails ? auditLogs.newValues : sql`NULL`,
          details: includeDetails ? auditLogs.details : sql`NULL`,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt
        })
        .from(auditLogs)
        .leftJoin(tenantUsers, eq(auditLogs.userId, tenantUsers.userId))
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(and(...conditions));

      const total = parseInt(totalCountResult[0]?.count || 0);

      return {
        logs,
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get tenant audit logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for dashboard
   */
  async getActivityStats(tenantId, period = '24h') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get activity counts by type
      const activityStats = await db
        .select({
          action: auditLogs.action,
          count: sql`count(*)`.as('count')
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.createdAt, startDate)
        ))
        .groupBy(auditLogs.action);

      // Get audit event counts
      const auditStats = await db
        .select({
          resourceType: auditLogs.resourceType,
          action: auditLogs.action,
          count: sql`count(*)`.as('count')
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.createdAt, startDate)
        ))
        .groupBy(auditLogs.resourceType, auditLogs.action);

      // Get unique active users
      const activeUsersResult = await db
        .select({
          uniqueUsers: sql`count(distinct user_id)`.as('uniqueUsers')
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.createdAt, startDate)
        ));

      const uniqueActiveUsers = parseInt(activeUsersResult[0]?.uniqueUsers || 0);

      return {
        period,
        startDate,
        endDate: now,
        uniqueActiveUsers,
        activityBreakdown: activityStats.map(stat => ({
          action: stat.action,
          count: parseInt(stat.count)
        })),
        auditBreakdown: auditStats.map(stat => ({
          resourceType: stat.resourceType,
          action: stat.action,
          count: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get activity stats:', error);
      throw error;
    }
  }

  /**
   * Helper method to create request context from request object
   */
  createRequestContext(request, sessionId = null) {
    return {
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
      sessionId: sessionId || request.headers['x-session-id'],
      source: request.headers['x-source'] || 'web'
    };
  }

  /**
   * Batch log multiple activities (for bulk operations)
   */
  async logBatchActivities(activities) {
    try {
      if (!activities || activities.length === 0) {
        return { success: true, count: 0 };
      }

      const activityData = activities.map(activity => ({
        ...activity,
        metadata: {
          ...activity.metadata,
          timestamp: new Date().toISOString(),
          batch: true,
        }
      }));

      await db.insert(auditLogs).values(activityData);

      console.log(`📊 Batch activities logged: ${activities.length} entries`);
      return { success: true, count: activities.length };
    } catch (error) {
      console.error('❌ Failed to log batch activities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch log multiple audit events (for bulk operations)
   */
  async logBatchAuditEvents(auditEvents) {
    try {
      if (!auditEvents || auditEvents.length === 0) {
        return { success: true, count: 0 };
      }

      const auditData = auditEvents.map(event => ({
        ...event,
        details: {
          ...event.details,
          timestamp: new Date().toISOString(),
          batch: true,
        }
      }));

      await db.insert(auditLogs).values(auditData);

      console.log(`🔍 Batch audit events logged: ${auditEvents.length} entries`);
      return { success: true, count: auditEvents.length };
    } catch (error) {
      console.error('❌ Failed to log batch audit events:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create instance
const activityLogger = new ActivityLogger();

// Export the instance as default and also export the static constants
export default activityLogger;
export const ACTIVITY_TYPES = ActivityLogger.ACTIVITY_TYPES;
export const RESOURCE_TYPES = ActivityLogger.RESOURCE_TYPES; 