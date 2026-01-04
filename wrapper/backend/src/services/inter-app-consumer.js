#!/usr/bin/env node

/**
 * Inter-Application Event Consumer
 *
 * Generic consumer that handles events between all business suite applications.
 * Routes events to appropriate handlers based on targetApplication.
 *
 * Usage: node src/services/inter-app-consumer.js
 */

import dotenv from 'dotenv';
import { InterAppEventService } from './inter-app-event-service.js';
import { crmSyncStreams, redisManager } from '../utils/redis.js';

// Load environment variables
dotenv.config();

const consumerGroup = 'inter-app-consumers';
const consumerName = `inter-app-consumer-${Date.now()}`;
const streamKey = 'inter-app-events';

// Mock databases for different applications (replace with actual implementations)
class MockAppDatabases {
  constructor() {
    this.databases = {
      crm: new Map(),
      hr: new Map(),
      affiliate: new Map(),
      system: new Map()
    };
  }

  getDatabase(app) {
    return this.databases[app] || new Map();
  }

  updateData(app, tenantId, entityId, data) {
    const key = `${tenantId}:${entityId}`;
    const db = this.getDatabase(app);
    const existing = db.get(key) || {};

    db.set(key, {
      ...existing,
      ...data,
      lastUpdated: new Date(),
      app
    });

    console.log(`💾 Updated ${app.toUpperCase()} data for ${key}:`, db.get(key));
    return db.get(key);
  }

  getData(app, tenantId, entityId) {
    const db = this.getDatabase(app);
    return db.get(`${tenantId}:${entityId}`);
  }
}

const appDatabases = new MockAppDatabases();

