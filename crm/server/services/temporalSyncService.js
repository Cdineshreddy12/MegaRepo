// =============================================================================
// TEMPORAL SYNC SERVICE
// Wrapper service for Temporal-based sync with fallback to direct sync
// Used for authentication sync when feature flag is enabled
// =============================================================================

import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../temporal-shared/client.js';
import TenantSyncStatus from '../models/TenantSyncStatus.js';
import syncOrchestrationService from './syncOrchestrationService.js';

class TemporalSyncService {
  /**
   * Ensure tenant sync using Temporal workflow with fallback
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async ensureTenantSync(tenantId, authToken, options = {}) {
    const correlationId = options.correlationId || `temporal-sync-${tenantId}-${Date.now()}`;
    const startTime = Date.now();
    const timeout = TEMPORAL_CONFIG.authTimeoutMs || 60000;
    
    const logContext = {
      correlationId,
      tenantId,
      syncMethod: 'temporal',
      timestamp: new Date().toISOString()
    };
    
    console.log(`🚀 [TEMPORAL-SYNC] Starting Temporal sync for tenant: ${tenantId}`, logContext);
    
    try {
      // Check if essential data already exists (fast path)
      const syncStatus = await TenantSyncStatus.findOne({ tenantId });
      if (syncStatus && (syncStatus.phase === 'dependent' || syncStatus.phase === 'completed')) {
        // Verify tenant record actually exists (safety check for deleted data)
        const mongoose = (await import('mongoose')).default;
        const Tenant = mongoose.model('Tenant');
        const tenant = await Tenant.findOne({ tenantId });
        
        if (!tenant) {
          console.log(`⚠️ [TEMPORAL-SYNC] Sync status says completed but tenant record not found, forcing re-sync...`, {
            ...logContext,
            phase: 'data_missing'
          });
          // Reset sync status to force re-sync
          syncStatus.status = 'pending';
          syncStatus.phase = 'independent';
          await syncStatus.save();
          // Continue to start workflow below
        } else {
          console.log(`✅ [TEMPORAL-SYNC] Essential data already synced, skipping workflow`, {
            ...logContext,
            phase: 'already_synced'
          });
          return {
            success: true,
            alreadySynced: true,
            correlationId,
            syncMethod: 'temporal',
            syncStatus: syncStatus.toObject()
          };
        }
      }
      
      // Start Temporal workflow
      const temporalClient = await getTemporalClient();
      const workflowId = `tenant-sync-auth-${tenantId}-${Date.now()}`;
      
      const handle = await temporalClient.workflow.start('tenantSyncWorkflow', {
        args: [{
          tenantId,
          authToken,
          options: {
            forceSync: options.forceSync || false,
            skipReferenceData: false, // Can be async
          },
        }],
        taskQueue: getTaskQueue('CRM'),
        workflowId,
        workflowExecutionTimeout: '1h',
        workflowTaskTimeout: '10s',
        workflowIdReusePolicy: 'ALLOW_DUPLICATE',
      });
      
      console.log(`✅ [TEMPORAL-SYNC] Started workflow: ${workflowId}`, {
        ...logContext,
        workflowId,
        runId: handle.firstExecutionRunId
      });
      
      // Poll for essential data completion
      const pollInterval = 500; // Check every 500ms
      const maxWaitTime = timeout;
      const pollStartTime = Date.now();
      
      while (Date.now() - pollStartTime < maxWaitTime) {
        // Check sync status in database (faster than querying workflow)
        const currentStatus = await TenantSyncStatus.findOne({ tenantId });
        
        if (currentStatus) {
          // Essential data is ready when phase is 'dependent' or 'completed'
          if (currentStatus.phase === 'dependent' || currentStatus.phase === 'completed') {
            const duration = Date.now() - startTime;
            console.log(`✅ [TEMPORAL-SYNC] Essential data synced via Temporal`, {
              ...logContext,
              workflowId,
              phase: 'essential_complete',
              duration
            });
            
            return {
              success: true,
              correlationId,
              syncMethod: 'temporal',
              workflowId,
              runId: handle.firstExecutionRunId,
              backgroundSyncStarted: true,
              syncStatus: currentStatus.toObject(),
              duration
            };
          }
          
          // Check if sync failed
          if (currentStatus.status === 'failed') {
            throw new Error(`Sync failed: ${currentStatus.errorDetails?.message || 'Unknown error'}`);
          }
        }
        
        // Check workflow status as backup
        try {
          const workflowStatus = await handle.describe();
          if (workflowStatus.status.name === 'COMPLETED') {
            const result = await handle.result();
            if (result.success) {
              const duration = Date.now() - startTime;
              return {
                success: true,
                correlationId,
                syncMethod: 'temporal',
                workflowId,
                ...result,
                duration
              };
            } else {
              throw new Error(result.error?.message || 'Workflow completed with errors');
            }
          } else if (workflowStatus.status.name === 'FAILED' || workflowStatus.status.name === 'TERMINATED') {
            throw new Error(`Workflow ${workflowStatus.status.name.toLowerCase()}`);
          }
        } catch (workflowError) {
          // If workflow query fails, continue polling database status
          console.warn(`⚠️ [TEMPORAL-SYNC] Could not query workflow status: ${workflowError.message}`);
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      // Timeout - check if essential data is at least partially synced
      const finalStatus = await TenantSyncStatus.findOne({ tenantId });
      if (finalStatus && (finalStatus.phase === 'dependent' || finalStatus.phase === 'completed')) {
        const duration = Date.now() - startTime;
        console.warn(`⚠️ [TEMPORAL-SYNC] Timeout but essential data appears synced`, {
          ...logContext,
          workflowId,
          duration,
          warning: 'Sync timeout but essential data appears synced'
        });
        
        return {
          success: true,
          correlationId,
          syncMethod: 'temporal',
          workflowId,
          backgroundSyncStarted: true,
          warning: 'Sync timeout but essential data appears synced',
          syncStatus: finalStatus.toObject(),
          duration
        };
      }
      
      // Timeout and no essential data - fallback to direct sync
      throw new Error(`Sync timeout after ${timeout}ms - essential data not synced`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TEMPORAL-SYNC] Temporal sync failed, falling back to direct sync`, {
        ...logContext,
        error: error.message,
        duration
      });
      
      // Fallback to direct sync
      try {
        console.log(`🔄 [TEMPORAL-SYNC] Falling back to direct sync for tenant: ${tenantId}`);
        const directResult = await syncOrchestrationService.syncTenant(tenantId, authToken, {
          ...options,
          correlationId,
          syncMethod: 'direct_fallback'
        });
        
        return {
          ...directResult,
          correlationId,
          syncMethod: 'temporal_with_fallback',
          fallbackUsed: true,
          temporalError: error.message
        };
      } catch (fallbackError) {
        console.error(`❌ [TEMPORAL-SYNC] Fallback sync also failed`, {
          ...logContext,
          temporalError: error.message,
          fallbackError: fallbackError.message
        });
        
        throw new Error(`Both Temporal and direct sync failed. Temporal: ${error.message}, Direct: ${fallbackError.message}`);
      }
    }
  }
}

export default new TemporalSyncService();

