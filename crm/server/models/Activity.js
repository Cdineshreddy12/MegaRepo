import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  operation: {
    type: String,
    required: true,
    index: true
  },
  operationCode: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    index: true
  },
  entityId: {
    type: String,
    index: true
  },
  creditsUsed: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String
}, {
  timestamps: true
});

// Indexes
activitySchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
activitySchema.index({ tenantId: 1, operationCode: 1, timestamp: -1 });
activitySchema.index({ tenantId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('Activity', activitySchema);
