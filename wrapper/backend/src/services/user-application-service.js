/**
 * 🔐 **USER APPLICATION ACCESS SERVICE**
 * Manages user access to applications and external sync functionality
 */

import { db } from '../db/index.js';
import { 
  tenantUsers, 
  applications, 
  userApplicationPermissions, 
  organizationApplications,
  applicationModules 
} from '../db/schema/index.js';
import { eq, and, isNotNull } from 'drizzle-orm';

export class UserApplicationService {
  
  /**
   * Get all users with their application access
   * @param {string} tenantId - Organization/tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Users with application access details
   */
  async getUsersWithApplicationAccess(tenantId, options = {}) {
    const { 
      includeInactive = false, 
      appCode = null,
      includePermissionDetails = true 
    } = options;

    try {
      // Base query for users
      let userQuery = db
        .select({
          userId: tenantUsers.userId,
          kindeUserId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          avatar: tenantUsers.avatar,
          title: tenantUsers.title,
          department: tenantUsers.department,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          lastActiveAt: tenantUsers.lastActiveAt,
          lastLoginAt: tenantUsers.lastLoginAt,
          onboardingCompleted: tenantUsers.onboardingCompleted
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      if (!includeInactive) {
        userQuery = userQuery.where(
          and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.isActive, true)
          )
        );
      }

      const users = await userQuery;

      // Get application access for each user
      const usersWithAccess = await Promise.all(
        users.map(async (user) => {
          const applicationAccess = await this.getUserApplicationAccess(
            user.userId, 
            tenantId, 
            { appCode, includePermissionDetails }
          );

          return {
            ...user,
            applicationAccess,
            totalApplications: applicationAccess.length,
            hasAnyAccess: applicationAccess.length > 0
          };
        })
      );

      return usersWithAccess;
    } catch (error) {
      console.error('Error fetching users with application access:', error);
      throw error;
    }
  }

  /**
   * Get application access for a specific user
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's application access
   */
  async getUserApplicationAccess(userId, tenantId, options = {}) {
    const { appCode = null, includePermissionDetails = true } = options;

    try {
      let query = db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          status: applications.status,
          isCore: applications.isCore,
          permissionId: userApplicationPermissions.id,
          permissions: userApplicationPermissions.permissions,
          isActive: userApplicationPermissions.isActive,
          grantedAt: userApplicationPermissions.grantedAt,
          expiresAt: userApplicationPermissions.expiresAt,
          moduleId: userApplicationPermissions.moduleId
        })
        .from(userApplicationPermissions)
        .innerJoin(applications, eq(userApplicationPermissions.appId, applications.appId))
        .where(
          and(
            eq(userApplicationPermissions.userId, userId),
            eq(userApplicationPermissions.tenantId, tenantId),
            eq(userApplicationPermissions.isActive, true)
          )
        );

      if (appCode) {
        query = query.where(
          and(
            eq(userApplicationPermissions.userId, userId),
            eq(userApplicationPermissions.tenantId, tenantId),
            eq(userApplicationPermissions.isActive, true),
            eq(applications.appCode, appCode)
          )
        );
      }

      const accessRecords = await query;

      // Group by application and include module details if needed
      const groupedAccess = {};
      
      for (const record of accessRecords) {
        if (!groupedAccess[record.appCode]) {
          groupedAccess[record.appCode] = {
            appId: record.appId,
            appCode: record.appCode,
            appName: record.appName,
            description: record.description,
            icon: record.icon,
            baseUrl: record.baseUrl,
            status: record.status,
            isCore: record.isCore,
            modules: [],
            permissions: []
          };
        }

        if (includePermissionDetails && record.moduleId) {
          // Get module details
          const moduleDetails = await db
            .select()
            .from(applicationModules)
            .where(eq(applicationModules.moduleId, record.moduleId))
            .limit(1);

          if (moduleDetails.length > 0) {
            groupedAccess[record.appCode].modules.push({
              moduleId: record.moduleId,
              moduleCode: moduleDetails[0].moduleCode,
              moduleName: moduleDetails[0].moduleName,
              permissions: record.permissions,
              grantedAt: record.grantedAt,
              expiresAt: record.expiresAt
            });
          }
        }

        groupedAccess[record.appCode].permissions.push({
          permissionId: record.permissionId,
          permissions: record.permissions,
          grantedAt: record.grantedAt,
          expiresAt: record.expiresAt
        });
      }

