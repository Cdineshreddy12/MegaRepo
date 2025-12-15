#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import RedisStreamsCRMConsumer from './services/redisStreamsConsumer.js';
import mongoose from 'mongoose';

async function main() {
  console.log('🚀 Starting CRM Redis Streams Consumer...\n');

  const redisUrl = process.env.REDIS_URL;
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }

  if (!mongoUri) {
    console.error('❌ MONGO_URI or MONGODB_URI environment variable is required');
    process.exit(1);
  }
  const consumerName = process.env.CONSUMER_NAME || `multi-tenant-consumer_${process.pid}_${Date.now()}`;
  const consumerGroup = process.env.CONSUMER_GROUP || 'crm-consumers';
  const maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
  const batchSize = parseInt(process.env.BATCH_SIZE) || 10;
  const blockTime = parseInt(process.env.BLOCK_TIME) || 5000;

  console.log('🔧 Configuration:');
  console.log(`   Redis URL: ${redisUrl.replace(/:[^:]+@/, ':****@')}`);
  console.log(`   MongoDB URI: ${mongoUri.replace(/:[^:]+@/, ':****@')}`);
  console.log(`   Consumer Group: ${consumerGroup}`);
  console.log(`   Consumer Name Base: ${consumerName}`);
  console.log(`   Max Retries: ${maxRetries}`);
  console.log(`   Batch Size: ${batchSize}`);
  console.log(`   Block Time: ${blockTime}ms`);
  console.log(`   Mode: Multi-tenant - Will create consumers for all active tenants`);
  console.log('');

  // Connect to MongoDB first
  console.log('🔗 Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB successfully\n');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }

  // Import models after MongoDB connection
  const { default: Tenant } = await import('./models/Tenant.js');

  // Multi-tenant mode: get all active tenants
  console.log('🔄 Querying active tenants from database...');
  let tenantsToProcess = [];

  try {
    const Tenant = (await import('./models/Tenant.js')).default;
    const activeTenants = await Tenant.find({ status: 'active' }).select('tenantId tenantName').lean();
    tenantsToProcess = activeTenants;
    console.log(`✅ Found ${activeTenants.length} active tenants`);
  } catch (error) {
    console.error('❌ Failed to query active tenants:', error.message);
    console.error('❌ Cannot start consumers without active tenants in database');
    process.exit(1);
  }

  if (tenantsToProcess.length === 0) {
    console.error('❌ No active tenants found in database. Cannot start consumers.');
    process.exit(1);
  }

  // Create consumers for each tenant
  const consumers = [];
  for (const tenant of tenantsToProcess) {
    try {
      const tenantStream = `credit-events:${tenant.tenantId}`;
      const tenantConsumerGroup = `crm-consumers:${tenant.tenantId}`;

      console.log(`🔄 Creating consumer for tenant: ${tenant.tenantId} (${tenant.tenantName})`);
      console.log(`   Stream: ${tenantStream}`);
      console.log(`   Consumer Group: ${tenantConsumerGroup}`);

      // Include both tenant-specific streams and global CRM streams
      const allStreams = [
        tenantStream, // Tenant-specific credit events
        'crm:sync:user:user_created',
        'crm:sync:user:user_deactivated',
        'crm:sync:permissions:role_assigned',
        'crm:sync:permissions:role_unassigned',
        'crm:sync:role_permissions', // Legacy role permissions updates
        'crm:sync:role:role_created', // New role CRUD events
        'crm:sync:role:role_updated',
        'crm:sync:role:role_deleted',
        'crm:sync:organization:org_created',
        'crm:sync:credits:credit_allocated',
        'crm:sync:credits:credit_config_updated',
        'crm:organization-assignments' // Organization assignment events (global stream)
      ];

      const consumer = new RedisStreamsCRMConsumer({
        redisUrl,
        consumerGroup: tenantConsumerGroup, // Tenant-specific consumer group
        consumerName: `${consumerName}-${tenant.tenantId}`, // Unique name per tenant
        tenantId: tenant.tenantId,
        streams: allStreams, // All streams including tenant-specific and global
        maxRetries,
        batchSize,
        blockTime
      });

      await consumer.initialize();
      consumers.push(consumer);
      console.log(`✅ Consumer initialized for tenant: ${tenant.tenantId}`);
    } catch (error) {
      console.error(`❌ Failed to create consumer for tenant ${tenant.tenantId}:`, error.message);
    }
  }

  if (consumers.length === 0) {
    console.error('❌ No consumers were successfully created. Exiting...');
    process.exit(1);
  }

  console.log(`🎯 Successfully created ${consumers.length} consumer(s) for ${tenantsToProcess.length} tenant(s)\n`);

  // Create message router to distribute messages to tenant-specific streams
  console.log('🔄 Setting up message router...');
  const messageRouter = await createMessageRouter(redisUrl, tenantsToProcess);
  console.log('✅ Message router initialized\n');

  try {
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down all consumers and router gracefully...');
      for (const consumer of consumers) {
        try {
          await consumer.stop();
        } catch (error) {
          console.error('Error stopping consumer:', error.message);
        }
      }
      try {
        await messageRouter.stop();
      } catch (error) {
        console.error('Error stopping message router:', error.message);
      }
      await mongoose.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start all consumers
    console.log('🚀 Starting all consumers...');
    const consumerPromises = consumers.map(consumer => consumer.start());
    await Promise.all(consumerPromises);
    console.log('✅ All consumers started successfully');

    // Keep the process running
    console.log('🔄 Consumers and message router are now running and processing messages...');

  } catch (error) {
    console.error('❌ Failed to start consumers:', error);
    process.exit(1);
  }
}

