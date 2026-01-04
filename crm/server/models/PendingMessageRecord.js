import mongoose from 'mongoose';

/**
 * Pending Message Record
 * 
 * Tracks messages through their processing lifecycle to prevent duplicate processing.
 * Handles crash recovery by tracking processing state and ensuring idempotency.
 */
const pendingMessageRecordSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    index: true
  },
  stream: {
    type: String,
    required: true,
    index: true
  },
  consumerGroup: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    index: true,
    sparse: true // Optional for backward compatibility
  },
  workflowId: {
    type: String,
    index: true,
    sparse: true // Optional - only set for Temporal workflow signals
  },
  processingStartedAt: {
    type: Date,
    index: true,
    sparse: true // Set when status changes to 'processing'
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
    enum: ['processing', 'completed', 'failed'],
    default: 'completed',
    index: true
  },
  error: {
    type: String,
    sparse: true // Only set when status is 'failed'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index for fast lookup (unique per message in stream/group)
pendingMessageRecordSchema.index(
  { messageId: 1, stream: 1, consumerGroup: 1 },
  { unique: true } // Prevent duplicate records
);

// Index for idempotency checks by messageId + eventType
pendingMessageRecordSchema.index(
  { messageId: 1, eventType: 1, status: 1 },
  { unique: false }
);

// Index for stale record cleanup (processing status + processingStartedAt)
pendingMessageRecordSchema.index(
  { status: 1, processingStartedAt: 1 },
  { sparse: true }
);

// TTL Index: Auto-delete records older than 30 days
pendingMessageRecordSchema.index(
  { processedAt: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days in seconds
    name: 'processedAt_ttl'
  }
);

export default mongoose.model('PendingMessageRecord', pendingMessageRecordSchema);

