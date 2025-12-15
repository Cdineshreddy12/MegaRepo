import { db } from '../db/index.js';
import { eventTracking } from '../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getRedis } from '../utils/redis.js';

/**
 * Event Tracking Service
 * Tracks events published to external systems and handles acknowledgments
 */
export class EventTrackingService {

  /**
   * Track a published event
   */
  /**
   * Track a published event (zero-db-success storage)
   * Only stores failed events, successful ones are never stored in DB
   */
  static async trackPublishedEvent({
    eventId,
    eventType,
    tenantId,
    entityId,
    streamKey,
    sourceApplication = 'wrapper',
    targetApplication,
    eventData,
    publishedBy,
    metadata = {}
  }) {
    // For successful events: ZERO database storage
    // Only track in Redis/memory for real-time metrics
    await this.trackPendingInRedis(eventId, {
      eventType,
      tenantId,
      sourceApplication,
      targetApplication,
      publishedAt: new Date()
    });

    console.log(`📝 Event tracked in memory: ${sourceApplication} → ${targetApplication} (${eventType})`);
    return { tracked: true, storage: 'memory-only' };
  }

  /**
   * Track pending events in Redis for real-time metrics
   */
  static async trackPendingInRedis(eventId, eventInfo) {
    try {
      const redis = getRedis();
      if (!redis) return;

      const key = `pending_events:${eventInfo.tenantId}`;
      const field = `${eventInfo.sourceApplication}_${eventInfo.targetApplication}`;

      // Increment pending count for this communication channel
      await redis.hincrby(key, field, 1);

      // Store event info for potential failure tracking
      const eventKey = `event:${eventId}`;
      await redis.hmset(eventKey, {
        eventType: eventInfo.eventType,
        sourceApp: eventInfo.sourceApplication,
        targetApp: eventInfo.targetApplication,
        tenantId: eventInfo.tenantId,
        publishedAt: eventInfo.publishedAt.toISOString(),
        status: 'pending'
      });

      // Expire after 24 hours (cleanup)
      await redis.expire(eventKey, 24 * 60 * 60);

    } catch (error) {
      console.warn('⚠️ Failed to track in Redis:', error.message);
      // Don't fail the event if Redis tracking fails
    }
  }

