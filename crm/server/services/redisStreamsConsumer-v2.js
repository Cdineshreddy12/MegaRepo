import { createClient } from 'redis';
import CircuitBreaker from '../utils/circuitBreaker.js';
import EventValidator from '../utils/eventValidator.js';
import ConsumerGroupManager from '../utils/consumerGroupManager.js';

/**
 * 🚀 Redis Streams CRM Consumer V2
 * 
 * Enhanced version with standardized event format, validation, and centralized consumer group management.
 * Handles consumer groups, event ordering, idempotency, and error handling.
 * 
 * Production-Ready Features:
 * - Circuit Breaker: Prevents cascading failures
 * - Pending Message Protection: DB check for edge cases (consumer crash)
 * - Graceful Shutdown: Prevents data corruption during shutdown
 * - Event Validation: Comprehensive validation with dead-letter queues
 * - Centralized Consumer Group Management: Standardized naming and lifecycle
 */
class RedisStreamsCRMConsumerV2 {
  constructor(options = {}) {
    this.options = {
      redisUrl: process.env.REDIS_URL,
      consumerGroup: process.env.CRM_CONSUMER_GROUP || 'crm-consumers',
      consumerName: process.env.CRM_CONSUMER_NAME || 'crm-credit-consumer',
      tenantId: process.env.CRM_TENANT_ID || 'b0a6e370-c1e5-43d1-94e0-55ed792274c4',
      batchSize: parseInt(process.env.CRM_BATCH_SIZE) || 10,
      blockTime: parseInt(process.env.CRM_BLOCK_TIME) || 5000,
      maxRetries: parseInt(process.env.CRM_MAX_RETRIES) || 3,
      enableValidation: true,
      sendToDLQOnError: true,
      ...options
    };

    this.redisClient = null;
    this.isRunning = false;
    this.isShuttingDown = false;
    this.redisHealthy = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.healthCheckInterval = null;
    this.trimInterval = null;
    
    // Initialize utilities
    this.validator = new EventValidator();
    this.consumerGroupManager = null;
    
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
      eventsValidated: 0,
      eventsByType: new Map(),
      processingTimes: [],
      lastProcessedId: '0-0',
      validationErrors: 0,
      dlqMessages: 0
    };

    // Updated stream names with standardized naming
    this.streams = [
      'crm:sync:user:user_created',
      'crm:sync:user:user_deactivated',
      'crm:sync:user:user_deleted',
      'crm:sync:permissions:role_assigned',
      'crm:sync:permissions:role_unassigned',
      'crm:sync:role:role_created',
      'crm:sync:role:role_updated',
      'crm:sync:role:role_deleted',
      'crm:sync:role:role_permissions_changed', // New standardized stream
      'crm:sync:organization:org_created',
      'crm:sync:credits:credit_allocated',
      'crm:sync:credits:credit_config_updated',
      'credit-events',
      'crm:organization-assignments'
    ];

