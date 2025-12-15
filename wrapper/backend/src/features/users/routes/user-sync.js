import { UserClassificationService } from '../services/user-classification-service.js';
import { UserSyncService } from '../services/user-sync-service.js';
import { requirePermissions } from '../../../middleware/permission-middleware.js';

/**
 * 🔄 User Sync and Classification API Routes
 * 
 * These routes provide endpoints for user classification based on application access
 * and synchronization of users to their respective applications.
 */
export default async function userSyncRoutes(fastify, options) {

  // Get user classification by applications
  fastify.get('/classification', {
    // Add route debugging
    config: {
      routeId: 'user-classification'
    },
    preHandler: requirePermissions(['crm.system.users_read']),
    schema: {
      tags: ['User Management'],
      summary: 'Get user classification by application access',
      description: 'Returns all users classified by which applications they can access',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                summary: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'number' },
                    applicationBreakdown: { 
                      type: 'object',
                      additionalProperties: true
                    },
                    subscriptionBreakdown: { 
                      type: 'object',
                      additionalProperties: true
                    }
                  },
                  additionalProperties: true
                },
                byApplication: { 
                  type: 'object',
                  additionalProperties: true
                },
                byUser: { 
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🎯 CLASSIFICATION ENDPOINT CALLED!');
      console.log('📊 Request details:', {
        method: request.method,
        url: request.url,
        routeId: request.routeConfig?.routeId,
        headers: request.headers
      });
      
      const tenantId = request.userContext.tenantId;
      
      console.log('📊 API: Getting user classification for tenant:', tenantId);
      console.log('👤 API: User context:', {
        userId: request.userContext.userId,
        email: request.userContext.email,
        tenantId: request.userContext.tenantId,
        organizationName: request.userContext.organizationName
      });
      
      const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
      
      // Debug: Log what the service actually returned
      console.log('🔍 DEBUG: Service returned classification:', {
        hasSummary: !!classification.summary,
        summaryKeys: classification.summary ? Object.keys(classification.summary) : [],
        hasByApplication: !!classification.byApplication,
        byApplicationKeys: classification.byApplication ? Object.keys(classification.byApplication) : [],
        hasByUser: !!classification.byUser,
        byUserKeys: classification.byUser ? Object.keys(classification.byUser) : [],
        summaryContent: classification.summary,
        byApplicationContent: classification.byApplication,
        byUserContent: classification.byUser
      });
      
      // Clean the data to remove potential circular references
      const cleanClassification = {
        summary: {
          totalUsers: classification.summary.totalUsers,
          applicationBreakdown: classification.summary.applicationBreakdown,
          subscriptionBreakdown: classification.summary.subscriptionBreakdown
        },
        byApplication: {},
        byUser: {}
      };

      // Clean byApplication data
      console.log('🔍 DEBUG: Starting byApplication cleaning...');
      console.log('🔍 DEBUG: classification.byApplication keys:', Object.keys(classification.byApplication));
      
      Object.keys(classification.byApplication).forEach(appCode => {
        const appData = classification.byApplication[appCode];
        console.log(`🔍 DEBUG: Processing app ${appCode}:`, {
          hasAppData: !!appData,
          appDataKeys: appData ? Object.keys(appData) : [],
          hasAppInfo: !!appData?.appInfo,
          hasUsers: !!appData?.users,
          usersLength: appData?.users?.length || 0
        });
        
        // Test if we can serialize the users array
        let usersArray = [];
        try {
          if (appData.users && Array.isArray(appData.users)) {
            usersArray = appData.users.map(user => ({
              userId: user.userId,
              email: user.email || '',
              name: user.name || '',
              isTenantAdmin: user.isTenantAdmin || false
            }));
            console.log(`✅ DEBUG: Created users array for ${appCode}:`, usersArray.length, 'users');
          }
        } catch (error) {
          console.log(`⚠️ Error processing users for ${appCode}:`, error);
        }
        
        cleanClassification.byApplication[appCode] = {
          appCode: appData.appInfo.appCode,
          appName: appData.appInfo.appName,
          description: appData.appInfo.description,
          icon: appData.appInfo.icon,
          baseUrl: appData.appInfo.baseUrl,
          userCount: appData.totalUsers || appData.userCount || 0,
          totalUsers: appData.totalUsers || appData.userCount || 0,
          // Include cleaned user data for frontend processing
          users: usersArray
        };
        
        console.log(`✅ DEBUG: Added ${appCode} to cleanClassification.byApplication`);
      });
      
      console.log('🔍 DEBUG: After byApplication cleaning, keys:', Object.keys(cleanClassification.byApplication));

      // Clean byUser data
      Object.keys(classification.byUser).forEach(userId => {
        const userData = classification.byUser[userId];
        cleanClassification.byUser[userId] = {
          name: userData.name || '',
          email: userData.email || '',
          allowedApps: userData.allowedApplications || [],
          isTenantAdmin: userData.isTenantAdmin || false
        };
      });

      console.log('📊 API: Classification result summary:', {
        totalUsers: cleanClassification.summary.totalUsers,
        applicationBreakdown: cleanClassification.summary.applicationBreakdown,
        byApplicationKeys: Object.keys(cleanClassification.byApplication),
        byUserKeys: Object.keys(cleanClassification.byUser)
      });
      
      console.log('📊 API: Full classification object keys:', Object.keys(cleanClassification));
      console.log('📊 API: byApplication content:', cleanClassification.byApplication);
      console.log('📊 API: summary content:', cleanClassification.summary);

      const response = {
        success: true,
        data: cleanClassification,
        message: `Classified ${classification.summary.totalUsers} users across ${Object.keys(classification.byApplication).length} applications`
      };
      
      console.log('📊 API: Response being sent:', {
        success: response.success,
        dataKeys: Object.keys(response.data),
        message: response.message
      });
      
      console.log('📊 API: Response data details:', {
        summaryKeys: Object.keys(response.data.summary),
        byApplicationKeys: Object.keys(response.data.byApplication),
        byUserKeys: Object.keys(response.data.byUser)
      });
      
      console.log('📊 API: Response data content check:', {
        summaryHasData: !!response.data.summary.applicationBreakdown && Object.keys(response.data.summary.applicationBreakdown).length > 0,
        byApplicationHasData: !!response.data.byApplication && Object.keys(response.data.byApplication).length > 0,
        byUserHasData: !!response.data.byUser && Object.keys(response.data.byUser).length > 0
      });
      
      // Log the exact response being sent
      console.log('📊 API: FINAL RESPONSE BEING SENT:', JSON.stringify(response, null, 2));
      
      // Test if we can serialize the response
      try {
        const testSerialization = JSON.stringify(response);
        console.log('✅ Response serialization test passed, length:', testSerialization.length);
      } catch (error) {
        console.error('❌ Response serialization test failed:', error);
      }
      
      // Force explicit JSON serialization to prevent Fastify from cleaning the response
      console.log('📊 API: Sending response with explicit serialization...');
      
      // Add CORS headers to ensure the response isn't modified
      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .header('Access-Control-Allow-Origin', 'http://localhost:3001')
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        .send(response);
    } catch (error) {
      console.error('❌ Error getting user classification:', error);
      return reply.code(500).send({
        error: 'Failed to get user classification',
        message: error.message
      });
    }
  });

  // Test endpoint to debug response serialization
  fastify.get('/test-response', {
    schema: {
      tags: ['Debug'],
      summary: 'Test response serialization',
      description: 'Returns test data to debug response issues'
    }
  }, async (request, reply) => {
    const testData = {
      success: true,
      data: {
        summary: {
          totalUsers: 2,
          applicationBreakdown: { crm: 1, hr: 1 },
          subscriptionBreakdown: { professional: 2 }
        },
        byApplication: {
          crm: {
            appCode: 'crm',
            appName: 'Test CRM',
            users: [{ userId: 'test1', email: 'test@test.com' }]
          }
        },
        byUser: {
          test1: { name: 'Test User', email: 'test@test.com' }
        }
      },
      message: 'Test response'
    };
    
    console.log('🧪 TEST: Sending test response:', JSON.stringify(testData, null, 2));
    
    return reply
      .code(200)
      .header('Content-Type', 'application/json')
      .send(testData);
  });

  // Get users for a specific application
  fastify.get('/classification/:appCode', {
    preHandler: requirePermissions(['crm.system.users_read']),
    schema: {
      tags: ['User Management'],
      summary: 'Get users for a specific application',
      description: 'Returns users who have access to the specified application',
      params: {
        type: 'object',
        properties: {
          appCode: { 
            type: 'string', 
            enum: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
            description: 'Application code to get users for'
          }
        },
        required: ['appCode']
      }
    }
  }, async (request, reply) => {
    try {
      const { appCode } = request.params;
      const tenantId = request.userContext.tenantId;
      
      console.log(`📊 Getting users for application ${appCode} in tenant ${tenantId}`);
      
      const appUsers = await UserClassificationService.getUsersForApplication(tenantId, appCode);
      
      return {
        success: true,
        data: appUsers,
        message: `Found ${appUsers.totalUsers} users with access to ${appCode}`
      };
    } catch (error) {
      console.error('❌ Error getting users for application:', error);
      return reply.code(500).send({
        error: 'Failed to get users for application',
        message: error.message
      });
    }
  });

  // Get application access for a specific user
  fastify.get('/user/:userId/access', {
    preHandler: requirePermissions(['crm.system.users_read']),
    schema: {
      tags: ['User Management'],
      summary: 'Get application access for a specific user',
      description: 'Returns the applications a specific user has access to',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to check access for' }
        },
        required: ['userId']
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;
      
      console.log(`📊 Getting application access for user ${userId}`);
      
      const userAccess = await UserClassificationService.getUserApplicationAccess(userId, tenantId);
      
      if (!userAccess) {
        return reply.code(404).send({
          error: 'User not found',
          message: 'User not found or has no application access'
        });
      }
      
      return {
        success: true,
        data: userAccess,
        message: `User has access to ${userAccess.allowedApplications.length} applications`
      };
    } catch (error) {
      console.error('❌ Error getting user application access:', error);
      return reply.code(500).send({
        error: 'Failed to get user application access',
        message: error.message
      });
    }
  });

  // Sync all users to their respective applications
  fastify.post('/sync/all', {
    preHandler: requirePermissions(['crm.system.users_update']),
    schema: {
      tags: ['User Sync'],
      summary: 'Sync all users to their respective applications',
      description: 'Synchronizes all tenant users to the applications they have access to',
      body: {
        type: 'object',
        properties: {
          syncType: { 
            type: 'string', 
            enum: ['full', 'incremental'], 
            default: 'full',
            description: 'Type of sync to perform'
          },
          dryRun: { 
            type: 'boolean', 
            default: false,
            description: 'If true, shows what would be synced without actually syncing'
          },
          forceUpdate: { 
            type: 'boolean', 
            default: false,
            description: 'Force update existing users (useful for orgCode changes)'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;
      const { syncType = 'full', dryRun = false, forceUpdate = false } = request.body || {};
      const providedOrgCode = (request.body || {}).orgCode;
      const effectiveOrgCode = providedOrgCode || request.userContext?.kindeOrgId || null;
      
      console.log(`🔄 Starting ${dryRun ? 'dry run ' : ''}sync for tenant ${tenantId}`);
      if (!providedOrgCode && effectiveOrgCode) {
        console.log('🏢 Using orgCode from userContext.kindeOrgId:', effectiveOrgCode);
      }
      
      if (dryRun) {
        // For dry run, just return classification without syncing
        const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
        return {
          success: true,
          dryRun: true,
          data: {
            wouldSync: classification.summary,
            applicationBreakdown: classification.summary.applicationBreakdown
          },
          message: 'Dry run completed - no actual sync performed'
        };
      }
      
      const syncResults = await UserSyncService.syncAllUsersForTenant(tenantId, { syncType, orgCodeOverride: effectiveOrgCode, forceUpdate });
      
      return {
        success: true,
        data: syncResults,
        message: `Sync completed: ${syncResults.summary.successfulSyncs} successful, ${syncResults.summary.failedSyncs} failed`
      };
    } catch (error) {
      console.error('❌ Error syncing all users:', error);
      return reply.code(500).send({
        error: 'Failed to sync users',
        message: error.message
      });
    }
  });

  // Sync users for a specific application
  fastify.post('/sync/application/:appCode', {
    preHandler: requirePermissions(['crm.system.users_update']),
    schema: {
      tags: ['User Sync'],
      summary: 'Sync users for a specific application',
      description: 'Synchronizes users who have access to the specified application',
      params: {
        type: 'object',
        properties: {
          appCode: { 
            type: 'string', 
            enum: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
            description: 'Application code to sync users for'
          }
        },
        required: ['appCode']
      },
      body: {
        type: 'object',
        properties: {
          syncType: { 
            type: 'string', 
            enum: ['full', 'incremental'], 
            default: 'full'
          },
          orgCode: { type: 'string', description: 'Optional override for organization code (tenant) to sync into' },
          forceUpdate: { type: 'boolean', description: 'Force update existing users (useful for orgCode changes)', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { appCode } = request.params;
      const tenantId = request.userContext.tenantId;
      const { syncType = 'full', orgCode, forceUpdate = false } = request.body || {};
      const effectiveOrgCode = orgCode || request.userContext?.kindeOrgId || null;
      
      console.log(`🔄 Syncing users for application ${appCode}`);
      if (!orgCode && effectiveOrgCode) {
        console.log('🏢 Using orgCode from userContext.kindeOrgId:', effectiveOrgCode);
      }
      
      const syncResult = await UserSyncService.syncUsersForApplication(tenantId, appCode, { syncType, orgCodeOverride: effectiveOrgCode, forceUpdate });
      
      return {
        success: true,
        data: syncResult,
        message: syncResult.skipped 
          ? `No users to sync for ${appCode}` 
          : `Successfully synced ${syncResult.userCount || 0} users to ${appCode}`
      };
    } catch (error) {
      console.error('❌ Error syncing users for application:', error);
      return reply.code(500).send({
        error: 'Failed to sync users for application',
        message: error.message
      });
    }
  });

  // Sync a specific user to their allowed applications
  fastify.post('/sync/user/:userId', {
    preHandler: requirePermissions(['crm.system.users_update']),
    schema: {
      tags: ['User Sync'],
      summary: 'Sync a specific user to their applications',
      description: 'Synchronizes a specific user to all applications they have access to',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to sync' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          syncType: { 
            type: 'string', 
            enum: ['full', 'update'], 
            default: 'update'
          },
          orgCode: { type: 'string', description: 'Optional override for organization code (tenant) to sync into' },
          forceUpdate: { type: 'boolean', description: 'Force update existing users (useful for orgCode changes)', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;
      const { syncType = 'update', orgCode, forceUpdate = false } = request.body || {};
      const effectiveOrgCode = orgCode || request.userContext?.kindeOrgId || null;
      
      console.log(`🔄 Syncing user ${userId} to applications`);
      if (!orgCode && effectiveOrgCode) {
        console.log('🏢 Using orgCode from userContext.kindeOrgId:', effectiveOrgCode);
      }
      
      const syncResults = await UserSyncService.syncUserToApplications(userId, tenantId, { syncType, orgCodeOverride: effectiveOrgCode, forceUpdate });
      
      return {
        success: true,
        data: syncResults,
        message: `User synced to ${syncResults.summary.successfulSyncs} applications`
      };
    } catch (error) {
      console.error('❌ Error syncing user to applications:', error);
      return reply.code(500).send({
        error: 'Failed to sync user to applications',
        message: error.message
      });
    }
  });

  // Refresh user classification (when roles change)
  fastify.post('/refresh/:userId', {
    preHandler: requirePermissions(['crm.system.users_update']),
    schema: {
      tags: ['User Management'],
      summary: 'Refresh user classification after role changes',
      description: 'Refreshes a users application access classification after role or permission changes',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to refresh classification for' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          autoSync: { 
            type: 'boolean', 
            default: true,
            description: 'Whether to automatically sync user after refreshing classification'
          },
          previousApps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Previous applications user had access to (for removal sync)'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;
      const { autoSync = true, previousApps = [] } = request.body || {};
      
      console.log(`🔄 Refreshing classification for user ${userId}`);
      
      // Refresh user classification
      const userClassification = await UserClassificationService.refreshUserClassification(userId, tenantId);
      
      if (!userClassification) {
        return reply.code(404).send({
          error: 'User not found',
          message: 'User not found in tenant'
        });
      }

      const result = {
        success: true,
        data: {
          userClassification,
          syncResults: null,
          removalResults: null
        },
        message: 'User classification refreshed'
      };

      if (autoSync) {
        console.log('🔄 Auto-syncing user after classification refresh');
        
        // Sync user to their current applications
        const syncResults = await UserSyncService.syncUserToApplications(userId, tenantId, { syncType: 'update' });
        result.data.syncResults = syncResults;
        
        // Remove user from applications they no longer have access to
        const currentApps = userClassification.allowedApplications;
        const removedApps = previousApps.filter(app => !currentApps.includes(app));
        
        if (removedApps.length > 0) {
          console.log(`🗑️ Removing user from ${removedApps.length} applications`);
          const removalResults = await UserSyncService.removeUserFromApplications(userId, tenantId, removedApps);
          result.data.removalResults = removalResults;
        }
        
        result.message = `User classification refreshed and synced to ${syncResults.summary.successfulSyncs} applications`;
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error refreshing user classification:', error);
      return reply.code(500).send({
        error: 'Failed to refresh user classification',
        message: error.message
      });
    }
  });

  // Get sync status for the tenant
  fastify.get('/status', {
    // Add route debugging
    config: {
      routeId: 'user-sync-status'
    },
    preHandler: requirePermissions(['crm.system.users_read']),
    schema: {
      tags: ['User Sync'],
      summary: 'Get sync status for tenant',
      description: 'Returns the current sync status and configuration for the tenant',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                lastClassified: { type: 'string' },
                summary: { type: 'object' },
                applicationStatus: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🎯 STATUS ENDPOINT CALLED!');
      console.log('📊 Request details:', {
        method: request.method,
        url: request.url,
        routeId: request.routeConfig?.routeId,
        headers: request.headers
      });
      
      const tenantId = request.userContext.tenantId;
      
      console.log(`📊 Getting sync status for tenant ${tenantId}`);
      
      const status = await UserSyncService.getSyncStatus(tenantId);
      
      return {
        success: true,
        data: status,
        message: 'Sync status retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      return reply.code(500).send({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  // Test sync connectivity to applications
  fastify.post('/test-connectivity', {
    preHandler: requirePermissions(['crm.system.settings_read']),
    schema: {
      tags: ['User Sync'],
      summary: 'Test connectivity to applications',
      description: 'Tests connectivity to all configured applications to verify sync setup',
      body: {
        type: 'object',
        properties: {
          applications: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific applications to test (if not provided, tests all)'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { applications } = request.body || {};
      const appsToTest = applications || Object.keys(UserSyncService.APP_URLS);
      
      console.log(`🔧 Testing connectivity to applications:`, appsToTest);
      
      const connectivityResults = {
        tested: appsToTest,
        results: {},
        summary: {
          total: appsToTest.length,
          available: 0,
          unavailable: 0,
          errors: 0
        }
      };

      // Test each application
      for (const appCode of appsToTest) {
        const appUrl = UserSyncService.APP_URLS[appCode];
        
        if (!appUrl) {
          connectivityResults.results[appCode] = {
            configured: false,
            error: 'Application URL not configured'
          };
          connectivityResults.summary.errors++;
          continue;
        }

        try {
          // Test with a simple health check or ping
          const testUrl = `${appUrl}/api/internal/health`;
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'X-Internal-API-Key': UserSyncService.INTERNAL_API_KEY
            },
            timeout: 5000
          });

          connectivityResults.results[appCode] = {
            configured: true,
            url: appUrl,
            available: response.ok,
            statusCode: response.status,
            responseTime: `${Date.now()}ms` // Simplified
          };

          if (response.ok) {
            connectivityResults.summary.available++;
          } else {
            connectivityResults.summary.unavailable++;
          }

        } catch (error) {
          connectivityResults.results[appCode] = {
            configured: true,
            url: appUrl,
            available: false,
            error: error.message
          };
          connectivityResults.summary.unavailable++;
        }
      }
      
      return {
        success: true,
        data: connectivityResults,
        message: `Tested ${connectivityResults.summary.total} applications: ${connectivityResults.summary.available} available, ${connectivityResults.summary.unavailable} unavailable`
      };
    } catch (error) {
      console.error('❌ Error testing connectivity:', error);
      return reply.code(500).send({
        error: 'Failed to test connectivity',
        message: error.message
      });
    }
  });
}
