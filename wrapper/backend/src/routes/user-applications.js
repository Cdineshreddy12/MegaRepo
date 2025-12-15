/**
 * 🔐 **USER APPLICATION ACCESS ROUTES**
 * API endpoints for managing user application access and external sync
 */

import { UserClassificationService, UserSyncService } from '../features/users/index.js';

export default async function userApplicationRoutes(fastify, options) {
  
  /**
   * GET /api/user-applications/users
   * Get all users with their application access
   */
  fastify.get('/users', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'boolean', default: false },
          appCode: { type: 'string' },
          includePermissionDetails: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const options = request.query;

      // Use the working classification service instead
      const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
      
      // Transform to match expected format
      const users = Object.entries(classification.byUser).map(([userId, userData]) => ({
        userId,
        kindeUserId: userData.kindeUserId,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        title: userData.title,
        department: userData.department,
        isActive: userData.isActive,
        isTenantAdmin: userData.isTenantAdmin,
        lastActiveAt: userData.lastActiveAt,
        lastLoginAt: userData.lastLoginAt,
        onboardingCompleted: userData.onboardingCompleted,
        applicationAccess: userData.allowedApplications.map(appCode => ({
          appId: appCode,
          appCode,
          appName: UserClassificationService.getAppName(appCode),
          description: UserClassificationService.getAppDescription(appCode),
          icon: UserClassificationService.getAppIcon(appCode),
          baseUrl: UserClassificationService.getAppUrl(appCode),
          status: 'active',
          isCore: true,
          modules: [],
          permissions: []
        })),
        totalApplications: userData.allowedApplications.length,
        hasAnyAccess: userData.allowedApplications.length > 0
      }));

      return {
        success: true,
        data: users,
        meta: {
          total: users.length,
          usersWithAccess: users.filter(u => u.hasAnyAccess).length,
          usersWithoutAccess: users.filter(u => !u.hasAnyAccess).length
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching users with application access:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch users with application access'
      });
    }
  });

  /**
   * GET /api/user-applications/users/:userId
   * Get specific user's application access
   */
  fastify.get('/users/:userId', async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { userId } = request.params;
      const { appCode, includePermissionDetails = true } = request.query;

      // Use the working classification service
      const userAccess = await UserClassificationService.getUserApplicationAccess(userId, tenantId);
      
      if (!userAccess) {
        return reply.status(404).send({
          success: false,
          error: 'User not found or has no application access'
        });
      }

      // Transform to match expected format
      const applicationAccess = userAccess.allowedApplications.map(appCode => ({
        appId: appCode,
        appCode,
        appName: UserClassificationService.getAppName(appCode),
        description: UserClassificationService.getAppDescription(appCode),
        icon: UserClassificationService.getAppIcon(appCode),
        baseUrl: UserClassificationService.getAppUrl(appCode),
        status: 'active',
        isCore: true,
        modules: [],
        permissions: []
      }));

      return {
        success: true,
        data: {
          userId,
          applicationAccess,
          totalApplications: applicationAccess.length
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching user application access:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch user application access'
      });
    }
  });

  /**
   * GET /api/user-applications/summary
   * Get application access summary statistics
   */
  fastify.get('/summary', async (request, reply) => {
    try {
      const { tenantId } = request.userContext;

      // Use the working classification service
      const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
      
      const summary = {
        totalUsers: classification.summary.totalUsers,
        enabledApplications: Object.keys(classification.byApplication).length,
        usersWithAccess: Object.values(classification.byUser).filter(user => user.allowedApplications.length > 0).length,
        usersWithoutAccess: Object.values(classification.byUser).filter(user => user.allowedApplications.length === 0).length,
        applicationUsage: Object.entries(classification.byApplication).map(([appCode, appData]) => ({
          appId: appCode,
          appCode,
          appName: UserClassificationService.getAppName(appCode),
          userCount: appData.totalUsers
        }))
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      fastify.log.error('Error fetching application access summary:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch application access summary'
      });
    }
  });

  /**
   * POST /api/user-applications/sync/:appCode
   * Sync users to specific external application
   */
  fastify.post('/sync/:appCode', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appCode: { type: 'string' }
        },
        required: ['appCode']
      },
      body: {
        type: 'object',
        properties: {
          dryRun: { type: 'boolean', default: false },
          userIds: { 
            type: 'array', 
            items: { type: 'string' } 
          },
          forceSync: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { appCode } = request.params;
      const options = request.body || {};

      // Use the working sync service directly
      const syncResults = await UserSyncService.syncUsersForApplication(
        tenantId, 
        appCode, 
        { 
          syncType: options.forceSync ? 'full' : 'incremental',
          dryRun: options.dryRun
        }
      );

      return {
        success: true,
        data: syncResults
      };
    } catch (error) {
      fastify.log.error(`Error syncing users to ${request.params.appCode}:`, error);
      return reply.status(500).send({
        success: false,
        error: `Failed to sync users to ${request.params.appCode}`,
        details: error.message
      });
    }
  });

  /**
   * POST /api/user-applications/sync/bulk
   * Bulk sync all users to all their accessible applications
   */
  fastify.post('/sync/bulk', {
    schema: {
      body: {
        type: 'object',
        properties: {
          dryRun: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { dryRun = false } = request.body || {};

      // Use the working sync service directly
      const bulkResults = await UserSyncService.syncAllUsersForTenant(tenantId, { 
        syncType: 'full',
        dryRun 
      });

      return {
        success: true,
        data: bulkResults
      };
    } catch (error) {
      fastify.log.error('Error in bulk sync:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to perform bulk sync',
        details: error.message
      });
    }
  });

  /**
   * POST /api/user-applications/sync/user/:userId
   * Sync specific user to all their accessible applications
   */
  fastify.post('/sync/user/:userId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          dryRun: { type: 'boolean', default: false },
          appCodes: { 
            type: 'array', 
            items: { type: 'string' } 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { userId } = request.params;
      const { dryRun = false, appCodes = null } = request.body || {};

      // Use the working sync service directly
      const syncResults = await UserSyncService.syncUserToApplications(
        userId, 
        tenantId, 
        { 
          syncType: 'update',
          dryRun 
        }
      );

      return {
        success: true,
        data: syncResults
      };
    } catch (error) {
      fastify.log.error(`Error syncing user ${request.params.userId}:`, error);
      return reply.status(500).send({
        success: false,
        error: `Failed to sync user ${request.params.userId}`,
        details: error.message
      });
    }
  });
}