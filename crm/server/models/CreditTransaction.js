import mongoose from 'mongoose';

// Credit transaction log for audit trail
const creditTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },

  // Transaction details
  type: {
    type: String,
    enum: ['allocation', 'consumption', 'reservation', 'commit', 'release'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Context information
  operationType: {
    type: String,
    trim: true
  },
  operationId: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['wrapper', 'crm', 'system'],
    required: true
  },

  // References
  creditRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmEntityCredit'
  },

  // Reservation-specific fields
  reservationId: {
    type: String,
    sparse: true
  },
  expiresAt: {
    type: Date,
    sparse: true
  },

  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  processedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
creditTransactionSchema.index({ tenantId: 1, entityId: 1, createdAt: -1 });
creditTransactionSchema.index({ tenantId: 1, entityId: 1, type: 1 });
creditTransactionSchema.index({ tenantId: 1, entityId: 1, status: 1 });
creditTransactionSchema.index({ reservationId: 1 }, { sparse: true });
creditTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Instance methods
creditTransactionSchema.methods.markProcessed = function() {
  this.status = 'processed';
  this.processedAt = new Date();
  return this.save();
};

creditTransactionSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processedAt = new Date();
  return this.save();
};

// Static methods
creditTransactionSchema.statics.generateTransactionId = function() {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

creditTransactionSchema.statics.findByEntity = function(tenantId, entityId, limit = 50) {
  return this.find({ tenantId, entityId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

creditTransactionSchema.statics.getEntityBalance = async function(tenantId, entityId) {
  const transactions = await this.find({
    tenantId,
    entityId,
    status: 'processed'
  });

  let allocated = 0;
  let consumed = 0;

  for (const tx of transactions) {
    if (tx.type === 'allocation') {
      allocated += tx.amount;
    } else if (tx.type === 'consumption') {
      consumed += tx.amount;
    }
  }

  return {
    allocatedCredits: allocated,
    usedCredits: consumed,
    availableCredits: allocated - consumed
  };
};

export default mongoose.model('CreditTransaction', creditTransactionSchema);
