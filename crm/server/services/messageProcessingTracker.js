/**
 * Message Processing Tracker Service
 * 
 * Centralized service for tracking message processing lifecycle and ensuring idempotency.
 * Prevents duplicate processing even if consumer crashes after signaling Temporal workflows.
 */

class MessageProcessingTracker {
  constructor() {
    this.PendingMessageRecord = null; // Lazy load to avoid circular dependencies
    this.STALE_PROCESSING_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Lazy load PendingMessageRecord model
   */
  async getModel() {
    if (!this.PendingMessageRecord) {
      const module = await import('../models/PendingMessageRecord.js');
      this.PendingMessageRecord = module.default;
    }
    return this.PendingMessageRecord;
  }

  /**
   * Check if a message has already been processed
   * @param {string} messageId - Redis message ID
   * @param {string} eventType - Event type (optional but recommended)
   * @param {string} stream - Stream name (optional, for backward compatibility)
   * @param {string} consumerGroup - Consumer group (optional, for backward compatibility)
   * @returns {Promise<boolean>} - true if already processed or currently processing
   */
  async checkMessageProcessed(messageId, eventType = null, stream = null, consumerGroup = null) {
    try {
      const PendingMessageRecord = await this.getModel();
      
      const query = { messageId };
      
      // If eventType provided, use it for more precise check
      if (eventType) {
        query.eventType = eventType;
      }
      
      // For backward compatibility, also check by stream/group if provided
      if (stream && consumerGroup) {
        query.stream = stream;
        query.consumerGroup = consumerGroup;
      }
      
      // Check for completed or processing status
      query.status = { $in: ['completed', 'processing'] };
      
      const existingRecord = await PendingMessageRecord.findOne(query);
      
      if (existingRecord) {
        // If stuck in processing state for too long, consider it stale
        if (existingRecord.status === 'processing' && existingRecord.processingStartedAt) {
          const age = Date.now() - existingRecord.processingStartedAt.getTime();
          if (age > this.STALE_PROCESSING_THRESHOLD) {
            console.log(`⚠️ Found stale processing record for ${messageId} (age: ${Math.floor(age / 1000)}s), will cleanup`);
            // Don't return true - let cleanup handle it
            return false;
          }
        }
        return true; // Already processed or currently processing
      }
      
      return false; // Not processed
    } catch (error) {
      console.error('❌ Error checking message processed:', error.message);
      // On error, assume not processed (fail open)
      return false;
    }
  }

  /**
   * Mark a message as processing (atomic operation)
   * @param {string} messageId - Redis message ID
   * @param {string} eventType - Event type
   * @param {string} workflowId - Temporal workflow ID (optional)
   * @param {string} stream - Stream name
   * @param {string} consumerGroup - Consumer group name
   * @returns {Promise<boolean>} - true if successfully marked, false if already processing/completed
   */
  async markMessageProcessing(messageId, eventType, workflowId = null, stream = null, consumerGroup = null) {
    try {
      const PendingMessageRecord = await this.getModel();
      
      // Use findOneAndUpdate with upsert for atomic operation
      // Only update if status is not already 'processing' or 'completed'
      const result = await PendingMessageRecord.findOneAndUpdate(
        {
          messageId,
          ...(eventType && { eventType }),
          ...(stream && consumerGroup && { stream, consumerGroup }),
          status: { $nin: ['processing', 'completed'] } // Only update if not already processing/completed
        },
        {
          messageId,
          eventType: eventType || undefined,
          workflowId: workflowId || undefined,
          stream: stream || undefined,
          consumerGroup: consumerGroup || undefined,
          status: 'processing',
          processingStartedAt: new Date(),
          processedAt: new Date() // Update processedAt as well
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
      
      // If result is null, it means another process already marked it as processing/completed
      if (!result || result.status !== 'processing') {
        console.log(`⚠️ Message ${messageId} already processing/completed, cannot mark as processing`);
        return false;
      }
      
      return true; // Successfully marked as processing
    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        console.log(`⚠️ Race condition: Message ${messageId} already has a record`);
        return false;
      }
      console.error('❌ Error marking message as processing:', error.message);
      return false;
    }
  }

  /**
   * Mark a message as completed
   * @param {string} messageId - Redis message ID
   * @param {string} eventType - Event type
   * @returns {Promise<boolean>} - true if successfully marked
   */
  async markMessageCompleted(messageId, eventType = null) {
    try {
      const PendingMessageRecord = await this.getModel();
      
      const query = { messageId };
      if (eventType) {
        query.eventType = eventType;
      }
      
      const result = await PendingMessageRecord.findOneAndUpdate(
        query,
        {
          status: 'completed',
          processedAt: new Date(),
          $unset: { error: '', processingStartedAt: '' } // Clear error and processingStartedAt
        },
        {
          new: true
        }
      );
      
      return !!result;
    } catch (error) {
      console.error('❌ Error marking message as completed:', error.message);
      return false;
    }
  }

  /**
   * Mark a message as failed
   * @param {string} messageId - Redis message ID
   * @param {string} eventType - Event type
   * @param {string} error - Error message
   * @returns {Promise<boolean>} - true if successfully marked
   */
  async markMessageFailed(messageId, eventType = null, error = null) {
    try {
      const PendingMessageRecord = await this.getModel();
      
      const query = { messageId };
      if (eventType) {
        query.eventType = eventType;
      }
      
      const result = await PendingMessageRecord.findOneAndUpdate(
        query,
        {
          status: 'failed',
          error: error || 'Unknown error',
          processedAt: new Date()
        },
        {
          upsert: true,
          new: true
        }
      );
      
      return !!result;
    } catch (error) {
      console.error('❌ Error marking message as failed:', error.message);
      return false;
    }
  }

  /**
   * Clean up stale processing records (records stuck in "processing" state)
   * @returns {Promise<number>} - Number of records cleaned up
   */
  async cleanupStaleProcessingRecords() {
    try {
      const PendingMessageRecord = await this.getModel();
      
      const threshold = new Date(Date.now() - this.STALE_PROCESSING_THRESHOLD);
      
      const result = await PendingMessageRecord.updateMany(
        {
          status: 'processing',
          processingStartedAt: { $lt: threshold }
        },
        {
          $set: {
            status: 'failed',
            error: 'stale_processing_record',
            processedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${result.modifiedCount} stale processing record(s)`);
      }
      
      return result.modifiedCount;
    } catch (error) {
      console.error('❌ Error cleaning up stale processing records:', error.message);
      return 0;
    }
  }

  /**
   * Get processing statistics
   * @returns {Promise<Object>} - Statistics about message processing
   */
  async getStatistics() {
    try {
      const PendingMessageRecord = await this.getModel();
      
      const [processing, completed, failed, stale] = await Promise.all([
        PendingMessageRecord.countDocuments({ status: 'processing' }),
        PendingMessageRecord.countDocuments({ status: 'completed' }),
        PendingMessageRecord.countDocuments({ status: 'failed' }),
        PendingMessageRecord.countDocuments({
          status: 'processing',
          processingStartedAt: { $lt: new Date(Date.now() - this.STALE_PROCESSING_THRESHOLD) }
        })
      ]);
      
      return {
        processing,
        completed,
        failed,
        stale,
        total: processing + completed + failed
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error.message);
      return {
        processing: 0,
        completed: 0,
        failed: 0,
        stale: 0,
        total: 0
      };
    }
  }
}

// Export singleton instance
const messageProcessingTracker = new MessageProcessingTracker();
export default messageProcessingTracker;

