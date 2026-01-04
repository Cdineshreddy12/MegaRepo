#!/usr/bin/env node

/**
 * Redis to Temporal Bridge for Wrapper
 * Reads from Redis streams and publishes events to Temporal workflows
 * Runs alongside existing Redis consumers during transition
 */

import { createClient } from 'redis';
import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../temporal-shared/client.js';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

dotenv.config();

class RedisToTemporalBridge {
  constructor() {
    this.redisClient = null;
    this.temporalClient = null;
    this.isRunning = false;
    this.streams = [
      'inter-app-events',
      'crm:organization-assignments',
    ];
    this.consumerGroup = 'wrapper-temporal-bridge-consumers';
    this.consumerName = `wrapper-temporal-bridge-${process.pid}`;
  }

  async initialize() {
    if (!TEMPORAL_CONFIG.enabled) {
      console.log('⚠️ Temporal is disabled. Bridge will not start.');
      return false;
    }

    try {
      // Connect to Redis
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required');
      }

      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('❌ Redis client error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis client connected');
      });

      await this.redisClient.connect();

      // Create consumer groups for each stream
      for (const stream of this.streams) {
        try {
          await this.redisClient.xGroupCreate(
            stream,
            this.consumerGroup,
            '0',
            { MKSTREAM: true }
          );
          console.log(`✅ Created consumer group for stream: ${stream}`);
        } catch (error) {
          if (error.message.includes('BUSYGROUP')) {
            console.log(`ℹ️ Consumer group already exists for stream: ${stream}`);
          } else {
            console.error(`❌ Failed to create consumer group for ${stream}:`, error.message);
          }
        }
      }

      // Connect to Temporal
      this.temporalClient = await getTemporalClient();
      console.log('✅ Connected to Temporal');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize bridge:', error);
      throw error;
    }
  }

  /**
   * Parse Redis message into event format
   */
  parseRedisMessage(message, stream) {
    const event = { id: message.id };

    // Parse all fields from Redis hash
    Object.entries(message.message).forEach(([key, value]) => {
      try {
        const parsed = JSON.parse(value);
        event[key] = parsed;
      } catch {
        event[key] = value;
      }
    });

    // Handle inter-app-events format
    if (stream === 'inter-app-events' && event.message) {
      try {
        const messageData = typeof event.message === 'string' 
          ? JSON.parse(event.message) 
          : event.message;
        Object.assign(event, messageData);
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse message field: ${parseError.message}`);
      }
    }

    // Handle organization-assignments format
    if (stream === 'crm:organization-assignments' && event.event) {
      try {
        const eventData = typeof event.event === 'string'
          ? JSON.parse(event.event)
          : event.event;
        Object.assign(event, eventData);
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse event field: ${parseError.message}`);
      }
    }

    return event;
  }

  /**
   * Determine workflow type based on stream
   */
  getWorkflowType(stream) {
    if (stream === 'inter-app-events') {
      return 'interAppWorkflow';
    } else if (stream === 'crm:organization-assignments') {
      return 'organizationAssignmentWorkflow';
    }
    return null;
  }

  /**
   * Process messages from Redis streams
   */
  async processMessages() {
    try {
      const readConfigs = this.streams.map(stream => ({ key: stream, id: '>' }));

      const result = await this.redisClient.xReadGroup(
        this.consumerGroup,
        this.consumerName,
        readConfigs,
        { COUNT: 10, BLOCK: 5000 }
      );

      if (!result || result.length === 0) {
        return 0;
      }

      let processedCount = 0;

      for (const streamResult of result) {
        const stream = streamResult.name;
        const messages = streamResult.messages;
        const workflowType = this.getWorkflowType(stream);

        if (!workflowType) {
          console.warn(`⚠️ Unknown stream type: ${stream}, skipping`);
          continue;
        }

        for (const message of messages) {
          try {
            const event = this.parseRedisMessage(message, stream);

            // Start Temporal workflow
            const workflowId = `wrapper-${workflowType}-${event.tenantId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await this.temporalClient.workflow.start(workflowType, {
              args: [{
                ...event,
                tenantId: event.tenantId,
              }],
              taskQueue: getTaskQueue('WRAPPER'),
              workflowId,
            });

            // Acknowledge message in Redis
            await this.redisClient.xAck(stream, this.consumerGroup, message.id);
            
            processedCount++;
            console.log(`✅ Published event from ${stream} to Temporal (workflow: ${workflowId})`);
          } catch (error) {
            console.error(`❌ Failed to process message ${message.id} from stream ${stream}:`, error.message);
            // Don't acknowledge on error - let it retry
          }
        }
      }

      return processedCount;
    } catch (error) {
      if (error.message.includes('NOGROUP')) {
        // Consumer group doesn't exist, recreate it
        console.log('⚠️ Consumer group not found, recreating...');
        await this.initialize();
        return 0;
      }
      console.error('❌ Error processing messages:', error);
      return 0;
    }
  }

  /**
   * Start the bridge
   */
  async start() {
    console.log('🚀 Starting Redis to Temporal Bridge for Wrapper...');
    
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }

    this.isRunning = true;

    console.log(`📋 Monitoring ${this.streams.length} Redis streams`);
    console.log(`📋 Consumer Group: ${this.consumerGroup}`);
    console.log(`📋 Consumer Name: ${this.consumerName}`);

    // Process messages in a loop
    while (this.isRunning) {
      try {
        await this.processMessages();
      } catch (error) {
        console.error('❌ Error in message processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
      }
    }
  }

  /**
   * Stop the bridge
   */
  async stop() {
    console.log('🛑 Stopping Redis to Temporal Bridge...');
    this.isRunning = false;

    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Run if executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bridge = new RedisToTemporalBridge();

  process.on('SIGINT', async () => {
    await bridge.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await bridge.stop();
    process.exit(0);
  });

  bridge.start().catch((error) => {
    console.error('❌ Bridge failed:', error);
    process.exit(1);
  });
}

export default RedisToTemporalBridge;

