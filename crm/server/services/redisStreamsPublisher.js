import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

/**
 * 📤 Redis Streams CRM Publisher
 *
 * Publishes events to Redis Streams following the standardized format
 * from the Redis Streams CRM Synchronization Guide.
 */
class RedisStreamsCRMPublisher {
  constructor(options = {}) {
    this.options = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      sourceApp: 'crm',
      version: '1.0',
      ...options
    };

    this.redisClient = null;
    this.isConnected = false;

    // Event counters for metrics
    this.metrics = {
      eventsPublished: 0,
      eventsByType: new Map(),
      errors: 0
    };
  }

  /**
   * Initialize the publisher
   */
  async initialize() {
    try {
      console.log('📤 Initializing Redis Streams CRM Publisher');

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

      this.redisClient.on('connect', () => {
        console.log('✅ Redis publisher connected');
        this.isConnected = true;
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis publisher error:', err);
        this.isConnected = false;
      });

      await this.redisClient.connect();
      console.log('✅ Redis Streams CRM Publisher initialized');

      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Redis Streams publisher:', error);
      throw error;
    }
  }

  /**
   * Publish an event to Redis Streams
   */
  async publishEvent(eventType, entityType, entityId, tenantId, eventData, options = {}) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      // Generate stream ID
      const streamId = `crm:sync:${entityType}:${eventType}`;

      // Create standardized event
      const event = {
        // Stream identification
        streamId,
        messageId: `${Date.now()}-${uuidv4()}`,

        // Metadata
        timestamp: new Date().toISOString(),
        sourceApp: this.options.sourceApp,
        eventType,
        entityType,
        entityId,
        tenantId,
        action: this.getActionFromEventType(eventType),

        // Event-specific data
        data: eventData,

        // Processing metadata
        metadata: {
          correlationId: options.correlationId || `${eventType}_${entityId}_${Date.now()}`,
          version: this.options.version,
          retryCount: 0,
          sourceTimestamp: new Date().toISOString(),
          ...options.metadata
        }
      };

      // Serialize for Redis
      const serializedEvent = this.serializeEvent(event);

      // Publish to stream
      const result = await this.redisClient.xAdd(streamId, '*', serializedEvent);

      // Update metrics
      this.updateMetrics(eventType);

      console.log(`📤 Published ${eventType} to ${streamId} (${result})`);
      return { streamId, messageId: result, event };

    } catch (error) {
      console.error(`❌ Failed to publish ${eventType} event:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get action from event type
   */
  getActionFromEventType(eventType) {
    const actionMap = {
      'user_created': 'created',
      'user_deactivated': 'deactivated',
      'role_assigned': 'assigned',
      'role_unassigned': 'unassigned',
      'org_created': 'created',
      'credit_allocated': 'allocated'
    };

    return actionMap[eventType] || 'updated';
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
  updateMetrics(eventType) {
    this.metrics.eventsPublished++;
    this.metrics.eventsByType.set(
      eventType,
      (this.metrics.eventsByType.get(eventType) || 0) + 1
    );
  }

  // 🎯 HIGH-LEVEL EVENT PUBLISHING METHODS

  /**
   * Publish user created event
   */
  async publishUserCreated(tenantId, userData, options = {}) {
    return this.publishEvent(
      'user_created',
      'user',
      userData.userId,
      tenantId,
      {
        userId: userData.userId,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        isVerified: userData.isVerified,
        createdAt: userData.createdAt,
        kindeUserId: userData.kindeUserId
      },
      options
    );
  }

  /**
   * Publish user deactivated event
   */
  async publishUserDeactivated(tenantId, userData, options = {}) {
    return this.publishEvent(
      'user_deactivated',
      'user',
      userData.userId,
      tenantId,
      {
        userId: userData.userId,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        deactivatedAt: userData.deactivatedAt,
        deactivatedBy: userData.deactivatedBy,
        reason: userData.reason
      },
      options
    );
  }

  /**
   * Publish role assigned event
   */
  async publishRoleAssigned(tenantId, assignmentData, options = {}) {
    return this.publishEvent(
      'role_assigned',
      'role_assignment',
      assignmentData.assignmentId,
      tenantId,
      {
        assignmentId: assignmentData.assignmentId,
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        assignedAt: assignmentData.assignedAt,
        reason: assignmentData.reason
      },
      options
    );
  }

  /**
   * Publish role unassigned event
   */
  async publishRoleUnassigned(tenantId, assignmentData, options = {}) {
    return this.publishEvent(
      'role_unassigned',
      'role_assignment',
      assignmentData.assignmentId,
      tenantId,
      {
        assignmentId: assignmentData.assignmentId,
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        unassignedAt: assignmentData.unassignedAt,
        reason: assignmentData.reason
      },
      options
    );
  }

  /**
   * Publish organization created event
   */
  async publishOrgCreated(tenantId, orgData, options = {}) {
    return this.publishEvent(
      'org_created',
      'organization',
      orgData.orgCode,
      tenantId,
      {
        orgCode: orgData.orgCode,
        orgName: orgData.orgName,
        orgType: orgData.orgType,
        organizationType: orgData.organizationType,
        description: orgData.description,
        parentId: orgData.parentId,
        entityLevel: orgData.entityLevel,
        isActive: orgData.isActive,
        createdBy: orgData.createdBy,
        createdAt: orgData.createdAt
      },
      options
    );
  }

  /**
   * Publish credit allocated event
   */
  async publishCreditAllocated(tenantId, creditData, options = {}) {
    return this.publishEvent(
      'credit_allocated',
      'credit',
      creditData.entityId,
      tenantId,
      {
        entityId: creditData.entityId,
        entityType: creditData.entityType,
        allocatedCredits: creditData.allocatedCredits,
        previousBalance: creditData.previousBalance,
        newBalance: creditData.newBalance,
        source: creditData.source,
        sourceId: creditData.sourceId,
        description: creditData.description,
        allocatedBy: creditData.allocatedBy,
        allocatedAt: creditData.allocatedAt
      },
      options
    );
  }

  /**
   * Get publisher metrics
   */
  getMetrics() {
    return {
      eventsPublished: this.metrics.eventsPublished,
      eventsByType: Object.fromEntries(this.metrics.eventsByType),
      errors: this.metrics.errors,
      isConnected: this.isConnected
    };
  }

  /**
   * Close the publisher
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
    console.log('📤 Redis Streams CRM Publisher closed');
  }
}

export default RedisStreamsCRMPublisher;
