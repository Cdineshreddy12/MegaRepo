import DistributedSSOCache from '../utils/distributed-sso-cache.js';

/**
 * Cache Invalidation Middleware
 * Automatically invalidates cache when critical data changes
 */

// Event types that require cache invalidation
export const CACHE_INVALIDATION_EVENTS = {
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_PERMISSIONS_CHANGED: 'user_permissions_changed',
  TENANT_SUBSCRIPTION_CHANGED: 'tenant_subscription_changed',
  TENANT_FEATURES_CHANGED: 'tenant_features_changed',
  USER_STATUS_CHANGED: 'user_status_changed',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted'
};

/**
 * Cache invalidation service
 */
export class CacheInvalidationService {
  
  /**
   * Invalidate cache when user role assignments change
   */
  static async invalidateUserRoleCache(userId, tenantId, context = {}) {
    try {
      console.log(`🗑️ Invalidating cache for user role change: ${userId}`);
      
      // Get the user's Kinde info to invalidate the right cache keys
      const user = await this.getUserKindeInfo(userId);
      if (!user) {
        console.warn(`⚠️ Could not find Kinde info for user ${userId}`);
        return;
      }
      
      // Invalidate user-specific cache
      await DistributedSSOCache.invalidateUserCache(userId, tenantId);
      
      // Also invalidate auth cache if we have Kinde info
      if (user.kindeUserId && user.orgCode) {
        const authKey = `auth:${user.kindeUserId}:${user.orgCode}`;
        await DistributedSSOCache.invalidateUserCache(authKey);
      }
      
      console.log(`✅ Cache invalidated for user ${userId} role change`);
      
      // Log the invalidation event
      await this.logCacheInvalidation(CACHE_INVALIDATION_EVENTS.USER_ROLE_CHANGED, {
        userId,
        tenantId,
        ...context
      });
      
    } catch (error) {
      console.error(`❌ Failed to invalidate user role cache for ${userId}:`, error);
    }
  }
  
  /**
   * Invalidate cache when user permissions change
   */
  static async invalidateUserPermissionsCache(userId, tenantId, appCode = null, context = {}) {
    try {
      console.log(`🗑️ Invalidating permissions cache: ${userId}${appCode ? ` for ${appCode}` : ''}`);
      
      if (appCode) {
        // Invalidate specific app permissions
        const permKey = `perms:${userId}:${tenantId}:${appCode}`;
        await DistributedSSOCache.invalidateAppCache(permKey);
      } else {
        // Invalidate all user permissions
        await DistributedSSOCache.invalidateUserCache(userId, tenantId);
      }
      
      console.log(`✅ Permissions cache invalidated for user ${userId}`);
      
      await this.logCacheInvalidation(CACHE_INVALIDATION_EVENTS.USER_PERMISSIONS_CHANGED, {
        userId,
        tenantId,
        appCode,
        ...context
      });
      
    } catch (error) {
      console.error(`❌ Failed to invalidate permissions cache for ${userId}:`, error);
    }
  }
  
  /**
   * Invalidate cache when tenant subscription changes
   */
  static async invalidateTenantSubscriptionCache(tenantId, context = {}) {
    try {
      console.log(`🗑️ Invalidating subscription cache for tenant: ${tenantId}`);
      
      // Invalidate subscription and features cache
      await Promise.all([
        DistributedSSOCache.invalidateTenantCache(tenantId),
        // Also invalidate all user permissions since subscription affects access
        this.invalidateAllTenantUserPermissions(tenantId)
      ]);
      
      console.log(`✅ Subscription cache invalidated for tenant ${tenantId}`);
      
      await this.logCacheInvalidation(CACHE_INVALIDATION_EVENTS.TENANT_SUBSCRIPTION_CHANGED, {
        tenantId,
        ...context
      });
      
    } catch (error) {
      console.error(`❌ Failed to invalidate subscription cache for ${tenantId}:`, error);
    }
  }
  
  /**
   * Invalidate cache when role definition changes
   */
  static async invalidateRoleCache(roleId, tenantId, context = {}) {
    try {
      console.log(`🗑️ Invalidating cache for role change: ${roleId}`);
      
      // Get all users with this role
      const usersWithRole = await this.getUsersWithRole(roleId, tenantId);
      
      // Invalidate cache for all affected users
      const invalidationPromises = usersWithRole.map(userId => 
        this.invalidateUserPermissionsCache(userId, tenantId, null, { roleId })
      );
      
      await Promise.all(invalidationPromises);
      
      console.log(`✅ Role cache invalidated for ${usersWithRole.length} users`);
      
      await this.logCacheInvalidation(CACHE_INVALIDATION_EVENTS.ROLE_UPDATED, {
        roleId,
        tenantId,
        affectedUsers: usersWithRole.length,
        ...context
      });
      
    } catch (error) {
      console.error(`❌ Failed to invalidate role cache for ${roleId}:`, error);
    }
  }
  
