import { createClient } from 'redis';

// Redis Streams for Wrapper ↔ CRM Synchronization
class RedisStreamsService {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.consumer = null;
    this.isConnected = false;

    // Stream names
    this.STREAMS = {
      CREDIT_EVENTS: 'credit-events',
      CRM_CONSUMER_GROUP: 'crm-consumers'
    };
  }

  async connect() {
    try {
      // Create Redis clients
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.publisher = this.client.duplicate();
      this.consumer = this.client.duplicate();

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.consumer.connect()
      ]);

      this.isConnected = true;
      console.log('✅ Redis Streams connected');

      // Setup consumer group
      await this.setupConsumerGroup();

    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) await this.client.disconnect();
    if (this.publisher) await this.publisher.disconnect();
    if (this.consumer) await this.consumer.disconnect();
    this.isConnected = false;
  }

  async setupConsumerGroup() {
    try {
      // Create consumer group if it doesn't exist
      await this.consumer.xGroupCreate(
        this.STREAMS.CREDIT_EVENTS,
        this.STREAMS.CRM_CONSUMER_GROUP,
        '0', // Start from beginning
        { MKSTREAM: true } // Create stream if it doesn't exist
      );
      console.log('✅ Redis consumer group created');
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        // Consumer group already exists
        console.log('ℹ️ Redis consumer group already exists');
      } else {
        throw error;
      }
    }
  }

  // Wrapper publishes credit allocation events
  async publishCreditAllocation(tenantId, entityId, amount, metadata = {}) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    const eventData = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'credit.allocated',
      tenantId: String(tenantId),
      entityId: String(entityId),
      amount: String(amount),
      timestamp: new Date().toISOString(),
      source: 'wrapper',
      metadata: JSON.stringify(metadata)
    };

    try {
      const result = await this.publisher.xAdd(
        this.STREAMS.CREDIT_EVENTS,
        '*',
        eventData
      );

      console.log(`📨 Published credit allocation event: ${eventData.eventId}`);
      return { success: true, eventId: eventData.eventId, streamId: result };
    } catch (error) {
      console.error('❌ Failed to publish credit allocation event:', error);
      throw error;
    }
  }

  // CRM publishes credit consumption events
  async publishCreditConsumption(tenantId, entityId, amount, operationType, operationId, userId, metadata = {}) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    const eventData = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'credit.consumed',
      tenantId: String(tenantId),
      entityId: String(entityId),
      userId: String(userId || ''),
      amount: String(amount),
      operationType: String(operationType),
      operationId: String(operationId || ''),
      timestamp: new Date().toISOString(),
      source: 'crm',
      metadata: JSON.stringify(metadata)
    };

    try {
      const result = await this.publisher.xAdd(
        this.STREAMS.CREDIT_EVENTS,
        '*',
        eventData
      );

      console.log(`📨 Published credit consumption event: ${eventData.eventId}`);
      return { success: true, eventId: eventData.eventId, streamId: result };
    } catch (error) {
      console.error('❌ Failed to publish credit consumption event:', error);
      throw error;
    }
  }

  // CRM consumes events from Redis streams
  async consumeCreditEvents(consumerName = 'crm-consumer-1') {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      // Read pending messages first
      const pendingResult = await this.consumer.xReadGroup(
        this.STREAMS.CRM_CONSUMER_GROUP,
        consumerName,
        [{ key: this.STREAMS.CREDIT_EVENTS, id: '0' }], // Read from start
        { COUNT: 10, BLOCK: 5000 } // Read up to 10 messages, block for 5 seconds
      );

      if (pendingResult && pendingResult.length > 0) {
        for (const stream of pendingResult) {
          for (const message of stream.messages) {
            await this.processCreditEvent(message, consumerName);
          }
        }
      }

      // Continuously read new messages
      while (true) {
        const result = await this.consumer.xReadGroup(
          this.STREAMS.CRM_CONSUMER_GROUP,
          consumerName,
          [{ key: this.STREAMS.CREDIT_EVENTS, id: '>' }], // Read only new messages
          { COUNT: 10, BLOCK: 1000 } // Read up to 10 messages, block for 1 second
        );

        if (result && result.length > 0) {
          for (const stream of result) {
            for (const message of stream.messages) {
              await this.processCreditEvent(message, consumerName);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error consuming credit events:', error);
      throw error;
    }
  }

  // Process individual credit events
  async processCreditEvent(message, consumerName) {
    try {
      const eventData = message.message;
      const messageId = message.id;

      console.log(`📨 Processing event: ${eventData.eventId} (${eventData.eventType})`);

      // Parse metadata if it's a string
      if (typeof eventData.metadata === 'string') {
        try {
          eventData.metadata = JSON.parse(eventData.metadata);
        } catch (e) {
          eventData.metadata = {};
        }
      }

      // Process based on event type
      if (eventData.eventType === 'credit.allocated') {
        await this.handleCreditAllocated(eventData);
      } else if (eventData.eventType === 'credit.consumed') {
        await this.handleCreditConsumed(eventData);
      } else {
        console.log(`⚠️ Unknown event type: ${eventData.eventType}`);
      }

      // Acknowledge message processing
      await this.consumer.xAck(
        this.STREAMS.CREDIT_EVENTS,
        this.STREAMS.CRM_CONSUMER_GROUP,
        messageId
      );

      console.log(`✅ Processed event: ${eventData.eventId}`);

    } catch (error) {
      console.error(`❌ Failed to process event ${message.id}:`, error);

      // For failed messages, we could implement retry logic or dead letter queue
      // For now, we'll acknowledge to prevent infinite retries
      await this.consumer.xAck(
        this.STREAMS.CREDIT_EVENTS,
        this.STREAMS.CRM_CONSUMER_GROUP,
        message.id
      );
    }
  }

  // Handle credit allocation events from wrapper
  async handleCreditAllocated(eventData) {
    const { tenantId, entityId, amount, eventId } = eventData;

    try {
      // Import credit service
      const creditService = require('./creditService');

      // Allocate credits in CRM
      const result = await creditService.allocateCredits(
        tenantId,
        entityId,
        amount,
        'wrapper',
        { sourceEventId: eventId, ...eventData.metadata }
      );

      console.log(`💰 Allocated ${amount} credits to entity ${entityId} from wrapper event`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to allocate credits from event ${eventId}:`, error);
      throw error;
    }
  }

  // Handle credit consumption events from CRM (for wrapper awareness)
  async handleCreditConsumed(eventData) {
    const { tenantId, entityId, amount, userId, operationType, operationId } = eventData;

    try {
      // Update wrapper's consumption tracking
      console.log(`📊 Wrapper notified: ${amount} credits consumed by ${userId} for ${operationType}`);

      // Here the wrapper would update its own records
      // This is mainly for wrapper awareness of CRM consumption

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to process consumption event:`, error);
      throw error;
    }
  }

  // Get stream info for monitoring
  async getStreamInfo() {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const info = await this.client.xInfoStream(this.STREAMS.CREDIT_EVENTS);
      const groups = await this.client.xInfoGroups(this.STREAMS.CREDIT_EVENTS);

      return {
        stream: info,
        consumerGroups: groups
      };
    } catch (error) {
      console.error('❌ Failed to get stream info:', error);
      throw error;
    }
  }

  // Clean up old events (optional maintenance)
  async cleanupOldEvents(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 days
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const cutoffTimestamp = Date.now() - maxAgeMs;
      const minId = `${cutoffTimestamp}-0`;

      const result = await this.client.xTrim(
        this.STREAMS.CREDIT_EVENTS,
        'MINID',
        minId
      );

      console.log(`🧹 Cleaned up ${result} old events from stream`);
      return result;
    } catch (error) {
      console.error('❌ Failed to cleanup old events:', error);
      throw error;
    }
  }
}

export default new RedisStreamsService();