      return Object.values(groupedAccess);
    } catch (error) {
      console.error('Error fetching user application access:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for application access
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Access statistics
   */
  async getApplicationAccessSummary(tenantId) {
    try {
      // Total users
      const totalUsers = await db
        .select({ count: tenantUsers.userId })
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.isActive, true)
          )
        );

      // Total applications enabled for organization
      const enabledApps = await db
        .select({ count: organizationApplications.appId })
        .from(organizationApplications)
        .where(
          and(
            eq(organizationApplications.tenantId, tenantId),
            eq(organizationApplications.isEnabled, true)
          )
        );

      // Users with any application access
      const usersWithAccess = await db
        .select({ userId: userApplicationPermissions.userId })
        .from(userApplicationPermissions)
        .where(
          and(
            eq(userApplicationPermissions.tenantId, tenantId),
            eq(userApplicationPermissions.isActive, true)
          )
        )
        .groupBy(userApplicationPermissions.userId);

      // Application usage statistics
      const appUsageStats = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          userCount: userApplicationPermissions.userId
        })
        .from(userApplicationPermissions)
        .innerJoin(applications, eq(userApplicationPermissions.appId, applications.appId))
        .where(
          and(
            eq(userApplicationPermissions.tenantId, tenantId),
            eq(userApplicationPermissions.isActive, true)
          )
        )
        .groupBy(applications.appId, applications.appCode, applications.appName);

      return {
        totalUsers: totalUsers.length,
        enabledApplications: enabledApps.length,
        usersWithAccess: usersWithAccess.length,
        usersWithoutAccess: totalUsers.length - usersWithAccess.length,
        applicationUsage: appUsageStats
      };
    } catch (error) {
      console.error('Error fetching application access summary:', error);
      throw error;
    }
  }

  /**
   * Sync users to external application
   * @param {string} tenantId - Tenant ID
   * @param {string} appCode - Application code
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncUsersToExternalApplication(tenantId, appCode, options = {}) {
    const { dryRun = false, userIds = null, forceSync = false } = options;

    try {
      console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Syncing users to ${appCode} for tenant ${tenantId}`);

      // Get users to sync
      let usersToSync;
      if (userIds && userIds.length > 0) {
        // Sync specific users
        usersToSync = [];
        for (const userId of userIds) {
          const userAccess = await this.getUserApplicationAccess(userId, tenantId, { appCode });
          if (userAccess.length > 0) {
            const user = await db
              .select()
              .from(tenantUsers)
              .where(eq(tenantUsers.userId, userId))
              .limit(1);
            if (user.length > 0) {
              usersToSync.push({ ...user[0], applicationAccess: userAccess });
            }
          }
        }
      } else {
        // Sync all users with access to this application
        const allUsers = await this.getUsersWithApplicationAccess(tenantId, { appCode });
        usersToSync = allUsers.filter(user => user.hasAnyAccess);
      }

      const syncResult = {
        appCode,
        tenantId,
        dryRun,
        totalUsersToSync: usersToSync.length,
        syncedUsers: [],
        failedUsers: [],
        skippedUsers: [],
        summary: {
          successful: 0,
          failed: 0,
          skipped: 0
        },
        timestamp: new Date().toISOString()
      };

      if (usersToSync.length === 0) {
        syncResult.message = 'No users found with access to this application';
        return syncResult;
      }

      if (dryRun) {
        syncResult.message = 'Dry run completed - no actual sync performed';
        syncResult.syncedUsers = usersToSync.map(user => ({
          userId: user.userId,
          email: user.email,
          name: user.name,
          status: 'would_sync'
        }));
        syncResult.summary.successful = usersToSync.length;
        return syncResult;
      }

      // Import UserSyncService dynamically to avoid circular dependencies
      const { UserSyncService } = await import('./user-sync-service.js');
      
      // Get tenant information
      const { tenants } = await import('../db/schema/tenants.js');
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Transform users to sync format
      const usersForSync = usersToSync.map(user => ({
        userId: user.userId,
        kindeUserId: user.kindeUserId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isActive: user.isActive,
        isTenantAdmin: user.isTenantAdmin,
        department: user.department,
        title: user.title,
        lastActiveAt: user.lastActiveAt,
        applicationAccess: user.applicationAccess,
        subscriptionTier: tenant.subscriptionStatus
      }));

      // Perform sync
      const appSyncResult = await UserSyncService.syncUsersToApplication(
        appCode,
        usersForSync,
        tenant,
        { syncType: forceSync ? 'force' : 'update' }
      );

      // Update sync result
      if (appSyncResult.success) {
        syncResult.syncedUsers = usersForSync.map(user => ({
          userId: user.userId,
          email: user.email,
          name: user.name,
          status: 'synced'
        }));
        syncResult.summary.successful = usersForSync.length;
        syncResult.message = `Successfully synced ${usersForSync.length} users to ${appCode}`;
      } else {
        syncResult.failedUsers = usersForSync.map(user => ({
          userId: user.userId,
          email: user.email,
          name: user.name,
          error: appSyncResult.error || 'Sync failed'
        }));
        syncResult.summary.failed = usersForSync.length;
        syncResult.message = `Failed to sync users to ${appCode}: ${appSyncResult.error}`;
      }

      syncResult.externalSyncResult = appSyncResult;

      console.log(`✅ Sync completed for ${appCode}: ${syncResult.summary.successful} successful, ${syncResult.summary.failed} failed`);
      return syncResult;

    } catch (error) {
      console.error(`❌ Error syncing users to ${appCode}:`, error);
      throw error;
    }
  }

  /**
   * Bulk sync all users to all their accessible applications
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Bulk sync results
   */
  async bulkSyncAllUsers(tenantId, options = {}) {
    const { dryRun = false } = options;

    try {
      console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Starting bulk sync for tenant ${tenantId}`);

      // Get organization's enabled applications
      const { organizationApplications } = await import('../db/schema/suite-schema.js');
      const enabledApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName
        })
        .from(applications)
        .innerJoin(
          organizationApplications,
          and(
            eq(organizationApplications.appId, applications.appId),
            eq(organizationApplications.tenantId, tenantId),
            eq(organizationApplications.isEnabled, true)
          )
        );

      const bulkResult = {
        tenantId,
        dryRun,
        totalApplications: enabledApps.length,
        applicationResults: {},
        summary: {
          totalUsers: 0,
          totalApplicationsProcessed: 0,
          successfulSyncs: 0,
          failedSyncs: 0
        },
        timestamp: new Date().toISOString()
      };

      // Sync users to each enabled application
      for (const app of enabledApps) {
        try {
          console.log(`📱 Processing application: ${app.appCode}`);
          
          const appSyncResult = await this.syncUsersToExternalApplication(
            tenantId,
            app.appCode,
            { dryRun }
          );

          bulkResult.applicationResults[app.appCode] = appSyncResult;
          bulkResult.summary.totalApplicationsProcessed++;
          
          if (appSyncResult.summary.successful > 0) {
            bulkResult.summary.successfulSyncs++;
          }
          if (appSyncResult.summary.failed > 0) {
            bulkResult.summary.failedSyncs++;
          }

        } catch (error) {
          console.error(`❌ Error syncing ${app.appCode}:`, error);
          bulkResult.applicationResults[app.appCode] = {
            appCode: app.appCode,
            error: error.message,
            summary: { successful: 0, failed: 1 }
          };
          bulkResult.summary.failedSyncs++;
        }
      }

      // Calculate total users
      bulkResult.summary.totalUsers = Object.values(bulkResult.applicationResults)
        .reduce((total, result) => total + (result.totalUsersToSync || 0), 0);

      bulkResult.message = dryRun 
        ? `Dry run completed for ${bulkResult.summary.totalApplicationsProcessed} applications`
        : `Bulk sync completed: ${bulkResult.summary.successfulSyncs} successful, ${bulkResult.summary.failedSyncs} failed`;

      console.log(`✅ Bulk sync completed:`, bulkResult.summary);
      return bulkResult;

    } catch (error) {
      console.error('❌ Error in bulk sync:', error);
      throw error;
    }
  }
}