  /**
   * Mark an event as acknowledged (zero-db-success storage)
   */
  static async acknowledgeEvent(eventId, acknowledgmentData = {}) {
    try {
      // Update Redis tracking - decrement pending count
      await this.updateRedisAcknowledgment(eventId, acknowledgmentData);

      // For successful events: ZERO database storage
      // Only log externally if configured
      await this.logSuccessfulAcknowledgment({ eventId }, acknowledgmentData);

      console.log(`✅ Event acknowledged (no DB storage): ${eventId}`);
      return { acknowledged: true, storage: 'none' };
    } catch (error) {
      console.error(`❌ Failed to acknowledge event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Update Redis tracking when event is acknowledged
   */
  static async updateRedisAcknowledgment(eventId, acknowledgmentData) {
    try {
      const redis = getRedis();
      if (!redis) return;

      // Get event info from Redis
      const eventKey = `event:${eventId}`;
      const eventData = await redis.hgetall(eventKey);

      if (eventData && eventData.tenantId) {
        // Decrement pending count for this communication channel
        const key = `pending_events:${eventData.tenantId}`;
        const field = `${eventData.sourceApp}_${eventData.targetApp}`;
        await redis.hincrby(key, field, -1);

        // Update event status
        await redis.hset(eventKey, 'status', 'acknowledged');
        await redis.hset(eventKey, 'acknowledgedAt', new Date().toISOString());

        // Expire soon since we don't need it anymore
        await redis.expire(eventKey, 300); // 5 minutes
      }
    } catch (error) {
      console.warn('⚠️ Failed to update Redis acknowledgment:', error.message);
    }
  }

  /**
   * Log successful acknowledgments to external system (optional)
   */
  static async logSuccessfulAcknowledgment(event, acknowledgmentData) {
    // Optional: Send to external logging/monitoring system
    // Could be DataDog, CloudWatch, simple file logging, or just console
    try {
      const logEntry = {
        timestamp: new Date(),
        eventId: event.eventId,
        sourceApp: event.sourceApplication,
        targetApp: event.targetApplication,
        eventType: event.eventType,
        acknowledgmentData,
        processingTimeMs: Date.now() - new Date(event.publishedAt).getTime()
      };

      // Example implementations:
      // await monitoringService.logEvent(logEntry);
      // console.log(JSON.stringify(logEntry));
      // await fileLogger.append('successful-events.log', logEntry);

      console.log(`📊 Logged successful event: ${event.eventId} (${event.sourceApplication}→${event.targetApplication}) in ${logEntry.processingTimeMs}ms`);
    } catch (error) {
      // Don't fail the acknowledgment if logging fails
      console.warn(`⚠️ Failed to log successful acknowledgment: ${error.message}`);
    }
  }

  /**
   * Mark an event as failed (only failed events are stored in DB)
   */
  static async markEventFailed(eventId, errorMessage, incrementRetry = true) {
    try {
      // Get event info from Redis first
      const redis = getRedis();
      let eventInfo = null;

      if (redis) {
        const eventKey = `event:${eventId}`;
        eventInfo = await redis.hgetall(eventKey);
      }

      if (!eventInfo) {
        console.warn(`⚠️ No Redis info for failed event: ${eventId}`);
        return null;
      }

      // Only store failed events in database
      const trackingRecord = {
        eventId,
        eventType: eventInfo.eventType || 'unknown',
        tenantId: eventInfo.tenantId,
        entityId: null, // Could be added if needed
        streamKey: 'inter-app-events', // Assume inter-app for now
        sourceApplication: eventInfo.sourceApp,
        targetApplication: eventInfo.targetApp,
        eventData: {}, // Could be stored if needed
        publishedBy: 'system',
        status: 'failed',
        errorMessage,
        retryCount: incrementRetry ? 1 : 0,
        lastRetryAt: incrementRetry ? new Date() : null
      };

      const [record] = await db
        .insert(eventTracking)
        .values(trackingRecord)
        .returning();

      console.log(`❌ Event stored as failed: ${eventId} - ${errorMessage}`);
      return record;
    } catch (error) {
      console.error(`❌ Failed to mark event ${eventId} as failed:`, error);
      throw error;
    }
  }

  /**
   * Get event status by eventId
   */
  static async getEventStatus(eventId) {
    try {
      const [record] = await db
        .select()
        .from(eventTracking)
        .where(eq(eventTracking.eventId, eventId))
        .limit(1);

      return record || null;
    } catch (error) {
      console.error(`❌ Failed to get event status for ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get unacknowledged events for a tenant (for reconciliation)
   */
  static async getUnacknowledgedEvents(tenantId, hoursOld = 24) {
    try {
      const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));

      const records = await db
        .select()
        .from(eventTracking)
        .where(and(
          eq(eventTracking.tenantId, tenantId),
          eq(eventTracking.acknowledged, false),
          sql`${eventTracking.publishedAt} < ${cutoffTime}`
        ))
        .orderBy(eventTracking.publishedAt);

      return records;
    } catch (error) {
      console.error(`❌ Failed to get unacknowledged events for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync health metrics for a tenant (zero-db-success storage)
   */
  static async getSyncHealthMetrics(tenantId) {
    try {
      // Get data from Redis for pending events
      const redisData = await this.getRedisHealthData(tenantId);

      // Get failed events from database (only failed events are stored)
      const [dbStats] = await db
        .select({
          failedCount: sql`count(*)`,
          retryingCount: sql`count(case when retry_count > 0 then 1 end)`
        })
        .from(eventTracking)
        .where(and(
          eq(eventTracking.tenantId, tenantId),
          eq(eventTracking.status, 'failed')
        ));

      const failedCount = parseInt(dbStats.failedCount) || 0;
      const retryingCount = parseInt(dbStats.retryingCount) || 0;

      // Calculate health status based on Redis pending data
      const totalPending = redisData.totalPending || 0;
      const failureRate = totalPending > 0 ? (failedCount / (totalPending + failedCount) * 100) : 0;
      const healthStatus = failureRate > 20 ? 'degraded' :
                          failureRate > 5 ? 'warning' : 'healthy';

      const metrics = {
        tenantId,
        storageMode: 'zero-db-success', // Indicates maximum optimization
        current: {
          totalPendingEvents: totalPending,
          failedStoredInDb: failedCount,
          retrying: retryingCount,
          failureRate: failureRate.toFixed(2) + '%'
        },
        channelBreakdown: redisData.channels || {},
        health: {
          status: healthStatus,
          message: totalPending === 0 && failedCount === 0 ?
            'All systems healthy - zero pending events' :
            totalPending > 0 ?
            `${totalPending} events pending acknowledgment` :
            `${failedCount} failed events need attention`,
          recommendations: healthStatus === 'degraded' ?
            ['Check consumer processes', 'Review Redis connectivity', 'Check application logs'] :
            []
        },
        performance: {
          databaseStorage: 'Minimal (failed events only)',
          redisUsage: 'Light (pending counters)',
          querySpeed: 'Instant (Redis-based)',
          storageCost: 'Near zero'
        }
      };

      return metrics;
    } catch (error) {
      console.error(`❌ Failed to get sync health metrics for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get health data from Redis
   */
  static async getRedisHealthData(tenantId) {
    try {
      const redis = getRedis();
      if (!redis) return { totalPending: 0, channels: {} };

      const key = `pending_events:${tenantId}`;
      const channelData = await redis.hgetall(key);

      let totalPending = 0;
      const channels = {};

      for (const [channel, count] of Object.entries(channelData)) {
        const countNum = parseInt(count) || 0;
        totalPending += countNum;
        channels[channel] = countNum;
      }

      return { totalPending, channels };
    } catch (error) {
      console.warn('⚠️ Failed to get Redis health data:', error.message);
      return { totalPending: 0, channels: {} };
    }
  }

  /**
   * Get inter-application sync health metrics (zero-db-success storage)
   */
  static async getInterAppSyncHealth(tenantId) {
    try {
      // Get pending events from Redis
      const redisData = await this.getRedisHealthData(tenantId);

      // Get failed events from database (only failed events are stored)
      const [failedStats] = await db
        .select({
          crmToHrFailed: sql`count(case when source_application = 'crm' and target_application = 'hr' then 1 end)`,
          hrToCrmFailed: sql`count(case when source_application = 'hr' and target_application = 'crm' then 1 end)`,
          wrapperToCrmFailed: sql`count(case when source_application = 'wrapper' and target_application = 'crm' then 1 end)`,
          wrapperToHrFailed: sql`count(case when source_application = 'wrapper' and target_application = 'hr' then 1 end)`,
          totalFailed: sql`count(*)`
        })
        .from(eventTracking)
        .where(and(
          eq(eventTracking.tenantId, tenantId),
          eq(eventTracking.status, 'failed')
        ));

      const totalPending = redisData.totalPending || 0;
      const totalFailed = parseInt(failedStats.totalFailed) || 0;

      // Build channel breakdown combining Redis (pending) and DB (failed)
      const channels = {};
      for (const [channel, pendingCount] of Object.entries(redisData.channels)) {
        const [source, target] = channel.split('_');
        const channelKey = `${source} → ${target}`;
        const failedCount = this.getFailedCountForChannel(failedStats, source, target);

        channels[channelKey] = {
          pending: pendingCount,
          failed: failedCount,
          total: pendingCount + failedCount,
          failureRate: (pendingCount + failedCount) > 0 ?
            (failedCount / (pendingCount + failedCount) * 100).toFixed(2) + '%' : '0%',
          health: (pendingCount + failedCount) > 0 && (failedCount / (pendingCount + failedCount)) > 0.1 ?
            'degraded' : 'healthy'
        };
      }

      return {
        tenantId,
        storageMode: 'zero-db-success',
        summary: {
          totalPendingEvents: totalPending,
          totalFailedEventsStored: totalFailed,
          overallFailureRate: (totalPending + totalFailed) > 0 ?
            (totalFailed / (totalPending + totalFailed) * 100).toFixed(2) + '%' : '0%'
        },
        byChannel: channels,
        insights: {
          message: totalPending === 0 && totalFailed === 0 ?
            'All inter-app communication healthy' :
            totalPending > 0 ?
            `${totalPending} events pending between apps` :
            `${totalFailed} failed inter-app communications`,
          recommendations: totalFailed > 3 ?
            ['Check inter-app consumer processes', 'Review Redis streams', 'Check application connectivity'] :
            []
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get inter-app sync health for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Helper to get failed count for a specific channel
   */
  static getFailedCountForChannel(failedStats, source, target) {
    const key = `${source}To${target.charAt(0).toUpperCase() + target.slice(1)}Failed`;
    return parseInt(failedStats[key]) || 0;
  }

  /**
   * Clean up old events (zero-db-success storage)
   */
  static async cleanupOldEvents(daysOld = 7) {
    try {
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));

      // Clean up database: only failed events (successful ones never stored)
      const [dbResult] = await db
        .delete(eventTracking)
        .where(and(
          eq(eventTracking.status, 'failed'),
          sql`${eventTracking.publishedAt} < ${cutoffDate}`
        ));

      // Clean up Redis: old pending event tracking
      const redis = getRedis();
      if (redis) {
        try {
          // Get all tenant keys for pending events
          const tenantKeys = await redis.keys('pending_events:*');

          for (const key of tenantKeys) {
            const tenantId = key.replace('pending_events:', '');
            // Reset old counters (they auto-expire anyway, but this is cleanup)
            await redis.del(key);
          }

          // Clean up individual event keys that are very old
          const eventKeys = await redis.keys('event:*');
          for (const eventKey of eventKeys) {
            const eventData = await redis.hgetall(eventKey);
            if (eventData.publishedAt) {
              const publishedAt = new Date(eventData.publishedAt);
              if (publishedAt < cutoffDate) {
                await redis.del(eventKey);
              }
            }
          }
        } catch (redisError) {
          console.warn('⚠️ Redis cleanup failed:', redisError.message);
        }
      }

      const totalCleaned = dbResult?.rowCount || 0;

      console.log(`🧹 Cleaned up ${totalCleaned} old failed events from database`);
      console.log(`🧹 Cleaned up Redis pending event tracking`);
      return totalCleaned;
    } catch (error) {
      console.error('❌ Failed to cleanup old events:', error);
      throw error;
    }
  }
}
