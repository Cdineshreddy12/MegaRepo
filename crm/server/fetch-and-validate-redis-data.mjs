#!/usr/bin/env node
/**
 * Fetch Redis Stream Data and Validate Against CRM
 * 
 * This script:
 * 1. Connects to Redis and fetches data from streams
 * 2. Validates the data against CRM database
 * 3. Shows what's being consumed
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

// Streams to check (matching the consumer configuration)
const STREAMS_TO_CHECK = [
  'credit-events',
  'crm:sync:user:user_created',
  'crm:sync:user:user_deactivated',
  'crm:sync:user:user_deleted',
  'crm:sync:permissions:role_assigned',
  'crm:sync:permissions:role_unassigned',
  'crm:sync:permissions:role_updated',
  'crm:sync:role_permissions',
  'crm:sync:role:role_created',
  'crm:sync:role:role_updated',
  'crm:sync:role:role_deleted',
  'crm:sync:organization:org_created',
  'crm:sync:credits:credit_allocated',
  'crm:sync:credits:credit_config_updated',
  'crm:organization-assignments'
];

class RedisDataValidator {
  constructor() {
    this.redisClient = null;
    this.mongoClient = null;
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    try {
      console.log('🔗 Connecting to Redis...');
      console.log(`   URL: ${redisUrl.replace(/:[^:]+@/, ':****@')}`);
      
      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });
      
      this.redisClient.on('connect', () => {
        console.log('✅ Redis Client Connected');
      });
      
      await this.redisClient.connect();
      console.log('✅ Redis connection established\n');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      return false;
    }
  }

  /**
   * Initialize MongoDB connection
   */
  async initMongo() {
    if (!mongoUri) {
      console.warn('⚠️ MONGO_URI not provided, skipping database validation');
      return false;
    }

    try {
      console.log('🔗 Connecting to MongoDB...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      console.log('✅ MongoDB connection established\n');
      this.mongoClient = mongoose.connection;
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      return false;
    }
  }

  /**
   * Parse Redis message (similar to consumer implementation)
   */
  parseRedisMessage(message) {
    const event = { id: message.id };

    // Parse all fields from Redis hash
    Object.entries(message.message || {}).forEach(([key, value]) => {
      try {
        const parsed = JSON.parse(value);
        event[key] = parsed;
      } catch {
        event[key] = value;
      }
    });

    // Handle wrapper API format where event is in 'data' field
    if (event.data && typeof event.data === 'object') {
      Object.assign(event, event.data);
      delete event.data;
    } else if (event.data && typeof event.data === 'string') {
      try {
        let dataStr = event.data;
        if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
          dataStr = dataStr.slice(1, -1);
        }
        const parsedData = JSON.parse(dataStr);
        Object.assign(event, parsedData);
        delete event.data;
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse data field: ${parseError.message}`);
      }
    }

    // Handle wrapper API events without eventType
    if (!event.eventType) {
      if (event.reason === 'application_allocation') {
        event.eventType = 'credit.allocated';
        event.amount = event.availableCredits;
      }
    }

    return event;
  }

  /**
   * Get all streams (including tenant-specific ones)
   */
  async getAvailableStreams() {
    try {
      // Get all keys matching stream patterns
      const keys = await this.redisClient.keys('*');
      const streamKeys = keys.filter(key => 
        STREAMS_TO_CHECK.some(pattern => key.includes(pattern)) || 
        key.startsWith('credit-events:') ||
        key.startsWith('crm:')
      );
      return [...new Set([...STREAMS_TO_CHECK, ...streamKeys])];
    } catch (error) {
      console.error('❌ Error getting streams:', error.message);
      return STREAMS_TO_CHECK;
    }
  }

  /**
   * Get stream info
   */
  async getStreamInfo(streamName) {
    try {
      const info = await this.redisClient.xInfoStream(streamName);
      return {
        length: info.length,
        firstEntry: info.firstEntry,
        lastEntry: info.lastEntry,
        groups: info.groups
      };
    } catch (error) {
      if (error.message.includes('no such key')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read messages from stream
   */
  async readStreamMessages(streamName, count = 10) {
    try {
      const messages = await this.redisClient.xRange(streamName, '-', '+', {
        COUNT: count
      });
      return messages;
    } catch (error) {
      if (error.message.includes('no such key')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Validate credit allocation event against CRM
   */
  async validateCreditAllocation(event, tenantId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      crmData: null
    };

    try {
      // Import models dynamically
      const { default: CrmEntityCredit } = await import('./models/CrmEntityCredit.js');
      const { default: Organization } = await import('./models/Organization.js');

      // Check if entityId exists
      const entityId = event.entityId || event.data?.entityId;
      if (!entityId) {
        validation.valid = false;
        validation.errors.push('Missing entityId in event');
        return validation;
      }

      // Check if credit record exists in CRM
      const creditRecord = await CrmEntityCredit.findOne({
        tenantId: tenantId,
        $or: [
          { entityIdString: entityId },
          { entityId: entityId }
        ]
      });

      if (creditRecord) {
        validation.crmData = {
          allocatedCredits: creditRecord.allocatedCredits,
          usedCredits: creditRecord.usedCredits,
          availableCredits: creditRecord.availableCredits,
          isActive: creditRecord.isActive
        };

        // Validate amount matches
        const eventAmount = event.amount || event.data?.amount || event.availableCredits;
        if (eventAmount && creditRecord.allocatedCredits !== eventAmount) {
          validation.warnings.push(
            `Amount mismatch: Event=${eventAmount}, CRM=${creditRecord.allocatedCredits}`
          );
        }
      } else {
        validation.warnings.push('Credit record not found in CRM database');
      }

      // Check if organization exists
      const org = await Organization.findOne({
        tenantId: tenantId,
        $or: [
          { orgCode: entityId },
          { _id: entityId }
        ]
      });

      if (!org) {
        validation.warnings.push(`Organization ${entityId} not found in CRM`);
      } else {
        validation.crmData = {
          ...validation.crmData,
          organizationName: org.orgName || org.companyName
        };
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate user event against CRM
   */
  async validateUserEvent(event, tenantId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      crmData: null
    };

    try {
      // Import model dynamically
      const { default: UserProfile } = await import('./models/UserProfile.js');
      const userId = event.userId || event.data?.userId || event.id;

      if (!userId) {
        validation.valid = false;
        validation.errors.push('Missing userId in event');
        return validation;
      }

      const user = await UserProfile.findOne({
        tenantId: tenantId,
        $or: [
          { userId: userId },
          { userIdString: userId }
        ]
      });

      if (user) {
        validation.crmData = {
          email: user.personalInfo?.email,
          name: user.personalInfo?.name,
          isActive: user.isActive
        };
      } else {
        validation.warnings.push(`User ${userId} not found in CRM database`);
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate event based on type
   */
  async validateEvent(event, tenantId) {
    const eventType = event.eventType || 'unknown';

    switch (eventType) {
      case 'credit.allocated':
      case 'credit_allocated':
        return await this.validateCreditAllocation(event, tenantId);

      case 'user_created':
      case 'user_deactivated':
      case 'user_deleted':
        return await this.validateUserEvent(event, tenantId);

      default:
        return {
          valid: true,
          errors: [],
          warnings: ['No specific validation for event type'],
          crmData: null
        };
    }
  }

  /**
   * Fetch and validate stream data
   */
  async fetchAndValidateStreams(tenantId = null) {
    console.log('📊 Fetching Redis Stream Data and Validating Against CRM\n');
    console.log('='.repeat(80));

    const streams = await this.getAvailableStreams();
    const results = {
      totalStreams: 0,
      streamsWithData: 0,
      totalMessages: 0,
      validatedMessages: 0,
      validationErrors: 0,
      streamDetails: []
    };

    for (const streamName of streams) {
      try {
        const streamInfo = await this.getStreamInfo(streamName);
        
        if (!streamInfo) {
          continue; // Stream doesn't exist
        }

        results.totalStreams++;
        
        if (streamInfo.length === 0) {
          console.log(`\n📡 Stream: ${streamName}`);
          console.log(`   Status: Empty (no messages)`);
          continue;
        }

        results.streamsWithData++;
        console.log(`\n📡 Stream: ${streamName}`);
        console.log(`   Messages: ${streamInfo.length}`);
        console.log(`   Consumer Groups: ${streamInfo.groups?.length || 0}`);

        // Read recent messages
        const messages = await this.readStreamMessages(streamName, 5);
        results.totalMessages += messages.length;

        const streamDetail = {
          streamName,
          messageCount: streamInfo.length,
          recentMessages: []
        };

        for (const message of messages) {
          const event = this.parseRedisMessage(message);
          const eventTenantId = event.tenantId || tenantId;

          console.log(`\n   📨 Message ID: ${message.id}`);
          console.log(`      Event Type: ${event.eventType || 'unknown'}`);
          console.log(`      Tenant ID: ${eventTenantId || 'N/A'}`);

          // Show event data (truncated)
          const eventPreview = {
            id: event.id,
            eventType: event.eventType,
            tenantId: event.tenantId,
            entityId: event.entityId,
            amount: event.amount,
            userId: event.userId
          };
          console.log(`      Data: ${JSON.stringify(eventPreview)}`);

          // Validate against CRM if MongoDB is connected
          if (this.mongoClient && eventTenantId) {
            try {
              const validation = await this.validateEvent(event, eventTenantId);
              results.validatedMessages++;

              if (!validation.valid || validation.errors.length > 0) {
                results.validationErrors++;
                console.log(`      ❌ Validation: FAILED`);
                validation.errors.forEach(err => console.log(`         - ${err}`));
              } else if (validation.warnings.length > 0) {
                console.log(`      ⚠️  Validation: WARNINGS`);
                validation.warnings.forEach(warn => console.log(`         - ${warn}`));
              } else {
                console.log(`      ✅ Validation: PASSED`);
              }

              if (validation.crmData) {
                console.log(`      📋 CRM Data: ${JSON.stringify(validation.crmData)}`);
              }

              streamDetail.recentMessages.push({
                messageId: message.id,
                eventType: event.eventType,
                validation
              });
            } catch (validationError) {
              console.log(`      ❌ Validation Error: ${validationError.message}`);
            }
          } else {
            console.log(`      ⚠️  Skipping validation (no MongoDB connection or tenantId)`);
          }
        }

        results.streamDetails.push(streamDetail);

      } catch (error) {
        console.error(`\n❌ Error processing stream ${streamName}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Get consumer group info
   */
  async getConsumerGroupInfo(streamName, groupName) {
    try {
      const info = await this.redisClient.xInfoGroups(streamName);
      const group = info.find(g => g.name === groupName);
      
      if (group) {
        const consumers = await this.redisClient.xInfoConsumers(streamName, groupName);
        return {
          ...group,
          consumers
        };
      }
      return null;
    } catch (error) {
      if (error.message.includes('no such key') || error.message.includes('no such group')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Show what's being consumed
   */
  async showConsumptionStatus() {
    console.log('\n\n📈 Consumption Status\n');
    console.log('='.repeat(80));

    const streams = await this.getAvailableStreams();
    const consumerGroup = process.env.CRM_CONSUMER_GROUP || 'crm-consumers';

    for (const streamName of streams) {
      try {
        const streamInfo = await this.getStreamInfo(streamName);
        if (!streamInfo || streamInfo.length === 0) continue;

        console.log(`\n📡 Stream: ${streamName}`);
        console.log(`   Total Messages: ${streamInfo.length}`);

        // Check consumer groups
        if (streamInfo.groups && streamInfo.groups.length > 0) {
          for (const group of streamInfo.groups) {
            const groupInfo = await this.getConsumerGroupInfo(streamName, group.name);
            if (groupInfo) {
              console.log(`   Consumer Group: ${group.name}`);
              console.log(`      Pending: ${groupInfo.pending}`);
              console.log(`      Last Delivered ID: ${groupInfo.lastDeliveredId}`);
              console.log(`      Consumers: ${groupInfo.consumers?.length || 0}`);
              
              if (groupInfo.consumers && groupInfo.consumers.length > 0) {
                groupInfo.consumers.forEach(consumer => {
                  console.log(`         - ${consumer.name}: ${consumer.pending} pending`);
                });
              }
            }
          }
        } else {
          console.log(`   ⚠️  No consumer groups found`);
        }

      } catch (error) {
        // Skip if stream doesn't exist
        if (!error.message.includes('no such key')) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Close connections
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('\n🔌 Redis connection closed');
    }
    if (this.mongoClient) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Main execution
async function main() {
  const validator = new RedisDataValidator();

  try {
    // Initialize connections
    const redisConnected = await validator.initRedis();
    if (!redisConnected) {
      console.error('❌ Cannot proceed without Redis connection');
      process.exit(1);
    }

    const mongoConnected = await validator.initMongo();
    if (!mongoConnected) {
      console.warn('⚠️  Continuing without MongoDB validation\n');
    }

    // Get tenant ID from environment or use default
    const tenantId = process.env.CRM_TENANT_ID || process.env.TENANT_ID || null;

    // Fetch and validate
    const results = await validator.fetchAndValidateStreams(tenantId);

    // Show consumption status
    await validator.showConsumptionStatus();

    // Summary
    console.log('\n\n📊 Summary\n');
    console.log('='.repeat(80));
    console.log(`Total Streams Checked: ${results.totalStreams}`);
    console.log(`Streams With Data: ${results.streamsWithData}`);
    console.log(`Total Messages Analyzed: ${results.totalMessages}`);
    console.log(`Messages Validated: ${results.validatedMessages}`);
    console.log(`Validation Errors: ${results.validationErrors}`);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  } finally {
    await validator.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default RedisDataValidator;