    // Enhanced event handlers mapping with standardized event types
    this.eventHandlers = {
      // Standardized event types (dot notation)
      'user.created': this.handleUserCreated.bind(this),
      'user.deactivated': this.handleUserDeactivated.bind(this),
      'user.deleted': this.handleUserDeleted.bind(this),
      'role.created': this.handleRoleCreated.bind(this),
      'role.updated': this.handleRoleUpdated.bind(this),
      'role.deleted': this.handleRoleDeleted.bind(this),
      'role.permissions_changed': this.handleRolePermissionsChanged.bind(this), // NEW STANDARDIZED HANDLER
      'organization.created': this.handleOrgCreated.bind(this),
      'credit.allocated': this.handleCreditAllocated.bind(this),
      'credit.config_updated': this.handleCreditConfigUpdated.bind(this),
      
      // Legacy event types (for backward compatibility)
      'user_created': this.handleUserCreated.bind(this),
      'user_deactivated': this.handleUserDeactivated.bind(this),
      'user_deleted': this.handleUserDeleted.bind(this),
      'role_created': this.handleRoleCreated.bind(this),
      'role_updated': this.handleRoleUpdated.bind(this),
      'role_deleted': this.handleRoleDeleted.bind(this),
      'role_permissions_changed': this.handleRolePermissionsChanged.bind(this), // Legacy handler
      'org_created': this.handleOrgCreated.bind(this),
      'credit_allocated': this.handleCreditAllocated.bind(this),
      'credit_config_updated': this.handleCreditConfigUpdated.bind(this),
      'role_assigned': this.handleRoleAssigned.bind(this),
      'role_unassigned': this.handleRoleUnassigned.bind(this),
      
      // Organization assignment events
      'organization.assignment.created': this.handleOrganizationAssignmentCreated.bind(this),
      'organization.assignment.updated': this.handleOrganizationAssignmentUpdated.bind(this),
      'organization.assignment.deleted': this.handleOrganizationAssignmentDeleted.bind(this),
      'organization.assignment.deactivated': this.handleOrganizationAssignmentDeactivated.bind(this),
      'organization.assignment.activated': this.handleOrganizationAssignmentActivated.bind(this)
    };
  }

  /**
   * Initialize the Redis Streams consumer with new utilities
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Redis Streams CRM Consumer V2');
      console.log(`🔗 Redis URL: ${this.options.redisUrl.replace(/:([^:@]{4})[^:@]*@/, ':$1****@')}`);
      console.log(`👥 Consumer Group: ${this.options.consumerGroup}`);
      console.log(`🏷️ Consumer Name: ${this.options.consumerName}`);
      console.log(`🏢 Tenant ID: ${this.options.tenantId}`);
      console.log(`✅ Validation Enabled: ${this.options.enableValidation}`);
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

      // Set up event handlers with health monitoring
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

      // Initialize consumer group manager
      this.consumerGroupManager = new ConsumerGroupManager(this.redisClient);

      // Create consumer groups using centralized management
      await this.createConsumerGroups();

      // Start automatic message trimming (daily cleanup)
      this.startAutomaticTrimming();

      console.log('✅ Redis Streams CRM Consumer V2 initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Redis Streams consumer:', error);
      throw error;
    }
  }

  /**
   * Create consumer groups using centralized management
   */
  async createConsumerGroups() {
    console.log('👥 Creating consumer groups using centralized management...');

    try {
      const results = await this.consumerGroupManager.createConsumerGroups(
        this.streams, 
        this.options.tenantId
      );

      console.log(`✅ Consumer group creation summary:`, {
        total: results.summary.total,
        created: results.summary.created,
        existing: results.summary.existing,
        failed: results.summary.failed
      });

      // Log any failures
      if (results.summary.failed > 0) {
        console.warn('⚠️ Some consumer groups failed to create:');
        results.failed.forEach(failure => {
          console.warn(`   - ${failure.stream}: ${failure.error}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to create consumer groups:', error);
      throw error;
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
    console.log('▶️ Starting Redis Streams consumption V2...');

    try {
      // First, try to claim any pending messages from other consumers
      await this.claimPendingMessages();

      console.log('🔄 Starting consumer loop...');
      let consecutiveEmptyCycles = 0;
      
      while (this.isRunning) {
        let messagesProcessed = 0;
        
        // Process new messages (only log if messages found)
        const newMessagesCount = await this.processNewMessages();
        messagesProcessed += newMessagesCount || 0;
        
        // Process pending messages (only log if messages found)
        const pendingMessagesCount = await this.processPendingMessages();
        messagesProcessed += pendingMessagesCount || 0;
        
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
   * Process a batch of messages with enhanced validation
   */
  async processMessages(results, isPending = false) {
    // Stop processing if shutting down
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown in progress, skipping message processing');
      return;
    }

    for (const result of results) {
      const stream = result.name;
      const messages = result.messages;

      for (const message of messages) {
        // Stop processing individual messages if shutting down
        if (this.isShuttingDown) {
          console.log('⚠️ Shutdown in progress, stopping message processing');
          return;
        }

        const messageId = String(message.id);

        try {
          const startTime = Date.now();
          const event = this.parseRedisMessage(message);

          // Enhanced validation if enabled
          if (this.options.enableValidation) {
            const validation = this.validator.validateEvent(event);
            this.metrics.eventsValidated++;

            if (!validation.valid) {
              console.error(`❌ Event validation failed for ${messageId}:`, validation.errors);
              this.metrics.validationErrors++;

              // Send to dead-letter queue if enabled
              if (this.options.sendToDLQOnError) {
                await this.validator.sendToDeadLetterStream(event, validation.errors, this.redisClient);
                this.metrics.dlqMessages++;
              }

              // Acknowledge invalid events to prevent infinite retry
              await this.redisClient.xAck(stream, this.getConsumerGroupName(stream), messageId);
              continue;
            }

            // Log warnings if any
            if (validation.warnings.length > 0) {
              console.warn(`⚠️ Event validation warnings for ${messageId}:`, validation.warnings);
            }
          }

          // Filter events by tenantId for global streams
          if (stream.includes('crm:') && !stream.includes(`:${this.options.tenantId}`)) {
            if (event.tenantId && event.tenantId !== this.options.tenantId) {
              console.log(`⏭️ Skipping event ${messageId} - tenant mismatch (event: ${event.tenantId}, consumer: ${this.options.tenantId})`);
              await this.redisClient.xAck(stream, this.getConsumerGroupName(stream), messageId);
              continue;
            }
          }

          // EDGE CASE: For pending messages only, check if already processed
          if (isPending) {
            const alreadyProcessed = await this.checkPendingMessageProcessed(messageId, stream, this.getConsumerGroupName(stream));
            if (alreadyProcessed) {
              console.log(`🔄 Pending message ${messageId} already processed, skipping`);
              await this.redisClient.xAck(stream, this.getConsumerGroupName(stream), messageId);
              continue;
            }
          }

          // Process event with circuit breaker protection
          let processResult;
          try {
            processResult = await this.mongoCircuitBreaker.execute(async () => {
              return await this.processEvent(event);
            });
          } catch (circuitError) {
            if (circuitError.code === 'CIRCUIT_BREAKER_OPEN') {
              console.log(`⚠️ MongoDB circuit breaker is OPEN, skipping event processing`);
              throw circuitError;
            }
            throw circuitError;
          }

          // Handle different result types
          let shouldAcknowledge = true;
          let wasSuccessful = true;

          if (processResult && typeof processResult === 'object') {
            if (processResult.skipped) {
              console.log(`⏭️ Event ${event.eventType} was skipped: ${processResult.reason}`);
              shouldAcknowledge = true;
              wasSuccessful = true;
            } else if (processResult.acknowledged) {
              console.log(`⚠️ Event ${event.eventType} failed but acknowledged: ${processResult.reason}`);
              shouldAcknowledge = true;
              wasSuccessful = false;
            } else if (processResult.success === false) {
              wasSuccessful = false;
              shouldAcknowledge = false;
            } else {
              wasSuccessful = true;
              shouldAcknowledge = true;
            }
          }

          // Acknowledge message if processing was successful or skipped
          if (shouldAcknowledge) {
            if (isPending) {
              await this.storePendingMessageRecord(messageId, stream, this.getConsumerGroupName(stream), wasSuccessful);
            }

            if (this.redisClient && (this.redisHealthy || this.redisClient.status === 'ready')) {
              await this.redisClient.xAck(stream, this.getConsumerGroupName(stream), messageId);
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

          // Handle processing error
          await this.handleProcessingError(stream, message, error);
        }
      }
    }
  }

  /**
   * Get consumer group name using centralized management
   */
  getConsumerGroupName(streamKey) {
    return this.consumerGroupManager 
      ? this.consumerGroupManager.generateConsumerGroupName(streamKey, this.options.tenantId)
      : `${this.options.consumerGroup}:${this.options.tenantId}`;
  }

  /**
   * Get consumer name using centralized management
   */
  getConsumerName(streamKey) {
    return this.consumerGroupManager
      ? this.consumerGroupManager.generateConsumerName(
          this.consumerGroupManager.getStreamType(streamKey), 
          this.options.tenantId
        )
      : this.options.consumerName;
  }

  /**
   * Enhanced role permissions changed event handler with standardized format support
   */
  async handleRolePermissionsChanged(event) {
    // Handle both standardized format and legacy format
    const eventData = event.data || event;

    console.log(`🎭 Processing role permissions changed event: ${eventData.roleId}`);

    // Validate required fields
    if (!eventData.roleId) {
      throw new Error(`Missing required field 'roleId' in role.permissions_changed event`);
    }

    if (!event.tenantId) {
      throw new Error(`Missing required field 'tenantId' in role.permissions_changed event`);
    }

    try {
      const { default: CrmRole } = await import('../models/CrmRole.js');

      // Handle both nested permissions object and flat permissions array
      let permissions = [];
      
      if (eventData.permissions) {
        // Nested permissions structure: { "crm": { "leads": ["read", "create"] } }
        permissions = this.flattenPermissions(eventData.permissions);
      } else if (eventData.flatPermissions) {
        // Already flat array: ["crm.leads.read", "crm.leads.create"]
        permissions = Array.isArray(eventData.flatPermissions) ? eventData.flatPermissions : [];
      }

      // Update role permissions
      const updateData = {
        roleName: eventData.roleName || 'Unknown Role',
        permissions: permissions,
        description: eventData.description,
        isActive: eventData.isActive !== undefined ? eventData.isActive : true,
        lastSyncedAt: new Date(),
        metadata: {
          ...eventData.metadata,
          updatedBy: eventData.updatedBy,
          updatedAt: eventData.updatedAt || new Date().toISOString(),
          source: 'redis_stream',
          eventId: event.eventId
        }
      };

      // Use upsert to handle both create and update
      const result = await CrmRole.findOneAndUpdate(
        { tenantId: event.tenantId, roleId: eventData.roleId },
        updateData,
        { upsert: true, new: true }
      );

      console.log(`🎭 Updated permissions for role ${eventData.roleId} (${eventData.roleName || 'Unknown'}): ${permissions.length} permissions`);
      console.log(`   Permissions: ${permissions.slice(0, 5).join(', ')}${permissions.length > 5 ? '...' : ''}`);

      return { 
        success: true, 
        roleId: eventData.roleId, 
        roleName: eventData.roleName,
        permissionsCount: permissions.length,
        wasCreated: result.createdAt === result.updatedAt
      };

    } catch (error) {
      console.error('❌ Failed to update role permissions in CRM:', error);
      console.error(`📋 Event structure: ${JSON.stringify(event, null, 2)}`);
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
   * Parse Redis message into event object with enhanced format support
   */
  parseRedisMessage(message) {
    const event = { id: message.id };

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

    // Handle standardized format where data is an object
    if (event.data && typeof event.data === 'object') {
      Object.assign(event, event.data);
      delete event.data;
    }
    // Handle legacy format where data is a JSON string
    else if (event.data && typeof event.data === 'string') {
      try {
        let dataStr = event.data;
        if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
          dataStr = dataStr.slice(1, -1);
        }
        
        const parsedData = JSON.parse(dataStr);
        Object.assign(event, parsedData);
        delete event.data;
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse data field as JSON: ${parseError.message}`);
      }
    }

    // Handle wrapper API events that don't have eventType field
    if (!event.eventType) {
      if (event.reason === 'application_allocation') {
        event.eventType = 'credit.allocated';
        event.amount = event.availableCredits;
        console.log(`🔄 Mapped wrapper event to CRM format: ${event.reason} -> ${event.eventType}`);
      } else {
        console.log(`⚠️ Unknown wrapper event reason: ${event.reason}, cannot map to eventType`);
        event.eventType = 'unknown';
      }
    }

    return event;
  }

  // ... [Include all other methods from the original consumer: processNewMessages, processPendingMessages, claimPendingMessages, etc.]

  /**
   * Process new messages
   */
  async processNewMessages() {
    try {
      if (!this.redisClient || !this.redisHealthy) {
        console.log('⚠️ Redis client not ready, skipping message processing');
        return;
      }

      // Use centralized consumer group management
      const consumerGroupName = this.getConsumerGroupName(this.streams[0]);
      const consumerName = this.getConsumerName(this.streams[0]);

      // PRIORITY 1: Always try to read new messages first (use '>')
      const newReadConfigs = this.streams.map(stream => ({ key: stream, id: '>' }));

      const newResult = await this.redisClient.xReadGroup(
        consumerGroupName,
        consumerName,
        newReadConfigs,
        { COUNT: this.options.batchSize, BLOCK: 100 }
      );

      let newMessagesCount = 0;
      if (newResult && newResult.length > 0) {
        const totalMessages = newResult.reduce((sum, stream) => sum + stream.messages.length, 0);
        if (totalMessages > 0) {
          console.log(`📨 Processing ${totalMessages} new message(s)...`);
          await this.processMessages(newResult, false);
          newMessagesCount = totalMessages;
        }
      }

      // PRIORITY 2: Then process any pending messages assigned to this consumer
      const pendingReadConfigs = this.streams.map(stream => ({ key: stream, id: '0' }));

      const pendingResult = await this.redisClient.xReadGroup(
        consumerGroupName,
        consumerName,
        pendingReadConfigs,
        { COUNT: this.options.batchSize, BLOCK: 100 }
      );

      let pendingMessagesCount = 0;
      if (pendingResult && pendingResult.length > 0) {
        const totalMessages = pendingResult.reduce((sum, stream) => sum + stream.messages.length, 0);
        if (totalMessages > 0) {
          console.log(`📋 Processing ${totalMessages} pending message(s)...`);
          await this.processMessages(pendingResult, true);
          pendingMessagesCount = totalMessages;
        }
      }

      return newMessagesCount + pendingMessagesCount;
    } catch (error) {
      if (error.message !== 'Connection is closed' && error.message !== 'The client is closed') {
        console.error('❌ Error processing new messages:', error);
      }
    }
  }

  /**
   * Update metrics with new validation metrics
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

  /**
   * Get enhanced metrics including validation metrics
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
        isRunning: this.isRunning,
        version: '2.0'
      },
      performance: {
        eventsProcessed: this.metrics.eventsProcessed,
        eventsFailed: this.metrics.eventsFailed,
        eventsValidated: this.metrics.eventsValidated,
        validationErrors: this.metrics.validationErrors,
        dlqMessages: this.metrics.dlqMessages,
        successRate: this.metrics.eventsProcessed /
          (this.metrics.eventsProcessed + this.metrics.eventsFailed) * 100,
        validationRate: this.metrics.eventsValidated > 0
          ? ((this.metrics.eventsValidated - this.metrics.validationErrors) / this.metrics.eventsValidated) * 100
          : 100,
        avgProcessingTime: Math.round(avgProcessingTime),
        eventsByType: Object.fromEntries(this.metrics.eventsByType)
      },
      configuration: {
        validationEnabled: this.options.enableValidation,
        dlqEnabled: this.options.sendToDLQOnError,
        batchSize: this.options.batchSize,
        maxRetries: this.options.maxRetries
      }
    };
  }

  // ... [Include all other utility methods from the original consumer]

  /**
   * Health check with enhanced monitoring
   */
  async healthCheck() {
    try {
      const ping = await this.redisClient.ping();
      const isConnected = ping === 'PONG';

      // Get consumer group health using centralized management
      let consumerGroupHealth = null;
      if (this.consumerGroupManager) {
        consumerGroupHealth = await this.consumerGroupManager.healthCheck(this.options.tenantId);
      }

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        redisConnected: isConnected,
        consumerGroupHealth,
        timestamp: new Date().toISOString(),
        metrics: this.getMetrics()
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
   * Stop the consumer
   */
  async stop() {
    console.log('🛑 Stopping Redis Streams CRM Consumer V2...');
    
    this.isShuttingDown = true;
    this.isRunning = false;

    // Wait for current processing to complete
    const shutdownTimeout = 30000;
    const startTime = Date.now();
    while (Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 500));
      break;
    }

    this.stopHealthChecks();

    if (this.trimInterval) {
      clearInterval(this.trimInterval);
      this.trimInterval = null;
    }

    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
        console.log('🔌 Redis client disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting Redis:', error.message);
      }
    }

    console.log('✅ Redis Streams CRM Consumer V2 stopped');
  }
}

export default RedisStreamsCRMConsumerV2;