/**
 * Create a message router that distributes messages from main stream to tenant-specific streams
 */
async function createMessageRouter(redisUrl, tenants) {
  const { createClient } = await import('redis');

  const redisClient = createClient({ url: redisUrl });
  await redisClient.connect();

  // Create consumer group for main stream
  try {
    await redisClient.xGroupCreate('credit-events', 'message-router', '0', { MKSTREAM: true });
  } catch (error) {
    if (!error.message.includes('BUSYGROUP')) {
      throw error;
    }
  }

  const router = {
    running: true,

    async start() {
      console.log('🔄 Starting message router...');

      while (this.running) {
        try {
          // Read messages from main stream
          const messages = await redisClient.xReadGroup(
            'message-router',
            'router-consumer',
            [{ key: 'credit-events', id: '>' }],
            { COUNT: 10, BLOCK: 5000 }
          );

          if (messages && messages.length > 0) {
            for (const stream of messages) {
              for (const message of stream.messages) {
                await this.routeMessage(message);
              }
            }
          }
        } catch (error) {
          if (this.running) {
            console.error('❌ Message router error:', error.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
          }
        }
      }
    },

    async routeMessage(message) {
      try {
        // Check if Redis client is available
        if (!redisClient || redisClient.status !== 'ready') {
          console.log(`⚠️ Message router Redis client not available, skipping message ${message.id}`);
          return;
        }

        // Parse the message to get tenantId
        const event = { id: message.id };
        Object.entries(message.message).forEach(([key, value]) => {
          try {
            event[key] = JSON.parse(value);
          } catch {
            event[key] = value;
          }
        });

        // Handle wrapper API format where event is in 'data' field as JSON string
        if (event.data && typeof event.data === 'object') {
          Object.assign(event, event.data);
          delete event.data;
        }

        if (!event.tenantId) {
          console.log(`⚠️ Message ${message.id} has no tenantId, skipping`);
          if (redisClient && (redisClient.status === 'ready' || redisClient.status === 'connected')) {
            await redisClient.xAck('credit-events', 'message-router', message.id);
          }
          return;
        }

        // Find the tenant
        const tenant = tenants.find(t => t.tenantId === event.tenantId);
        if (!tenant) {
          console.log(`⚠️ Message ${message.id} for unknown tenant ${event.tenantId}, skipping`);
          if (redisClient && (redisClient.status === 'ready' || redisClient.status === 'connected')) {
            await redisClient.xAck('credit-events', 'message-router', message.id);
          }
          return;
        }

        // Route to tenant-specific stream
        const tenantStream = `credit-events:${event.tenantId}`;
        await redisClient.xAdd(tenantStream, '*', message.message);

        console.log(`🔄 Routed message ${message.id} to ${tenantStream}`);

        // Acknowledge the original message
        await redisClient.xAck('credit-events', 'message-router', message.id);

      } catch (error) {
        console.error(`❌ Failed to route message ${message.id}:`, error.message);
      }
    },

    async stop() {
      console.log('🛑 Stopping message router...');
      this.running = false;
      await redisClient.disconnect();
      console.log('✅ Message router stopped');
    }
  };

  // Start the router
  router.start();

  return router;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;
