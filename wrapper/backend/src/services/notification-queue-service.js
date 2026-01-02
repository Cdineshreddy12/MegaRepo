import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationService } from './notification-service.js';
import { broadcastToTenant } from '../utils/websocket-server.js';

/**
 * Notification Queue Service
 * Handles async processing of notifications using BullMQ
 */
class NotificationQueueService {
  constructor() {
    // Create Redis connection for BullMQ (ioredis instance)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    // Create queues
    this.immediateQueue = new Queue('notifications-immediate', { connection: this.connection });
    this.bulkQueue = new Queue('notifications-bulk', { connection: this.connection });
    this.scheduledQueue = new Queue('notifications-scheduled', { connection: this.connection });

    // Create queue events for monitoring
    this.queueEvents = {
      immediate: new QueueEvents('notifications-immediate', { connection: this.connection }),
      bulk: new QueueEvents('notifications-bulk', { connection: this.connection }),
      scheduled: new QueueEvents('notifications-scheduled', { connection: this.connection })
    };

    // Workers
    this.workers = {};
    this.notificationService = new NotificationService();

    this.initializeWorkers();
  }

  /**
   * Initialize workers for each queue
   */
  initializeWorkers() {
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '10');

    // Immediate notifications worker (high priority)
    this.workers.immediate = new Worker(
      'notifications-immediate',
      async (job) => {
        return await this.processNotification(job.data);
      },
      {
        connection: this.connection,
        concurrency: concurrency,
        removeOnComplete: { count: 1000, age: 3600 }, // Keep last 1000 jobs for 1 hour
        removeOnFail: { count: 5000, age: 86400 } // Keep failed jobs for 24 hours
      }
    );

    // Bulk notifications worker
    this.workers.bulk = new Worker(
      'notifications-bulk',
      async (job) => {
        return await this.processBulkNotifications(job.data);
      },
      {
        connection: this.connection,
        concurrency: Math.max(1, Math.floor(concurrency / 2)), // Lower concurrency for bulk
        removeOnComplete: { count: 100, age: 3600 },
        removeOnFail: { count: 1000, age: 86400 }
      }
    );

    // Scheduled notifications worker
    this.workers.scheduled = new Worker(
      'notifications-scheduled',
      async (job) => {
        return await this.processNotification(job.data);
      },
      {
        connection: this.connection,
        concurrency: 5,
        removeOnComplete: { count: 500, age: 3600 },
        removeOnFail: { count: 1000, age: 86400 }
      }
    );

    // Set up error handlers
    Object.values(this.workers).forEach(worker => {
      worker.on('completed', (job) => {
        console.log(`✅ Notification job ${job.id} completed`);
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Notification job ${job.id} failed:`, err.message);
      });
    });
  }

  /**
   * Process a single notification
   */
  async processNotification(data) {
    try {
      const { notificationData, tenantId } = data;

      // Create notification
      const notification = await this.notificationService.createNotification({
        ...notificationData,
        tenantId
      });

      // Broadcast via WebSocket
      try {
        broadcastToTenant(tenantId, notification);
      } catch (wsError) {
        console.warn(`WebSocket broadcast failed for tenant ${tenantId}:`, wsError.message);
        // Don't fail the job if WebSocket fails
      }

      return {
        success: true,
        notificationId: notification.notificationId,
        tenantId
      };
    } catch (error) {
      console.error('Error processing notification:', error);
      throw error;
    }
  }

  /**
   * Process bulk notifications (batch of 100)
   */
  async processBulkNotifications(data) {
    try {
      const { notifications, batchSize = 100 } = data;
      const results = [];

      // Process in batches
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(notif => this.processNotification(notif))
        );

        results.push(...batchResults.map((result, idx) => ({
          index: i + idx,
          success: result.status === 'fulfilled',
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        })));
      }

      return {
        success: true,
        processed: results.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error processing bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Add immediate notification to queue
   */
  async addImmediate(notificationData, tenantId, options = {}) {
    try {
      const job = await this.immediateQueue.add(
        'send-notification',
        { notificationData, tenantId },
        {
          priority: options.priority || 0,
          attempts: options.attempts || 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      return {
        jobId: job.id,
        queue: 'immediate'
      };
    } catch (error) {
      console.error('Error adding immediate notification to queue:', error);
      throw error;
    }
  }

  /**
   * Add bulk notifications to queue
   */
  async addBulk(notifications, options = {}) {
    try {
      const job = await this.bulkQueue.add(
        'bulk-send',
        { notifications, batchSize: options.batchSize || 100 },
        {
          priority: options.priority || 0,
          attempts: options.attempts || 2,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      return {
        jobId: job.id,
        queue: 'bulk',
        totalNotifications: notifications.length
      };
    } catch (error) {
      console.error('Error adding bulk notifications to queue:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for later
   */
  async schedule(notificationData, tenantId, scheduledAt, options = {}) {
    try {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      
      if (delay < 0) {
        throw new Error('Scheduled time must be in the future');
      }

      const job = await this.scheduledQueue.add(
        'scheduled-notification',
        { notificationData, tenantId },
        {
          delay,
          attempts: options.attempts || 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      return {
        jobId: job.id,
        queue: 'scheduled',
        scheduledAt
      };
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    try {
      const queue = this[`${queueName}Queue`];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress || 0;

      return {
        jobId: job.id,
        status: state,
        progress,
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp
      };
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(queueName, jobId) {
    try {
      const queue = this[`${queueName}Queue`];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        return { success: true, jobId };
      }

      return { success: false, message: 'Job not found' };
    } catch (error) {
      console.error('Error canceling job:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    try {
      const queue = this[`${queueName}Queue`];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount()
      ]);

      return {
        queue: queueName,
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Close all queues and workers
   */
  async close() {
    try {
      // Close workers
      await Promise.all(Object.values(this.workers).map(worker => worker.close()));

      // Close queues
      await Promise.all([
        this.immediateQueue.close(),
        this.bulkQueue.close(),
        this.scheduledQueue.close()
      ]);

      // Close queue events
      await Promise.all(Object.values(this.queueEvents).map(events => events.close()));

      console.log('✅ All notification queues and workers closed');
    } catch (error) {
      console.error('Error closing queues:', error);
      throw error;
    }
  }
}

export const notificationQueueService = new NotificationQueueService();
export default notificationQueueService;

