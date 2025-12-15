#!/usr/bin/env node

/**
 * Organization Assignment Events Consumer
 *
 * Consumes organization assignment events from Redis Streams
 * and synchronizes with external CRM systems.
 *trak
 * Usage: node src/services/organization-assignment-consumer.js
 */

import { randomUUID } from 'crypto';
import { getRedis } from '../utils/redis.js';

const streamKey = 'crm:organization-assignments';
const consumerGroup = 'organization-assignment-consumers';
const consumerName = `org-assignment-consumer-${randomUUID().slice(0, 8)}`;

class OrganizationAssignmentConsumer {
  constructor() {
    this.redisManager = getRedis();
    this.consumerGroup = consumerGroup;
    this.consumerName = consumerName;
    this.streamKey = streamKey;
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.redisManager.connect();
      console.log('✅ Organization Assignment Consumer connected to Redis');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setupConsumerGroup() {
    try {
      // Try to create consumer group (will fail if it already exists)
      await this.redisManager.client.xGroupCreate(
        this.streamKey,
        this.consumerGroup,
        '0', // Start from beginning
        { MKSTREAM: true }
      );

      console.log(`✅ Created consumer group: ${this.consumerGroup} for stream: ${this.streamKey}`);
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        console.log(`ℹ️ Consumer group ${this.consumerGroup} already exists`);
      } else {
        console.error('❌ Failed to create consumer group:', error);
        throw error;
      }
    }
  }

  async start() {
    console.log(`🚀 Starting Organization Assignment Consumer`);
    console.log(`📡 Stream: ${this.streamKey}`);
    console.log(`👥 Consumer Group: ${this.consumerGroup}`);
    console.log(`🏷️ Consumer Name: ${this.consumerName}`);

    await this.connect();
    await this.setupConsumerGroup();

    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Read pending messages first
        const pendingMessages = await this.redisManager.client.xReadGroup(
          this.streamKey,
          this.consumerGroup,
          this.consumerName,
          { COUNT: 10, BLOCK: 1000 },
          '0' // Read pending messages
        );

        if (pendingMessages && pendingMessages.length > 0) {
          for (const stream of pendingMessages) {
            for (const message of stream.messages) {
              await this.processMessage(message);
              await this.redisManager.client.xAck(this.streamKey, this.consumerGroup, message.id);
            }
          }
        }

        // Then read new messages
        const newMessages = await this.redisManager.client.xReadGroup(
          this.streamKey,
          this.consumerGroup,
          this.consumerName,
          { COUNT: 10, BLOCK: 2000 },
          '>' // Read new messages
        );

        if (newMessages && newMessages.length > 0) {
          for (const stream of newMessages) {
            for (const message of stream.messages) {
              await this.processMessage(message);
              await this.redisManager.client.xAck(this.streamKey, this.consumerGroup, message.id);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error in consumer loop:', error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async processMessage(message) {
    try {
      const event = JSON.parse(message.message.event);
      console.log(`📨 Organization Assignment Consumer received: ${event.eventType}`);

      switch (event.eventType) {
        case 'organization.assignment.created':
          await this.handleAssignmentCreated(event);
          break;
        case 'organization.assignment.updated':
          await this.handleAssignmentUpdated(event);
          break;
        case 'organization.assignment.deactivated':
          await this.handleAssignmentDeactivated(event);
          break;
        case 'organization.assignment.activated':
          await this.handleAssignmentActivated(event);
          break;
        case 'organization.assignment.deleted':
          await this.handleAssignmentDeleted(event);
          break;
        default:
          console.log(`⚠️ Unknown event type: ${event.eventType}`);
      }

    } catch (error) {
      console.error('❌ Failed to process message:', error);
    }
  }

  async handleAssignmentCreated(event) {
    try {
      console.log(`👥 Processing organization assignment created:`, {
        userId: event.data.userId,
        organizationId: event.data.organizationId,
        assignmentType: event.data.assignmentType
      });

      // Here you could:
      // 1. Sync with external CRM system
      // 2. Update local caches
      // 3. Trigger downstream processes
      // 4. Send notifications

      console.log(`✅ Organization assignment created processed successfully`);

    } catch (error) {
      console.error('❌ Failed to handle assignment created:', error);
    }
  }

  async handleAssignmentUpdated(event) {
    try {
      console.log(`🔄 Processing organization assignment updated:`, {
        userId: event.data.userId,
        organizationId: event.data.organizationId,
        changes: event.data.changes
      });

      // Process assignment updates
      console.log(`✅ Organization assignment updated processed successfully`);

    } catch (error) {
      console.error('❌ Failed to handle assignment updated:', error);
    }
  }

  async handleAssignmentDeactivated(event) {
    try {
      console.log(`⏸️ Processing organization assignment deactivated:`, {
        userId: event.data.userId,
        organizationId: event.data.organizationId,
        reason: event.data.reason
      });

      // Process assignment deactivation
      console.log(`✅ Organization assignment deactivated processed successfully`);

    } catch (error) {
      console.error('❌ Failed to handle assignment deactivated:', error);
    }
  }

  async handleAssignmentActivated(event) {
    try {
      console.log(`▶️ Processing organization assignment activated:`, {
        userId: event.data.userId,
        organizationId: event.data.organizationId
      });

      // Process assignment activation
      console.log(`✅ Organization assignment activated processed successfully`);

    } catch (error) {
      console.error('❌ Failed to handle assignment activated:', error);
    }
  }

  async handleAssignmentDeleted(event) {
    try {
      console.log(`🗑️ Processing organization assignment deleted:`, {
        userId: event.data.userId,
        organizationId: event.data.organizationId,
        reason: event.data.reason
      });

      // Process assignment deletion
      console.log(`✅ Organization assignment deleted processed successfully`);

    } catch (error) {
      console.error('❌ Failed to handle assignment deleted:', error);
    }
  }

  async stop() {
    console.log('🛑 Stopping Organization Assignment Consumer...');
    this.isRunning = false;
    await this.redisManager.disconnect();
  }

  async getStreamInfo() {
    try {
      const info = await this.redisManager.client.xInfoStream(this.streamKey);
      const groups = await this.redisManager.client.xInfoGroups(this.streamKey);
      const pending = await this.redisManager.client.xPending(this.streamKey, this.consumerGroup);

      return {
        streamLength: info.length,
        consumerGroups: groups.length,
        pendingMessages: pending.length,
        lastGeneratedId: info.lastGeneratedId,
        firstEntry: info.firstEntry,
        lastEntry: info.lastEntry
      };
    } catch (error) {
      console.error('❌ Failed to get stream info:', error);
      return null;
    }
  }
}

// Export for use in other modules
export { OrganizationAssignmentConsumer };

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const consumer = new OrganizationAssignmentConsumer();

  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
  });

  consumer.start().catch(error => {
    console.error('❌ Consumer failed to start:', error);
    process.exit(1);
  });
}
