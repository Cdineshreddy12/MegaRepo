/**
 * 🚀 **PERMISSION SYNC API ROUTES**
 * API endpoints for automatic permission sync and management
 */

import AutoPermissionSyncService from '../services/permission-sync-service.js';
import { customRoleService as CustomRoleService } from '../features/roles/index.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

export default async function permissionSyncRoutes(fastify, options) {
  
  /**
   * 🔄 **FULL PERMISSION SYNC WITH AUTO-UPDATES**
   * Syncs permissions and automatically updates all organizations
   */
  fastify.post('/sync', {
    preHandler: [authenticateToken, requirePermission('system:admin')]
  }, async (request, reply) => {
    try {
      console.log('🚀 API: Starting full permission sync with auto-updates...');
      
      const result = await AutoPermissionSyncService.syncPermissionsWithAutoUpdate();
      
      return {
        success: true,
        message: 'Permission sync completed successfully',
        data: result
      };
      
    } catch (error) {
      console.error('❌ API: Permission sync failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Permission sync failed',
        details: error.message
      });
    }
  });
  
  /**
   * 🔄 **UPDATE ORGANIZATION ACCESS**
   * Update a specific organization's access based on subscription tier
   */
  fastify.post('/update-organization-access', {
    preHandler: [authenticateToken, requirePermission('system:admin')]
  }, async (request, reply) => {
    try {
      const { tenantId, subscriptionTier } = request.body;
      
      if (!tenantId || !subscriptionTier) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: tenantId, subscriptionTier'
        });
      }
      
      console.log(`🔄 API: Updating organization access for ${tenantId} to ${subscriptionTier}`);
      
      await CustomRoleService.updateOrganizationAccess(tenantId, subscriptionTier);
      
      return {
        success: true,
        message: `Organization access updated to ${subscriptionTier} tier`,
        data: { tenantId, subscriptionTier }
      };
      
    } catch (error) {
      console.error('❌ API: Organization access update failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update organization access',
        details: error.message
      });
    }
  });
  
  /**
   * 🔄 **HANDLE SUBSCRIPTION TIER CHANGE**
   * Called when an organization's subscription tier changes
   */
  fastify.post('/subscription-tier-change', {
    preHandler: [authenticateToken, requirePermission('system:admin')]
  }, async (request, reply) => {
    try {
      const { tenantId, newTier, oldTier } = request.body;
      
      if (!tenantId || !newTier) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: tenantId, newTier'
        });
      }
      
      console.log(`🔄 API: Handling subscription tier change for ${tenantId}: ${oldTier} → ${newTier}`);
      
      const result = await AutoPermissionSyncService.handleSubscriptionTierChange(
        tenantId, 
        newTier, 
        oldTier
      );
      
      return {
        success: true,
        message: `Subscription tier updated from ${oldTier} to ${newTier}`,
        data: result
      };
      
    } catch (error) {
      console.error('❌ API: Subscription tier change failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to handle subscription tier change',
        details: error.message
      });
    }
  });
  
  /**
   * 📊 **GET PERMISSION TIER CONFIGURATION**
   * Returns the current permission tier configuration
   */
  fastify.get('/tier-configuration', {
    preHandler: [authenticateToken, requirePermission('system:admin')]
  }, async (request, reply) => {
    try {
      const { PERMISSION_TIERS } = await import('../config/permission-tiers.js');
      
      return {
        success: true,
        message: 'Permission tier configuration retrieved',
        data: {
          tiers: PERMISSION_TIERS,
          totalTiers: Object.keys(PERMISSION_TIERS).length
        }
      };
      
    } catch (error) {
      console.error('❌ API: Failed to get tier configuration:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get tier configuration',
        details: error.message
      });
    }
  });
  
  /**
   * 🔍 **CHECK MODULE ACCESSIBILITY**
   * Check if a module is accessible for a given subscription tier
   */
  fastify.get('/check-module-access', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { appCode, moduleCode, subscriptionTier } = request.query;
      
      if (!appCode || !moduleCode || !subscriptionTier) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required query parameters: appCode, moduleCode, subscriptionTier'
        });
      }
      
      const { isModuleAccessible } = await import('../config/permission-tiers.js');
      const isAccessible = isModuleAccessible(appCode, moduleCode, subscriptionTier);
      
      return {
        success: true,
        message: 'Module accessibility checked',
        data: {
          appCode,
          moduleCode,
          subscriptionTier,
          isAccessible,
          accessLevel: isAccessible ? 'allowed' : 'denied'
        }
      };
      
    } catch (error) {
      console.error('❌ API: Module access check failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to check module access',
        details: error.message
      });
    }
  });
  
  /**
   * 🧹 **CLEAR PERMISSION CACHES**
   * Clear permission-related caches
   */
  fastify.post('/clear-caches', {
    preHandler: [authenticateToken, requirePermission('system:admin')]
  }, async (request, reply) => {
    try {
      console.log('🧹 API: Clearing permission caches...');
      
      const result = await AutoPermissionSyncService.clearPermissionCaches();
      
      return {
        success: true,
        message: 'Permission caches cleared successfully',
        data: result
      };
      
    } catch (error) {
      console.error('❌ API: Cache clearing failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to clear caches',
        details: error.message
      });
    }
  });
  
  /**
   * ⏰ **RUN SCHEDULED SYNC**
   * Endpoint for scheduled permission sync (cron jobs)
   */
  fastify.post('/scheduled-sync', {
    // No auth required for scheduled jobs - should be called internally or with API key
  }, async (request, reply) => {
    try {
      const { apiKey } = request.headers;
      
      // Simple API key check (in production, use proper authentication)
      if (apiKey !== process.env.SYNC_API_KEY) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid API key for scheduled sync'
        });
      }
      
      console.log('⏰ API: Running scheduled permission sync...');
      
      const result = await AutoPermissionSyncService.runScheduledSync();
      
      return {
        success: true,
        message: 'Scheduled permission sync completed',
        data: result
      };
      
    } catch (error) {
      console.error('❌ API: Scheduled sync failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Scheduled sync failed',
        details: error.message
      });
    }
  });
}
