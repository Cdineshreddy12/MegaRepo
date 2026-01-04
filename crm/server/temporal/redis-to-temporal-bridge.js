#!/usr/bin/env node

/**
 * Redis to Temporal Bridge for CRM
 * Reads from Redis streams and publishes events to Temporal workflows
 * Runs alongside existing Redis consumer during transition
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
      'crm:sync:user:user_created',
      'crm:sync:user:user_deactivated',
      'crm:sync:permissions:role_assigned',
      'crm:sync:permissions:role_unassigned',
      'crm:sync:role:role_created',
      'crm:sync:role:role_updated',
      'crm:sync:role:role_deleted',
      'crm:sync:organization:org_created',
      'crm:sync:credits:credit_allocated',
      'crm:sync:credits:credit_config_updated',
      'crm:organization-assignments',
    ];
    this.consumerGroup = 'temporal-bridge-consumers';
    this.consumerName = `crm-temporal-bridge-${process.pid}`;
    
    // Crash recovery configuration
    this.pendingMessageIdleThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.maxPendingClaimRetries = 3;
    
    // Metrics
    this.metrics = {
      messagesProcessed: 0,
      messagesFailed: 0,
      workflowsStarted: 0,
      workflowsFailed: 0,
      pendingMessagesClaimed: 0,
      startTime: Date.now(),
    };
    
    // Graceful shutdown flag
    this.isShuttingDown = false;
    this.currentBatch = null;
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
  parseRedisMessage(message) {
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

    // Handle wrapper API format where event is in 'data' field
    if (event.data && typeof event.data === 'string') {
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
    } else if (event.data && typeof event.data === 'object') {
      Object.assign(event, event.data);
      delete event.data;
    }

    return event;
  }

  /**
   * Map stream name to event type
   */
  getEventTypeFromStream(stream) {
    const mapping = {
      'crm:sync:user:user_created': 'user.created',
      'crm:sync:user:user_deactivated': 'user.deactivated',
      'crm:sync:permissions:role_assigned': 'role.assigned',
      'crm:sync:permissions:role_unassigned': 'role.unassigned',
      'crm:sync:role:role_created': 'role.created',
      'crm:sync:role:role_updated': 'role.updated',
      'crm:sync:role:role_deleted': 'role.deleted',
      'crm:sync:organization:org_created': 'org.created',
      'crm:sync:credits:credit_allocated': 'credit.allocated',
      'crm:sync:credits:credit_config_updated': 'credit.config.updated',
    };

    return mapping[stream] || stream.split(':').pop();
  }

  /**
   * Claim pending messages from crashed consumer instances
   */
  async claimPendingMessages() {
    let totalClaimed = 0;
    
    for (const stream of this.streams) {
      try {
        // Get pending count for this stream
        const pendingInfo = await this.redisClient.xPending(stream, this.consumerGroup);
        
        if (!pendingInfo || pendingInfo.pending === 0) {
          continue;
        }
        
        // Get detailed pending messages
        const pendingMessages = await this.redisClient.xPendingRange(
          stream,
          this.consumerGroup,
          '-', // min
          '+', // max
          100 // Max messages to check
        );
        
        if (!pendingMessages || pendingMessages.length === 0) {
          continue;
        }
        
        // Filter messages that are idle longer than threshold
        const messagesToClaim = pendingMessages.filter(msg => {
          const idleTime = parseInt(msg.timeSinceLastDelivery);
          return idleTime > this.pendingMessageIdleThreshold;
        });
        
        if (messagesToClaim.length === 0) {
          continue;
        }
        
        // Claim messages one by one (xClaim requires message IDs as array)
        for (const msg of messagesToClaim) {
          try {
            const claimedMessages = await this.redisClient.xClaim(
              stream,
              this.consumerGroup,
              this.consumerName,
              this.pendingMessageIdleThreshold,
              [msg.id] // xClaim requires array of message IDs
            );
            
            if (claimedMessages && claimedMessages.length > 0) {
              totalClaimed += claimedMessages.length;
              this.metrics.pendingMessagesClaimed += claimedMessages.length;
              
              // Process claimed messages
              for (const message of claimedMessages) {
                await this.processMessage(stream, message);
              }
            }
          } catch (claimError) {
            // Message might be actively processed by another consumer
            console.warn(`⚠️ Could not claim message ${msg.id} from stream ${stream}: ${claimError.message}`);
          }
        }
        
        if (totalClaimed > 0) {
          console.log(`🔄 Claimed ${totalClaimed} pending messages from stream ${stream}`);
        }
      } catch (error) {
        if (error.message.includes('NOGROUP')) {
          // Consumer group doesn't exist, skip
          continue;
        }
        console.error(`❌ Error claiming pending messages from stream ${stream}:`, error.message);
      }
    }
    
    return totalClaimed;
  }

  /**
   * Process a single message
   */
  async processMessage(stream, message) {
    try {
      const event = this.parseRedisMessage(message);
      const eventType = event.eventType || this.getEventTypeFromStream(stream);

      // Start Temporal workflow
      const workflowId = `crm-${eventType}-${event.tenantId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Start workflow BEFORE acknowledging (only ACK on success)
      await this.temporalClient.workflow.start('crmSyncWorkflow', {
        args: [{
          eventType,
          tenantId: event.tenantId,
          ...event,
        }],
        taskQueue: getTaskQueue('CRM'),
        workflowId,
        workflowIdReusePolicy: 'ALLOW_DUPLICATE', // Allow duplicate workflow IDs for retries
      });

      // Only acknowledge AFTER workflow starts successfully
      await this.redisClient.xAck(stream, this.consumerGroup, message.id);
      
      this.metrics.messagesProcessed++;
      this.metrics.workflowsStarted++;
      console.log(`✅ Published event ${eventType} to Temporal (workflow: ${workflowId})`);
      
      return true;
    } catch (error) {
      this.metrics.messagesFailed++;
      this.metrics.workflowsFailed++;
      
      // Check if it's a non-retryable error
      const isNonRetryable = error.message?.includes('WorkflowExecutionAlreadyStartedError') ||
                            error.message?.includes('ValidationError');
      
      if (isNonRetryable) {
        // Acknowledge non-retryable errors to prevent infinite loops
        try {
          await this.redisClient.xAck(stream, this.consumerGroup, message.id);
          console.warn(`⚠️ Acknowledged non-retryable error for message ${message.id}: ${error.message}`);
        } catch (ackError) {
          console.error(`❌ Failed to acknowledge non-retryable error:`, ackError.message);
        }
      } else {
        // Don't acknowledge retryable errors - let them retry
        console.error(`❌ Failed to process message ${message.id} from stream ${stream}:`, error.message);
      }
      
      return false;
    }
  }

  /**
   * Process messages from Redis streams
   */
  async processMessages() {
    try {
      // First, claim any pending messages from crashed instances
      if (!this.isShuttingDown) {
        await this.claimPendingMessages();
      }

      // Then process new messages
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

      // Store current batch for graceful shutdown
      this.currentBatch = result;

      let processedCount = 0;

      for (const streamResult of result) {
        const stream = streamResult.name;
        const messages = streamResult.messages;

        for (const message of messages) {
          if (this.isShuttingDown) {
            console.log('🛑 Shutdown requested, stopping message processing...');
            break;
          }
          
          const success = await this.processMessage(stream, message);
          if (success) {
            processedCount++;
          }
        }
      }

      // Clear current batch after processing
      this.currentBatch = null;

      return processedCount;
    } catch (error) {
      this.currentBatch = null;
      
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
   * Get metrics for monitoring
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const failureRate = this.metrics.messagesProcessed > 0 
      ? (this.metrics.messagesFailed / this.metrics.messagesProcessed * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      uptimeMs: uptime,
      uptimeMinutes: Math.floor(uptime / 60000),
      failureRate: `${failureRate}%`,
      isRunning: this.isRunning,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Log metrics periodically
   */
  logMetrics() {
    const metrics = this.getMetrics();
    console.log(`📊 Bridge Metrics:`, {
      processed: metrics.messagesProcessed,
      failed: metrics.messagesFailed,
      workflowsStarted: metrics.workflowsStarted,
      pendingClaimed: metrics.pendingMessagesClaimed,
      failureRate: metrics.failureRate,
      uptime: `${metrics.uptimeMinutes} minutes`,
    });
  }

  /**
   * Start the bridge
   */
  async start() {
    console.log('🚀 Starting Redis to Temporal Bridge for CRM...');
    
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }

    this.isRunning = true;

    console.log(`📋 Monitoring ${this.streams.length} Redis streams`);
    console.log(`📋 Consumer Group: ${this.consumerGroup}`);
    console.log(`📋 Consumer Name: ${this.consumerName}`);
    console.log(`📋 Pending message idle threshold: ${this.pendingMessageIdleThreshold / 1000}s`);

    // Log metrics every 5 minutes
    const metricsInterval = setInterval(() => {
      if (this.isRunning) {
        this.logMetrics();
      } else {
        clearInterval(metricsInterval);
      }
    }, 5 * 60 * 1000);

    // Process messages in a loop
    while (this.isRunning && !this.isShuttingDown) {
      try {
        await this.processMessages();
      } catch (error) {
        console.error('❌ Error in message processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
      }
    }

    clearInterval(metricsInterval);
  }

  /**
   * Stop the bridge gracefully
   */
  async stop() {
    console.log('🛑 Stopping Redis to Temporal Bridge...');
    this.isShuttingDown = true;
    this.isRunning = false;

    // Wait for current batch to finish (with timeout)
    if (this.currentBatch) {
      console.log('⏳ Waiting for current batch to finish...');
      const timeout = setTimeout(() => {
        console.warn('⚠️ Timeout waiting for batch, forcing shutdown...');
      }, 30000); // 30 second timeout

      // Wait up to 30 seconds for batch to complete
      let waitCount = 0;
      while (this.currentBatch && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitCount++;
      }

      clearTimeout(timeout);
    }

    // Log final metrics
    this.logMetrics();

    // Close connections
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        console.log('✅ Redis connection closed');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error);
      }
    }

    console.log('✅ Bridge stopped gracefully');
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

