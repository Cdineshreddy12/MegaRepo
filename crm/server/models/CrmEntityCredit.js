import mongoose from 'mongoose';
// Clean schema with only required fields for CRM entity credits
const crmEntityCreditSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  // References with backward-compatible string fields
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false // Made optional for two-phase creation
    // Removed index: true since we use entityIdString for uniqueness
  },
  entityIdString: {
    type: String,
    index: true // For queries using external IDs
  },
  allocatedCredits: {
    type: Number,
    required: true,
    min: 0
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  targetApplication: {
    type: String,
    required: true,
    enum: ['crm'],
    default: 'crm'
  },
  usedCredits: {
    type: Number,
    default: 0,
    min: 0
  },
  availableCredits: {
    type: Number,
    default: function() {
      const allocated = Number(this.allocatedCredits) || 0;
      const used = Number(this.usedCredits) || 0;
      return Math.max(0, allocated - used);
    }
  },
  expiresAt: {
    type: Date,
    sparse: true // Optional expiration - indexed below with TTL
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  transactionIds: [{
    type: String,
    index: true
  }],
  lastTransactionId: {
    type: String
  },
  reconciliationStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced'
  },
  // Additional fields from wrapper API (audit fields - keep as strings)
  allocationType: {
    type: String,
    enum: ['manual', 'automatic', 'system'],
    default: 'manual'
  },
  allocationPurpose: {
    type: String,
    trim: true
  },
  allocationSource: {
    type: String,
    enum: ['system', 'manual', 'api'],
    default: 'system'
  },
  // References for allocatedBy (user who allocated credits)
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    index: true
  },
  allocatedByString: {
    type: String,
    index: true // For queries using external user IDs
  },
  allocatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
crmEntityCreditSchema.index({ tenantId: 1, entityIdString: 1 }, { unique: true }); // Use string for uniqueness
crmEntityCreditSchema.index({ tenantId: 1, isActive: 1 });
crmEntityCreditSchema.index({ tenantId: 1, targetApplication: 1 });
crmEntityCreditSchema.index({ tenantId: 1, allocationType: 1 });
crmEntityCreditSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to calculate available credits
crmEntityCreditSchema.pre('save', function(next) {
  try {
    // Ensure numeric values and calculate available credits
    const allocated = Number(this.allocatedCredits) || 0;
    const used = Number(this.usedCredits) || 0;

    // Calculate available credits (ensure it's not NaN)
    const available = Math.max(0, allocated - used);

    // Debug logging
    console.log(`Entity Credit Save: allocated=${allocated}, used=${used}, calculated available=${available}`);

    // Only set if the result is a valid number
    if (!isNaN(available) && isFinite(available)) {
      this.availableCredits = available;
    } else {
      console.log(`Warning: Invalid available credits calculation: ${available}`);
      this.availableCredits = 0; // Fallback
    }

    // Ensure all numeric fields are valid numbers
    this.allocatedCredits = allocated;
    this.usedCredits = used;
  } catch (error) {
    console.log(`Error in entity credit pre-save: ${error.message}`);
    // If calculation fails, set safe defaults
    this.availableCredits = 0;
    this.allocatedCredits = Number(this.allocatedCredits) || 0;
    this.usedCredits = Number(this.usedCredits) || 0;
  }
  next();
});

// Instance method to consume credits with atomic operations
crmEntityCreditSchema.methods.consumeCredits = function(amount, operationDetails = {}) {
  if (!this.isActive) {
    throw new Error('Credit allocation is not active');
  }

  if (this.expiresAt && new Date() > this.expiresAt) {
    throw new Error('Credit allocation has expired');
  }

  // Calculate current available credits
  const currentAvailable = Math.max(0, this.allocatedCredits - this.usedCredits);
  if (currentAvailable < amount) {
    throw new Error('Insufficient credits available');
  }

  // Use atomic update to prevent race conditions
  // Check that usedCredits hasn't changed and allocatedCredits is sufficient
  return this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version, // Optimistic locking
      usedCredits: this.usedCredits, // Ensure no concurrent consumption
      allocatedCredits: { $gte: this.usedCredits + amount } // Ensure sufficient allocation
    },
    {
      $inc: {
        usedCredits: amount,
        version: 1
      },
      $set: {
        lastConsumption: {
          amount: amount,
          timestamp: new Date(),
          ...operationDetails
        },
        updatedAt: new Date()
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).then(updatedDoc => {
    if (!updatedDoc) {
      // Either version conflict or insufficient credits (race condition)
      throw new Error('Concurrent modification or insufficient credits');
    }

    // Update local instance
    Object.assign(this, updatedDoc.toObject());
    return this;
  });
};

// Instance method to add credits with conflict resolution
crmEntityCreditSchema.methods.addCredits = function(amount, reason = '', source = 'crm') {
  // Use atomic update to safely add credits
  return this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      version: this.version // Optimistic locking
    },
    {
      $inc: {
        allocatedCredits: amount,
        version: 1
      },
      $set: {
        lastSyncAt: source === 'wrapper' ? new Date() : this.lastSyncAt,
        creditAddition: {
          amount: amount,
          reason: reason,
          source: source,
          timestamp: new Date()
        },
        updatedAt: new Date()
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).then(updatedDoc => {
    if (!updatedDoc) {
      throw new Error('Concurrent modification during credit addition');
    }

    // Update local instance
    Object.assign(this, updatedDoc.toObject());
    return this;
  });
};

// Method to sync credits from wrapper with conflict resolution
crmEntityCreditSchema.methods.syncFromWrapper = function(newAllocatedCredits, wrapperVersion = null) {
  const creditDifference = newAllocatedCredits - this.allocatedCredits;

  if (creditDifference === 0) {
    // No change needed
    return Promise.resolve(this);
  }

  // Use atomic update for sync
  const updateData = {
    $set: {
      allocatedCredits: newAllocatedCredits,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
      version: this.version + 1
    }
  };

  // If wrapper provides version, use it for conflict detection
  const query = { _id: this._id };
  if (wrapperVersion) {
    query.wrapperVersion = wrapperVersion;
  }

  return this.constructor.findOneAndUpdate(query, updateData, {
    new: true,
    runValidators: true
  }).then(updatedDoc => {
    if (!updatedDoc) {
      throw new Error('Sync conflict: Wrapper data may be stale');
    }

    // Update local instance
    Object.assign(this, updatedDoc.toObject());
    return this;
  });
};

// Static method to get total credits for tenant
crmEntityCreditSchema.statics.getTenantTotalCredits = function(tenantId, targetApplication = 'crm') {
  return this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        targetApplication: targetApplication,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalAllocated: { $sum: '$allocatedCredits' },
        totalUsed: { $sum: '$usedCredits' },
        totalAvailable: { $sum: '$availableCredits' }
      }
    }
  ]);
};

// Import relationships
import { entityCreditRelationships } from './relationships.js';

// Add relationship methods to entity credit schema
crmEntityCreditSchema.methods.getOrganization = entityCreditRelationships.getOrganization;
crmEntityCreditSchema.methods.getTenant = entityCreditRelationships.getTenant;
crmEntityCreditSchema.methods.getAllocatedByUser = entityCreditRelationships.getAllocatedByUser;
crmEntityCreditSchema.methods.canConsumeCredits = entityCreditRelationships.canConsumeCredits;
// Note: consumeCredits is already defined above, so we don't override it

export default mongoose.model('CrmEntityCredit', crmEntityCreditSchema);