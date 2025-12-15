#!/usr/bin/env node

/**
 * Acknowledgment Consumer
 *
 * Listens for event acknowledgments from CRM and updates event tracking status
 */

import dotenv from 'dotenv';
import { EventTrackingService } from './event-tracking-service.js';
import { redisManager } from '../utils/redis.js';

// Load environment variables
dotenv.config();
const consumerGroup = 'wrapper-consumers';
const consumerName = `wrapper-consumer-${Date.now()}`;
const streamKey = 'acknowledgments';

class AcknowledgmentConsumer {
  constructor() {
    this.redis = redisManager;
    this.consumerGroup = consumerGroup;
    this.consumerName = consumerName;
    this.streamKey = streamKey;
    this.isRunning = false;
  }

  async connect() {
    try {
      // Use the singleton RedisManager - it handles connection management
      await this.redis.connect();
      console.log('✅ Acknowledgment Consumer connected to Redis (via RedisManager)');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setupConsumerGroup() {
    try {
      // Try to create consumer group (will fail if it already exists)
      await this.redis.xGroupCreate(
        this.streamKey,
        this.consumerGroup,
        '0', // Start from beginning
        { MKSTREAM: true }
      );
      console.log(`✅ Created consumer group: ${this.consumerGroup}`);
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        console.log(`ℹ️ Consumer group ${this.consumerGroup} already exists`);
      } else {
        console.error('❌ Failed to create consumer group:', error);
        throw error;
      }
    }
  }

  async processAcknowledgment(event) {
    const ackData = event.message;

    console.log(`📨 Processing acknowledgment: ${ackData.acknowledgmentId}`);

    try {
      const { originalEventId, status, acknowledgmentData } = ackData;
      const parsedAckData = JSON.parse(acknowledgmentData || '{}');

      switch (status) {
        case 'processed':
          await EventTrackingService.acknowledgeEvent(originalEventId, parsedAckData);
          break;

        case 'failed':
          const errorMessage = parsedAckData.error || 'CRM processing failed';
          await EventTrackingService.markEventFailed(originalEventId, errorMessage, false);
          break;

        case 'timeout':
          await EventTrackingService.markEventFailed(originalEventId, 'Acknowledgment timeout', false);
          break;

        default:
          console.log(`⚠️ Unknown acknowledgment status: ${status}`);
      }

      // Acknowledge successful processing
      await this.redis.xAck(this.streamKey, this.consumerGroup, event.id);
      console.log(`✅ Acknowledgment processed: ${ackData.acknowledgmentId}`);

    } catch (error) {
      console.error(`❌ Failed to process acknowledgment ${event.id}:`, error);
      // Still acknowledge to prevent infinite retries
      await this.redis.xAck(this.streamKey, this.consumerGroup, event.id);
    }
  }

  async consumeAcknowledgments() {
    console.log(`🚀 Starting acknowledgment consumer: ${this.consumerName}`);
    console.log(`👥 Consumer Group: ${this.consumerGroup}`);
    console.log(`📡 Stream: ${this.streamKey}`);
    console.log('');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Read pending messages first
        const pendingMessages = await this.redis.xReadGroup(
          this.streamKey,
          this.consumerGroup,
          this.consumerName,
          { COUNT: 10, BLOCK: 1000 },
          '0' // Read pending messages
        );

        if (pendingMessages && pendingMessages.length > 0) {
          for (const stream of pendingMessages) {
            for (const event of stream.messages) {
              await this.processAcknowledgment(event);
            }
          }
        }

        // Then read new messages
        const newMessages = await this.redis.xReadGroup(
          this.streamKey,
          this.consumerGroup,
          this.consumerName,
          { COUNT: 10, BLOCK: 2000 },
          '>' // Read new messages
        );

        if (newMessages && newMessages.length > 0) {
          for (const stream of newMessages) {
            for (const event of stream.messages) {
              await this.processAcknowledgment(event);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error consuming acknowledgments:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
  }

  async stop() {
    console.log('🛑 Stopping Acknowledgment Consumer...');
    this.isRunning = false;
    await this.redis.quit();
  }

  async getStreamInfo() {
    try {
      const info = await this.redis.xInfoStream(this.streamKey);
      const groups = await this.redis.xInfoGroups(this.streamKey);
      const pending = await this.redis.xPending(this.streamKey, this.consumerGroup);

      return {
        streamLength: info.length,
        consumerGroups: groups.length,
        pendingMessages: pending.length,
        lastDeliveredId: groups.find(g => g.name === this.consumerGroup)?.['last-delivered-id']
      };
    } catch (error) {
      console.error('❌ Failed to get stream info:', error);
      return null;
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (global.consumer) {
    global.consumer.stop().then(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (global.consumer) {
    global.consumer.stop().then(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

// Main execution
async function main() {
  const consumer = new AcknowledgmentConsumer();
  global.consumer = consumer;

  try {
    console.log('🔄 Starting Acknowledgment Consumer...');
    console.log('=======================================');

    await consumer.connect();
    await consumer.setupConsumerGroup();

    // Display stream info
    const streamInfo = await consumer.getStreamInfo();
    if (streamInfo) {
      console.log(`📊 Stream Info:`, streamInfo);
    }

    console.log('\n🎯 Ready to consume acknowledgments!');
    console.log('====================================');
    console.log('• processed - CRM successfully processed event');
    console.log('• failed - CRM failed to process event');
    console.log('• timeout - Acknowledgment timed out');
    console.log('');

    await consumer.consumeAcknowledgments();

  } catch (error) {
    console.error('❌ Consumer failed:', error);
    process.exit(1);
  }
}

// Run the consumer if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AcknowledgmentConsumer };
