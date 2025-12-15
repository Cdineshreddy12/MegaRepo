import mongoose from 'mongoose';

/**
 * Pending Message Record
 * 
 * Tracks pending messages that were processed (edge case: consumer crash before ACK).
 * Only stores records for pending messages to prevent duplicate processing after consumer restart.
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
  processedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['completed', 'failed'],
    default: 'completed',
    index: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index for fast lookup (unique per message in stream/group)
pendingMessageRecordSchema.index(
  { messageId: 1, stream: 1, consumerGroup: 1 },
  { unique: true } // Prevent duplicate records
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