  /**
   * Invalidate cache when user status changes (active/inactive)
   */
  static async invalidateUserStatusCache(userId, tenantId, context = {}) {
    try {
      console.log(`🗑️ Invalidating cache for user status change: ${userId}`);
      
      // Invalidate all user-related cache
      await DistributedSSOCache.invalidateUserCache(userId, tenantId);
      
      console.log(`✅ User status cache invalidated for ${userId}`);
      
      await this.logCacheInvalidation(CACHE_INVALIDATION_EVENTS.USER_STATUS_CHANGED, {
        userId,
        tenantId,
        ...context
      });
      
    } catch (error) {
      console.error(`❌ Failed to invalidate user status cache for ${userId}:`, error);
    }
  }
  
  // Helper methods
  
  static async getUserKindeInfo(userId) {
    try {
      // This would query your database to get Kinde user info
      const { db } = await import('../db/index.js');
      const { tenantUsers } = await import('../db/schema/index.js');
      const { eq } = await import('drizzle-orm');
      
      const [user] = await db
        .select({
          kindeUserId: tenantUsers.kindeUserId,
          // You'd need to join with tenant to get orgCode
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.id, userId))
        .limit(1);
        
      return user;
    } catch (error) {
      console.error('Failed to get user Kinde info:', error);
      return null;
    }
  }
  
  static async getUsersWithRole(roleId, tenantId) {
    try {
      const { db } = await import('../db/index.js');
      const { userRoleAssignments } = await import('../db/schema/index.js');
      const { eq, and } = await import('drizzle-orm');
      
      const users = await db
        .select({ userId: userRoleAssignments.userId })
        .from(userRoleAssignments)
        .where(and(
          eq(userRoleAssignments.roleId, roleId),
          eq(userRoleAssignments.isActive, true)
        ));
        
      return users.map(u => u.userId);
    } catch (error) {
      console.error('Failed to get users with role:', error);
      return [];
    }
  }
  
  static async invalidateAllTenantUserPermissions(tenantId) {
    try {
      // Get all users in the tenant
      const { db } = await import('../db/index.js');
      const { tenantUsers } = await import('../db/schema/index.js');
      const { eq } = await import('drizzle-orm');
      
      const users = await db
        .select({ userId: tenantUsers.id })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));
      
      // Invalidate permissions for all users
      const invalidationPromises = users.map(user => 
        DistributedSSOCache.invalidateUserCache(user.userId, tenantId)
      );
      
      await Promise.all(invalidationPromises);
      console.log(`✅ Invalidated permissions for ${users.length} users in tenant ${tenantId}`);
      
    } catch (error) {
      console.error('Failed to invalidate all tenant user permissions:', error);
    }
  }
  
  static async logCacheInvalidation(event, data) {
    try {
      // Log cache invalidation events for monitoring
      console.log(`📊 Cache Invalidation Event: ${event}`, data);
      
      // You could store this in a database table for analytics
      // await db.insert(cacheInvalidationLogs).values({
      //   event,
      //   data: JSON.stringify(data),
      //   timestamp: new Date()
      // });
      
    } catch (error) {
      console.error('Failed to log cache invalidation:', error);
    }
  }
}

/**
 * Middleware to automatically invalidate cache on data changes
 */
export function createCacheInvalidationMiddleware() {
  return {
    // Middleware for role assignment changes
    onRoleAssignment: async (userId, roleId, tenantId, action) => {
      await CacheInvalidationService.invalidateUserRoleCache(userId, tenantId, {
        roleId,
        action // 'assigned' or 'removed'
      });
    },
    
    // Middleware for role definition changes
    onRoleUpdate: async (roleId, tenantId, changes) => {
      await CacheInvalidationService.invalidateRoleCache(roleId, tenantId, {
        changes
      });
    },
    
    // Middleware for subscription changes
    onSubscriptionChange: async (tenantId, oldPlan, newPlan) => {
      await CacheInvalidationService.invalidateTenantSubscriptionCache(tenantId, {
        oldPlan,
        newPlan
      });
    },
    
    // Middleware for user status changes
    onUserStatusChange: async (userId, tenantId, oldStatus, newStatus) => {
      await CacheInvalidationService.invalidateUserStatusCache(userId, tenantId, {
        oldStatus,
        newStatus
      });
    }
  };
}

export default CacheInvalidationService; 