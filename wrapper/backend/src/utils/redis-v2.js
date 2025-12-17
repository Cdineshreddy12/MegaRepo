import Redis from 'redis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Redis Streams Publisher with standardized event format
 * 
 * This version integrates with the unified event format and validation system.
 * All wrapper publishers should use this enhanced version for consistency.
 */
class EnhancedRedisManager {
  constructor() {
    this.client = null;
    this.subscribers = new Map();
    this.isConnected = false;
    this.validator = null; // Will be imported from standardized utils
  }

  async connect() {
    // Return early if already connected
    if (this.isConnected && this.client) {
      console.log('✅ Enhanced Redis already connected, skipping connection');
      return;
    }

    // If client exists but not connected, try to reconnect
    if (this.client && !this.isConnected) {
      try {
        console.log('🔄 Attempting to reconnect existing Enhanced Redis client');
        await this.client.connect();
        return;
      } catch (error) {
        console.warn('Failed to reconnect existing Enhanced Redis client:', error.message);
        this.client = null;
      }
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      console.log('🔗 Connecting to Enhanced Redis:', process.env.REDIS_URL ? 'Cloud Redis' : 'localhost:6379');

      this.client = Redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('Redis max retry attempts exceeded');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (error) => {
        console.error('Enhanced Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Enhanced Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('❌ Enhanced Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      console.log('✅ Enhanced Redis connection established successfully');

    } catch (error) {
      console.error('❌ Failed to connect to Enhanced Redis:', error);
      this.client = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('✅ Enhanced Redis client disconnected gracefully');
      } catch (error) {
        console.warn('Error during Enhanced Redis disconnect:', error.message);
        try {
          this.client.disconnect();
        } catch (forceError) {
          console.warn('Force disconnect also failed:', forceError.message);
        }
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  async healthCheck() {
    if (!this.client) {
      return {
        status: 'disconnected',
        message: 'Enhanced Redis client not initialized'
      };
    }

    try {
      const ping = await this.client.ping();
      const isConnected = ping === 'PONG';

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  isConnected() {
    return this.isConnected;
  }
}

/**
 * Enhanced CRM Sync Streams Class with standardized event format
 */
class EnhancedCrmSyncStreams {
  constructor(redisClient) {
    this.redis = redisClient;
    this.streamPrefix = 'crm:sync';
    this.version = '2.0';
    
    // Enhanced stream configurations with standardized naming
    this.STREAM_CONFIG = {
      // User lifecycle events
      'user.created': { stream: 'crm:sync:user:user_created', type: 'user-events' },
      'user.deactivated': { stream: 'crm:sync:user:user_deactivated', type: 'user-events' },
      'user.deleted': { stream: 'crm:sync:user:user_deleted', type: 'user-events' },
      
      // Role management events
      'role.created': { stream: 'crm:sync:role:role_created', type: 'role-events' },
      'role.updated': { stream: 'crm:sync:role:role_updated', type: 'role-events' },
      'role.deleted': { stream: 'crm:sync:role:role_deleted', type: 'role-events' },
      'role.permissions_changed': { stream: 'crm:sync:role:role_permissions_changed', type: 'role-events' },
      'role.assigned': { stream: 'crm:sync:permissions:role_assigned', type: 'permission-events' },
      'role.unassigned': { stream: 'crm:sync:permissions:role_unassigned', type: 'permission-events' },
      
      // Organization events
      'organization.created': { stream: 'crm:sync:organization:org_created', type: 'org-events' },
      
      // Credit events
      'credit.allocated': { stream: 'crm:sync:credits:credit_allocated', type: 'credit-events' },
      'credit.config_updated': { stream: 'crm:sync:credits:credit_config_updated', type: 'credit-events' },
      
      // Real-time credit events
      'credit-events': { stream: 'credit-events', type: 'credit-events' },
      
      // Organization assignment events
      'organization.assignment.created': { stream: 'crm:organization-assignments', type: 'assignment-events' },
      'organization.assignment.updated': { stream: 'crm:organization-assignments', type: 'assignment-events' },
      'organization.assignment.deleted': { stream: 'crm:organization-assignments', type: 'assignment-events' },
      'organization.assignment.deactivated': { stream: 'crm:organization-assignments', type: 'assignment-events' },
      'organization.assignment.activated': { stream: 'crm:organization-assignments', type: 'assignment-events' },
      
      // Inter-application events
      'inter-app-events': { stream: 'inter-app-events', type: 'interapp-events' },
      'acknowledgments': { stream: 'acknowledgments', type: 'acknowledgment-events' }
    };

    // Enhanced event type mapping (standardized format -> legacy format)
    this.EVENT_TYPE_MAPPING = {
      // User events
      'user.created': 'user_created',
      'user.deactivated': 'user_deactivated',
      'user.deleted': 'user_deleted',
      
      // Role events
      'role.created': 'role_created',
      'role.updated': 'role_updated',
      'role.deleted': 'role_deleted',
      'role.permissions_changed': 'role_permissions_changed',
      'role.assigned': 'role_assigned',
      'role.unassigned': 'role_unassigned',
      
      // Organization events
      'organization.created': 'org_created',
      
      // Credit events
      'credit.allocated': 'credit_allocated',
      'credit.config_updated': 'credit_config_updated'
    };
  }

  /**
   * Generate standardized event with unified format
   */
  createStandardizedEvent(eventType, entityType, entityId, tenantId, eventData, options = {}) {
    const streamConfig = this.getStreamConfig(eventType);
    const correlationId = options.correlationId || `${eventType}_${entityId}_${Date.now()}`;
    
    // Create the standardized event according to the unified format
    const standardizedEvent = {
      // Core identification fields
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: eventType,
      entityType: entityType,
      entityId: String(entityId),
      tenantId: String(tenantId),
      
      // Timing and source information
      timestamp: new Date().toISOString(),
      source: 'wrapper',
      version: '2.0',
      
      // Event-specific data
      data: eventData,
      
      // Processing metadata
      metadata: {
        correlationId,
        sourceTimestamp: new Date().toISOString(),
        retryCount: 0,
        ...options.metadata
      }
    };

    // For legacy compatibility, add legacy event type
    if (this.EVENT_TYPE_MAPPING[eventType]) {
      standardizedEvent.legacyEventType = this.EVENT_TYPE_MAPPING[eventType];
    }

    return {
      event: standardizedEvent,
      streamKey: streamConfig.stream,
      streamType: streamConfig.type
    };
  }

  /**
   * Get stream configuration for an event type
   */
  getStreamConfig(eventType) {
    const config = this.STREAM_CONFIG[eventType];
    if (config) {
      return config;
    }

    // Fallback for unknown event types
    console.warn(`⚠️ Unknown event type: ${eventType}, using fallback stream`);
    return {
      stream: `crm:sync:${eventType.replace('.', ':')}`,
      type: 'unknown-events'
    };
  }

  /**
   * Publish user lifecycle event with standardized format
   */
  async publishUserEvent(tenantId, eventType, userData, metadata = {}) {
    const { event, streamKey } = this.createStandardizedEvent(
      eventType,
      'user',
      userData.userId,
      tenantId,
      {
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: userData.name,
        isActive: userData.isActive,
        createdAt: userData.createdAt ? userData.createdAt.toISOString() : undefined,
        deactivatedAt: userData.deactivatedAt ? userData.deactivatedAt.toISOString() : undefined,
        deactivatedBy: userData.deactivatedBy,
        deletedAt: userData.deletedAt ? userData.deletedAt.toISOString() : undefined,
        deletedBy: userData.deletedBy,
        reason: userData.reason
      },
      { metadata }
    );

    return await this.publishToStream(streamKey, event);
  }

  /**
   * Publish role management event with standardized format
   */
  async publishRoleEvent(tenantId, eventType, roleData, metadata = {}) {
    const { event, streamKey } = this.createStandardizedEvent(
      eventType,
      'role',
      roleData.roleId || roleData.assignmentId,
      tenantId,
      {
        roleId: roleData.roleId,
        roleName: roleData.roleName,
        assignmentId: roleData.assignmentId,
        userId: roleData.userId,
        userIdString: roleData.userIdString,
        permissions: roleData.permissions,
        flatPermissions: roleData.flatPermissions,
        description: roleData.description,
        isActive: roleData.isActive,
        assignedAt: roleData.assignedAt ? roleData.assignedAt.toISOString() : undefined,
        assignedBy: roleData.assignedBy,
        unassignedAt: roleData.unassignedAt ? roleData.unassignedAt.toISOString() : undefined,
        unassignedBy: roleData.unassignedBy,
        updatedAt: roleData.updatedAt ? roleData.updatedAt.toISOString() : undefined,
        updatedBy: roleData.updatedBy
      },
      { metadata }
    );

    return await this.publishToStream(streamKey, event);
  }

  /**
   * Publish organization event with standardized format
   */
  async publishOrgEvent(tenantId, eventType, orgData, metadata = {}) {
    const { event, streamKey } = this.createStandardizedEvent(
      eventType,
      'organization',
      orgData.orgCode || orgData.organizationId,
      tenantId,
      {
        orgCode: orgData.orgCode,
        orgName: orgData.orgName || orgData.name,
        orgType: orgData.orgType || orgData.type,
        organizationType: orgData.organizationType,
        description: orgData.description,
        parentId: orgData.parentId,
        entityLevel: orgData.entityLevel,
        isActive: orgData.isActive,
        createdBy: orgData.createdBy,
        createdAt: orgData.createdAt ? orgData.createdAt.toISOString() : undefined
      },
      { metadata }
    );

    return await this.publishToStream(streamKey, event);
  }

  /**
   * Publish credit event with standardized format
   */
  async publishCreditEvent(tenantId, eventType, creditData, metadata = {}) {
    const { event, streamKey } = this.createStandardizedEvent(
      eventType,
      'credit',
      creditData.entityId || creditData.allocationId || creditData.configId,
      tenantId,
      {
        entityId: creditData.entityId,
        entityType: creditData.entityType,
        allocationId: creditData.allocationId,
        configId: creditData.configId,
        allocatedCredits: creditData.allocatedCredits,
        previousBalance: creditData.previousBalance,
        newBalance: creditData.newBalance,
        amount: creditData.amount,
        source: creditData.source,
        sourceId: creditData.sourceId,
        description: creditData.description,
        allocatedBy: creditData.allocatedBy,
        allocatedAt: creditData.allocatedAt ? creditData.allocatedAt.toISOString() : undefined
      },
      { metadata }
    );

    return await this.publishToStream(streamKey, event);
  }

  /**
   * Publish credit allocation event (legacy format for backward compatibility)
   */
  async publishCreditAllocation(tenantId, entityId, amount, metadata = {}) {
    const event = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'credit.allocated',
      tenantId,
      entityId,
      amount,
      timestamp: new Date().toISOString(),
      source: 'wrapper',
      metadata: JSON.stringify({
        allocationId: metadata.allocationId,
        reason: metadata.reason || 'credit_allocation',
        ...metadata
      })
    };

    console.log(`📡 Publishing credit allocation: ${amount} credits to ${entityId}`);
    return await this.publishToStream('credit-events', event);
  }

  /**
   * Publish inter-application event with standardized format
   */
  async publishInterAppEvent(eventType, sourceApp, targetApp, tenantId, entityId, eventData = {}, publishedBy = 'system') {
    const { event, streamKey } = this.createStandardizedEvent(
      eventType,
      'interapp',
      entityId,
      tenantId,
      {
        sourceApplication: sourceApp,
        targetApplication: targetApp,
        eventData: eventData,
        publishedBy: publishedBy
      },
      {
        correlationId: `inter_${sourceApp}_${targetApp}_${Date.now()}`,
        metadata: {
          interAppEvent: true,
          sourceApp,
          targetApp
        }
      }
    );

    console.log(`📡 Publishing inter-app event: ${sourceApp} → ${targetApp} (${eventType})`);
    return await this.publishToStream(streamKey, event);
  }

  /**
   * Publish acknowledgment event
   */
  async publishAcknowledgment(originalEventId, status, acknowledgmentData = {}) {
    const event = {
      acknowledgmentId: `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalEventId,
      status,
      timestamp: new Date().toISOString(),
      source: acknowledgmentData.sourceApplication || 'wrapper',
      acknowledgmentData: JSON.stringify(acknowledgmentData)
    };

    console.log(`📡 Publishing acknowledgment for event ${originalEventId}: ${status}`);
    return await this.publishToStream('acknowledgments', event);
  }

  /**
   * Enhanced publish method with validation and monitoring
   */
  async publishToStream(streamKey, message) {
    if (!this.redis.isConnected) {
      console.warn('⚠️ Enhanced Redis not connected, skipping stream publish');
      return null;
    }

    try {
      // Validate the event format if validator is available
      if (this.validator) {
        const validation = this.validator.validateEvent(message);
        if (!validation.valid) {
          console.error(`❌ Event validation failed before publish:`, validation.errors);
          throw new Error(`Event validation failed: ${JSON.stringify(validation.errors)}`);
        }
      }

      // Convert message to Redis stream format
      const streamData = {};
      Object.entries(message).forEach(([key, value]) => {
        if (typeof value === 'string') {
          streamData[key] = value;
        } else {
          streamData[key] = JSON.stringify(value);
        }
      });

      // Use XADD to add to stream
      const result = await this.redis.client.xAdd(streamKey, '*', streamData);

      console.log(`📡 Published to Enhanced Redis Stream: ${streamKey} (ID: ${result})`);
      console.log(`   Event: ${message.eventType}, Entity: ${message.entityId}`);

      return {
        streamKey,
        messageId: result,
        success: true,
        eventId: message.eventId
      };

    } catch (error) {
      console.error(`❌ Failed to publish to Enhanced Redis Stream ${streamKey}:`, error);
      throw error;
    }
  }

  /**
   * Get stream info for monitoring
   */
  async getStreamInfo(streamKey) {
    if (!this.redis.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.client.xInfoStream(streamKey);
      return info;
    } catch (error) {
      console.error(`❌ Failed to get stream info for ${streamKey}:`, error);
      return null;
    }
  }

  /**
   * Get all configured stream types
   */
  getConfiguredStreams() {
    return Object.keys(this.STREAM_CONFIG);
  }

  /**
   * Get streams by type
   */
  getStreamsByType(streamType) {
    return Object.entries(this.STREAM_CONFIG)
      .filter(([_, config]) => config.type === streamType)
      .map(([eventType, config]) => ({
        eventType,
        streamKey: config.stream,
        type: config.type
      }));
  }
}

// Create enhanced singleton instances
const enhancedRedisManager = new EnhancedRedisManager();
const enhancedCrmSyncStreams = new EnhancedCrmSyncStreams(enhancedRedisManager);

// Export enhanced implementations
export { enhancedRedisManager as redis };
export { enhancedCrmSyncStreams };
export { EnhancedCrmSyncStreams };
export { EnhancedRedisManager };

// Backward compatibility exports
export function getRedis() {
  return enhancedRedisManager;
}

export function publish(channel, message) {
  return enhancedRedisManager.publish(channel, message);
}

export function subscribe(channel) {
  return enhancedRedisManager.subscribe(channel);
}

// Legacy export - uncomment and import if needed for gradual migration
// import { crmSyncStreams } from './redis.js';
// export { crmSyncStreams as legacyCrmSyncStreams };
export default enhancedRedisManager;