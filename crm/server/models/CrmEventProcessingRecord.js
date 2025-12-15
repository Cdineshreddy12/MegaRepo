import mongoose from 'mongoose';

/**
 * CRM Event Processing Record
 * 
 * Tracks all events processed by the Redis Streams consumer for idempotency.
 * This ensures exactly-once processing even after application restarts.
 */
const crmEventProcessingRecordSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true,
    enum: [
      'credit.allocated',
      'credit.consumed',
      'credit_config.updated',
      'org_created',
      'org_updated',
      'user_created',
      'user_deactivated',
      'role_assigned',
      'role_unassigned',
      'role_permissions.updated',
      'unknown'
    ]
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: String,
    index: true,
    sparse: true // Optional - entity affected by the event
  },
  processedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['completed', 'failed', 'skipped'],
    default: 'completed',
    index: true
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Stores processing result details:
    // { success: true, creditsAllocated: 120000 }
    // { success: false, error: "..." }
  },
  errorMessage: {
    type: String,
    sparse: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Stores additional event metadata
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index for fast idempotency checks
crmEventProcessingRecordSchema.index(
  { eventId: 1, eventType: 1, tenantId: 1, status: 1 },
  { unique: false } // Allow multiple records for retries, but query filters by status
);

// Index for querying by tenant and date
crmEventProcessingRecordSchema.index({ tenantId: 1, processedAt: -1 });

// Index for querying by event type
crmEventProcessingRecordSchema.index({ eventType: 1, processedAt: -1 });

// TTL Index: Auto-delete records older than 30 days
// MongoDB will automatically remove expired documents every 60 seconds
// This prevents unbounded growth and keeps the collection size manageable
crmEventProcessingRecordSchema.index(
  { processedAt: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days in seconds
    name: 'processedAt_ttl'
  }
);

export default mongoose.model('CrmEventProcessingRecord', crmEventProcessingRecordSchema);
