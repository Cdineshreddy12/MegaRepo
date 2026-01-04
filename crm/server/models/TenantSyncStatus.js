import mongoose from 'mongoose';

const tenantSyncStatusSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    phase: {
      type: String,
      enum: ['independent', 'dependent', 'completed'],
      default: 'independent',
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    nextAttemptAt: {
      type: Date,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    errorDetails: {
      message: String,
      stack: String,
      code: String,
      lastErrorAt: Date,
    },
    syncLock: {
      isLocked: {
        type: Boolean,
        default: false,
        index: true,
      },
      lockedAt: Date,
      lockedBy: String, // Process ID or instance identifier
      lockExpiry: Date,
    },
    collections: {
      tenants: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      users: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      organizations: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      roles: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      employeeAssignments: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      roleAssignments: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      creditConfigs: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
      entityCredits: {
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
        recordCount: { type: Number, default: 0 },
        lastSyncAt: Date,
        error: String,
      },
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      triggeredBy: String,
      triggerSource: String, // 'auto', 'manual', 'api'
      retryReason: String,
      notes: String,
    },
  },
  {
    timestamps: true,
    collection: 'tenantSyncStatuses',
  }
);

// Indexes for performance
tenantSyncStatusSchema.index({ status: 1, nextAttemptAt: 1 });
tenantSyncStatusSchema.index({ 'syncLock.isLocked': 1, 'syncLock.lockExpiry': 1 });
tenantSyncStatusSchema.index({ updatedAt: -1 });

// Instance methods
tenantSyncStatusSchema.methods.acquireLock = async function (processId, lockDurationMs = 300000) {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + lockDurationMs);

  // Try to acquire lock
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      $or: [
        { 'syncLock.isLocked': false },
        { 'syncLock.lockExpiry': { $lt: now } }, // Lock has expired
      ],
    },
    {
      $set: {
        'syncLock.isLocked': true,
        'syncLock.lockedAt': now,
        'syncLock.lockedBy': processId,
        'syncLock.lockExpiry': lockExpiry,
      },
    },
    { new: true }
  );

  return !!updated;
};

tenantSyncStatusSchema.methods.releaseLock = async function () {
  this.syncLock = {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    lockExpiry: null,
  };
  return this.save();
};

tenantSyncStatusSchema.methods.markPhaseComplete = async function (phase) {
  if (phase === 'independent') {
    this.phase = 'dependent';
  } else if (phase === 'dependent') {
    this.phase = 'completed';
    this.status = 'completed';
    this.completedAt = new Date();
  }
  return this.save();
};

tenantSyncStatusSchema.methods.markCollectionSynced = async function (collectionName, recordCount = 0) {
  const now = new Date();
  
  // Map collection names to schema field names
  const collectionMap = {
    'tenant': 'tenants',
    'tenants': 'tenants',
    'organization': 'organizations',
    'organizations': 'organizations',
    'role': 'roles',
    'roles': 'roles',
    'user': 'users',
    'users': 'users',
    'userProfile': 'users',
    'userProfiles': 'users',
    'employeeAssignment': 'employeeAssignments',
    'employeeAssignments': 'employeeAssignments',
    'roleAssignment': 'roleAssignments',
    'roleAssignments': 'roleAssignments',
    'creditConfig': 'creditConfigs',
    'creditConfigs': 'creditConfigs',
    'entityCredit': 'entityCredits',
    'entityCredits': 'entityCredits',
  };
  
  const mappedName = collectionMap[collectionName] || collectionName;
  
  if (this.collections && this.collections[mappedName]) {
    this.collections[mappedName].status = 'completed';
    this.collections[mappedName].recordCount = recordCount;
    this.collections[mappedName].lastSyncAt = now;
    this.collections[mappedName].error = null;
    
    // Update total records
    this.totalRecords = (this.totalRecords || 0) + recordCount;
    
    // Mark as modified to trigger save
    this.markModified(`collections.${mappedName}`);
  }
  
  return this.save();
};

tenantSyncStatusSchema.methods.completeSync = async function (totalRecords = 0, durationMs = 0) {
  this.status = 'completed';
  this.phase = 'completed';
  this.completedAt = new Date();
  this.totalRecords = totalRecords;
  this.durationMs = durationMs;
  
  // Release lock
  this.syncLock = {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    lockExpiry: null,
  };
  
  return this.save();
};

