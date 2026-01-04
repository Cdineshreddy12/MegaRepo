import mongoose from 'mongoose';
import TenantSyncStatus from '../../models/TenantSyncStatus.js';

// Dynamic import to avoid loading sync service at module load time
let TenantDataSyncServiceV2 = null;

async function getSyncService() {
  if (!TenantDataSyncServiceV2) {
    const module = await import('../../services/tenantDataSyncServiceV2.js');
    // tenantDataSyncServiceV2.js exports an instance, not a class
    TenantDataSyncServiceV2 = module.default;
  }
  // Return the instance directly (it's already instantiated)
  return TenantDataSyncServiceV2;
}

/**
 * Ensure MongoDB connection is established
 */
async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI environment variable is required');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('[Sync Activity] MongoDB connection established');
  } catch (error) {
    console.error('[Sync Activity] Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Sync Essential Data Activity
 * Syncs tenant, organizations, roles, and users with idempotency checks
 */
export async function syncEssentialData({ tenantId, authToken, forceSync = false }) {
  await ensureMongoConnection();

  if (!tenantId) {
    throw new Error('tenantId is required for syncEssentialData activity');
  }

  if (!authToken) {
    throw new Error('authToken is required for syncEssentialData activity');
  }

  console.log(`[Sync Activity] Starting essential data sync for tenant: ${tenantId}`);

  try {
    // Check sync status for idempotency
    let syncStatus = await TenantSyncStatus.findOne({ tenantId });

    if (!syncStatus) {
      syncStatus = new TenantSyncStatus({
        tenantId,
        status: 'pending',
        phase: 'independent',
      });
      await syncStatus.save();
    }

    // Check if already synced (idempotency check)
    if (!forceSync && syncStatus.status === 'completed' && syncStatus.phase === 'completed') {
      console.log(`[Sync Activity] Tenant ${tenantId} already synced, skipping essential data sync`);
      return {
        success: true,
        skipped: true,
        reason: 'already_synced',
        stats: {
          tenant: syncStatus.collections?.tenants?.recordCount || 0,
          organizations: syncStatus.collections?.organizations?.recordCount || 0,
          roles: syncStatus.collections?.roles?.recordCount || 0,
          users: syncStatus.collections?.users?.recordCount || 0,
        },
      };
    }

    // Check if sync is in progress and not expired
    if (!forceSync && syncStatus.status === 'in_progress' && syncStatus.syncLock.isLocked) {
      const lockExpiry = syncStatus.syncLock.lockExpiry;
      if (lockExpiry && lockExpiry > new Date()) {
        console.log(`[Sync Activity] Sync already in progress for tenant ${tenantId}, skipping`);
        return {
          success: true,
          skipped: true,
          reason: 'sync_in_progress',
        };
      }
    }

    // Acquire lock
    const processId = `temporal-sync-${process.pid}-${Date.now()}`;
    const lockAcquired = await syncStatus.acquireLock(processId, 30 * 60 * 1000); // 30 minute lock

    if (!lockAcquired && !forceSync) {
      console.log(`[Sync Activity] Could not acquire lock for tenant ${tenantId}, sync may be in progress`);
      return {
        success: true,
        skipped: true,
        reason: 'lock_not_acquired',
      };
    }

    // Update status to in_progress
    syncStatus.status = 'in_progress';
    syncStatus.phase = 'independent';
    syncStatus.lastAttemptAt = new Date();
    syncStatus.attemptCount += 1;
    await syncStatus.save();

    // Perform sync using sync service
    const syncService = await getSyncService();
    const result = await syncService.syncEssentialDataWithTransaction(tenantId, authToken, syncStatus);

    // Update sync status
    if (result.success) {
      // Check if role assignments failed (they're part of essential sync now)
      const roleAssignmentsStatus = syncStatus.collections?.roleAssignments;
      if (roleAssignmentsStatus && roleAssignmentsStatus.status === 'failed') {
        console.warn(`[Sync Activity] Essential data synced but role assignments failed - marking as partial success`);
        // Mark as dependent phase (ready for background) but note the failure
        syncStatus.status = 'completed';
        syncStatus.phase = 'dependent';
        syncStatus.completedAt = new Date();
        // Keep the role assignment failure in collections status
        await syncStatus.save();
      } else {
        syncStatus.status = 'completed';
        syncStatus.phase = 'dependent'; // Ready for reference data sync
        syncStatus.completedAt = new Date();
        await syncStatus.save();
      }
    } else {
      await syncStatus.failSync(result.error?.message || 'Essential data sync failed', 'SYNC_FAILED');
    }

    // Release lock
    await syncStatus.releaseLock();

    console.log(`[Sync Activity] Essential data sync completed for tenant: ${tenantId}`);

    return {
      success: result.success,
      stats: result.stats || {},
      error: result.error || null,
    };
  } catch (error) {
    console.error(`[Sync Activity] Essential data sync failed for tenant ${tenantId}:`, error);

    // Update sync status on error
    try {
      const syncStatus = await TenantSyncStatus.findOne({ tenantId });
      if (syncStatus) {
        await syncStatus.failSync(error.message, error.constructor?.name || 'Error');
        await syncStatus.releaseLock();
      }
    } catch (statusError) {
      console.error(`[Sync Activity] Failed to update sync status:`, statusError);
    }

    return {
      success: false,
      error: {
        message: error.message,
        type: error.constructor?.name || 'Error',
        stack: error.stack,
      },
    };
  }
}

/**
 * Sync Reference Data Activity
 * Syncs employee assignments, role assignments, credit configs, and entity credits
 */
export async function syncReferenceData({ tenantId, authToken, forceSync = false }) {
  await ensureMongoConnection();

  if (!tenantId) {
    throw new Error('tenantId is required for syncReferenceData activity');
  }

  if (!authToken) {
    throw new Error('authToken is required for syncReferenceData activity');
  }

  console.log(`[Sync Activity] Starting reference data sync for tenant: ${tenantId}`);

  try {
    // Check sync status
    let syncStatus = await TenantSyncStatus.findOne({ tenantId });

    if (!syncStatus) {
      throw new Error(`Sync status not found for tenant ${tenantId}. Essential data sync must be completed first.`);
    }

    // Check if essential data sync is completed
    if (syncStatus.phase !== 'dependent' && syncStatus.phase !== 'completed') {
      throw new Error(`Essential data sync not completed for tenant ${tenantId}. Current phase: ${syncStatus.phase}`);
    }

    // Check if reference data already synced (idempotency)
    const referenceCollections = ['employeeAssignments', 'roleAssignments', 'creditConfigs', 'entityCredits'];
    const allSynced = referenceCollections.every(collection => {
      const collectionStatus = syncStatus.collections?.[collection];
      return collectionStatus?.status === 'completed';
    });

    if (!forceSync && allSynced) {
      console.log(`[Sync Activity] Reference data already synced for tenant ${tenantId}, skipping`);
      return {
        success: true,
        skipped: true,
        reason: 'already_synced',
        stats: {
          employeeAssignments: syncStatus.collections?.employeeAssignments?.recordCount || 0,
          roleAssignments: syncStatus.collections?.roleAssignments?.recordCount || 0,
          creditConfigs: syncStatus.collections?.creditConfigs?.recordCount || 0,
          entityCredits: syncStatus.collections?.entityCredits?.recordCount || 0,
        },
      };
    }

    // Update phase to dependent (if not already)
    syncStatus.phase = 'dependent';
    await syncStatus.save();

    // Perform sync using sync service
    const syncService = await getSyncService();
    const result = await syncService.syncBackgroundData(tenantId, authToken, syncStatus);

    // Update sync status
    if (result.success) {
      syncStatus.phase = 'completed';
      syncStatus.status = 'completed';
      syncStatus.completedAt = new Date();
      await syncStatus.save();
    } else {
      // Don't fail the entire sync if reference data fails - it's non-critical
      console.warn(`[Sync Activity] Reference data sync had issues for tenant ${tenantId}:`, result.error);
    }

    console.log(`[Sync Activity] Reference data sync completed for tenant: ${tenantId}`);

    return {
      success: result.success,
      stats: result.stats || {},
      error: result.error || null,
    };
  } catch (error) {
    console.error(`[Sync Activity] Reference data sync failed for tenant ${tenantId}:`, error);

    return {
      success: false,
      error: {
        message: error.message,
        type: error.constructor?.name || 'Error',
        stack: error.stack,
      },
    };
  }
}

/**
 * Validate Sync Completion Activity
 * Validates that sync completed successfully and data is consistent
 */
export async function validateSyncCompletion({ tenantId }) {
  await ensureMongoConnection();

  if (!tenantId) {
    throw new Error('tenantId is required for validateSyncCompletion activity');
  }

  console.log(`[Sync Activity] Validating sync completion for tenant: ${tenantId}`);

  try {
    const syncStatus = await TenantSyncStatus.findOne({ tenantId });

    if (!syncStatus) {
      return {
        success: false,
        isValid: false,
        issues: ['Sync status not found'],
        error: {
          message: 'Sync status not found',
          type: 'NotFoundError',
        },
      };
    }

    const issues = [];

    // Check if essential collections are synced
    const essentialCollections = ['tenants', 'organizations', 'roles', 'users'];
    for (const collection of essentialCollections) {
      const collectionStatus = syncStatus.collections?.[collection];
      if (!collectionStatus || collectionStatus.status !== 'completed') {
        issues.push(`Essential collection ${collection} not synced (status: ${collectionStatus?.status || 'unknown'})`);
      }
    }

    // Check if reference collections are synced (warnings, not errors)
    const referenceCollections = ['employeeAssignments', 'roleAssignments', 'creditConfigs', 'entityCredits'];
    for (const collection of referenceCollections) {
      const collectionStatus = syncStatus.collections?.[collection];
      if (!collectionStatus || collectionStatus.status !== 'completed') {
        issues.push(`Reference collection ${collection} not synced (status: ${collectionStatus?.status || 'unknown'}) - non-critical`);
      }
    }

    // Check overall status
    if (syncStatus.status !== 'completed') {
      issues.push(`Overall sync status is ${syncStatus.status}, expected 'completed'`);
    }

    const isValid = issues.length === 0;

    console.log(`[Sync Activity] Validation ${isValid ? 'passed' : 'failed'} for tenant: ${tenantId}`);
    if (issues.length > 0) {
      console.log(`[Sync Activity] Issues found:`, issues);
    }

    return {
      success: true,
      isValid,
      issues,
      syncStatus: {
        status: syncStatus.status,
        phase: syncStatus.phase,
        totalRecords: syncStatus.totalRecords,
        completedAt: syncStatus.completedAt,
      },
    };
  } catch (error) {
    console.error(`[Sync Activity] Validation failed for tenant ${tenantId}:`, error);

    return {
      success: false,
      isValid: false,
      issues: [`Validation error: ${error.message}`],
      error: {
        message: error.message,
        type: error.constructor?.name || 'Error',
        stack: error.stack,
      },
    };
  }
}


