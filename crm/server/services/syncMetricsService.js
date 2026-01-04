// =============================================================================
// SYNC METRICS SERVICE
// Collects and exposes metrics for sync operations
// =============================================================================

import TenantSyncStatus from '../models/TenantSyncStatus.js';
import syncOrchestrationService from './syncOrchestrationService.js';

class SyncMetricsService {
  /**
   * Get comprehensive sync metrics
   * @returns {Promise<Object>} Metrics data
   */
  async getMetrics() {
    const orchestrationMetrics = syncOrchestrationService.getMetrics();
    
    // Get database-level metrics
    const dbMetrics = await this.getDatabaseMetrics();
    
    // Get collection-level metrics
    const collectionMetrics = await this.getCollectionMetrics();
    
    return {
      orchestration: orchestrationMetrics,
      database: dbMetrics,
      collections: collectionMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get metrics from database (TenantSyncStatus)
   * @returns {Promise<Object>} Database metrics
   */
  async getDatabaseMetrics() {
    const totalTenants = await TenantSyncStatus.countDocuments();
    const completedTenants = await TenantSyncStatus.countDocuments({ status: 'completed' });
    const failedTenants = await TenantSyncStatus.countDocuments({ status: 'failed' });
    const inProgressTenants = await TenantSyncStatus.countDocuments({ status: 'in_progress' });
    const pendingTenants = await TenantSyncStatus.countDocuments({ status: 'pending' });
    
    // Get average sync duration
    const completedSyncs = await TenantSyncStatus.find({ 
      status: 'completed',
      durationMs: { $exists: true, $gt: 0 }
    }).select('durationMs').lean();
    
    const avgDuration = completedSyncs.length > 0
      ? completedSyncs.reduce((sum, s) => sum + (s.durationMs || 0), 0) / completedSyncs.length
      : 0;
    
    // Get total records synced
    const totalRecords = await TenantSyncStatus.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalRecords' } } }
    ]);
    
    const totalRecordsSynced = totalRecords.length > 0 ? totalRecords[0].total : 0;
    
    return {
      totalTenants,
      completedTenants,
      failedTenants,
      inProgressTenants,
      pendingTenants,
      successRate: totalTenants > 0 ? (completedTenants / totalTenants) * 100 : 0,
      failureRate: totalTenants > 0 ? (failedTenants / totalTenants) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      totalRecordsSynced
    };
  }

  /**
   * Get collection-level success metrics
   * @returns {Promise<Object>} Collection metrics
   */
  async getCollectionMetrics() {
    const collections = [
      'tenants',
      'users',
      'organizations',
      'roles',
      'employeeAssignments',
      'roleAssignments',
      'creditConfigs',
      'entityCredits'
    ];
    
    const metrics = {};
    
    for (const collection of collections) {
      const collectionPath = `collections.${collection}`;
      
      const total = await TenantSyncStatus.countDocuments({
        [`${collectionPath}.status`]: { $exists: true }
      });
      
      const completed = await TenantSyncStatus.countDocuments({
        [`${collectionPath}.status`]: 'completed'
      });
      
      const failed = await TenantSyncStatus.countDocuments({
        [`${collectionPath}.status`]: 'failed'
      });
      
      // Get total records synced for this collection
      const recordsAggregation = await TenantSyncStatus.aggregate([
        { $match: { [`${collectionPath}.status`]: 'completed' } },
        { $group: { _id: null, total: { $sum: `$${collectionPath}.recordCount` } } }
      ]);
      
      const totalRecords = recordsAggregation.length > 0 ? recordsAggregation[0].total : 0;
      
      metrics[collection] = {
        total,
        completed,
        failed,
        pending: total - completed - failed,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        failureRate: total > 0 ? (failed / total) * 100 : 0,
        totalRecords
      };
    }
    
    return metrics;
  }

  /**
   * Get sync health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const metrics = await this.getMetrics();
    const orchestration = metrics.orchestration;
    const database = metrics.database;
    
    // Determine overall health
    const successRate = orchestration.successRate || database.successRate || 0;
    const failureRate = orchestration.failureRate || database.failureRate || 0;
    const stuckSyncs = await TenantSyncStatus.countDocuments({
      status: 'in_progress',
      'syncLock.lockExpiry': { $lt: new Date() }
    });
    
    let healthStatus = 'healthy';
    if (failureRate > 20 || stuckSyncs > 5) {
      healthStatus = 'unhealthy';
    } else if (failureRate > 10 || stuckSyncs > 0) {
      healthStatus = 'degraded';
    }
    
    return {
      status: healthStatus,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      stuckSyncs,
      activeSyncs: orchestration.activeSyncs || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get sync method statistics (direct vs Temporal)
   * @returns {Promise<Object>} Method statistics
   */
  async getSyncMethodStats() {
    // This would require tracking sync method in TenantSyncStatus
    // For now, return basic stats
    const totalSyncs = await TenantSyncStatus.countDocuments();
    const completedSyncs = await TenantSyncStatus.countDocuments({ status: 'completed' });
    
    return {
      totalSyncs,
      completedSyncs,
      // Note: To track sync method, add syncMethod field to TenantSyncStatus model
      // For now, this is a placeholder
      directSyncs: totalSyncs, // Placeholder
      temporalSyncs: 0, // Placeholder
      note: 'Sync method tracking requires TenantSyncStatus model update'
    };
  }
}

export default new SyncMetricsService();

