// =============================================================================
// SYNC ORCHESTRATION SERVICE
// Manages sync lifecycle, triggers, monitoring, and cleanup
// =============================================================================

import TenantSyncStatus from '../models/TenantSyncStatus.js';
import tenantDataSyncServiceV2 from './tenantDataSyncServiceV2.js';

class SyncOrchestrationService {
  constructor() {
    this.activeSyncs = new Map(); // tenantId → sync promise
    this.cleanupInterval = null;
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      syncDurations: [],
      errorTypes: {},
      phaseDurations: {
        essential: [],
        background: []
      }
    };
  }

  /**
   * Initialize orchestration service
   */
  async initialize() {
    console.log('🔧 Initializing Sync Orchestration Service...');
    
    // Cleanup any stuck syncs from previous runs
    await this.cleanupStuckSyncs();
    
    // Start periodic cleanup (every 5 minutes)
    this.startPeriodicCleanup(5 * 60 * 1000);
    
    console.log('✅ Sync Orchestration Service initialized');
  }

  /**
   * Check if tenant needs sync
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<boolean>}
   */
  async needsSync(tenantId) {
    return await TenantSyncStatus.needsSync(tenantId);
  }

  /**
   * Get sync status for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>}
   */
  async getSyncStatus(tenantId) {
    const syncStatus = await TenantSyncStatus.findOne({ tenantId });
    
    if (!syncStatus) {
      return {
        tenantId,
        status: 'not_started',
        needsSync: true
      };
    }

    return {
      tenantId,
      status: syncStatus.status,
      phase: syncStatus.phase,
      attemptCount: syncStatus.attemptCount,
      startedAt: syncStatus.startedAt,
      completedAt: syncStatus.completedAt,
      lastAttemptAt: syncStatus.lastAttemptAt,
      isStuck: syncStatus.isStuck,
      progress: syncStatus.getSyncProgress(),
      errors: syncStatus.errors,
      metadata: syncStatus.metadata,
      needsSync: await this.needsSync(tenantId)
    };
  }

  /**
   * Trigger sync for tenant (main entry point)
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token
   * @param {Object} options - Sync options
   * @returns {Promise<Object>}
   */
  async syncTenant(tenantId, authToken, options = {}) {
    console.log(`\n🎯 Sync requested for tenant: ${tenantId}`);
    
    // Check if sync is already active
    if (this.activeSyncs.has(tenantId)) {
      console.log('⏳ Sync already active for this tenant, waiting...');
      return await this.activeSyncs.get(tenantId);
    }

    // Check if sync is needed (idempotency)
    const needsSync = await this.needsSync(tenantId);
    if (!needsSync) {
      console.log('✅ Tenant already synced');
      const syncStatus = await TenantSyncStatus.findOne({ tenantId });
      return {
        success: true,
        alreadySynced: true,
        syncStatus: syncStatus?.toObject()
      };
    }

    // Start sync
    console.log('🚀 Starting new sync...');
    const syncPromise = this.executeSyncWithMonitoring(tenantId, authToken, options);
    
    // Track active sync
    this.activeSyncs.set(tenantId, syncPromise);
    
    try {
      const result = await syncPromise;
      return result;
    } finally {
      // Remove from active syncs
      this.activeSyncs.delete(tenantId);
    }
  }

  /**
   * Execute sync with monitoring and error handling
   */
  async executeSyncWithMonitoring(tenantId, authToken, options) {
    const startTime = Date.now();
    const correlationId = options.correlationId || `sync-${tenantId}-${Date.now()}`;
    const syncMethod = options.syncMethod || 'direct';
    
    const logContext = {
      correlationId,
      tenantId,
      syncMethod,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🚀 [SYNC] Starting sync execution`, { ...logContext });
    
    try {
      // Trigger sync via tenantDataSyncServiceV2
      const essentialStartTime = Date.now();
      const result = await tenantDataSyncServiceV2.syncTenant(tenantId, authToken, {
        ...options,
        correlationId
      });
      
      const totalDuration = Date.now() - startTime;
      const essentialDuration = result.essentialDuration || (Date.now() - essentialStartTime);
      const backgroundDuration = result.backgroundDuration || 0;
      
      // Update metrics
      this.metrics.totalSyncs++;
      this.metrics.successfulSyncs++;
      this.metrics.syncDurations.push(totalDuration);
      this.metrics.phaseDurations.essential.push(essentialDuration);
      if (backgroundDuration > 0) {
        this.metrics.phaseDurations.background.push(backgroundDuration);
      }
      
      // Keep only last 1000 metrics entries to prevent memory issues
      if (this.metrics.syncDurations.length > 1000) {
        this.metrics.syncDurations.shift();
        this.metrics.phaseDurations.essential.shift();
        if (this.metrics.phaseDurations.background.length > 0) {
          this.metrics.phaseDurations.background.shift();
        }
      }
      
      const structuredLog = {
        ...logContext,
        phase: 'sync_completed',
        success: true,
        totalDuration,
        essentialDuration,
        backgroundDuration,
        recordsSynced: result.stats?.totalRecords || 0
      };
      
      console.log(`✅ [SYNC] Sync completed for ${tenantId}`, structuredLog);
      
      return {
        success: true,
        tenantId,
        correlationId,
        syncMethod,
        duration: totalDuration,
        essentialDuration,
        backgroundDuration,
        metrics: {
          totalDuration,
          essentialDuration,
          backgroundDuration
        },
        ...result
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorType = this.classifyErrorType(error);
      
      // Update metrics
      this.metrics.totalSyncs++;
      this.metrics.failedSyncs++;
      this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
      
      const structuredErrorLog = {
        ...logContext,
        phase: 'sync_failed',
        success: false,
        duration,
        errorType,
        errorMessage: error.message,
        retryable: error.retryable !== undefined ? error.retryable : this.isRetryableErrorType(errorType)
      };
      
      console.error(`❌ [SYNC] Sync failed for ${tenantId}`, structuredErrorLog);
      
      // Record failure in sync status
      const syncStatus = await TenantSyncStatus.findOne({ tenantId });
      if (syncStatus) {
        await syncStatus.failSync(error.message, errorType);
      }
      
      return {
        success: false,
        tenantId,
        correlationId,
        syncMethod,
        duration,
        error: error.message,
        errorType,
        retryable: error.retryable !== undefined ? error.retryable : this.isRetryableErrorType(errorType),
        metrics: {
          totalDuration: duration
        }
      };
    }
  }

  /**
   * Check if error type is retryable
   * @param {string} errorType - Error type
   * @returns {boolean} True if retryable
   */
  isRetryableErrorType(errorType) {
    const nonRetryableTypes = ['AUTH_ERROR', 'VALIDATION_ERROR'];
    return !nonRetryableTypes.includes(errorType);
  }

  /**
   * Get sync metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    const avgDuration = this.metrics.syncDurations.length > 0
      ? this.metrics.syncDurations.reduce((a, b) => a + b, 0) / this.metrics.syncDurations.length
      : 0;
    
    const avgEssentialDuration = this.metrics.phaseDurations.essential.length > 0
      ? this.metrics.phaseDurations.essential.reduce((a, b) => a + b, 0) / this.metrics.phaseDurations.essential.length
      : 0;
    
    const avgBackgroundDuration = this.metrics.phaseDurations.background.length > 0
      ? this.metrics.phaseDurations.background.reduce((a, b) => a + b, 0) / this.metrics.phaseDurations.background.length
      : 0;
    
    const successRate = this.metrics.totalSyncs > 0
      ? (this.metrics.successfulSyncs / this.metrics.totalSyncs) * 100
      : 0;
    
    return {
      ...this.metrics,
      averageDuration: Math.round(avgDuration),
      averageEssentialDuration: Math.round(avgEssentialDuration),
      averageBackgroundDuration: Math.round(avgBackgroundDuration),
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round((100 - successRate) * 100) / 100
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  resetMetrics() {
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      syncDurations: [],
      errorTypes: {},
      phaseDurations: {
        essential: [],
        background: []
      }
    };
  }

  /**
   * Force sync for tenant (ignores idempotency check)
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token
   * @returns {Promise<Object>}
   */
  async forceSyncTenant(tenantId, authToken) {
    console.log(`\n⚠️ Force sync requested for tenant: ${tenantId}`);
    
    // Reset sync status
    const syncStatus = await TenantSyncStatus.findOne({ tenantId });
    if (syncStatus) {
      syncStatus.status = 'not_started';
      syncStatus.attemptCount = 0;
      syncStatus.errors = [];
      await syncStatus.save();
    }
    
    // Trigger sync
    return await this.syncTenant(tenantId, authToken, { force: true });
  }

  /**
   * Get sync progress for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>}
   */
  async getSyncProgress(tenantId) {
    const syncStatus = await TenantSyncStatus.findOne({ tenantId });
    
    if (!syncStatus) {
      return {
        tenantId,
        progress: 0,
        status: 'not_started',
        message: 'Sync not started'
      };
    }

    const progress = syncStatus.getSyncProgress();
    
    return {
      tenantId,
      status: syncStatus.status,
      phase: syncStatus.phase,
      progress: progress.percentage,
      syncedCollections: progress.synced,
      totalCollections: progress.total,
      collections: progress.collections,
      message: this.getProgressMessage(syncStatus)
    };
  }

  /**
   * Get progress message based on sync status
   */
  getProgressMessage(syncStatus) {
    switch (syncStatus.status) {
      case 'not_started':
        return 'Sync not started';
      case 'in_progress':
        if (syncStatus.phase === 'independent') {
          return 'Syncing essential data (tenant, organizations, roles, users)...';
        } else if (syncStatus.phase === 'dependent') {
          return 'Syncing assignments and credits (background)...';
        } else {
          return 'Syncing in progress...';
        }
      case 'completed':
        return 'Sync completed successfully';
      case 'failed':
        return 'Sync failed: ' + (syncStatus.errors[syncStatus.errors.length - 1]?.error || 'Unknown error');
      default:
        return 'Unknown status';
    }
  }

  /**
   * Release stuck sync lock (admin operation)
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>}
   */
  async releaseStuckLock(tenantId) {
    console.log(`🔓 Releasing stuck lock for tenant: ${tenantId}`);
    
    const syncStatus = await TenantSyncStatus.findOne({ tenantId });
    
    if (!syncStatus) {
      return {
        success: false,
        error: 'Sync status not found'
      };
    }

    if (!syncStatus.syncLock.locked) {
      return {
        success: false,
        error: 'No lock to release'
      };
    }

    await syncStatus.releaseLock();
    syncStatus.status = 'failed';
    await syncStatus.save();

    console.log(`✅ Lock released for tenant: ${tenantId}`);
    
    return {
      success: true,
      tenantId,
      message: 'Lock released successfully'
    };
  }

  /**
   * Cleanup stuck syncs (runs periodically)
   */
  async cleanupStuckSyncs() {
    console.log('🔧 Checking for stuck syncs...');
    
    const cleanedCount = await TenantSyncStatus.cleanupStuckSyncs();
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} stuck syncs`);
    } else {
      console.log('✅ No stuck syncs found');
    }

    return {
      cleanedCount
    };
  }

  /**
   * Start periodic cleanup of stuck syncs
   */
  startPeriodicCleanup(intervalMs = 5 * 60 * 1000) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupStuckSyncs();
      } catch (error) {
        console.error('❌ Periodic cleanup error:', error.message);
      }
    }, intervalMs);

    console.log(`🔄 Periodic cleanup started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Periodic cleanup stopped');
    }
  }

  /**
   * Get sync statistics (admin)
   * @returns {Promise<Object>}
   */
  async getSyncStatistics() {
    const stats = await TenantSyncStatus.getStatistics();
    const activeSyncs = await TenantSyncStatus.findActiveSyncs();
    const stuckSyncs = await TenantSyncStatus.findStuckSyncs();

    return {
      summary: stats,
      activeSyncs: activeSyncs.length,
      stuckSyncs: stuckSyncs.length,
      activeTenantsBeingSynced: Array.from(this.activeSyncs.keys())
    };
  }

  /**
   * Get all sync statuses (admin)
   * @param {Object} filter - Optional filter
   * @returns {Promise<Array>}
   */
  async getAllSyncStatuses(filter = {}) {
    const syncStatuses = await TenantSyncStatus.find(filter)
      .sort({ lastAttemptAt: -1 })
      .limit(100)
      .lean();

    return syncStatuses.map(status => ({
      tenantId: status.tenantId,
      status: status.status,
      phase: status.phase,
      attemptCount: status.attemptCount,
      startedAt: status.startedAt,
      completedAt: status.completedAt,
      lastAttemptAt: status.lastAttemptAt,
      duration: status.metadata?.syncDuration,
      totalRecords: status.metadata?.totalRecords,
      errors: status.errors.length
    }));
  }

  /**
   * Classify error type
   */
  classifyErrorType(error) {
    if (error.type) return error.type;
    
    if (error.message.includes('Authentication') || error.message.includes('401')) {
      return 'AUTH_ERROR';
    }
    
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    
    if (error.message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    
    if (error.message.includes('database') || error.message.includes('transaction')) {
      return 'DATABASE_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Shutdown orchestration service
   */
  async shutdown() {
    console.log('🛑 Shutting down Sync Orchestration Service...');
    
    this.stopPeriodicCleanup();
    
    // Wait for active syncs to complete (with timeout)
    if (this.activeSyncs.size > 0) {
      console.log(`⏳ Waiting for ${this.activeSyncs.size} active syncs to complete...`);
      
      const activeSyncPromises = Array.from(this.activeSyncs.values());
      await Promise.race([
        Promise.all(activeSyncPromises),
        new Promise(resolve => setTimeout(resolve, 30000)) // 30s timeout
      ]);
    }
    
    console.log('✅ Sync Orchestration Service shutdown complete');
  }
}

export default new SyncOrchestrationService();

