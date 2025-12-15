// =============================================================================
// TENANT SYNC API ROUTES
// Manual sync triggering, monitoring, and management
// =============================================================================

import express from 'express';
import syncOrchestrationService from '../../services/syncOrchestrationService.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/sync/tenants/:tenantId/trigger
 * @desc    Trigger manual sync for a tenant
 * @access  Private (requires auth token)
 */
router.post('/tenants/:tenantId/trigger', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    console.log(`📡 API: Manual sync triggered for tenant ${tenantId}`);

    // Trigger sync
    const result = await syncOrchestrationService.syncTenant(tenantId, authToken);

    res.json({
      success: result.success,
      message: result.success ? 'Sync started successfully' : 'Sync failed',
      data: result
    });

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
 * @desc    Force sync for a tenant (ignores idempotency)
 * @access  Private (requires auth token + admin)
 */
router.post('/tenants/:tenantId/force', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    console.log(`⚠️  API: Force sync triggered for tenant ${tenantId}`);

    // Force sync
    const result = await syncOrchestrationService.forceSyncTenant(tenantId, authToken);

    res.json({
      success: result.success,
      message: result.success ? 'Force sync started successfully' : 'Force sync failed',
      data: result
    });

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
 * @desc    Get sync status for a tenant
 * @access  Private (requires auth token)
 */
router.get('/tenants/:tenantId/status', auth, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const status = await syncOrchestrationService.getSyncStatus(tenantId);

    res.json({
      success: true,
      data: status
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

export default router;

