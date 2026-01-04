// =============================================================================
// TENANT SYNC API ROUTES
// Manual sync triggering, monitoring, and management
// Uses Temporal workflows for reliable sync execution
// =============================================================================

import express from 'express';
import syncOrchestrationService from '../../services/syncOrchestrationService.js';
import syncMetricsService from '../../services/syncMetricsService.js';
import TenantSyncStatus from '../../models/TenantSyncStatus.js';
import auth from '../../middleware/auth.js';
import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../../temporal-shared/client.js';

const router = express.Router();

/**
 * @route   POST /api/sync/tenants/:tenantId/trigger
 * @desc    Trigger manual sync for a tenant using Temporal workflow
 * @access  Private (requires auth token)
 */
router.post('/tenants/:tenantId/trigger', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const { skipReferenceData = false } = req.query;

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    console.log(`📡 API: Manual sync triggered for tenant ${tenantId}`);

    // Use Temporal workflow if enabled, otherwise fall back to direct sync
    if (TEMPORAL_CONFIG.enabled) {
      try {
        const temporalClient = await getTemporalClient();
        const workflowId = `tenant-sync-${tenantId}-${Date.now()}`;
        
        const handle = await temporalClient.workflow.start('tenantSyncWorkflow', {
          args: [{
            tenantId,
            authToken,
            options: {
              forceSync: false,
              skipReferenceData: skipReferenceData === 'true',
            },
          }],
          taskQueue: getTaskQueue('CRM'),
          workflowId,
          workflowExecutionTimeout: '1h',
          workflowTaskTimeout: '10s',
          workflowIdReusePolicy: 'ALLOW_DUPLICATE',
        });

        console.log(`✅ Started Temporal workflow for tenant sync: ${workflowId}`);

        res.json({
          success: true,
          message: 'Sync workflow started successfully',
          data: {
            workflowId: handle.workflowId,
            runId: handle.firstExecutionRunId,
            tenantId,
          },
        });
      } catch (temporalError) {
        console.error('❌ Failed to start Temporal workflow:', temporalError);
        // Fall back to direct sync if Temporal fails
        console.log('🔄 Falling back to direct sync...');
        const result = await syncOrchestrationService.syncTenant(tenantId, authToken);
        res.json({
          success: result.success,
          message: result.success ? 'Sync started successfully (direct)' : 'Sync failed',
          data: result,
        });
      }
    } else {
      // Temporal disabled, use direct sync
      const result = await syncOrchestrationService.syncTenant(tenantId, authToken);
      res.json({
        success: result.success,
        message: result.success ? 'Sync started successfully' : 'Sync failed',
        data: result,
      });
    }

  } catch (error) {
    console.error('❌ Sync trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger sync',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sync/tenants/:tenantId/force
 * @desc    Force sync for a tenant (ignores idempotency) using Temporal workflow
 * @access  Private (requires auth token + admin)
 */
router.post('/tenants/:tenantId/force', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const { skipReferenceData = false } = req.query;

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    console.log(`⚠️  API: Force sync triggered for tenant ${tenantId}`);

    // Use Temporal workflow if enabled, otherwise fall back to direct sync
    if (TEMPORAL_CONFIG.enabled) {
      try {
        const temporalClient = await getTemporalClient();
        const workflowId = `tenant-sync-force-${tenantId}-${Date.now()}`;
        
        const handle = await temporalClient.workflow.start('tenantSyncWorkflow', {
          args: [{
            tenantId,
            authToken,
            options: {
              forceSync: true, // Force sync ignores idempotency
              skipReferenceData: skipReferenceData === 'true',
            },
          }],
          taskQueue: getTaskQueue('CRM'),
          workflowId,
          workflowExecutionTimeout: '1h',
          workflowTaskTimeout: '10s',
          workflowIdReusePolicy: 'ALLOW_DUPLICATE',
        });

        console.log(`✅ Started Temporal workflow for force sync: ${workflowId}`);

        res.json({
          success: true,
          message: 'Force sync workflow started successfully',
          data: {
            workflowId: handle.workflowId,
            runId: handle.firstExecutionRunId,
            tenantId,
          },
        });
      } catch (temporalError) {
        console.error('❌ Failed to start Temporal workflow:', temporalError);
        // Fall back to direct sync if Temporal fails
        console.log('🔄 Falling back to direct sync...');
        const result = await syncOrchestrationService.forceSyncTenant(tenantId, authToken);
        res.json({
          success: result.success,
          message: result.success ? 'Force sync started successfully (direct)' : 'Force sync failed',
          data: result,
        });
      }
    } else {
      // Temporal disabled, use direct sync
      const result = await syncOrchestrationService.forceSyncTenant(tenantId, authToken);
      res.json({
        success: result.success,
        message: result.success ? 'Force sync started successfully' : 'Force sync failed',
        data: result,
      });
    }

  } catch (error) {
    console.error('❌ Force sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger force sync',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/tenants/:tenantId/status
 * @desc    Get sync status for a tenant with enhanced metrics
 * @access  Private (requires auth token)
 */
router.get('/tenants/:tenantId/status', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const status = await syncOrchestrationService.getSyncStatus(tenantId);
    
    // Add sync method information if available
    const syncStatus = await TenantSyncStatus.findOne({ tenantId });
    const enhancedStatus = {
      ...status,
      syncMethod: syncStatus?.metadata?.syncMethod || 'direct',
      hasFailedCollections: syncStatus?.hasFailedCollections() || false,
      failedCollections: syncStatus?.getFailedCollections() || []
    };

    res.json({
      success: true,
      data: enhancedStatus
    });

  } catch (error) {
    console.error('❌ Get sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/tenants/:tenantId/progress
 * @desc    Get sync progress for a tenant
 * @access  Private (requires auth token)
 */
router.get('/tenants/:tenantId/progress', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const progress = await syncOrchestrationService.getSyncProgress(tenantId);

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('❌ Get sync progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync progress',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/sync/tenants/:tenantId/lock
 * @desc    Release stuck sync lock (admin operation)
 * @access  Private (requires auth token + admin)
 */
router.delete('/tenants/:tenantId/lock', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // TODO: Add admin check
    // if (!req.user.isTenantAdmin) {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }

    console.log(`🔓 API: Releasing stuck lock for tenant ${tenantId}`);

    const result = await syncOrchestrationService.releaseStuckLock(tenantId);

    res.json({
      success: result.success,
      message: result.success ? 'Lock released successfully' : result.error,
      data: result
    });

  } catch (error) {
    console.error('❌ Release lock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release lock',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sync/cleanup
 * @desc    Cleanup stuck syncs (admin operation)
 * @access  Private (requires auth token + admin)
 */
router.post('/cleanup', auth, async (req, res) => {
  try {
    // TODO: Add admin check
    // if (!req.user.isTenantAdmin) {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }

    console.log('🧹 API: Cleaning up stuck syncs');

    const result = await syncOrchestrationService.cleanupStuckSyncs();

    res.json({
      success: true,
      message: `Cleaned up ${result.cleanedCount} stuck syncs`,
      data: result
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup stuck syncs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/statistics
 * @desc    Get sync statistics (admin operation)
 * @access  Private (requires auth token + admin)
 */
router.get('/statistics', auth, async (req, res) => {
  try {
    // TODO: Add admin check
    // if (!req.user.isTenantAdmin) {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }

    const stats = await syncOrchestrationService.getSyncStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/all
 * @desc    Get all sync statuses (admin operation)
 * @access  Private (requires auth token + admin)
 */
router.get('/all', auth, async (req, res) => {
  try {
    // TODO: Add admin check
    // if (!req.user.isTenantAdmin) {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }

    const { status } = req.query;
    const filter = status ? { status } : {};

    const syncStatuses = await syncOrchestrationService.getAllSyncStatuses(filter);

    res.json({
      success: true,
      count: syncStatuses.length,
      data: syncStatuses
    });

  } catch (error) {
    console.error('❌ Get all sync statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync statuses',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/needs-sync/:tenantId
 * @desc    Check if tenant needs sync
 * @access  Private (requires auth token)
 */
router.get('/needs-sync/:tenantId', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const needsSync = await syncOrchestrationService.needsSync(tenantId);

    res.json({
      success: true,
      data: {
        tenantId,
        needsSync
      }
    });

  } catch (error) {
    console.error('❌ Check needs sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check if sync is needed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/metrics
 * @desc    Get comprehensive sync metrics
 * @access  Private (requires auth token)
 */
router.get('/metrics', auth, async (req, res) => {
  try {
    const metrics = await syncMetricsService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/health
 * @desc    Get sync health status
 * @access  Private (requires auth token)
 */
router.get('/health', auth, async (req, res) => {
  try {
    const health = await syncMetricsService.getHealthStatus();

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('❌ Get health status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync health status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/method-stats
 * @desc    Get sync method statistics (direct vs Temporal)
 * @access  Private (requires auth token)
 */
router.get('/method-stats', auth, async (req, res) => {
  try {
    const stats = await syncMetricsService.getSyncMethodStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get method stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync method statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/consumer/health
 * @desc    Get consumer health status including circuit breaker state
 * @access  Private (requires auth token)
 */
router.get('/consumer/health', auth, async (req, res) => {
  try {
    // Note: Consumer manager may not be available if consumer is running separately
    // This endpoint provides circuit breaker status if available
    return res.json({
      success: true,
      message: 'Consumer health check - circuit breaker status available via reset endpoint',
      note: 'If consumer is running separately, circuit breaker state is managed in that process',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting consumer health:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sync/consumer/reset-circuit-breaker
 * @desc    Reset MongoDB circuit breaker to allow event processing
 * @access  Private (requires auth token)
 * @note    This endpoint provides instructions. Circuit breaker must be reset in the consumer process.
 */
router.post('/consumer/reset-circuit-breaker', auth, async (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Circuit breaker reset instructions',
      instructions: [
        '1. The circuit breaker is managed in the consumer process (crm-consumer-runner.js)',
        '2. To reset: Restart the consumer process or wait for automatic recovery (60s timeout)',
        '3. The circuit breaker will automatically transition from OPEN to HALF_OPEN after resetTimeout',
        '4. After 2 successful operations in HALF_OPEN, it will transition to CLOSED',
        '5. Check consumer logs for circuit breaker state transitions'
      ],
      automaticRecovery: {
        resetTimeout: '60 seconds',
        halfOpenSuccessThreshold: 2,
        message: 'Circuit breaker will automatically attempt recovery after 60 seconds'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error resetting circuit breaker:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

