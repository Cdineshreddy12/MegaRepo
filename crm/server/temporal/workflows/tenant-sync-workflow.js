import { proxyActivities, workflowInfo } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
// proxyActivities creates stubs that connect to actual activities at runtime
const {
  syncEssentialData,
  syncReferenceData,
  validateSyncCompletion,
} = proxyActivities({
  startToCloseTimeout: '30 minutes', // Sync operations can take a long time
  retry: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '300s', // 5 minutes max
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['ValidationError', 'NotFoundError'],
  },
});

/**
 * Tenant Sync Workflow
 * Orchestrates the initial sync of tenant data from wrapper API to CRM
 * 
 * Workflow execution timeout: 1 hour (for very large tenants)
 * Workflow task timeout: 10 seconds (for workflow logic execution)
 * 
 * Phases:
 * 1. Essential Data Sync (Tenant, Organizations, Roles, Users) - Transaction-based
 * 2. Reference Data Sync (Assignments, Credits) - Can be done in background
 * 3. Validation - Verify sync completion
 */
export async function tenantSyncWorkflow({ tenantId, authToken, options = {} }) {
  const workflowStartTime = Date.now();
  const { forceSync = false, skipReferenceData = false } = options;

  if (!tenantId) {
    throw new Error('tenantId is required for tenant sync workflow');
  }

  if (!authToken) {
    throw new Error('authToken is required for tenant sync workflow');
  }

  console.log(`[Tenant Sync Workflow] Starting sync for tenant: ${tenantId}`);
  console.log(`[Tenant Sync Workflow] Workflow ID: ${workflowInfo().workflowId}`);
  console.log(`[Tenant Sync Workflow] Run ID: ${workflowInfo().runId}`);
  console.log(`[Tenant Sync Workflow] Force sync: ${forceSync}`);
  console.log(`[Tenant Sync Workflow] Skip reference data: ${skipReferenceData}`);

  const syncResult = {
    tenantId,
    workflowId: workflowInfo().workflowId,
    runId: workflowInfo().runId,
    phases: {},
    startTime: workflowStartTime,
    endTime: null,
    durationMs: 0,
    success: false,
    error: null,
  };

  try {
    // Phase 1: Sync Essential Data (Tenant, Organizations, Roles, Users)
    console.log(`[Tenant Sync Workflow] Phase 1: Syncing essential data...`);
    const phase1StartTime = Date.now();
    
    const essentialResult = await syncEssentialData({
      tenantId,
      authToken,
      forceSync,
    });

    const phase1Duration = Date.now() - phase1StartTime;
    syncResult.phases.essential = {
      success: essentialResult.success,
      skipped: essentialResult.skipped || false,
      stats: essentialResult.stats || {},
      durationMs: phase1Duration,
      error: essentialResult.error || null,
    };

    if (!essentialResult.success && !essentialResult.skipped) {
      throw new Error(`Essential data sync failed: ${essentialResult.error?.message || 'Unknown error'}`);
    }

    console.log(`[Tenant Sync Workflow] Phase 1 completed in ${phase1Duration}ms`);

    // Phase 2: Sync Reference Data (Assignments, Credits) - Optional
    if (!skipReferenceData) {
      console.log(`[Tenant Sync Workflow] Phase 2: Syncing reference data...`);
      const phase2StartTime = Date.now();

      const referenceResult = await syncReferenceData({
        tenantId,
        authToken,
        forceSync,
      });

      const phase2Duration = Date.now() - phase2StartTime;
      syncResult.phases.reference = {
        success: referenceResult.success,
        skipped: referenceResult.skipped || false,
        stats: referenceResult.stats || {},
        durationMs: phase2Duration,
        error: referenceResult.error || null,
      };

      if (!referenceResult.success && !referenceResult.skipped) {
        console.warn(`[Tenant Sync Workflow] Phase 2 failed but continuing: ${referenceResult.error?.message}`);
        // Don't throw - reference data failures are non-critical
      }

      console.log(`[Tenant Sync Workflow] Phase 2 completed in ${phase2Duration}ms`);
    } else {
      console.log(`[Tenant Sync Workflow] Phase 2 skipped (skipReferenceData=true)`);
      syncResult.phases.reference = {
        skipped: true,
      };
    }

    // Phase 3: Validate Sync Completion
    console.log(`[Tenant Sync Workflow] Phase 3: Validating sync completion...`);
    const phase3StartTime = Date.now();

    const validationResult = await validateSyncCompletion({
      tenantId,
    });

    const phase3Duration = Date.now() - phase3StartTime;
    syncResult.phases.validation = {
      success: validationResult.success,
      isValid: validationResult.isValid || false,
      issues: validationResult.issues || [],
      durationMs: phase3Duration,
      error: validationResult.error || null,
    };

    if (!validationResult.success) {
      console.warn(`[Tenant Sync Workflow] Validation failed: ${validationResult.error?.message}`);
      // Don't throw - validation failures are warnings, not critical
    }

    console.log(`[Tenant Sync Workflow] Phase 3 completed in ${phase3Duration}ms`);

    // Mark as successful
    syncResult.success = true;
    syncResult.endTime = Date.now();
    syncResult.durationMs = syncResult.endTime - workflowStartTime;

    console.log(`[Tenant Sync Workflow] Sync completed successfully in ${syncResult.durationMs}ms`);

    return syncResult;
  } catch (error) {
    syncResult.success = false;
    syncResult.error = {
      message: error.message,
      type: error.constructor?.name || 'Error',
      stack: error.stack,
      phase: syncResult.phases.essential?.success ? 'reference' : 'essential',
    };
    syncResult.endTime = Date.now();
    syncResult.durationMs = syncResult.endTime - workflowStartTime;

    console.error(`[Tenant Sync Workflow] Sync failed after ${syncResult.durationMs}ms:`, error.message);

    // Return result with error for monitoring/debugging
    return syncResult;
  }
}