tenantSyncStatusSchema.methods.failSync = async function (errorMessage, errorCode = 'UNKNOWN') {
  const now = new Date();
  
  this.status = 'failed';
  this.lastAttemptAt = now;
  this.attemptCount += 1;
  
  // Store error details
  this.errorDetails = {
    message: errorMessage,
    code: errorCode,
    lastErrorAt: now,
  };
  
  // Calculate next retry time (exponential backoff)
  const baseDelay = 60000; // 1 minute
  const maxDelay = 3600000; // 1 hour
  const delay = Math.min(baseDelay * Math.pow(2, this.attemptCount - 1), maxDelay);
  this.nextAttemptAt = new Date(now.getTime() + delay);
  
  // Release lock
  this.syncLock = {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    lockExpiry: null,
  };
  
  return this.save();
};

// Instance methods
tenantSyncStatusSchema.methods.hasFailedCollections = function () {
  if (!this.collections) return false;

  const collectionNames = ['tenants', 'users', 'organizations', 'roles', 'employeeAssignments', 'roleAssignments', 'creditConfigs', 'entityCredits'];

  return collectionNames.some(collectionName => {
    return this.collections[collectionName] && this.collections[collectionName].status === 'failed';
  });
};

tenantSyncStatusSchema.methods.getFailedCollections = function () {
  if (!this.collections) return [];

  const collectionNames = ['tenants', 'users', 'organizations', 'roles', 'employeeAssignments', 'roleAssignments', 'creditConfigs', 'entityCredits'];
  const failedCollections = [];

  collectionNames.forEach(collectionName => {
    if (this.collections[collectionName] && this.collections[collectionName].status === 'failed') {
      failedCollections.push({
        collection: collectionName,
        error: this.collections[collectionName].error,
        lastSyncAt: this.collections[collectionName].lastSyncAt
      });
    }
  });

  return failedCollections;
};

// Static methods
tenantSyncStatusSchema.statics.needsSync = async function (tenantId) {
  const syncStatus = await this.findOne({ tenantId });

  // If no record exists, sync is needed
  if (!syncStatus) {
    return true;
  }

  // If sync is completed, verify that tenant record actually exists
  // This handles cases where data was deleted but sync status still says "completed"
  if (syncStatus.status === 'completed') {
    try {
      const mongoose = (await import('mongoose')).default;
      const Tenant = mongoose.model('Tenant');
      const tenant = await Tenant.findOne({ tenantId });
      
      // If tenant record doesn't exist, sync is needed (data was deleted)
      if (!tenant) {
        console.log(`⚠️ [NEEDSSYNC] Sync status says "completed" but tenant record not found for ${tenantId}, re-sync needed`);
        return true;
      }
      
      // Tenant exists, no sync needed
      return false;
    } catch (error) {
      // If we can't check, err on the side of caution and trigger sync
      console.warn(`⚠️ [NEEDSSYNC] Error checking tenant existence for ${tenantId}: ${error.message}, will trigger sync`);
      return true;
    }
  }

  // If sync is in progress and not expired, no need to trigger another
  if (
    syncStatus.status === 'in_progress' &&
    syncStatus.syncLock.isLocked &&
    syncStatus.syncLock.lockExpiry > new Date()
  ) {
    return false;
  }

  // If sync failed or is pending, it needs sync
  return true;
};

tenantSyncStatusSchema.statics.cleanupStuckSyncs = async function (stuckThresholdMs = 600000) {
  const now = new Date();
  const stuckThreshold = new Date(now.getTime() - stuckThresholdMs);

  const result = await this.updateMany(
    {
      status: 'in_progress',
      'syncLock.isLocked': true,
      'syncLock.lockExpiry': { $lt: stuckThreshold },
    },
    {
      $set: {
        status: 'failed',
        'syncLock.isLocked': false,
        'errorDetails.message': 'Sync marked as failed due to stuck lock',
        'errorDetails.lastErrorAt': now,
      },
    }
  );

  return result.modifiedCount;
};

const TenantSyncStatus = mongoose.model('TenantSyncStatus', tenantSyncStatusSchema);

export default TenantSyncStatus;