class InterAppEventConsumer {
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
      console.log('✅ Inter-App Event Consumer connected to Redis (via RedisManager)');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setupConsumerGroup() {
    try {
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

  async processInterAppEvent(event, options = {}) {
    const eventData = event.message;
    const { skipAck = false } = options; // Allow skipping acknowledgment (e.g., when called from Temporal)

    console.log(`\n📨 Processing inter-app event:`, {
      eventId: eventData.eventId,
      from: eventData.sourceApplication,
      to: eventData.targetApplication,
      type: eventData.eventType,
      tenantId: eventData.tenantId
    });

    try {
      const parsedEventData = JSON.parse(eventData.eventData || '{}');

      // Route to appropriate handler based on target application
      switch (eventData.targetApplication) {
        case 'crm':
          await this.handleCrmEvent(eventData, parsedEventData);
          break;

        case 'hr':
          await this.handleHrEvent(eventData, parsedEventData);
          break;

        case 'affiliate':
          await this.handleAffiliateEvent(eventData, parsedEventData);
          break;

        case 'system':
          await this.handleSystemEvent(eventData, parsedEventData);
          break;

        default:
          console.log(`⚠️ Unknown target application: ${eventData.targetApplication}`);
      }

      // Acknowledge successful processing (only if not skipping - e.g., when called from Temporal)
      if (!skipAck && this.redis.client && event.id) {
        try {
          await this.redis.client.xAck(this.streamKey, this.consumerGroup, event.id);
          console.log(`✅ Inter-app event acknowledged: ${eventData.eventId}`);
        } catch (ackError) {
          console.warn('⚠️ Failed to acknowledge event (may be called outside Redis consumer context):', ackError.message);
        }
      } else if (!skipAck) {
        console.log(`✅ Inter-app event processed: ${eventData.eventId}`);
      }

    } catch (error) {
      console.error(`❌ Failed to process inter-app event ${event.id}:`, error);

      // Send failure acknowledgment
      try {
        await crmSyncStreams.publishAcknowledgment(eventData.eventId, 'failed', {
          error: error.message,
          sourceApplication: eventData.targetApplication, // Target becomes source for ack
          targetApplication: eventData.sourceApplication,  // Source becomes target for ack
          tenantId: eventData.tenantId,
          processedAt: new Date().toISOString()
        });
      } catch (ackError) {
        console.error('❌ Failed to send failure acknowledgment:', ackError.message);
      }

      // Still acknowledge to prevent infinite retries (only if not skipping)
      if (!skipAck && this.redis.client && event.id) {
        try {
          await this.redis.client.xAck(this.streamKey, this.consumerGroup, event.id);
        } catch (ackError) {
          console.warn('⚠️ Failed to acknowledge failed event:', ackError.message);
        }
      }

      throw error; // Re-throw to let Temporal handle retries
    }
  }

  async handleCrmEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;

    console.log(`🏢 CRM processing event from ${sourceApplication}: ${eventType}`);

    // Update CRM database based on event type
    switch (eventType) {
      case 'user.created':
        appDatabases.updateData('crm', tenantId, entityId, {
          userCreated: true,
          userData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'employee.updated':
        appDatabases.updateData('crm', tenantId, entityId, {
          employeeUpdated: true,
          employeeData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'partner.registered':
        appDatabases.updateData('crm', tenantId, entityId, {
          partnerRegistered: true,
          partnerData: parsedEventData,
          source: sourceApplication
        });
        break;

      default:
        console.log(`ℹ️ CRM: Unhandled event type: ${eventType}`);
    }

    // Send success acknowledgment
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'crm',
      eventType,
      tenantId,
      entityId,
      crmData: appDatabases.getData('crm', tenantId, entityId)
    });
  }

  async handleHrEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;

    console.log(`👥 HR processing event from ${sourceApplication}: ${eventType}`);

    switch (eventType) {
      case 'user.created':
        appDatabases.updateData('hr', tenantId, entityId, {
          employeeOnboarded: true,
          onboardingData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'benefits.updated':
        appDatabases.updateData('hr', tenantId, entityId, {
          benefitsUpdated: true,
          benefitsData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'performance.review':
        appDatabases.updateData('hr', tenantId, entityId, {
          performanceReview: true,
          reviewData: parsedEventData,
          source: sourceApplication
        });
        break;

      default:
        console.log(`ℹ️ HR: Unhandled event type: ${eventType}`);
    }

    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'hr',
      eventType,
      tenantId,
      entityId,
      hrData: appDatabases.getData('hr', tenantId, entityId)
    });
  }

  async handleAffiliateEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;

    console.log(`🤝 Affiliate processing event from ${sourceApplication}: ${eventType}`);

    switch (eventType) {
      case 'partner.created':
        appDatabases.updateData('affiliate', tenantId, entityId, {
          partnerCreated: true,
          partnerData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'commission.updated':
        appDatabases.updateData('affiliate', tenantId, entityId, {
          commissionUpdated: true,
          commissionData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'referral.completed':
        appDatabases.updateData('affiliate', tenantId, entityId, {
          referralCompleted: true,
          referralData: parsedEventData,
          source: sourceApplication
        });
        break;

      default:
        console.log(`ℹ️ Affiliate: Unhandled event type: ${eventType}`);
    }

    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'affiliate',
      eventType,
      tenantId,
      entityId,
      affiliateData: appDatabases.getData('affiliate', tenantId, entityId)
    });
  }

  async handleSystemEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;

    console.log(`⚙️ System processing event from ${sourceApplication}: ${eventType}`);

    switch (eventType) {
      case 'config.updated':
        appDatabases.updateData('system', tenantId, entityId, {
          configUpdated: true,
          configData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'maintenance.scheduled':
        appDatabases.updateData('system', tenantId, entityId, {
          maintenanceScheduled: true,
          maintenanceData: parsedEventData,
          source: sourceApplication
        });
        break;

      case 'security.alert':
        appDatabases.updateData('system', tenantId, entityId, {
          securityAlert: true,
          alertData: parsedEventData,
          source: sourceApplication
        });
        break;

      default:
        console.log(`ℹ️ System: Unhandled event type: ${eventType}`);
    }

    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'system',
      eventType,
      tenantId,
      entityId,
      systemData: appDatabases.getData('system', tenantId, entityId)
    });
  }

  async consumeEvents() {
    console.log(`🚀 Starting inter-app event consumer: ${this.consumerName}`);
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
              await this.processInterAppEvent(event);
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
              await this.processInterAppEvent(event);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error consuming inter-app events:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
  }

  async stop() {
    console.log('🛑 Stopping Inter-App Event Consumer...');
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
  const consumer = new InterAppEventConsumer();
  global.consumer = consumer;

  try {
    console.log('🔄 Starting Inter-Application Event Consumer...');
    console.log('================================================');

    await consumer.connect();
    await consumer.setupConsumerGroup();

    // Display stream info
    const streamInfo = await consumer.getStreamInfo();
    if (streamInfo) {
      console.log(`📊 Stream Info:`, streamInfo);
    }

    console.log('\n🎯 Ready to consume inter-application events!');
    console.log('============================================');
    console.log('Supported event flows:');
    console.log('• CRM ↔ HR ↔ Affiliate ↔ System');
    console.log('• Any app can publish to any other app');
    console.log('• Events are automatically routed and acknowledged');
    console.log('');

    await consumer.consumeEvents();

  } catch (error) {
    console.error('❌ Inter-App Consumer failed:', error);
    process.exit(1);
  }
}

// Run the consumer if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { InterAppEventConsumer };
