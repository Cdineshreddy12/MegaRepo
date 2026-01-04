import { createClient } from 'redis';
import CircuitBreaker from '../utils/circuitBreaker.js';
import messageProcessingTracker from './messageProcessingTracker.js';

/**
 * 🚀 Redis Streams CRM Consumer
 *
 * Implements real-time synchronization using Redis Streams as per the guide.
 * Handles consumer groups, event ordering, idempotency, and error handling.
 * 
 * Production-Ready Features:
 * - Circuit Breaker: Prevents cascading failures
 * - Pending Message Protection: DB check for edge cases (consumer crash)
 * - Graceful Shutdown: Prevents data corruption during shutdown
 */
class RedisStreamsCRMConsumer {
  constructor(options = {}) {
    this.options = {
      redisUrl: process.env.REDIS_URL,
      consumerGroup: process.env.CRM_CONSUMER_GROUP || 'crm-consumers',
      consumerName: process.env.CRM_CONSUMER_NAME || 'crm-credit-consumer',
      tenantId: process.env.CRM_TENANT_ID || 'b0a6e370-c1e5-43d1-94e0-55ed792274c4',
      batchSize: parseInt(process.env.CRM_BATCH_SIZE) || 10,
      blockTime: parseInt(process.env.CRM_BLOCK_TIME) || 5000,
      maxRetries: parseInt(process.env.CRM_MAX_RETRIES) || 3,
      ...options
    };

    this.redisClient = null;
    this.isRunning = false;
    this.isShuttingDown = false; // Flag to prevent new processing during shutdown
    this.redisHealthy = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.healthCheckInterval = null;
    this.trimInterval = null; // For automatic message trimming
    
    // Circuit breakers for different operations
    this.redisCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000
    });
    
    this.mongoCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000
    });
    
    this.metrics = {
      eventsProcessed: 0,
      eventsFailed: 0,
      eventsByType: new Map(),
      processingTimes: [],
      lastProcessedId: '0-0'
    };

    // Stream names to listen to (following the guide)
    // Temporarily focusing only on credit-events for testing
    this.streams = [
      'crm:sync:user:user_created',
      'crm:sync:user:user_deactivated',
      'crm:sync:user:user_deleted', // User permanent deletion
      'crm:sync:permissions:role_assigned',
      'crm:sync:permissions:role_unassigned',
      'crm:sync:permissions:role_updated', // Wrapper publishes role updates here
      'crm:sync:role_permissions', // Legacy role permissions
      'crm:sync:role:role_created', // New role CRUD events
      'crm:sync:role:role_updated', // Alternative stream name
      'crm:sync:role:role_deleted',
      'crm:sync:organization:org_created',
      'crm:sync:credits:credit_allocated',
      'crm:sync:credits:credit_config_updated',
      'crm:organization-assignments', // Organization assignment events
      // New credit events stream for real-time synchronization
      'credit-events'
    ];

    // Event handlers mapping
    this.eventHandlers = {
      'user_created': this.handleUserCreated.bind(this),
      'user_deactivated': this.handleUserDeactivated.bind(this),
      'user_deleted': this.handleUserDeleted.bind(this), // User permanent deletion
      'role_assigned': this.handleRoleAssigned.bind(this),
      'role_unassigned': this.handleRoleUnassigned.bind(this),
      'role_permissions_changed': this.handleRolePermissionsChanged.bind(this),
      'role_updated': this.handleRoleUpdated.bind(this), // Wrapper publishes as 'role_updated'
      'role.created': this.handleRoleCreated.bind(this), // New role CRUD handlers
      'role.updated': this.handleRoleUpdated.bind(this), // Alternative event type
      'role.deleted': this.handleRoleDeleted.bind(this),
      'org_created': this.handleOrgCreated.bind(this),
      'credit_allocated': this.handleCreditAllocated.bind(this),
      'credit_config_updated': this.handleCreditConfigUpdated.bind(this),
      // New credit event handlers for real-time synchronization
      // NOTE: Only credit.allocated events are consumed from credit-events stream
      // Credit consumption/transaction events are NOT published to streams (internal CRM operations only)
      'credit.allocated': this.handleCreditAllocated.bind(this),
      // Organization assignment event handlers
      'organization.assignment.created': this.handleOrganizationAssignmentCreated.bind(this),
      'organization.assignment.updated': this.handleOrganizationAssignmentUpdated.bind(this),
      'organization.assignment.deleted': this.handleOrganizationAssignmentDeleted.bind(this),
      'organization.assignment.deactivated': this.handleOrganizationAssignmentDeactivated.bind(this),
      'organization.assignment.activated': this.handleOrganizationAssignmentActivated.bind(this)
    };
  }

  /**
   * Initialize the Redis Streams consumer
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Redis Streams CRM Consumer');
      console.log(`🔗 Redis URL: ${this.options.redisUrl.replace(/:([^:@]{4})[^:@]*@/, ':$1****@')}`);
      console.log(`👥 Consumer Group: ${this.options.consumerGroup}`);
      console.log(`🏷️ Consumer Name: ${this.options.consumerName}`);
      console.log(`🏢 Tenant ID: ${this.options.tenantId}`);
      console.log('='.repeat(60));

      // Connect to Redis
      this.redisClient = createClient({
        url: this.options.redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('❌ Max Redis reconnection attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Set up event handlers with health monitoring BEFORE connecting
      this.redisClient.on('connect', () => {
        console.log('✅ Redis client connected');
        this.redisHealthy = true;
        this.reconnectAttempts = 0;
      });
      this.redisClient.on('ready', () => {
        console.log('✅ Redis client ready');
        this.redisHealthy = true;
        this.startHealthChecks();
      });
      this.redisClient.on('error', (err) => {
        console.error('❌ Redis client error:', err.message);
        this.redisHealthy = false;
        this.handleRedisError(err);
      });
      this.redisClient.on('end', () => {
        console.log('🔌 Redis client disconnected');
        this.redisHealthy = false;
        this.stopHealthChecks();
      });

      // Connect to Redis
      await this.redisClient.connect();

      // Create consumer groups for each stream pattern
      await this.createConsumerGroups();

      // Start automatic message trimming (daily cleanup)
      this.startAutomaticTrimming();

      console.log('✅ Redis Streams CRM Consumer initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Redis Streams consumer:', error);
      throw error;
    }
  }

  /**
   * Start automatic message trimming (cleanup old messages)
   */
  startAutomaticTrimming() {
    // Get retention period from env (default: 30 days)
    const retentionDays = parseInt(process.env.CREDIT_EVENTS_RETENTION_DAYS) || 
                          parseInt(process.env.STREAM_RETENTION_DAYS) || 30;
    
    console.log(`🧹 Automatic trimming enabled: ${retentionDays} days retention`);

    // Trim old messages on startup
    this.trimOldMessages(retentionDays).catch(err => {
      console.error('❌ Error trimming old messages on startup:', err.message);
    });

    // Schedule daily trimming (every 24 hours)
    const trimIntervalMs = 24 * 60 * 60 * 1000; // 24 hours
    
    this.trimInterval = setInterval(() => {
      this.trimOldMessages(retentionDays).catch(err => {
        console.error('❌ Error trimming old messages:', err.message);
      });
    }, trimIntervalMs);

    console.log(`⏰ Scheduled automatic trimming every 24 hours`);
  }

  /**
   * Trim old messages from streams
   * @param {number} retentionDays - Number of days to retain messages
   */
  async trimOldMessages(retentionDays = 30) {
    if (!this.redisClient || !this.redisHealthy) {
      return; // Skip if Redis not available
    }

    try {
      const cutoffTimestamp = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const minId = `${cutoffTimestamp}-0`;
      let totalTrimmed = 0;

      for (const stream of this.streams) {
        try {
          const trimmed = await this.redisClient.xTrim(stream, 'MINID', '~', minId);
          if (trimmed > 0) {
            totalTrimmed += trimmed;
            console.log(`🧹 Trimmed ${trimmed} messages older than ${retentionDays} days from ${stream}`);
          }
        } catch (error) {
          // Stream might not exist, ignore
          if (!error.message.includes('no such key') && !error.message.includes('NOGROUP')) {
            console.error(`❌ Error trimming ${stream}:`, error.message);
          }
        }
      }

      if (totalTrimmed > 0) {
        console.log(`✅ Total trimmed: ${totalTrimmed} messages across all streams`);
      }
    } catch (error) {
      console.error('❌ Error in trimOldMessages:', error.message);
    }
  }

  /**
   * Start Redis health checks
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.redisClient.ping();
        if (!this.redisHealthy) {
          console.log('✅ Redis connection restored');
          this.redisHealthy = true;
          this.reconnectAttempts = 0;
        }
      } catch (error) {
        if (this.redisHealthy) {
          console.error('❌ Redis health check failed:', error.message);
          this.redisHealthy = false;
        }
        this.handleRedisError(error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop Redis health checks
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Handle Redis connection errors with automatic reconnection
   */
  async handleRedisError(error) {
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect to Redis (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      try {
        if (!this.redisClient || this.redisClient.status === 'end') {
          await this.redisClient.connect();
        }
      } catch (reconnectError) {
        console.error(`❌ Redis reconnection failed:`, reconnectError.message);

        // Exponential backoff for reconnection attempts
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        console.log(`⏳ Waiting ${delay}ms before next reconnection attempt`);

        setTimeout(() => {
          this.handleRedisError(error);
        }, delay);
      }
    } else {
      console.error('🚨 Max Redis reconnection attempts reached. Manual intervention required.');
      console.error('💡 Check Redis server status and network connectivity');
    }
  }

  /**
   * Check if Redis is healthy
   */
  isRedisHealthy() {
    return this.redisHealthy && this.redisClient;
  }

  /**
   * Create consumer groups for all streams
   */
  async createConsumerGroups() {
    console.log('👥 Creating consumer groups...');

    for (const stream of this.streams) {
      try {
        await this.redisClient.xGroupCreate(
          stream,
          this.options.consumerGroup,
          '0',
          { MKSTREAM: true }
        );
        console.log(`✅ Consumer group created: ${stream} -> ${this.options.consumerGroup}`);
      } catch (error) {
        if (error.message.includes('BUSYGROUP')) {
          console.log(`ℹ️ Consumer group already exists for: ${stream}`);
        } else {
          console.error(`❌ Failed to create consumer group for ${stream}:`, error);
        }
      }
    }
  }

  /**
   * Start consuming events from Redis Streams
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Consumer is already running');
      return;
    }

    this.isRunning = true;
    console.log('▶️ Starting Redis Streams consumption...');

    try {
      // First, try to claim any pending messages from other consumers
      await this.claimPendingMessages();

      console.log('🔄 Starting consumer loop...');
      let consecutiveEmptyCycles = 0;
      let circuitBreakerOpenCycles = 0;
      let lastCleanupTime = Date.now();
      const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
      
      while (this.isRunning) {
        // Periodic cleanup of stale processing records (every 30 minutes)
        if (Date.now() - lastCleanupTime > CLEANUP_INTERVAL) {
          try {
            const staleCount = await messageProcessingTracker.cleanupStaleProcessingRecords();
            if (staleCount > 0) {
              console.log(`🧹 Periodic cleanup: Removed ${staleCount} stale processing record(s)`);
            }
            lastCleanupTime = Date.now();
          } catch (cleanupError) {
            console.error('❌ Error during periodic cleanup:', cleanupError.message);
          }
        }
        // Check circuit breaker state before processing
        const circuitBreakerState = this.mongoCircuitBreaker.getState();
        const circuitBreakerInfo = this.mongoCircuitBreaker.getStateInfo();
        
        if (circuitBreakerState === 'OPEN') {
          const waitTime = circuitBreakerInfo.waitTimeMs;
          const minWaitTime = 5000; // Minimum 5 seconds wait
          const actualWaitTime = Math.max(waitTime, minWaitTime);
          
          circuitBreakerOpenCycles++;
          // Log every cycle when circuit breaker is OPEN (but limit verbosity)
          if (circuitBreakerOpenCycles === 1 || circuitBreakerOpenCycles % 10 === 0) {
            console.log(`⚠️ MongoDB circuit breaker is OPEN, waiting ${Math.ceil(actualWaitTime / 1000)}s before retry (cycle ${circuitBreakerOpenCycles})`, {
              nextAttempt: circuitBreakerInfo.nextAttempt,
              waitTimeMs: actualWaitTime
            });
          }
          
          // Wait until circuit breaker recovery time or minimum wait time
          await new Promise(resolve => setTimeout(resolve, actualWaitTime));
          
          // Don't process messages when circuit breaker is OPEN - skip this cycle
          continue;
        }
        
        // Reset circuit breaker open cycles counter when circuit breaker is not OPEN
        if (circuitBreakerOpenCycles > 0) {
          console.log(`✅ Circuit breaker recovered (was OPEN for ${circuitBreakerOpenCycles} cycles), resuming message processing`);
          circuitBreakerOpenCycles = 0;
        }
        
        let messagesProcessed = 0;
        let circuitBreakerBlocked = false;
        
        // Process new messages (only log if messages found)
        const newMessagesResult = await this.processNewMessages();
        if (typeof newMessagesResult === 'object' && newMessagesResult.circuitBreakerOpen) {
          circuitBreakerBlocked = true;
        } else {
          messagesProcessed += newMessagesResult || 0;
        }
        
        // Process pending messages (only log if messages found)
        const pendingMessagesResult = await this.processPendingMessages();
        if (typeof pendingMessagesResult === 'object' && pendingMessagesResult.circuitBreakerOpen) {
          circuitBreakerBlocked = true;
        } else {
          messagesProcessed += pendingMessagesResult || 0;
        }
        
        // If circuit breaker blocked processing, wait and retry
        if (circuitBreakerBlocked) {
          const waitTime = Math.max(5000, circuitBreakerInfo.waitTimeMs || 5000);
          console.log(`⏸️ Circuit breaker OPEN blocked message processing, waiting ${Math.ceil(waitTime / 1000)}s`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Only wait if no messages were processed (avoid tight loop when idle)
        if (messagesProcessed === 0) {
          consecutiveEmptyCycles++;
          // Only log every 10th empty cycle to reduce log spam
          if (consecutiveEmptyCycles % 10 === 0) {
            console.log(`⏳ No messages found (${consecutiveEmptyCycles} empty cycles), waiting 5 seconds...`);
          }
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        } else {
          consecutiveEmptyCycles = 0; // Reset counter when messages are found
          console.log(`✅ Processed ${messagesProcessed} message(s), continuing immediately...`);
        }
      }
    } catch (error) {
      console.error('❌ Error in consumer loop:', error);
      this.isRunning = false;
    }
  }

  /**
   * Claim pending messages from other consumers at startup
   */
  async claimPendingMessages() {
    console.log('🔄 FORCE CLAIMING ALL PENDING MESSAGES FROM CRASHED CONSUMERS...');

    try {
      let totalClaimed = 0;

      // Claim ALL pending messages from ALL streams aggressively
      for (const stream of this.streams) {
    try {
          // Get ALL pending messages for this stream
          const pendingDetails = await this.redisClient.xPendingRange(
            stream,
            this.options.consumerGroup,
            '-', // min
            '+', // max
            100 // Get up to 100 messages at once
          );

          if (pendingDetails.length > 0) {
            console.log(`   📋 Found ${pendingDetails.length} pending messages in ${stream}`);

            for (const msg of pendingDetails) {
              try {
                console.log(`      🎯 FORCE claiming message ${msg.id} (was with: ${msg.consumer || 'unassigned'})`);

                // Use very aggressive claiming - claim immediately regardless of idle time
            const claimed = await this.redisClient.xClaim(
              stream,
              this.options.consumerGroup,
              this.options.consumerName,
                  0, // No minimum idle time - claim immediately
                  [msg.id]
            );

            if (claimed && claimed.length > 0) {
                  totalClaimed++;
                  console.log(`      ✅ FORCE claimed: ${msg.id}`);

                  // Immediately process the claimed message
              const messages = await this.redisClient.xReadGroup(
                this.options.consumerGroup,
                this.options.consumerName,
                [{ key: stream, id: '0' }],
                { COUNT: 1, BLOCK: 100 }
              );

              if (messages && messages.length > 0) {
                await this.processMessages(messages, true); // true = pending messages
                    console.log(`      ✅ Processed: ${msg.id}`);
              }
            } else {
                  console.log(`      ⚠️ Could not claim ${msg.id} (actively processed by another consumer)`);
            }
          } catch (claimError) {
                console.log(`      ❌ Failed to claim ${msg.id}: ${claimError.message}`);
          }
        }
          }
        } catch (error) {
          if (!error.message.includes('NOGROUP')) {
            console.log(`   ⚠️ Error claiming from ${stream}: ${error.message}`);
        }
      }
      }

      console.log(`🔄 FORCE CLAIMING COMPLETE: ${totalClaimed} messages claimed and processed`);

    } catch (error) {
      console.error('❌ Error in force claiming pending messages:', error);
    }
  }

  /**
   * Process pending messages (unacknowledged)
   * @returns {Promise<number>} Number of messages processed
   */
  async processPendingMessages() {
    try {
      // Check circuit breaker state before processing
      if (this.mongoCircuitBreaker.getState() === 'OPEN') {
        return { circuitBreakerOpen: true };
      }

      let totalProcessed = 0;

      // First, claim any unassigned pending messages (with stuck message handling)
      await this.claimUnassignedPendingMessages();

      // Then try to read messages assigned to this consumer
      for (const stream of this.streams) {
        try {
          const result = await this.redisClient.xReadGroup(
            this.options.consumerGroup,
            this.options.consumerName,
            [{ key: stream, id: '0' }],
            { COUNT: this.options.batchSize, BLOCK: 100 }
          );

          if (result && result.length > 0) {
            const streamData = result[0]; // xReadGroup returns array of stream results
            if (streamData.messages && streamData.messages.length > 0) {
              console.log(`   ✅ Found ${streamData.messages.length} pending messages in ${stream}`);
              const processResult = await this.processMessages(result, true); // true = pending messages
              
              // Check if processing was blocked by circuit breaker
              if (processResult && typeof processResult === 'object' && processResult.circuitBreakerOpen) {
                return { circuitBreakerOpen: true };
              }
              
              totalProcessed += streamData.messages.length;
            }
          }
        } catch (streamError) {
          // This stream might not have pending messages for this consumer
          if (!streamError.message.includes('NOGROUP') && !streamError.message.includes('The client is closed')) {
            console.log(`   ⚠️ Error reading ${stream}: ${streamError.message}`);
          }
        }
      }

      return totalProcessed;
    } catch (error) {
      if (error.message !== 'Connection is closed' && error.message !== 'The client is closed') {
      console.error('❌ Error processing pending messages:', error);
      }
      return 0;
    }
  }

  /**
   * Claim pending messages that aren't assigned to any consumer
   */
  async claimUnassignedPendingMessages() {
    const STUCK_MESSAGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    for (const stream of this.streams) {
      try {
        // Get ALL pending messages for this stream (not just unassigned)
        const pendingDetails = await this.redisClient.xPendingRange(
          stream,
          this.options.consumerGroup,
          '-', // min
          '+', // max
          50 // Get more messages at once
        );

        // Only log if there are pending messages to claim
        if (pendingDetails.length > 0) {
          console.log(`   📋 Found ${pendingDetails.length} pending messages in ${stream} to claim`);

        for (const msg of pendingDetails) {
            // Check if message is stuck (pending for more than 5 minutes)
            const timeSinceDelivery = Date.now() - msg.timeSinceDelivery;
            const isStuck = timeSinceDelivery > STUCK_MESSAGE_TIMEOUT;
            
            if (isStuck) {
              console.log(`   ⚠️ Stuck message detected: ${msg.id} (pending for ${Math.floor(timeSinceDelivery / 1000)}s, assigned to: ${msg.consumer || 'unassigned'})`);
              
              // Try to claim it first
              try {
                const claimed = await this.redisClient.xClaim(
                  stream,
                  this.options.consumerGroup,
                  this.options.consumerName,
                  1000, // Very short min idle time (1 second) to claim even recently active messages
                  [msg.id]
                );

                if (claimed && claimed.length > 0) {
                  console.log(`   ✅ Claimed stuck message: ${msg.id}`);
                  continue; // Successfully claimed, will be processed normally
                }
              } catch (claimError) {
                // If claim fails, acknowledge to prevent infinite loop
                console.log(`   ⚠️ Could not claim stuck message ${msg.id}, acknowledging to prevent infinite loop: ${claimError.message}`);
                try {
                  await this.redisClient.xAck(stream, this.options.consumerGroup, msg.id);
                  console.log(`   ✅ Acknowledged stuck message ${msg.id} to prevent infinite retry`);
                } catch (ackError) {
                  console.log(`   ❌ Failed to acknowledge stuck message ${msg.id}: ${ackError.message}`);
                }
                continue;
              }
            }
            
            // Claim ALL pending messages, even those assigned to other consumers
            // This handles crashed consumers and ensures no messages are lost
            console.log(`   🎯 Claiming message ${msg.id} from ${stream} (was assigned to: ${msg.consumer || 'unassigned'})`);

            try {
              const claimed = await this.redisClient.xClaim(
                stream,
                this.options.consumerGroup,
                this.options.consumerName,
                1000, // Very short min idle time (1 second) to claim even recently active messages
                [msg.id]
              );

              if (claimed && claimed.length > 0) {
                console.log(`   ✅ Claimed message: ${msg.id}`);
              } else {
                console.log(`   ⚠️ Could not claim message ${msg.id} (may be actively processed by another consumer)`);
              }
            } catch (claimError) {
              console.log(`   ❌ Failed to claim message ${msg.id}: ${claimError.message}`);
            }
          }
        }
      } catch (error) {
        // Stream might not have consumer group or pending messages
        if (!error.message.includes('NOGROUP')) {
          console.log(`   ⚠️ Error checking pending messages for ${stream}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Process new messages
   */
  async processNewMessages() {
    try {
      // Check circuit breaker state before processing
      if (this.mongoCircuitBreaker.getState() === 'OPEN') {
        return { circuitBreakerOpen: true };
      }

      // Check if Redis client is available
      if (!this.redisClient || !this.redisHealthy) {
        console.log('⚠️ Redis client not ready, skipping message processing');
        return 0;
      }

      // PRIORITY 1: Always try to read new messages first (use '>')
      const newReadConfigs = this.streams.map(stream => ({ key: stream, id: '>' }));

      const newResult = await this.redisClient.xReadGroup(
        this.options.consumerGroup,
        this.options.consumerName,
        newReadConfigs,
        { COUNT: this.options.batchSize, BLOCK: 100 }
      );

      let newMessagesCount = 0;
      if (newResult && newResult.length > 0) {
        const totalMessages = newResult.reduce((sum, stream) => sum + stream.messages.length, 0);
        if (totalMessages > 0) {
          console.log(`📨 Processing ${totalMessages} new message(s)...`);
          const processResult = await this.processMessages(newResult, false); // false = not pending (new messages)
          
          // Check if processing was blocked by circuit breaker
          if (processResult && typeof processResult === 'object' && processResult.circuitBreakerOpen) {
            return { circuitBreakerOpen: true };
          }
          
          newMessagesCount = totalMessages;
        }
      }

      // PRIORITY 2: Then process any pending messages assigned to this consumer
      const pendingReadConfigs = this.streams.map(stream => ({ key: stream, id: '0' }));

      const pendingResult = await this.redisClient.xReadGroup(
        this.options.consumerGroup,
        this.options.consumerName,
        pendingReadConfigs,
        { COUNT: this.options.batchSize, BLOCK: 100 }
      );

      let pendingMessagesCount = 0;
      if (pendingResult && pendingResult.length > 0) {
          const totalMessages = pendingResult.reduce((sum, stream) => sum + stream.messages.length, 0);
        if (totalMessages > 0) {
          console.log(`📋 Processing ${totalMessages} pending message(s)...`);
          const processResult = await this.processMessages(pendingResult, true); // true = pending messages
          
          // Check if processing was blocked by circuit breaker
          if (processResult && typeof processResult === 'object' && processResult.circuitBreakerOpen) {
            return { circuitBreakerOpen: true };
          }
          
          pendingMessagesCount = totalMessages;
        }
      }

      return newMessagesCount + pendingMessagesCount;
    } catch (error) {
      if (error.message !== 'Connection is closed' && error.message !== 'The client is closed') {
        console.error('❌ Error processing new messages:', error);
      } else {
        console.log('⚠️ Redis connection closed during message processing');
      }
      return 0;
    }
  }

  /**
   * Process a batch of messages
   * @param {Array} results - Messages from xReadGroup
   * @param {boolean} isPending - true if messages are pending (id='0'), false if new (id='>')
   */
  async processMessages(results, isPending = false) {
    // Stop processing if shutting down
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown in progress, skipping message processing');
      return;
    }

    // Check circuit breaker state before processing
    if (this.mongoCircuitBreaker.getState() === 'OPEN') {
      return { circuitBreakerOpen: true };
    }

    for (const result of results) {
      const stream = result.name; // xReadGroup returns objects with 'name' property
      const messages = result.messages;

      for (const message of messages) {
        // Stop processing individual messages if shutting down
        if (this.isShuttingDown) {
          console.log('⚠️ Shutdown in progress, stopping message processing');
          return;
        }

        // Check circuit breaker state before each message
        if (this.mongoCircuitBreaker.getState() === 'OPEN') {
          return { circuitBreakerOpen: true };
        }

        const messageId = String(message.id);

        try {
          const startTime = Date.now();
          const event = this.parseRedisMessage(message);

          // Filter events by tenantId for global streams (like crm:organization-assignments)
          // Tenant-specific streams (like credit-events:{tenantId}) don't need filtering
          if (stream.includes('crm:') && !stream.includes(`:${this.options.tenantId}`)) {
            // This is a global stream, check if event belongs to this tenant
            if (event.tenantId && event.tenantId !== this.options.tenantId) {
              console.log(`⏭️ Skipping event ${message.id} - tenant mismatch (event: ${event.tenantId}, consumer: ${this.options.tenantId})`);
              // Still acknowledge to prevent reprocessing
              if (this.redisClient && (this.redisHealthy || this.redisClient.status === 'ready')) {
            await this.redisClient.xAck(stream, this.options.consumerGroup, messageId);
              }
            continue;
          }
          }

          // STEP 1: Check idempotency for ALL messages (not just pending)
          const eventType = event.eventType || 'unknown';
          const alreadyProcessed = await messageProcessingTracker.checkMessageProcessed(
            messageId,
            eventType,
            stream,
            this.options.consumerGroup
          );
          
          if (alreadyProcessed) {
            console.log(`⏭️ Message ${messageId} (${eventType}) already processed or currently processing, skipping`);
            // Still acknowledge to prevent infinite retry
            if (this.redisClient && (this.redisHealthy || this.redisClient.status === 'ready')) {
              await this.redisClient.xAck(stream, this.options.consumerGroup, messageId);
            }
            continue;
          }

          // STEP 2: Determine if this is a complex event (needs Temporal) or simple event (direct processing)
          const isComplexEvent = this.isComplexEvent(eventType);
          const workflowId = isComplexEvent ? this.getWorkflowId(event) : null;

          // STEP 3: Mark as processing BEFORE any processing (atomic operation)
          const markedAsProcessing = await messageProcessingTracker.markMessageProcessing(
            messageId,
            eventType,
            workflowId,
            stream,
            this.options.consumerGroup
          );

          if (!markedAsProcessing) {
            // Another process is already processing this message
            console.log(`⚠️ Message ${messageId} could not be marked as processing (race condition), skipping`);
            if (this.redisClient && (this.redisHealthy || this.redisClient.status === 'ready')) {
              await this.redisClient.xAck(stream, this.options.consumerGroup, messageId);
            }
            continue;
          }

          // STEP 4: Process event with circuit breaker protection for MongoDB operations
          let processResult;
          try {
            processResult = await this.mongoCircuitBreaker.execute(async () => {
              if (isComplexEvent) {
                return await this.handleComplexEvent(event, workflowId);
              } else {
                return await this.handleSimpleEvent(event);
              }
            });
          } catch (circuitError) {
            if (circuitError.code === 'CIRCUIT_BREAKER_OPEN') {
              // Circuit breaker opened during processing - mark as failed and return early
              await messageProcessingTracker.markMessageFailed(messageId, eventType, 'Circuit breaker OPEN');
              return { circuitBreakerOpen: true };
            }
            // Mark as failed on other errors
            await messageProcessingTracker.markMessageFailed(messageId, eventType, circuitError.message);
            throw circuitError;
          }

          // STEP 5: Handle different result types and mark completion status
          let shouldAcknowledge = true;
          let wasSuccessful = true;

          if (processResult && typeof processResult === 'object') {
            if (processResult.skipped) {
              // Event was skipped (e.g., already processed), still acknowledge
              console.log(`⏭️ Event ${event.eventType} was skipped: ${processResult.reason}`);
              shouldAcknowledge = true;
              wasSuccessful = true;
            } else if (processResult.acknowledged) {
              // Event processing failed but should be acknowledged (e.g., concurrent modification after retries)
              console.log(`⚠️ Event ${event.eventType} failed but acknowledged: ${processResult.reason}`);
              shouldAcknowledge = true;
              wasSuccessful = false;
            } else if (processResult.success === false) {
              // Event processing failed
              wasSuccessful = false;
              shouldAcknowledge = false; // Don't acknowledge failed events
            } else {
              // Event processed successfully
              wasSuccessful = true;
              shouldAcknowledge = true;
            }
          }

          // STEP 6: Mark as completed BEFORE acknowledging Redis message
          if (wasSuccessful) {
            await messageProcessingTracker.markMessageCompleted(messageId, eventType);
          } else {
            // Mark as failed if not already marked
            const errorMsg = processResult?.error || processResult?.reason || 'Processing failed';
            await messageProcessingTracker.markMessageFailed(messageId, eventType, errorMsg);
          }

          // STEP 7: Acknowledge message if processing was successful or skipped
          if (shouldAcknowledge) {
            // Check if Redis client is still available for acknowledgment
            if (this.redisClient && (this.redisHealthy || this.redisClient.status === 'ready')) {
              console.log(`🔄 Acknowledging message: stream=${stream}, group=${this.options.consumerGroup}, id=${messageId}`);
              await this.redisClient.xAck(stream, this.options.consumerGroup, messageId);
            } else {
              console.log(`⚠️ Cannot acknowledge message ${messageId}: Redis client not available (healthy: ${this.redisHealthy}, status: ${this.redisClient?.status})`);
            }
          }

          // Update metrics
          const processingTime = Date.now() - startTime;
          this.updateMetrics(event, wasSuccessful, processingTime);

          const status = wasSuccessful ? '✅' : '❌';
          console.log(`${status} Processed ${event.eventType} (${event.entityId || 'unknown'}) in ${processingTime}ms`);

        } catch (error) {
          console.error(`❌ Failed to process event ${message.id}:`, error);
          this.updateMetrics(null, false, 0);

          // Mark as failed if not already marked
          const eventType = event?.eventType || 'unknown';
          await messageProcessingTracker.markMessageFailed(messageId, eventType, error.message);

          // Handle processing error
          await this.handleProcessingError(stream, message, error);
        }
      }
    }
  }

  /**
   * Parse Redis message into event object
   */
  parseRedisMessage(message) {
    const event = { id: message.id };

    // Log raw message structure for debugging role assignment events
    const messageKeys = Object.keys(message.message || {});
    if (messageKeys.includes('eventType') && (message.message.eventType?.includes('role_assigned') || message.message.eventType?.includes('role_unassigned'))) {
      console.log(`🔍 Raw Redis message keys: ${messageKeys.join(', ')}`);
      console.log(`🔍 Raw message.data type: ${typeof message.message.data}, value preview: ${message.message.data ? String(message.message.data).substring(0, 200) : 'undefined'}`);
    }

    // Parse all fields from Redis hash
    Object.entries(message.message).forEach(([key, value]) => {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(value);
        event[key] = parsed;
      } catch {
        // If parsing fails, keep as string
        event[key] = value;
      }
    });

    // Handle wrapper API format where event is in 'data' field as JSON string
    // Case 1: data is already an object (from previous parsing)
    if (event.data && typeof event.data === 'object') {
      Object.assign(event, event.data);
      delete event.data;
    }
    // Case 2: data is a JSON string that needs parsing
    else if (event.data && typeof event.data === 'string') {
      try {
        // Remove surrounding quotes if present (Redis format)
        let dataStr = event.data;
        if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
          dataStr = dataStr.slice(1, -1);
        }
        
        const parsedData = JSON.parse(dataStr);
        Object.assign(event, parsedData);
        delete event.data;
        
        if (event.eventType && (event.eventType.includes('role_assigned') || event.eventType.includes('role_unassigned'))) {
          console.log(`✅ Parsed data field, extracted keys: ${Object.keys(parsedData).join(', ')}`);
        }
      } catch (parseError) {
        // If parsing fails, keep data as string
        console.warn(`⚠️ Failed to parse data field as JSON: ${parseError.message}`);
        console.warn(`⚠️ Data value: ${String(event.data).substring(0, 200)}`);
      }
    }
    
    // Log if data field exists but wasn't parsed (for role events)
    if (event.eventType && (event.eventType.includes('role_assigned') || event.eventType.includes('role_unassigned'))) {
      if (event.data) {
        console.log(`⚠️ Data field still exists after parsing: ${typeof event.data}, keys in event: ${Object.keys(event).join(', ')}`);
      } else {
        console.log(`✅ Data field successfully flattened, event keys: ${Object.keys(event).join(', ')}`);
      }
    }

    // Handle wrapper API events that don't have eventType field
    if (!event.eventType) {
      // Detect event type based on reason field (wrapper API format)
      if (event.reason === 'application_allocation') {
        event.eventType = 'credit.allocated';
        event.amount = event.availableCredits; // Map availableCredits to amount
        // entityId is now included in the event, no need to use allocationId
        console.log(`🔄 Mapped wrapper event to CRM format: ${event.reason} -> ${event.eventType}`);
        console.log(`🎯 Target entity: ${event.entityId}, Amount: ${event.amount}`);
      } else {
        // NOTE: credit_consumption events are NOT processed from credit-events stream
        // Credit consumption/transaction events are internal CRM operations only
        console.log(`⚠️ Unknown wrapper event reason: ${event.reason}, cannot map to eventType`);
        event.eventType = 'unknown';
      }
    }

    // Handle organization assignment events - they come with eventType already set
    // The eventType field should already be parsed from the message
    // Organization assignment events have format: organization.assignment.created, etc.

    return event;
  }

  /**
   * Determine if an event is complex (needs Temporal workflow) or simple (direct processing)
   * @param {string} eventType - Event type
   * @returns {boolean} - true if complex event, false if simple
   */
  isComplexEvent(eventType) {
    // Complex events that need Temporal workflows:
    // - Multi-step processes
    // - Need retry/compensation logic
    // - Long-running operations
    const complexEventTypes = [
      'organization.assignment.created',
      'organization.assignment.deleted',
      'organization.assignment.activated',
      'organization.assignment.deactivated',
      'organization.assignment.updated',
      'tenant.sync.required',
    ];
    
    return complexEventTypes.includes(eventType);
  }

  /**
   * Get workflow ID for an event
   * @param {Object} event - Event object
   * @returns {string} - Workflow ID
   */
  getWorkflowId(event) {
    const eventType = event.eventType;
    const tenantId = event.tenantId;
    
    if (eventType.includes('organization.assignment')) {
      return `org-assignment-${tenantId}`;
    } else if (eventType.includes('tenant.sync')) {
      return `tenant-sync-${tenantId}`;
    }
    
    // Default: one workflow per tenant per event type
    return `${eventType}-${tenantId}`.replace(/\./g, '-');
  }

  /**
   * Handle complex event via Temporal workflow
   * @param {Object} event - Event object
   * @param {string} workflowId - Temporal workflow ID
   * @returns {Promise<Object>} - Processing result
   */
  async handleComplexEvent(event, workflowId) {
    try {
      const { getTemporalClient } = await import('../../../temporal-shared/client.js');
      const temporalClient = await getTemporalClient();
      
      if (!temporalClient) {
        console.warn(`⚠️ Temporal client not available, falling back to direct processing for ${event.eventType}`);
        return await this.handleSimpleEvent(event);
      }

      const eventPayload = {
        tenantId: event.tenantId,
        ...(event.data || {}),
        ...event, // Spread all event fields
      };
      
      // Remove data field if it's an object (already spread)
      if (eventPayload.data && typeof eventPayload.data === 'object') {
        delete eventPayload.data;
      }

      try {
        // Try to signal existing workflow
        await temporalClient.workflow.signal(
          workflowId,
          event.eventType,
          eventPayload
        );
        console.log(`✅ Signaled Temporal workflow ${workflowId} with event ${event.eventType}`);
        return { success: true, method: 'signaled', workflowId };
      } catch (notFoundError) {
        // Workflow doesn't exist, start it first
        console.log(`🔄 Workflow ${workflowId} doesn't exist, starting it...`);
        
        // Determine workflow name based on event type
        let workflowName = 'organizationAssignmentWorkflow';
        if (event.eventType.includes('tenant.sync')) {
          workflowName = 'tenantSyncWorkflow';
        }
        
        await temporalClient.workflow.start(workflowName, {
          workflowId,
          taskQueue: 'CRM',
          args: [{ tenantId: event.tenantId }],
        });
        
        // Then signal it
        await temporalClient.workflow.signal(
          workflowId,
          event.eventType,
          eventPayload
        );
        console.log(`✅ Started and signaled Temporal workflow ${workflowId} with event ${event.eventType}`);
        return { success: true, method: 'started_and_signaled', workflowId };
      }
    } catch (error) {
      console.error(`❌ Failed to handle complex event via Temporal: ${error.message}`);
      // Fallback to direct processing on Temporal failure
      console.log(`🔄 Falling back to direct processing for ${event.eventType}`);
      return await this.handleSimpleEvent(event);
    }
  }

  /**
   * Handle simple event via direct processing
   * @param {Object} event - Event object
   * @returns {Promise<Object>} - Processing result
   */
  async handleSimpleEvent(event) {
    console.log(`🔄 Processing simple event: ${event.eventType} for tenant ${event.tenantId}`);
    
    // Log event structure for debugging (truncated to avoid log spam)
    const eventPreview = {
      id: event.id,
      eventType: event.eventType,
      tenantId: event.tenantId,
      entityId: event.entityId,
      hasData: !!event.data,
      keys: Object.keys(event).slice(0, 10) // First 10 keys
    };
    console.log(`📋 Event preview: ${JSON.stringify(eventPreview)}`);
    
    const handler = this.eventHandlers[event.eventType];

    if (handler) {
      console.log(`✅ Found handler for ${event.eventType}`);
      const result = await handler(event);
      console.log(`📋 Handler result: ${JSON.stringify(result)}`);
      return result; // Return handler result for processing logic
    } else {
      console.log(`⚠️ No handler for event type: ${event.eventType}`);
      console.log(`Available handlers: ${Object.keys(this.eventHandlers).join(', ')}`);
      return { success: false, reason: 'no_handler' };
    }
  }

  /**
   * Process a single event (legacy method - kept for backward compatibility)
   * @deprecated Use handleSimpleEvent or handleComplexEvent instead
   */
  async processEvent(event) {
    // Route to appropriate handler
    const isComplex = this.isComplexEvent(event.eventType);
    if (isComplex) {
      const workflowId = this.getWorkflowId(event);
      return await this.handleComplexEvent(event, workflowId);
    } else {
      return await this.handleSimpleEvent(event);
    }
  }

  /**
   * Check if pending message was already processed (edge case: consumer crash)
   * 
   * Uses messageProcessingTracker for comprehensive idempotency checking.
   * 
   * @param {string} messageId - Redis message ID
   * @param {string} stream - Stream name
   * @param {string} consumerGroup - Consumer group name
   * @param {string} eventType - Event type (optional but recommended)
   * @returns {Promise<boolean>} - true if already processed or currently processing, false otherwise
   */
  async checkPendingMessageProcessed(messageId, stream, consumerGroup, eventType = null) {
    try {
      return await messageProcessingTracker.checkMessageProcessed(
        messageId,
        eventType,
        stream,
        consumerGroup
      );
    } catch (error) {
      console.error('❌ Error checking pending message:', error.message);
      // On error, assume not processed (fail open)
      return false;
    }
  }

  /**
   * Store pending message record (legacy method - now uses messageProcessingTracker)
   * 
   * @deprecated Use messageProcessingTracker.markMessageCompleted/Failed instead
   * 
   * @param {string} messageId - Redis message ID
   * @param {string} stream - Stream name
   * @param {string} consumerGroup - Consumer group name
   * @param {boolean} success - Whether processing was successful
   * @param {string} eventType - Event type (optional)
   * @param {string} workflowId - Workflow ID (optional)
   */
  async storePendingMessageRecord(messageId, stream, consumerGroup, success, eventType = null, workflowId = null) {
    try {
      // Use messageProcessingTracker for consistency
      if (success) {
        await messageProcessingTracker.markMessageCompleted(messageId, eventType);
      } else {
        await messageProcessingTracker.markMessageFailed(messageId, eventType, 'Processing failed');
      }
    } catch (error) {
      // Log but don't fail - best-effort
      console.error('❌ Error storing pending message record:', error.message);
    }
  }

  /**
   * Handle processing errors with retry logic
   */
  async handleProcessingError(stream, message, error) {
    const MAX_RETRIES = this.options.maxRetries;

    try {
      // Check if Redis client is available - handle both undefined and status checks
      const redisStatus = this.redisClient?.status;
      // Redis client is available if:
      // 1. Client exists
      // 2. Status is 'ready' or 'connected' (not 'end' or 'error' or undefined)
      // 3. redisHealthy flag is not explicitly false
      // Note: If status is undefined but healthy is true, the client might be in a transitional state
      // In that case, we'll trust the healthy flag if the client exists
      const isRedisAvailable = this.redisClient && 
                                (
                                  (redisStatus === 'ready' || redisStatus === 'connected') ||
                                  (redisStatus === undefined && this.redisHealthy === true)
                                ) &&
                                this.redisHealthy !== false;

      if (!isRedisAvailable) {
        const statusInfo = this.redisClient 
          ? `status: ${redisStatus || 'undefined'}, healthy: ${this.redisHealthy}` 
          : 'client is null/undefined';
        console.error(`❌ Cannot handle processing error for ${message.id}: Redis client not available (${statusInfo})`);
        // Don't try to publish retry events if Redis is unavailable
        console.error(`💀 Event ${message.id} failed permanently (Redis unavailable): ${error.message}`);
        return;
      }

      const retryMessage = this.parseRedisMessage(message);
      const retryCount = (retryMessage.metadata?.retryCount || 0) + 1;

      if (retryCount <= MAX_RETRIES) {
        // Add back to stream with incremented retry count
        const retryEvent = {
          ...retryMessage,
          metadata: {
            ...retryMessage.metadata,
            retryCount,
            lastError: error.message,
            lastRetryAt: new Date().toISOString()
          }
        };

        await this.redisClient.xAdd(`${stream}:retry`, '*',
          this.serializeEvent(retryEvent)
        );
        console.log(`🔄 Retrying event ${message.id} (attempt ${retryCount})`);
      } else {
        // Move to dead letter queue
        const dlqEvent = {
          ...retryMessage,
          metadata: {
            ...retryMessage.metadata,
            finalError: error.message,
            failedAt: new Date().toISOString(),
            totalRetries: retryCount
          }
        };

        await this.redisClient.xAdd(`${stream}:dlq`, '*',
          this.serializeEvent(dlqEvent)
        );

        console.error(`💀 Event ${message.id} moved to DLQ after ${MAX_RETRIES} retries`);
      }
    } catch (dlqError) {
      console.error('❌ Failed to handle processing error:', dlqError);
    }
  }

  /**
   * Serialize event for Redis storage
   */
  serializeEvent(event) {
    const serialized = {};
    Object.entries(event).forEach(([key, value]) => {
      serialized[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    return serialized;
  }

  /**
   * Update metrics
   */
  updateMetrics(event, success, processingTime) {
    if (success) {
      this.metrics.eventsProcessed++;
      if (event) {
        this.metrics.eventsByType.set(
          event.eventType,
          (this.metrics.eventsByType.get(event.eventType) || 0) + 1
        );
      }
    } else {
      this.metrics.eventsFailed++;
    }

    if (processingTime > 0) {
      this.metrics.processingTimes.push(processingTime);

      // Keep only last 100 processing times
      if (this.metrics.processingTimes.length > 100) {
        this.metrics.processingTimes.shift();
      }
    }
  }

  // 🎯 EVENT HANDLERS

  /**
   * Handle user creation event
   */
  async handleUserCreated(event) {
    // Handle both nested data structure and flattened structure
    const eventData = event.data || event;

    // Parse data if it's a JSON string
    let parsedData = eventData;
    if (typeof eventData === 'string') {
      try {
        parsedData = JSON.parse(eventData);
      } catch (e) {
        parsedData = eventData;
      }
    }

    // Validate required fields
    if (!parsedData.userId) {
      console.error(`❌ Missing userId in user_created event. Event keys: ${Object.keys(event).join(', ')}`);
      throw new Error(`Missing required field 'userId' in user_created event`);
    }

    try {
      // Import CRM models
      const { default: UserProfile } = await import('../models/UserProfile.js');

      // Check if user already exists (by userId or userIdString)
      const existingUser = await UserProfile.findOne({
        tenantId: event.tenantId,
        $or: [
          { userId: parsedData.userId },
          { userIdString: parsedData.userId },
          { 'personalInfo.email': parsedData.email }
        ]
      });

      if (existingUser) {
        console.log(`⏭️ User ${parsedData.userId} already exists, updating instead of creating`);
        
        // Update existing user with latest data
        await UserProfile.findOneAndUpdate(
          { _id: existingUser._id },
          {
            userId: parsedData.userId,
            userIdString: parsedData.userId,
            personalInfo: {
              firstName: parsedData.firstName || parsedData.name?.split(' ')[0] || '',
              lastName: parsedData.lastName || parsedData.name?.split(' ').slice(1).join(' ') || '',
              email: parsedData.email
            },
            'status.isActive': true,
            'status.lastActivityAt': parsedData.createdAt ? new Date(parsedData.createdAt) : new Date(),
            lastSyncedAt: new Date()
          }
        );
        
        return { success: true, action: 'updated', userId: parsedData.userId };
      }

      // Create user profile in CRM
      const userProfile = new UserProfile({
        tenantId: event.tenantId,
        userId: parsedData.userId,
        userIdString: parsedData.userId,
        personalInfo: {
          firstName: parsedData.firstName || parsedData.name?.split(' ')[0] || 'User',
          lastName: parsedData.lastName || parsedData.name?.split(' ').slice(1).join(' ') || '',
          email: parsedData.email
        },
        status: {
          isActive: true,
          lastActivityAt: parsedData.createdAt ? new Date(parsedData.createdAt) : new Date()
        },
        lastSyncedAt: new Date()
      });

      await userProfile.save();
      console.log(`👤 Created CRM user profile: ${parsedData.userId} (${parsedData.email})`);
      return { success: true, action: 'created', userId: parsedData.userId };

    } catch (error) {
      console.error('❌ Failed to create user in CRM:', error);

      // Handle duplicate key error gracefully - acknowledge to prevent infinite retries
      if (error.code === 11000 && error.message.includes('duplicate key error')) {
        console.log(`⚠️ User ${parsedData.userId} already exists (duplicate key), acknowledging event`);
        return { acknowledged: true, reason: 'duplicate_key_error' };
      }

      // For other errors, re-throw to allow retries
      throw error;
    }
  }

  /**
   * Handle user deactivation event
   */
  async handleUserDeactivated(event) {
    // Handle both nested data structure and flattened structure
    const eventData = event.data || event;

    // Parse data if it's a JSON string
    let parsedData = eventData;
    if (typeof eventData === 'string') {
      try {
        parsedData = JSON.parse(eventData);
      } catch (e) {
        parsedData = eventData;
      }
    }

    // Validate required fields
    if (!parsedData.userId) {
      console.error(`❌ Missing userId in user_deactivated event. Event keys: ${Object.keys(event).join(', ')}`);
      throw new Error(`Missing required field 'userId' in user_deactivated event`);
    }

    try {
      const { default: UserProfile } = await import('../models/UserProfile.js');

      // Find user by userId or userIdString
      const user = await UserProfile.findOne({
        tenantId: event.tenantId,
        $or: [
          { userId: parsedData.userId },
          { userIdString: parsedData.userId }
        ]
      });

      if (!user) {
        console.log(`⚠️ User ${parsedData.userId} not found - treating as success (idempotent)`);
        return { success: true, action: 'not_found', userId: parsedData.userId };
      }

      if (!user.status?.isActive) {
        console.log(`⚠️ User ${parsedData.userId} already deactivated - treating as success (idempotent)`);
        return { success: true, action: 'already_deactivated', userId: parsedData.userId };
      }

      // Update user status to inactive
      await UserProfile.findOneAndUpdate(
        { _id: user._id },
        {
          'status.isActive': false,
          'status.lastActivityAt': parsedData.deactivatedAt ? new Date(parsedData.deactivatedAt) : new Date(),
          lastSyncedAt: new Date()
        }
      );

      console.log(`👤 Deactivated CRM user: ${parsedData.userId}`);
      return { success: true, action: 'deactivated', userId: parsedData.userId };

    } catch (error) {
      console.error('❌ Failed to deactivate user in CRM:', error);
      throw error;
    }
  }

  /**
   * Handle user deletion event (permanent deletion)
   */
  async handleUserDeleted(event) {
    // Handle both nested data structure and flattened structure
    const eventData = event.data || event;

    // Parse data if it's a JSON string
    let parsedData = eventData;
    if (typeof eventData === 'string') {
      try {
        parsedData = JSON.parse(eventData);
      } catch (e) {
        parsedData = eventData;
      }
    }

    // Validate required fields
    if (!parsedData.userId) {
      console.error(`❌ Missing userId in user_deleted event. Event keys: ${Object.keys(event).join(', ')}`);
      throw new Error(`Missing required field 'userId' in user_deleted event`);
    }

    try {
      const { default: UserProfile } = await import('../models/UserProfile.js');
      const { default: CrmRoleAssignment } = await import('../models/CrmRoleAssignment.js');
      const ActivityLog = (await import('../models/ActivityLog.js')).default;

      // Find user by userId or userIdString
      const user = await UserProfile.findOne({
        tenantId: event.tenantId,
        $or: [
          { userId: parsedData.userId },
          { userIdString: parsedData.userId }
        ]
      });

      if (!user) {
        console.log(`⚠️ User ${parsedData.userId} not found - treating as success (idempotent)`);
        return { success: true, action: 'not_found', userId: parsedData.userId };
      }

      // Helper function to check if a string is a valid MongoDB ObjectId
      const isValidObjectId = (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-fA-F]{24}$/.test(id);
      };

      // Build query conditions for role assignment deactivation
      // Only use userId (ObjectId) if it's a valid ObjectId, otherwise use userIdString (UUID)
      const assignmentQueryConditions = [
        { userIdString: parsedData.userId }
      ];
      
      // If userId is a valid ObjectId, also check userId field
      if (isValidObjectId(parsedData.userId)) {
        try {
          const mongoose = (await import('mongoose')).default;
          assignmentQueryConditions.push({ userId: new mongoose.Types.ObjectId(parsedData.userId) });
        } catch (e) {
          console.warn(`⚠️ Failed to convert userId to ObjectId: ${e.message}`);
        }
      }

      // Deactivate all role assignments for this user before deletion
      const deactivatedAssignments = await CrmRoleAssignment.updateMany(
        {
          tenantId: event.tenantId,
          $or: assignmentQueryConditions,
          isActive: true
        },
        {
          isActive: false,
          deactivatedAt: parsedData.deletedAt ? new Date(parsedData.deletedAt) : new Date(),
          deactivatedBy: parsedData.deletedBy || 'system',
          deactivationReason: 'user_deleted',
          lastSyncedAt: new Date()
        }
      );

      if (deactivatedAssignments.modifiedCount > 0) {
        console.log(`✅ Deactivated ${deactivatedAssignments.modifiedCount} role assignment(s) for deleted user ${parsedData.userId}`);
      }

      // Log the deletion before removing the user
      if (ActivityLog) {
        try {
          await ActivityLog.create({
            tenantId: event.tenantId,
            userId: parsedData.userId,
            action: 'user.deleted',
            entityType: 'user',
            entityId: parsedData.userId,
            details: {
              email: parsedData.email,
              deletedBy: parsedData.deletedBy,
              reason: parsedData.reason,
              deletedAt: parsedData.deletedAt
            },
            performedBy: parsedData.deletedBy || 'system',
            timestamp: parsedData.deletedAt ? new Date(parsedData.deletedAt) : new Date()
          });
        } catch (logError) {
          console.warn(`⚠️ Failed to log user deletion activity: ${logError.message}`);
        }
      }

      // Permanently delete the user profile
      await UserProfile.deleteOne({ _id: user._id });

      console.log(`🗑️ Permanently deleted CRM user: ${parsedData.userId} (${parsedData.email || 'no email'})`);
      return { 
        success: true, 
        action: 'deleted', 
        userId: parsedData.userId,
        deactivatedAssignmentsCount: deactivatedAssignments.modifiedCount
      };

    } catch (error) {
      console.error('❌ Failed to delete user in CRM:', error);
      throw error;
    }
  }

  /**
   * Handle role assignment event
   */
  async handleRoleAssigned(event) {
    // Log full event structure for debugging
    console.log(`🔍 Full event keys: ${Object.keys(event).join(', ')}`);
    console.log(`🔍 Event.data type: ${typeof event.data}, value: ${event.data ? (typeof event.data === 'string' ? event.data.substring(0, 100) : JSON.stringify(event.data).substring(0, 100)) : 'undefined'}`);
    
    // Handle both nested data structure (from Temporal activities) and flattened structure (from Redis streams)
    let parsedData;
    
    // If event.data exists as a string (Redis stream format), parse it first
    if (event.data && typeof event.data === 'string') {
      try {
        parsedData = JSON.parse(event.data);
        // Merge with event to preserve tenantId and other top-level fields
        parsedData = {
          ...event,
          ...parsedData,
        };
        console.log(`✅ Parsed data from string, keys: ${Object.keys(parsedData).join(', ')}`);
      } catch (e) {
        console.warn(`⚠️ Failed to parse data string: ${e.message}`);
        // Fallback: merge event.data (as object) with event
        parsedData = {
          ...event,
          ...(event.data || {}),
        };
      }
    } else {
      // Merge event.data with event to preserve tenantId and other top-level fields
      // This handles both Temporal activities (object data) and Redis streams (flattened)
      parsedData = {
        ...event,
        ...(event.data || {}),
      };
    }
    
    // Final fallback: if still missing required fields, use event directly
    if (!parsedData.assignmentId && !parsedData.userId && !parsedData.userIdString) {
      console.log(`⚠️ Data not found in parsedData, using event directly`);
      parsedData = event;
    }

    // Log what we have
    console.log(`🔍 ParsedData keys: ${Object.keys(parsedData).join(', ')}`);
    console.log(`🔍 ParsedData.assignmentId: ${parsedData.assignmentId}`);
    console.log(`🔍 ParsedData.userId: ${parsedData.userId}`);
    console.log(`🔍 ParsedData.userIdString: ${parsedData.userIdString}`);
    console.log(`🔍 ParsedData.roleId: ${parsedData.roleId}`);
    console.log(`🔍 ParsedData.roleIdString: ${parsedData.roleIdString}`);

    // Validate required fields
    if (!parsedData.assignmentId) {
      console.error(`❌ Missing assignmentId in event. Event keys: ${Object.keys(event).join(', ')}, ParsedData keys: ${Object.keys(parsedData).join(', ')}`);
      console.error(`❌ Full event structure: ${JSON.stringify(event, null, 2)}`);
      throw new Error(`Missing required field 'assignmentId' in role_assigned event. Event structure: ${JSON.stringify(event, null, 2)}`);
    }

    try {
      const { default: CrmRoleAssignment } = await import('../models/CrmRoleAssignment.js');

      // IMPORTANT: Only ONE role per user globally (not per entity)
      // When a new role is assigned, deactivate ALL existing active roles for this user
      const userIdStr = parsedData.userIdString || parsedData.userId;
      const roleIdStr = parsedData.roleIdString || parsedData.roleId;

      // Log for debugging
      console.log(`🔍 Processing role assignment: userId=${userIdStr}, roleId=${roleIdStr}, assignmentId=${parsedData.assignmentId}`);

      if (!userIdStr) {
        console.error(`❌ Missing userId/userIdString in event data. Available keys: ${Object.keys(parsedData).join(', ')}`);
        throw new Error(`Missing required field 'userId' or 'userIdString' in role_assigned event`);
      }

      // Helper function to check if a string is a valid MongoDB ObjectId
      const isValidObjectId = (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-fA-F]{24}$/.test(id);
      };

      // Check if assignment already exists (idempotent operation)
      const existingAssignment = await CrmRoleAssignment.findOne({
        tenantId: event.tenantId,
        assignmentId: parsedData.assignmentId
      });

      if (existingAssignment) {
        console.log(`⚠️ Role assignment ${parsedData.assignmentId} already exists - treating as success (idempotent)`);

        // Update lastSyncedAt to indicate we've processed this event
        await CrmRoleAssignment.findOneAndUpdate(
          { tenantId: event.tenantId, assignmentId: parsedData.assignmentId },
          { lastSyncedAt: new Date() }
        );

        return { success: true, action: 'already_exists', assignmentId: parsedData.assignmentId };
      }

      // CRITICAL: Deactivate ALL existing active role assignments for this user BEFORE creating new one
      // This ensures only ONE active role per user globally
      // Build comprehensive query that handles all possible userId formats
      const deactivationQueryConditions = [
        { userIdString: userIdStr }
      ];
      
      // If userIdStr is a valid ObjectId, also check userId field
      if (isValidObjectId(userIdStr)) {
        try {
          const mongoose = (await import('mongoose')).default;
          deactivationQueryConditions.push({ userId: new mongoose.Types.ObjectId(userIdStr) });
        } catch (e) {
          console.warn(`⚠️ Failed to convert userId to ObjectId: ${e.message}`);
        }
      }
      
      // Deactivate ALL active assignments for this user (except the one we're about to create)
      const deactivationResult = await CrmRoleAssignment.updateMany(
        {
          tenantId: event.tenantId,
          $or: deactivationQueryConditions,
          isActive: true,
          assignmentId: { $ne: parsedData.assignmentId } // Don't deactivate the new assignment if it somehow exists
        },
        {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: parsedData.assignedBy || 'system',
          deactivationReason: 'replaced_by_new_role',
          replacedByAssignmentId: parsedData.assignmentId,
          lastSyncedAt: new Date()
        }
      );

      if (deactivationResult.modifiedCount > 0) {
        console.log(`✅ Deactivated ${deactivationResult.modifiedCount} existing active role assignment(s) for user ${userIdStr} before assigning new role`);
      } else {
        console.log(`ℹ️ No existing active role assignments found for user ${userIdStr} - creating new assignment`);
      }

      // Find existing active assignments for logging (should be 0 after deactivation)
      const existingActiveAssignments = await CrmRoleAssignment.find({
        tenantId: event.tenantId,
        $or: deactivationQueryConditions,
        isActive: true
      }).lean();

      console.log(`🔍 Remaining active assignments after deactivation: ${existingActiveAssignments.length}`);

      // Note: We've already deactivated all existing active assignments above
      // This check is just for logging and edge cases
      if (existingActiveAssignments.length > 0) {
        console.warn(`⚠️ WARNING: Found ${existingActiveAssignments.length} active assignment(s) after deactivation - this shouldn't happen!`);
        existingActiveAssignments.forEach(assignment => {
          console.warn(`   - Still active: Assignment ${assignment.assignmentId}, roleId=${assignment.roleIdString || assignment.roleId}`);
        });
      }

      // Create new role assignment
      // Only set ObjectId fields if the values are valid ObjectIds (24 char hex)
      // Otherwise, use the String fields for UUIDs
      const assignment = new CrmRoleAssignment({
        tenantId: event.tenantId,
        // Only set ObjectId if it's a valid MongoDB ObjectId (24 char hex)
        userId: isValidObjectId(parsedData.userId) ? parsedData.userId : undefined,
        userIdString: parsedData.userIdString || parsedData.userId,
        roleId: isValidObjectId(parsedData.roleId) ? parsedData.roleId : undefined,
        roleIdString: parsedData.roleIdString || parsedData.roleId,
        entityId: isValidObjectId(parsedData.entityId) ? parsedData.entityId : undefined,
        entityIdString: parsedData.entityIdString || parsedData.entityId,
        assignmentId: parsedData.assignmentId,
        assignedBy: parsedData.assignedBy || 'system',
        isActive: true,
        assignedAt: parsedData.assignedAt ? new Date(parsedData.assignedAt) : new Date(),
        metadata: parsedData.metadata || {}
      });

      await assignment.save();
      console.log(`✅ Assigned role ${roleIdStr} to user ${userIdStr} in entity ${parsedData.entityId || 'N/A'}`);

      return {
        success: true,
        action: deactivationResult.modifiedCount > 0 ? 'replaced' : 'created',
        assignmentId: parsedData.assignmentId,
        deactivatedCount: deactivationResult.modifiedCount,
        previousAssignmentIds: existingActiveAssignments.map(a => a.assignmentId)
      };

    } catch (error) {
      console.error('❌ Failed to assign role in CRM:', error);
      throw error;
    }
  }

  /**
   * Handle role unassignment event
   */
  async handleRoleUnassigned(event) {
    // Merge event.data with event to preserve tenantId and other top-level fields
    const eventData = {
      ...event,
      ...(event.data || {}),
    };

    // Validate required fields - need at least assignmentId OR (userId + roleId)
    if (!eventData.assignmentId && (!eventData.userId && !eventData.userIdString) && (!eventData.roleId && !eventData.roleIdString)) {
      throw new Error(`Missing required fields in role_unassigned event. Need either 'assignmentId' OR ('userId'/'userIdString' + 'roleId'/'roleIdString'). Event structure: ${JSON.stringify(event, null, 2)}`);
    }

    try {
      const { default: CrmRoleAssignment } = await import('../models/CrmRoleAssignment.js');

      const userIdStr = eventData.userIdString || eventData.userId;
      const roleIdStr = eventData.roleIdString || eventData.roleId;

      // First, try to find by assignmentId (preferred method)
      let assignmentsToDeactivate = [];
      
      if (eventData.assignmentId) {
        const assignmentById = await CrmRoleAssignment.findOne({
          tenantId: event.tenantId,
          assignmentId: eventData.assignmentId
        });

        if (assignmentById) {
          assignmentsToDeactivate = [assignmentById];
        }
      }

      // If not found by assignmentId, try to find by userId + roleId (fallback)
      // This handles cases where assignmentId might not match or is missing
      if (assignmentsToDeactivate.length === 0 && userIdStr && roleIdStr) {
        const assignmentsByUserRole = await CrmRoleAssignment.find({
          tenantId: event.tenantId,
          userIdString: userIdStr,
          roleIdString: roleIdStr,
          isActive: true
        });

        if (assignmentsByUserRole.length > 0) {
          assignmentsToDeactivate = assignmentsByUserRole;
          console.log(`🔍 Found ${assignmentsByUserRole.length} active assignment(s) for user ${userIdStr} and role ${roleIdStr} (fallback query)`);
        }
      }

      // If still not found, log and treat as success (idempotent)
      if (assignmentsToDeactivate.length === 0) {
        console.log(`⚠️ No active role assignment found for unassignment - treating as success (idempotent)`);
        console.log(`   AssignmentId: ${eventData.assignmentId || 'not provided'}`);
        console.log(`   UserId: ${userIdStr || 'not provided'}, RoleId: ${roleIdStr || 'not provided'}`);
        return { success: true, action: 'not_found_already_unassigned', assignmentId: eventData.assignmentId };
      }

      // Check if all assignments are already inactive
      const activeAssignments = assignmentsToDeactivate.filter(a => a.isActive);
      if (activeAssignments.length === 0) {
        console.log(`⚠️ All role assignments already inactive - treating as success (idempotent)`);
        
        // Update lastSyncedAt for all found assignments
        await CrmRoleAssignment.updateMany(
          { _id: { $in: assignmentsToDeactivate.map(a => a._id) } },
          { lastSyncedAt: new Date() }
        );

        return { success: true, action: 'already_inactive', assignmentId: eventData.assignmentId };
      }

      // Deactivate ALL active assignments for this user/role combination
      // This ensures we don't leave any duplicate or stale assignments active
      await CrmRoleAssignment.updateMany(
        { 
          _id: { $in: activeAssignments.map(a => a._id) },
          tenantId: event.tenantId
        },
        {
          isActive: false,
          unassignedAt: eventData.unassignedAt ? new Date(eventData.unassignedAt) : new Date(),
          unassignedBy: eventData.unassignedBy || 'system',
          lastSyncedAt: new Date()
        }
      );

      console.log(`✅ Unassigned role from user ${userIdStr || 'unknown'} (deactivated ${activeAssignments.length} assignment(s))`);
      console.log(`   AssignmentIds: ${activeAssignments.map(a => a.assignmentId).join(', ')}`);
      return { 
        success: true, 
        action: 'unassigned', 
        assignmentId: eventData.assignmentId,
        deactivatedCount: activeAssignments.length,
        deactivatedAssignmentIds: activeAssignments.map(a => a.assignmentId)
      };

    } catch (error) {
      console.error('❌ Failed to unassign role in CRM:', error);
      throw error;
    }
  }

  /**
   * Handle role permissions changed event
   */
  async handleRolePermissionsChanged(event) {
    // Handle both nested data structure and flattened structure
    // After parseRedisMessage, data is flattened into event, but some events may still have data field
    const eventData = event.data || event;

    // Validate required fields
    if (!eventData.roleId) {
      throw new Error(`Missing required field 'roleId' in role_permissions_changed event. Event structure: ${JSON.stringify(event, null, 2)}`);
    }

    if (!event.tenantId) {
      throw new Error(`Missing required field 'tenantId' in role_permissions_changed event`);
    }

    try {
      const { default: CrmRole } = await import('../models/CrmRole.js');

      // Flatten nested permissions object into array of permission strings
      // Handle case where permissions might be undefined or null
      const permissions = this.flattenPermissions(eventData.permissions || {});

      // Update role permissions
      const updateData = {
        roleName: eventData.roleName || 'Unknown Role',
        permissions: permissions,
        description: eventData.description,
        isActive: eventData.isActive !== undefined ? eventData.isActive : true,
        lastSyncedAt: new Date()
      };

      await CrmRole.findOneAndUpdate(
        { tenantId: event.tenantId, roleId: eventData.roleId },
        updateData,
        { upsert: true, new: true }
      );

      console.log(`🎭 Updated permissions for role ${eventData.roleId} (${eventData.roleName || 'Unknown'}): ${permissions.length} permissions`);

      return { success: true, roleId: eventData.roleId, permissionsCount: permissions.length };

    } catch (error) {
      console.error('❌ Failed to update role permissions in CRM:', error);
      console.error(`📋 Event structure: ${JSON.stringify(event, null, 2)}`);
      throw error;
    }
  }

  /**
   * Handle role creation events
   */
  async handleRoleCreated(event) {
    // Merge event.data with event to preserve tenantId and other top-level fields
    const eventData = {
      ...event,
      ...(event.data || {}),
    };

    // Debug: Log what we're receiving
    console.log(`🔍 [handleRoleCreated] Event keys:`, Object.keys(event));
    console.log(`🔍 [handleRoleCreated] Event.data keys:`, event.data ? Object.keys(event.data) : 'no data field');
    console.log(`🔍 [handleRoleCreated] Merged eventData keys:`, Object.keys(eventData));
    console.log(`🔍 [handleRoleCreated] tenantId:`, eventData.tenantId);
    console.log(`🔍 [handleRoleCreated] roleId:`, eventData.roleId);
    console.log(`🔍 [handleRoleCreated] roleName:`, eventData.roleName);

    console.log(`🔄 Processing role creation event: ${eventData.roleName || eventData.roleId}`);

    try {
      // Import role processing service
      const { default: roleProcessingService } = await import('../services/roleProcessingService.js');

      // Initialize with models
      await roleProcessingService.initialize({
        CrmRole: (await import('../models/CrmRole.js')).default,
        CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
        UserProfile: (await import('../models/UserProfile.js')).default,
        ActivityLog: (await import('../models/ActivityLog.js')).default
      });

      const result = await roleProcessingService.processRoleCreate(eventData, {
        source: 'redis_stream'
      });

      console.log(`✅ Role created successfully: ${result.roleId}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to process role creation:', error);
      throw error;
    }
  }

  /**
   * Handle role update events
   */
  async handleRoleUpdated(event) {
    // Merge event.data with event to preserve tenantId and other top-level fields
    const eventData = {
      ...event,
      ...(event.data || {}),
    };

    // Parse data if it's a JSON string
    let parsedData = eventData;
    if (typeof eventData === 'string') {
      try {
        parsedData = JSON.parse(eventData);
      } catch (e) {
        parsedData = eventData;
      }
    }

    // Validate required fields
    if (!parsedData.roleId) {
      console.error(`❌ Missing roleId in role_updated/role.updated event. Event keys: ${Object.keys(event).join(', ')}`);
      throw new Error(`Missing required field 'roleId' in role_updated/role.updated event`);
    }

    console.log(`🔄 Processing role update event: ${parsedData.roleId}`);
    
    // Log permission structure for debugging
    if (parsedData.permissions) {
      const isHierarchical = typeof parsedData.permissions === 'object' && !Array.isArray(parsedData.permissions);
      console.log(`📋 Permissions format: ${isHierarchical ? 'hierarchical object' : 'flat array'}`);
    }

    try {
      // Import role processing service
      const { default: roleProcessingService } = await import('../services/roleProcessingService.js');

      // Initialize with models
      await roleProcessingService.initialize({
        CrmRole: (await import('../models/CrmRole.js')).default,
        CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
        UserProfile: (await import('../models/UserProfile.js')).default,
        ActivityLog: (await import('../models/ActivityLog.js')).default
      });

      const result = await roleProcessingService.processRoleUpdate(parsedData, {
        source: 'redis_stream'
      });

      console.log(`✅ Role updated successfully: ${parsedData.roleId}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to process role update:', error);
      throw error;
    }
  }

  /**
   * Handle role deletion events
   */
  async handleRoleDeleted(event) {
    // Merge event.data with event to preserve tenantId and other top-level fields
    // The activity creates { tenantId, data: data, ...data }, so we need both
    const eventData = {
      ...event,
      ...(event.data || {}),
    };

    console.log(`🔄 Processing role deletion event: ${eventData.roleId}`);

    try {
      // Import role processing service
      const { default: roleProcessingService } = await import('../services/roleProcessingService.js');

      // Initialize with models
      await roleProcessingService.initialize({
        CrmRole: (await import('../models/CrmRole.js')).default,
        CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
        UserProfile: (await import('../models/UserProfile.js')).default,
        ActivityLog: (await import('../models/ActivityLog.js')).default
      });

      const result = await roleProcessingService.processRoleDelete(eventData, {
        source: 'redis_stream'
      });

      console.log(`✅ Role deleted successfully: ${result.roleId} (${result.affectedUsersCount} users affected)`);
      return result;

    } catch (error) {
      console.error('❌ Failed to process role deletion:', error);
      throw error;
    }
  }

  /**
   * Flatten nested permissions object into array of permission strings
   */
  flattenPermissions(permissionsObj) {
    const permissions = [];

    if (!permissionsObj || typeof permissionsObj !== 'object') {
      return permissions;
    }

    // Handle nested permissions structure like { "crm": { "accounts": ["read", "create"] } }
    for (const [module, modulePermissions] of Object.entries(permissionsObj)) {
      if (Array.isArray(modulePermissions)) {
        // If it's an array, add each permission with module prefix
        modulePermissions.forEach(permission => {
          permissions.push(`${module}.${permission}`);
        });
      } else if (typeof modulePermissions === 'object') {
        // If it's an object, recurse deeper
        for (const [subModule, subPermissions] of Object.entries(modulePermissions)) {
          if (Array.isArray(subPermissions)) {
            subPermissions.forEach(permission => {
              permissions.push(`${module}.${subModule}.${permission}`);
            });
          } else if (typeof subPermissions === 'string') {
            permissions.push(`${module}.${subModule}.${subPermissions}`);
          }
        }
      } else if (typeof modulePermissions === 'string') {
        permissions.push(`${module}.${modulePermissions}`);
      }
    }

    return permissions;
  }

  /**
   * Handle organization creation event
   */
  async handleOrgCreated(event) {
    // Handle both direct event data and nested data formats (similar to credit allocation)
    const data = event.data || event;

    if (!data) {
      throw new Error('No data found in org_created event');
    }

    try {
      const { default: Organization } = await import('../models/Organization.js');

      console.log(`🏢 Processing org creation:`, JSON.stringify(data, null, 2));

      // Check if organization already exists to prevent duplicates
      const existingOrg = await Organization.findOne({
        tenantId: event.tenantId,
        orgCode: data.orgCode
      });

      if (existingOrg) {
        console.log(`🏢 Organization ${data.orgCode} already exists, skipping creation`);
        return { success: true, skipped: true, reason: 'already_exists' };
      }

      // Resolve parentId - it comes as a UUID string, need to find the actual ObjectId
      let resolvedParentId = null;
      if (data.parentId && data.parentId.trim()) {
        console.log(`🔍 Resolving parentId: ${data.parentId} for tenant ${event.tenantId}`);

        try {
          // Try to find parent organization by orgCode first
          const parentByOrgCode = await Organization.findOne({
            tenantId: event.tenantId,
            orgCode: data.parentId.trim()
          });

          if (parentByOrgCode) {
            resolvedParentId = parentByOrgCode._id;
            console.log(`✅ Found parent by orgCode: ${resolvedParentId}`);
          } else {
            console.log(`⚠️ Parent organization with orgCode ${data.parentId} not found for tenant ${event.tenantId}`);
            console.log(`🔍 Checking if parentId is actually an ObjectId string...`);

            // Check if parentId is already a valid ObjectId string
            if (data.parentId.match(/^[0-9a-fA-F]{24}$/)) {
              console.log(`✅ parentId appears to be a valid ObjectId string: ${data.parentId}`);
              resolvedParentId = data.parentId;
            } else {
              console.log(`❌ parentId ${data.parentId} is not a valid ObjectId and parent org not found`);
              resolvedParentId = null;
            }
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up parent organization: ${lookupError.message}`);
          // Check if parentId is already a valid ObjectId string as fallback
          if (data.parentId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log(`✅ Using parentId as ObjectId string due to lookup error: ${data.parentId}`);
            resolvedParentId = data.parentId;
          } else {
            console.warn(`⚠️ Could not resolve parentId ${data.parentId}, setting to null due to error`);
            resolvedParentId = null;
          }
        }
      } else {
        console.log(`ℹ️ No parentId specified or empty, setting to null`);
        resolvedParentId = null;
      }

      // Create organization
      // Map isActive to status (schema uses 'status' field with enum ['active', 'inactive'])
      const status = data.isActive === false ? 'inactive' : 'active';
      
      // Store extra fields in metadata (schema doesn't have: type, organizationType, description, entityLevel, lastSyncedAt)
      const metadata = {
        ...(data.orgType || data.type ? { type: data.orgType || data.type } : {}),
        ...(data.organizationType ? { organizationType: data.organizationType } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.entityLevel !== undefined ? { entityLevel: data.entityLevel } : {}),
        lastSyncedAt: new Date().toISOString()
      };

      const organization = new Organization({
        tenantId: event.tenantId,
        orgCode: data.orgCode,
        orgName: data.orgName || data.name || null, // Schema uses 'orgName', not 'name'
        status: status, // Schema uses 'status' enum, not 'isActive'
        parentId: resolvedParentId, // Use resolved ObjectId or null
        parentIdString: data.parentId || null, // Store original parentId string for reference
        metadata: Object.keys(metadata).length > 0 ? metadata : {} // Store extra fields in metadata
      });

      await organization.save();
      console.log(`🏢 Created CRM organization: ${data.orgCode} (orgName: ${organization.orgName || 'N/A'})`);

      return { success: true, orgCode: data.orgCode, orgId: organization._id.toString() };

    } catch (error) {
      console.error('❌ Failed to create organization in CRM:', error);
      throw error;
    }
  }

  /**
   * Handle credit allocation event
   */
  async handleCreditAllocated(event) {
    try {
      const { default: CrmEntityCredit } = await import('../models/CrmEntityCredit.js');

      // Handle both old format (with data field) and new format (flat structure)
      const eventData = event.data || event;

      // Parse amount as number (wrapper sends as string)
      const amount = parseInt(eventData.amount || eventData.availableCredits, 10);
      if (isNaN(amount)) {
        throw new Error(`Invalid amount: ${eventData.amount || eventData.availableCredits}`);
      }

      // Parse metadata if it's a string
      let metadata = eventData.metadata || {};
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (parseError) {
          console.warn('Failed to parse metadata JSON, using as-is:', parseError.message);
          metadata = { rawMetadata: metadata };
        }
      }

      console.log(`💰 Processing credit allocation: ${amount} credits`);
      console.log(`📋 Event data:`, JSON.stringify(eventData, null, 2));

      // For wrapper events, we need to determine which organization to allocate credits to
      let targetEntityId = eventData.entityId;

      // If no entityId is specified in wrapper event, this indicates a design issue
      if (!targetEntityId) {
        console.error(`❌ CRITICAL: Wrapper credit allocation event missing entityId field!`);
        console.error(`📋 Event received:`, JSON.stringify(event, null, 2));
        console.error(`💡 SOLUTION: Wrapper API must include 'entityId' field specifying which organization should receive the credits`);
        console.error(`📝 Example: Add "entityId": "cae02c60-ef89-4a0c-af66-955deb6f5623" for the work organization`);

        // TEMPORARY FALLBACK: Try to allocate to the "work" organization for this tenant
        // This is not ideal and should be fixed in the wrapper API
        console.warn(`🔄 TEMPORARY FIX: Attempting to allocate to 'work' organization`);
        const { default: Organization } = await import('../models/Organization.js');

        const workOrg = await Organization.findOne({
          tenantId: event.tenantId,
          orgName: 'work'
        });

        if (workOrg) {
          targetEntityId = workOrg.orgCode;
          console.log(`✅ Found work organization: ${targetEntityId}`);
        } else {
          console.error(`❌ Could not find work organization for tenant ${event.tenantId}`);
          throw new Error('Wrapper API must specify entityId for credit allocation. Temporary fallback failed.');
        }
      }

      console.log(`🎯 Target entity for credit allocation: ${targetEntityId}`);

      // Check if credits have already been allocated for this event
      const existingRecord = await CrmEntityCredit.findOne({
        tenantId: event.tenantId,
        entityIdString: targetEntityId
      });

      if (existingRecord) {
        // Check if this event has already been processed by looking at transaction IDs
        const eventAlreadyProcessed = existingRecord.transactionIds &&
          existingRecord.transactionIds.some(txId => txId.includes(eventData.eventId));

        if (eventAlreadyProcessed) {
          console.log(`ℹ️ Event ${eventData.eventId} already processed, skipping`);
          return { success: true, skipped: true, reason: 'already_processed' };
        }
      }

      // Process actual credit allocation with the improved credit service

      // Import credit service for proper allocation handling
      const creditService = (await import('./creditService.js')).default;

      // Use credit service for proper allocation with transaction logging
      // The credit service now handles concurrent modifications internally with retry logic
      const result = await creditService.allocateCredits(
        event.tenantId,
        targetEntityId, // Use the correctly determined target entity ID
        amount, // Use parsed number
        'wrapper',
        {
          sourceEventId: eventData.eventId,
          allocationSource: 'redis-stream',
          eventTimestamp: eventData.timestamp,
          source: eventData.source,
          ...metadata // Spread parsed metadata
        }
      );

      if (result.success) {
        if (result.wasIdempotent) {
          console.log(`⏭️ Credit allocation was already processed for event ${eventData.eventId}, acknowledging`);
          return { acknowledged: true, reason: 'already_processed' };
        }

        console.log(`✅ Successfully allocated ${amount} credits to entity ${targetEntityId}`);
        console.log(`   Event ID: ${eventData.eventId}`);
        console.log(`   Credit Record: ${result.creditRecord._id}`);
        console.log(`   New Balance: ${result.creditRecord.allocatedCredits} allocated, ${result.creditRecord.availableCredits} available`);

        // Store successful event processing in database
        // Update the event data with the correct entityId for logging
        const eventForLogging = {
          ...event,
          entityId: targetEntityId, // Use the correctly determined target entity
          ...(event.data && { data: { ...event.data, entityId: targetEntityId } })
        };
        await this.storeProcessedEvent(eventForLogging, 'credit.allocated', result);

        return { success: true, result };
      } else {
        throw new Error('Credit allocation failed');
      }

    } catch (error) {
      console.error(`❌ Failed to process credit allocation:`, error.message);

      // Check if this is a Redis connectivity issue
      const isRedisError = error.message.includes('Redis not connected') ||
                          error.message.includes('Client must be connected') ||
                          error.message.includes('Disconnects client') ||
                          error.message.includes('The client is closed');

      if (isRedisError) {
        console.log(`⚠️ Redis connection error, will retry later: ${error.message}`);
        // DON'T acknowledge the message - let it retry when Redis is back
        throw new Error(`Redis unavailable: ${error.message}`);
      }

      // For null reference errors (data issues), acknowledge to prevent infinite loops
      if (error.message.includes('Cannot read properties of null')) {
        console.log(`⚠️ Acknowledging failed event due to data error: ${error.message}`);
        return { acknowledged: true, reason: `data_error: ${error.message}` };
      }

      // For idempotency errors (event already being processed), acknowledge to prevent duplicates
      if (error.message.includes('is already being processed')) {
        console.log(`⚠️ Event already being processed, acknowledging to prevent duplicates: ${error.message}`);
        return { acknowledged: true, reason: `idempotent: ${error.message}` };
      }

      // For concurrent modification errors (max retries exceeded), acknowledge to prevent infinite loops
      if (error.message.includes('Concurrent modification during credit allocation - max retries exceeded')) {
        console.log(`⚠️ Concurrent modification detected, acknowledging to prevent infinite retries: ${error.message}`);
        return { acknowledged: true, reason: `concurrent_modification: ${error.message}` };
      }

      // For other errors, re-throw to allow retries
      throw error;
    }
  }

  /**
   * Store successfully processed event in database for audit trail
   */
  async storeProcessedEvent(event, eventType, result) {
    try {
      const { default: CrmActivityLog } = await import('../models/CrmActivityLog.js');

      const eventData = event.data || event;

      // Generate unique log ID
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await CrmActivityLog.create({
        logId,
        tenantId: event.tenantId,
        userId: eventData.userId || 'system',
        entityId: eventData.entityId,
        operationType: 'credit_usage', // Use existing enum value
        resourceType: 'credit',
        resourceId: eventData.eventId,
        operationDetails: {
          eventType,
          eventId: eventData.eventId,
          amount: eventData.amount,
          source: eventData.source,
          result: result.success ? 'success' : 'failed',
          creditRecordId: result.creditRecord?._id,
          newBalance: result.creditRecord?.availableCredits
        },
        severity: 'low',
        status: 'success',
        ipAddress: 'redis-stream',
        userAgent: 'crm-consumer',
        sessionId: `stream-${Date.now()}`
      });

      console.log(`📝 Stored event processing record for ${eventData.eventId}`);

    } catch (storeError) {
      console.warn('⚠️ Failed to store event processing record:', storeError.message);
      console.warn('   Error details:', storeError);
      // Don't throw - event processing succeeded, just logging failed
    }
  }

  /**
   * Handle credit consumption event from CRM with database storage
   */
  async handleCreditConsumed(event) {
    try {
      // Handle both old format (with data field) and new format (flat structure)
      const eventData = event.data || event;

      console.log(`📊 Redis Stream: Credit consumed notification received`);
      console.log(`   Event ID: ${eventData.eventId}`);
      console.log(`   Entity: ${eventData.entityId}`);
      console.log(`   User: ${eventData.userId || 'unknown'}`);
      console.log(`   Amount: ${eventData.amount}`);
      console.log(`   Operation: ${eventData.operationType}`);

      // Here the wrapper would update its own consumption tracking
      // This is mainly for wrapper awareness of CRM consumption
      // In a real implementation, this would update wrapper's consumption logs

      console.log(`💸 Wrapper notified: ${eventData.amount} credits consumed by ${eventData.userId || 'unknown'} for ${eventData.operationType}`);

      // Store the consumption event in database for audit trail
      await this.storeProcessedEvent(event, 'credit.consumed', { success: true });

      // TODO: Implement wrapper consumption tracking
      // await updateWrapperConsumptionTracking(event.tenantId, eventData);

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to process credit consumption notification:', error);
      throw error;
    }
  }

  /**
   * Handle credit config updated event
   * Supports hierarchical configuration: Global → Tenant → Entity
   */
  async handleCreditConfigUpdated(event) {
    // Handle both direct event data and nested data formats
    const data = event.data || event;

    if (!data) {
      throw new Error('No data found in credit config event');
    }

    try {
      const { default: CrmCreditConfig } = await import('../models/CrmCreditConfig.js');

      // Determine if this is a global or tenant-specific config
      const isGlobal = data.isGlobal === true || data.source === 'global' || !data.tenantId;
      
      // Build configuration data
      const configData = {
        configId: data.configId,
        tenantId: isGlobal ? null : (data.tenantId || event.tenantId),
        // Don't set entityId (ObjectId) - only use entityIdString for UUIDs
        entityIdString: data.entityId || data.entityIdString || null,
        configName: data.configName || data.metadata?.operationCode,
        operationCode: data.metadata?.operationCode || data.operationCode,
        description: data.metadata?.description || data.description || '',
        creditCost: data.metadata?.creditCost || data.creditCost,
        isGlobal: isGlobal,
        source: data.source || (isGlobal ? 'global' : 'tenant'),
        overridesGlobal: !isGlobal && data.tenantId !== null,
        unit: data.unit || 'operation',
        moduleName: data.moduleName || '',
        permissionName: data.permissionName || '',
        lastSyncedAt: new Date(),
        syncSource: 'wrapper'
      };

      // Upsert configuration (create or update)
      const result = await CrmCreditConfig.findOneAndUpdate(
        { configId: data.configId },
        configData,
        { upsert: true, new: true }
      );

      const configType = isGlobal ? 'global' : 'tenant-specific';
      console.log(`⚙️ ${result.createdAt === result.updatedAt ? 'Created' : 'Updated'} ${configType} credit config ${data.configId} for ${configData.operationCode}: ${configData.creditCost} credits`);

      // If this is a tenant override, check if we need to remove any inherited configs
      if (!isGlobal && data.tenantId) {
        await this.cleanupInheritedConfig(data.operationCode, data.tenantId, CrmCreditConfig);
      }

    } catch (error) {
      console.error('❌ Failed to update credit config in CRM:', error);
      throw error;
    }
  }

  /**
   * Handle organization assignment created event
   */
  async handleOrganizationAssignmentCreated(event) {
    try {
      // Handle both nested data structure and flattened structure
      const eventData = event.data || event;

      console.log(`🔄 [ORG-ASSIGNMENT-CREATE] Processing creation event:`, {
        assignmentId: eventData.assignmentId,
        userId: eventData.userId,
        organizationId: eventData.organizationId,
        tenantId: event.tenantId,
        eventId: event.id || event.eventId
      });

      if (!eventData.assignmentId || !eventData.userId || !eventData.organizationId) {
        throw new Error(`Missing required fields in organization.assignment.created event. Event structure: ${JSON.stringify(event, null, 2)}`);
      }

      if (!event.tenantId) {
        throw new Error(`Missing required field 'tenantId' in organization.assignment.created event`);
      }

      const { default: EmployeeOrgAssignment } = await import('../models/EmployeeOrgAssignment.js');
      const { default: Organization } = await import('../models/Organization.js');
      const { default: UserProfile } = await import('../models/UserProfile.js');

      // Strategy 1: Check if assignment already exists by assignmentId
      let existingAssignment = await EmployeeOrgAssignment.findOne({
        tenantId: event.tenantId,
        assignmentId: eventData.assignmentId
      });

      if (existingAssignment) {
        // If exists but inactive, check if there's already an active assignment with same userId+orgId
        if (!existingAssignment.isActive) {
          // Check for active assignment with same userId+orgId before reactivating
          const activeDuplicate = await EmployeeOrgAssignment.findOne({
            tenantId: event.tenantId,
            userIdString: eventData.userId,
            entityIdString: eventData.organizationId,
            isActive: true,
            assignmentId: { $ne: eventData.assignmentId } // Exclude the one we're trying to reactivate
          });

          if (activeDuplicate) {
            console.log(`ℹ️ [ORG-ASSIGNMENT-CREATE] Active assignment already exists for user ${eventData.userId} and org ${eventData.organizationId} (assignmentId: ${activeDuplicate.assignmentId}), skipping reactivation of ${eventData.assignmentId}`);
            return { success: true, skipped: true, reason: 'active_duplicate_exists' };
          }

          // Safe to reactivate - no active duplicate exists
          console.log(`🔄 [ORG-ASSIGNMENT-CREATE] Reactivating existing inactive assignment: ${eventData.assignmentId}`);
          try {
            existingAssignment.isActive = true;
            existingAssignment.deactivatedAt = undefined;
            existingAssignment.deactivatedBy = undefined;
            await existingAssignment.save();
            return { success: true, assignmentId: eventData.assignmentId, reactivated: true };
          } catch (saveError) {
            // Handle duplicate key error gracefully (race condition)
            if (saveError.code === 11000 && saveError.message.includes('duplicate key error')) {
              console.log(`⚠️ [ORG-ASSIGNMENT-CREATE] Duplicate key error while reactivating (race condition), checking for active assignment...`);
              const nowActive = await EmployeeOrgAssignment.findOne({
                tenantId: event.tenantId,
                userIdString: eventData.userId,
                entityIdString: eventData.organizationId,
                isActive: true
              });
              if (nowActive) {
                console.log(`ℹ️ [ORG-ASSIGNMENT-CREATE] Active assignment now exists (assignmentId: ${nowActive.assignmentId}), acknowledging event`);
                return { success: true, skipped: true, reason: 'duplicate_key_race_condition' };
              }
            }
            throw saveError;
          }
        }
        console.log(`ℹ️ [ORG-ASSIGNMENT-CREATE] Assignment ${eventData.assignmentId} already exists and is active, skipping creation`);
        return { success: true, skipped: true, reason: 'already_exists' };
      }

      // Strategy 2: Check if assignment exists by userId+orgId (might have different assignmentId)
      const duplicateAssignment = await EmployeeOrgAssignment.findOne({
        tenantId: event.tenantId,
        userIdString: eventData.userId,
        entityIdString: eventData.organizationId,
        isActive: true
      });

      if (duplicateAssignment) {
        console.log(`ℹ️ [ORG-ASSIGNMENT-CREATE] Active assignment already exists for user ${eventData.userId} and org ${eventData.organizationId} (assignmentId: ${duplicateAssignment.assignmentId}), skipping creation`);
        return { success: true, skipped: true, reason: 'duplicate' };
      }

      // Use organizationId as the orgCode for this CRM application
      const orgCode = eventData.organizationId;

      // Find organization
      let organization = await Organization.findOne({
        tenantId: event.tenantId,
        orgCode: orgCode
      }).lean();

      if (!organization) {
        // Try case-insensitive match
        organization = await Organization.findOne({
          tenantId: event.tenantId,
          orgCode: { $regex: `^${orgCode}$`, $options: 'i' }
        }).lean();
      }

      if (!organization) {
        console.error(`❌ [ORG-ASSIGNMENT-CREATE] Organization not found with orgCode: ${orgCode} in tenant ${event.tenantId}`);
        throw new Error(`Organization ${orgCode} not found in tenant ${event.tenantId}`);
      }

      // Find user profile
      const userProfile = await UserProfile.findOne({
        tenantId: event.tenantId,
        userId: eventData.userId
      }).lean();

      if (!userProfile) {
        console.error(`❌ [ORG-ASSIGNMENT-CREATE] User profile not found for userId: ${eventData.userId} in tenant ${event.tenantId}`);
        throw new Error(`User profile not found for userId: ${eventData.userId} in tenant ${event.tenantId}`);
      }

      // Create new assignment
      const newAssignment = new EmployeeOrgAssignment({
        assignmentId: eventData.assignmentId,
        tenantId: event.tenantId,
        userId: userProfile._id,
        userIdString: eventData.userId,
        entityId: organization._id,
        entityIdString: organization.orgCode,
        assignmentType: eventData.assignmentType || 'direct',
        isActive: eventData.isActive !== false,
        assignedAt: new Date(eventData.assignedAt || Date.now()),
        priority: eventData.priority || 1,
        assignedBy: eventData.assignedBy,
        isPrimary: eventData.isPrimary || false,
        metadata: eventData.metadata || {}
      });

      try {
        await newAssignment.save();
        console.log(`✅ [ORG-ASSIGNMENT-CREATE] Created organization assignment: ${eventData.assignmentId} for user ${eventData.userId} and orgCode: ${organization.orgCode}`);

        return { success: true, assignmentId: eventData.assignmentId };
      } catch (saveError) {
        // Handle duplicate key error gracefully (race condition - another process created it)
        if (saveError.code === 11000 && saveError.message.includes('duplicate key error')) {
          console.log(`⚠️ [ORG-ASSIGNMENT-CREATE] Duplicate key error while creating (race condition), checking if assignment now exists...`);
          const nowExists = await EmployeeOrgAssignment.findOne({
            tenantId: event.tenantId,
            $or: [
              { assignmentId: eventData.assignmentId },
              {
                userIdString: eventData.userId,
                entityIdString: eventData.organizationId,
                isActive: true
              }
            ]
          });
          if (nowExists) {
            console.log(`ℹ️ [ORG-ASSIGNMENT-CREATE] Assignment now exists (assignmentId: ${nowExists.assignmentId}), acknowledging event`);
            return { success: true, skipped: true, reason: 'duplicate_key_race_condition' };
          }
        }
        throw saveError;
      }

    } catch (error) {
      // Handle duplicate key error at top level as well
      if (error.code === 11000 && error.message.includes('duplicate key error')) {
        console.log(`⚠️ [ORG-ASSIGNMENT-CREATE] Duplicate key error, acknowledging to prevent infinite retry`);
        return { acknowledged: true, reason: 'duplicate_key_error' };
      }
      
      console.error('❌ [ORG-ASSIGNMENT-CREATE] Failed to create organization assignment:', {
        error: error.message,
        stack: error.stack,
        eventData: event.data || event
      });
      throw error;
    }
  }

  /**
   * Handle organization assignment updated event
   */
  async handleOrganizationAssignmentUpdated(event) {
    try {
      const eventData = event.data || event;

      if (!eventData.assignmentId || !event.tenantId) {
        throw new Error(`Missing required fields in organization.assignment.updated event`);
      }

      const { default: EmployeeOrgAssignment } = await import('../models/EmployeeOrgAssignment.js');

      const updateData = {};
      if (eventData.changes) {
        if (eventData.changes.assignmentType) updateData.assignmentType = eventData.changes.assignmentType;
        if (eventData.changes.isActive !== undefined) updateData.isActive = eventData.changes.isActive;
        if (eventData.changes.priority !== undefined) updateData.priority = eventData.changes.priority;
      }
      updateData.updatedAt = new Date();

      let result = await EmployeeOrgAssignment.updateOne(
        { tenantId: event.tenantId, assignmentId: eventData.assignmentId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        // Try userId+orgId lookup
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          result = await EmployeeOrgAssignment.updateOne(
            {
              tenantId: event.tenantId,
              userIdString: parts[0],
              entityIdString: parts[1]
            },
            { $set: updateData }
          );
        }
      }

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for update - acknowledging to prevent infinite retry`);
        return { success: false, reason: 'not_found', acknowledged: true }; // Acknowledge to prevent infinite retry
      }

      console.log(`✅ Updated organization assignment: ${eventData.assignmentId}`);
      return { success: true, assignmentId: eventData.assignmentId };

    } catch (error) {
      console.error('❌ Failed to update organization assignment:', error);
      throw error;
    }
  }

  /**
   * Handle organization assignment deleted event
   */
  async handleOrganizationAssignmentDeleted(event) {
    try {
      const eventData = event.data || event;

      console.log(`🔄 [ORG-ASSIGNMENT-DELETE] Processing deletion event:`, {
        assignmentId: eventData.assignmentId,
        userId: eventData.userId,
        organizationId: eventData.organizationId,
        tenantId: event.tenantId,
        eventId: event.id || event.eventId
      });

      if (!eventData.assignmentId || !event.tenantId) {
        throw new Error(`Missing required fields in organization.assignment.deleted event. Event: ${JSON.stringify({ assignmentId: eventData.assignmentId, tenantId: event.tenantId })}`);
      }

      const { default: EmployeeOrgAssignment } = await import('../models/EmployeeOrgAssignment.js');

      // Strategy 1: Try to find by exact assignmentId
      let assignmentToDelete = await EmployeeOrgAssignment.findOne({
        tenantId: event.tenantId,
        assignmentId: eventData.assignmentId
      });

      if (assignmentToDelete) {
        console.log(`✅ [ORG-ASSIGNMENT-DELETE] Found assignment by assignmentId: ${eventData.assignmentId}`);
      } else {
        // Strategy 2: Try userId + entityId combination
        if (eventData.userId && eventData.organizationId) {
          assignmentToDelete = await EmployeeOrgAssignment.findOne({
            tenantId: event.tenantId,
            userIdString: eventData.userId,
            entityIdString: eventData.organizationId
          });
          
          if (assignmentToDelete) {
            console.log(`✅ [ORG-ASSIGNMENT-DELETE] Found assignment by userId+entityId: ${eventData.userId} + ${eventData.organizationId}`);
          }
        }

        // Strategy 3: Try parsing assignmentId format (legacy format: userId_entityId_timestamp)
        if (!assignmentToDelete) {
          const parts = eventData.assignmentId.split('_');
          if (parts.length >= 2) {
            assignmentToDelete = await EmployeeOrgAssignment.findOne({
              tenantId: event.tenantId,
              userIdString: parts[0],
              entityIdString: parts[1]
            });
            
            if (assignmentToDelete) {
              console.log(`✅ [ORG-ASSIGNMENT-DELETE] Found assignment by parsed assignmentId parts: ${parts[0]} + ${parts[1]}`);
            }
          }
        }
      }

      if (!assignmentToDelete) {
        console.warn(`⚠️ [ORG-ASSIGNMENT-DELETE] Assignment not found for deletion:`, {
          assignmentId: eventData.assignmentId,
          userId: eventData.userId,
          organizationId: eventData.organizationId,
          tenantId: event.tenantId,
          message: 'Assignment may have already been deleted or never existed in CRM'
        });
        return { success: false, reason: 'not_found', acknowledged: true }; // Acknowledge to prevent infinite retry
      }

      // Instead of deleting, deactivate the assignment (soft delete)
      // This preserves history and allows for reactivation if needed
      const result = await EmployeeOrgAssignment.updateOne(
        { _id: assignmentToDelete._id },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: eventData.deletedBy || 'system_event'
          }
        }
      );

      if (result.matchedCount === 0) {
        console.warn(`⚠️ [ORG-ASSIGNMENT-DELETE] Assignment ${assignmentToDelete._id} not updated (already deleted?) - acknowledging to prevent infinite retry`);
        return { success: false, reason: 'already_deleted', acknowledged: true }; // Acknowledge to prevent infinite retry
      }

      console.log(`✅ [ORG-ASSIGNMENT-DELETE] Deactivated organization assignment: ${eventData.assignmentId} (was active: ${assignmentToDelete.isActive})`);
      return { success: true, assignmentId: eventData.assignmentId };

    } catch (error) {
      console.error('❌ [ORG-ASSIGNMENT-DELETE] Failed to delete organization assignment:', {
        error: error.message,
        stack: error.stack,
        eventData: event.data || event
      });
      throw error;
    }
  }

  /**
   * Handle organization assignment deactivated event
   */
  async handleOrganizationAssignmentDeactivated(event) {
    try {
      const eventData = event.data || event;

      if (!eventData.assignmentId || !event.tenantId) {
        throw new Error(`Missing required fields in organization.assignment.deactivated event`);
      }

      const { default: EmployeeOrgAssignment } = await import('../models/EmployeeOrgAssignment.js');

      let result = await EmployeeOrgAssignment.updateOne(
        { tenantId: event.tenantId, assignmentId: eventData.assignmentId },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: eventData.deactivatedBy
          }
        }
      );

      if (result.matchedCount === 0) {
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          result = await EmployeeOrgAssignment.updateOne(
            {
              tenantId: event.tenantId,
              userIdString: parts[0],
              entityIdString: parts[1]
            },
            {
              $set: {
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: eventData.deactivatedBy
              }
            }
          );
        }
      }

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for deactivation - acknowledging to prevent infinite retry`);
        return { success: false, reason: 'not_found', acknowledged: true }; // Acknowledge to prevent infinite retry
      }

      console.log(`✅ Deactivated organization assignment: ${eventData.assignmentId}`);
      return { success: true, assignmentId: eventData.assignmentId };

    } catch (error) {
      console.error('❌ Failed to deactivate organization assignment:', error);
      throw error;
    }
  }

  /**
   * Handle organization assignment activated event
   */
  async handleOrganizationAssignmentActivated(event) {
    try {
      const eventData = event.data || event;

      if (!eventData.assignmentId || !event.tenantId) {
        throw new Error(`Missing required fields in organization.assignment.activated event`);
      }

      const { default: EmployeeOrgAssignment } = await import('../models/EmployeeOrgAssignment.js');

      let result = await EmployeeOrgAssignment.updateOne(
        { tenantId: event.tenantId, assignmentId: eventData.assignmentId },
        {
          $set: {
            isActive: true,
            activatedAt: new Date(),
            activatedBy: eventData.activatedBy
          },
          $unset: {
            deactivatedAt: "",
            deactivatedBy: ""
          }
        }
      );

      if (result.matchedCount === 0) {
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          result = await EmployeeOrgAssignment.updateOne(
            {
              tenantId: event.tenantId,
              userIdString: parts[0],
              entityIdString: parts[1]
            },
            {
              $set: {
                isActive: true,
                activatedAt: new Date(),
                activatedBy: eventData.activatedBy
              },
              $unset: {
                deactivatedAt: "",
                deactivatedBy: ""
              }
            }
          );
        }
      }

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for activation - acknowledging to prevent infinite retry`);
        return { success: false, reason: 'not_found', acknowledged: true }; // Acknowledge to prevent infinite retry
      }

      console.log(`✅ Activated organization assignment: ${eventData.assignmentId}`);
      return { success: true, assignmentId: eventData.assignmentId };

    } catch (error) {
      console.error('❌ Failed to activate organization assignment:', error);
      throw error;
    }
  }

  /**
   * Cleanup inherited global configs when tenant creates an override
   */
  async cleanupInheritedConfig(operationCode, tenantId, CrmCreditConfig) {
    try {
      // Find and remove any inherited configs for this operation code and tenant
      const deletedCount = await CrmCreditConfig.deleteMany({
        operationCode,
        tenantId,
        source: 'global',
        inheritedFrom: { $exists: true, $ne: null }
      });

      if (deletedCount.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount.deletedCount} inherited global config(s) for ${operationCode} (tenant ${tenantId} now has override)`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup inherited configs:', error.message);
      // Non-fatal error - don't throw
    }
  }

  /**
   * Get consumer metrics
   */
  getMetrics() {
    const avgProcessingTime = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;

      return {
        consumer: {
          name: this.options.consumerName,
          group: this.options.consumerGroup,
          tenantId: this.options.tenantId,
          isRunning: this.isRunning
        },
        performance: {
          eventsProcessed: this.metrics.eventsProcessed,
          eventsFailed: this.metrics.eventsFailed,
          successRate: this.metrics.eventsProcessed /
            (this.metrics.eventsProcessed + this.metrics.eventsFailed) * 100,
          avgProcessingTime: Math.round(avgProcessingTime),
          eventsByType: Object.fromEntries(this.metrics.eventsByType)
        }
      };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const ping = await this.redisClient.ping();
      const isConnected = ping === 'PONG';

      // Check consumer group lag
      let totalLag = 0;
      for (const stream of this.streams) {
        try {
          const info = await this.redisClient.xInfoConsumers(stream, this.options.consumerGroup);
          totalLag += info.reduce((sum, consumer) => sum + consumer.pending, 0);
        } catch (error) {
          // Stream might not exist yet
        }
      }

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        redisConnected: isConnected,
        consumerLag: totalLag,
        timestamp: new Date().toISOString(),
        metrics: this.getMetrics(),
        circuitBreakers: {
          mongo: this.mongoCircuitBreaker.getStateInfo(),
          redis: this.redisCircuitBreaker.getStateInfo()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reset MongoDB circuit breaker
   */
  resetMongoCircuitBreaker() {
    this.mongoCircuitBreaker.reset();
    return {
      success: true,
      message: 'MongoDB circuit breaker reset',
      state: this.mongoCircuitBreaker.getStateInfo()
    };
  }

  /**
   * Force MongoDB circuit breaker to HALF_OPEN
   */
  forceMongoCircuitBreakerHalfOpen() {
    this.mongoCircuitBreaker.forceHalfOpen();
    return {
      success: true,
      message: 'MongoDB circuit breaker forced to HALF_OPEN',
      state: this.mongoCircuitBreaker.getStateInfo()
    };
  }

  /**
   * Stop the consumer
   */
  async stop() {
    console.log('🛑 Stopping Redis Streams CRM Consumer...');
    
    // Set shutdown flag to prevent new message processing
    this.isShuttingDown = true;
    this.isRunning = false;

    // Wait for current processing to complete (max 30 seconds)
    const shutdownTimeout = 30000;
    const startTime = Date.now();
    while (Date.now() - startTime < shutdownTimeout) {
      // Simple wait - no lock tracking needed
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
      break; // Just wait once, no need to check locks
    }

    // Stop health checks
    this.stopHealthChecks();

    // Stop automatic trimming
    if (this.trimInterval) {
      clearInterval(this.trimInterval);
      this.trimInterval = null;
      console.log('🛑 Stopped automatic message trimming');
    }

    // Disconnect Redis client
    if (this.redisClient) {
      try {
      await this.redisClient.disconnect();
        console.log('🔌 Redis client disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting Redis:', error.message);
      }
    }

    console.log('✅ Redis Streams CRM Consumer stopped');
  }
}

export default RedisStreamsCRMConsumer;
