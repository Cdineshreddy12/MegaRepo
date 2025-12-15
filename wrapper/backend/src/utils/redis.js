import Redis from 'redis';

class RedisManager {
  constructor() {
    this.client = null;
    this.subscribers = new Map();
    this.isConnected = false;
  }

  async connect() {
    // Return early if already connected
    if (this.isConnected && this.client) {
      console.log('✅ Redis already connected, skipping connection');
      return;
    }

    // If client exists but not connected, try to reconnect
    if (this.client && !this.isConnected) {
      try {
        console.log('🔄 Attempting to reconnect existing Redis client');
        await this.client.connect();
        return;
      } catch (error) {
        console.warn('Failed to reconnect existing Redis client, creating new one:', error.message);
        // Reset client and fall through to create new client
        this.client = null;
      }
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      console.log('🔗 Connecting to Redis:', process.env.REDIS_URL ? 'Cloud Redis' : 'localhost:6379');

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
          // Exponential backoff
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (error) => {
        console.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('❌ Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      console.log('✅ Redis connection established successfully');

    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.client = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('✅ Redis client disconnected gracefully');
      } catch (error) {
        console.warn('Error during Redis disconnect:', error.message);
        // Force disconnect if quit fails
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

  /**
   * Publish message to channel
   */
  async publish(channel, message) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.publish(channel, message);
      console.log(`📡 Published to ${channel}: ${message.length} characters`);
    } catch (error) {
      console.error(`❌ Failed to publish to ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.subscribe(channel);
      console.log(`📡 Subscribed to ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple channels
   */
  async subscribeMultiple(channels) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.subscribe(channels);
      console.log(`📡 Subscribed to ${channels.length} channels: ${channels.join(', ')}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to channels:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel) {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Redis client not connected, skipping unsubscribe');
      return;
    }

    try {
      await this.client.unsubscribe(channel);
      console.log(`📡 Unsubscribed from ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${channel}:`, error);
    }
  }

  /**
   * Set key-value pair
   */
  async set(key, value, ttl = null) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      console.log(`💾 Redis SET: ${key} (${serializedValue.length} bytes)`);
    } catch (error) {
      console.error(`❌ Failed to set Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get(key) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const value = await this.client.get(key);

      if (value) {
        const parsedValue = JSON.parse(value);
        console.log(`💾 Redis GET: ${key} (${value.length} bytes)`);
        return parsedValue;
      }

      console.log(`💾 Redis GET: ${key} (not found)`);
      return null;

    } catch (error) {
      console.error(`❌ Failed to get Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key
   */
  async delete(key) {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Redis client not connected, skipping delete');
      return;
    }

    try {
      const result = await this.client.del(key);
      console.log(`💾 Redis DEL: ${key} (deleted: ${result})`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to delete Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Failed to check Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern = '*') {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const keys = await this.client.keys(pattern);
      console.log(`💾 Redis KEYS: ${pattern} (found: ${keys.length})`);
      return keys;
    } catch (error) {
      console.error(`❌ Failed to get Redis keys ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Set up message handler
   */
  onMessage(callback) {
    if (!this.client) {
      console.warn('⚠️ Redis client not initialized');
      return;
    }

    this.client.on('message', callback);
    console.log('📡 Message handler registered');
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.client) {
      return {
        status: 'disconnected',
        message: 'Redis client not initialized'
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

  /**
   * Get connection status
   */
  isConnected() {
    return this.isConnected;
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Helper functions for backward compatibility
export function getRedis() {
  return redisManager;
}

export function publish(channel, message) {
  return redisManager.publish(channel, message);
}

export function subscribe(channel) {
  return redisManager.subscribe(channel);
}

/**
 * Usage Cache Class for tracking API usage and active users
 */
class UsageCache {
  constructor() {
    this.redis = redisManager;
  }

  /**
   * Increment API calls counter for a tenant and app
   */
  async incrementApiCalls(tenantId, app) {
    if (!this.redis.isConnected) {
      console.warn('⚠️ Redis not connected, skipping API call tracking');
      return;
    }

    try {
      const key = `api_calls:${tenantId}:${app}:${this.getCurrentHourKey()}`;
      await this.redis.client.incr(key);

      // Set expiry for 24 hours
      await this.redis.client.expire(key, 24 * 60 * 60);

      console.log(`📊 API call tracked: ${tenantId}:${app}`);
    } catch (error) {
      console.error('❌ Failed to increment API calls:', error);
    }
  }

  /**
   * Track active user for a tenant
   */
  async trackActiveUser(tenantId, userId) {
    if (!this.redis.isConnected) {
      console.warn('⚠️ Redis not connected, skipping active user tracking');
      return;
    }

    try {
      const key = `active_users:${tenantId}`;

      // Add user to active users set
      await this.redis.client.sAdd(key, userId);

      // Set expiry for 1 hour
      await this.redis.client.expire(key, 60 * 60);

      console.log(`👤 Active user tracked: ${tenantId}:${userId}`);
    } catch (error) {
      console.error('❌ Failed to track active user:', error);
    }
  }

  /**
   * Get API calls count for a tenant and app in the current hour
   */
  async getApiCallsCount(tenantId, app) {
    if (!this.redis.isConnected) {
      return 0;
    }

    try {
      const key = `api_calls:${tenantId}:${app}:${this.getCurrentHourKey()}`;
      const count = await this.redis.client.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      console.error('❌ Failed to get API calls count:', error);
      return 0;
    }
  }

  /**
   * Get active users count for a tenant
   */
  async getActiveUsersCount(tenantId) {
    if (!this.redis.isConnected) {
      return 0;
    }

    try {
      const key = `active_users:${tenantId}`;
      const count = await this.redis.client.sCard(key);
      return count;
    } catch (error) {
      console.error('❌ Failed to get active users count:', error);
      return 0;
    }
  }

  /**
   * Get current hour key for time-based tracking
   */
  getCurrentHourKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  }

  /**
   * Clean up old tracking data
   */
  async cleanupOldData() {
    if (!this.redis.isConnected) {
      return;
    }

    try {
      // Get all API call keys older than 24 hours
      const apiKeys = await this.redis.client.keys('api_calls:*:*');

      // Get all active user keys older than 1 hour
      const userKeys = await this.redis.client.keys('active_users:*');

      // Clean up old keys
      for (const key of [...apiKeys, ...userKeys]) {
        const ttl = await this.redis.client.ttl(key);
        if (ttl < 0) {
          await this.redis.client.del(key);
        }
      }

      console.log('🧹 Cleaned up old usage tracking data');
    } catch (error) {
      console.error('❌ Failed to cleanup usage data:', error);
    }
  }
}

// Create singleton instance
const usageCache = new UsageCache();

/**
 * CRM Sync Streams Class - Handles Redis Streams for CRM synchronization
 */
class CrmSyncStreams {
  constructor() {
    this.redis = redisManager;
    this.streamPrefix = 'crm:sync';
  }

  /**
   * Publish user lifecycle event
   * According to CRM requirements, the data field must be a JSON string
   */
  async publishUserEvent(tenantId, eventType, userData, metadata = {}) {
    const streamKey = `${this.streamPrefix}:user:${eventType}`;

    // Prepare data according to CRM requirements
    // The data field should be a JSON string, not an object
    const eventData = {
      userId: userData.userId,
      email: userData.email,
      ...(userData.firstName && { firstName: userData.firstName }),
      ...(userData.lastName && { lastName: userData.lastName }),
      ...(userData.name && { name: userData.name }),
      ...(userData.isActive !== undefined && { isActive: userData.isActive }),
      ...(userData.createdAt && { createdAt: typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toISOString() }),
      // For deactivation events
      ...(userData.deactivatedAt && { deactivatedAt: typeof userData.deactivatedAt === 'string' ? userData.deactivatedAt : userData.deactivatedAt.toISOString() }),
      ...(userData.deactivatedBy && { deactivatedBy: userData.deactivatedBy }),
      // For deletion events
      ...(userData.deletedAt && { deletedAt: typeof userData.deletedAt === 'string' ? userData.deletedAt : userData.deletedAt.toISOString() }),
      ...(userData.deletedBy && { deletedBy: userData.deletedBy }),
      ...(userData.reason && { reason: userData.reason })
    };

    const message = {
      streamId: streamKey,
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sourceApp: 'wrapper-api',
      eventType,
      entityType: 'user',
      entityId: userData.userId,
      tenantId,
      action: eventType.replace('user_', ''),
      data: JSON.stringify(eventData), // Data must be a JSON string per CRM requirements
      metadata: JSON.stringify({
        correlationId: `user_${userData.userId}_${Date.now()}`,
        version: '1.0',
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        ...metadata
      })
    };

    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish role/permission event
   * According to CRM requirements, the data field must be a JSON string
   */
  async publishRoleEvent(tenantId, eventType, roleData, metadata = {}) {
    const streamKey = `${this.streamPrefix}:permissions:${eventType}`;

    const message = {
      streamId: streamKey,
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sourceApp: 'wrapper-api',
      eventType,
      entityType: 'role_assignment',
      entityId: roleData.assignmentId || roleData.roleId,
      tenantId,
      action: eventType.replace('role_', ''),
      data: JSON.stringify(roleData), // Data must be a JSON string per CRM requirements
      metadata: JSON.stringify({
        correlationId: `role_${roleData.userId || roleData.roleId}_${Date.now()}`,
        version: '1.0',
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        ...metadata
      })
    };

    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish organization event
   */
  async publishOrgEvent(tenantId, eventType, orgData, metadata = {}) {
    const streamKey = `${this.streamPrefix}:organization:${eventType}`;

    const message = {
      streamId: streamKey,
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sourceApp: 'wrapper',
      eventType,
      entityType: 'organization',
      entityId: orgData.orgCode || orgData.organizationId,
      tenantId,
      action: eventType.replace('org_', '').replace('employee_', ''),
      data: orgData,
      metadata: {
        correlationId: `org_${orgData.orgCode || orgData.organizationId}_${Date.now()}`,
        version: '1.0',
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        ...metadata
      }
    };

    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish credit/billing event
   */
  async publishCreditEvent(tenantId, eventType, creditData, metadata = {}) {
    const streamKey = `${this.streamPrefix}:credits:${eventType}`;

    const message = {
      streamId: streamKey,
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sourceApp: 'wrapper',
      eventType,
      entityType: 'credit',
      entityId: creditData.allocationId || creditData.configId || `credit_${Date.now()}`,
      tenantId,
      action: eventType.replace('credit_', ''),
      data: creditData,
      metadata: {
        correlationId: `credit_${creditData.entityId || 'system'}_${Date.now()}`,
        version: '1.0',
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        ...metadata
      }
    };

    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish credit allocation event (for CRM sync)
   */
  async publishCreditAllocation(tenantId, entityId, amount, metadata = {}) {
    const streamKey = 'credit-events';

    const message = {
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
    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish credit consumption event (from CRM)
   */
  async publishCreditConsumption(tenantId, entityId, userId, amount, operationType, operationId, metadata = {}) {
    const streamKey = 'credit-events';

    const message = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'credit.consumed',
      tenantId,
      entityId,
      userId,
      amount,
      operationType,
      operationId,
      timestamp: new Date().toISOString(),
      source: 'crm',
      metadata: JSON.stringify({
        resourceType: metadata.resourceType,
        resourceId: metadata.resourceId,
        ...metadata
      })
    };

    console.log(`📡 Publishing credit consumption: ${amount} credits by ${userId} for ${operationType}`);
    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish acknowledgment for processed event
   */
  async publishAcknowledgment(originalEventId, status, acknowledgmentData = {}) {
    const streamKey = 'acknowledgments';

    const message = {
      acknowledgmentId: `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalEventId,
      status, // 'processed', 'failed', 'timeout'
      timestamp: new Date().toISOString(),
      source: acknowledgmentData.sourceApplication || 'crm', // Dynamic source
      acknowledgmentData: JSON.stringify(acknowledgmentData)
    };

    console.log(`📡 Publishing acknowledgment for event ${originalEventId}: ${status}`);
    return await this.publishToStream(streamKey, message);
  }

  /**
   * Publish inter-application event (any app to any app)
   */
  async publishInterAppEvent(eventType, sourceApp, targetApp, tenantId, entityId, eventData = {}, publishedBy = 'system') {
    const streamKey = 'inter-app-events';

    const message = {
      eventId: `inter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      sourceApplication: sourceApp,
      targetApplication: targetApp,
      tenantId,
      entityId,
      timestamp: new Date().toISOString(),
      eventData: JSON.stringify(eventData),
      publishedBy
    };

    console.log(`📡 Publishing inter-app event: ${sourceApp} → ${targetApp} (${eventType})`);
    return await this.publishToStream(streamKey, message);
  }

  /**
   * Generic publish method to Redis Stream
   */
  async publishToStream(streamKey, message) {
    if (!this.redis.isConnected) {
      console.warn('⚠️ Redis not connected, skipping stream publish');
      return null;
    }

    try {
      // Convert message to Redis stream format
      // If data/metadata are already JSON strings (per CRM requirements), don't double-stringify
      const streamData = {};
      Object.entries(message).forEach(([key, value]) => {
        // If value is already a string (like data and metadata fields), use it as-is
        // Otherwise, stringify it
        if (typeof value === 'string') {
          streamData[key] = value;
        } else {
          streamData[key] = JSON.stringify(value);
        }
      });

      // Use XADD to add to stream
      const result = await this.redis.client.xAdd(streamKey, '*', streamData);

      console.log(`📡 Published to Redis Stream: ${streamKey} (ID: ${result})`);
      console.log(`   Event: ${message.eventType}, Entity: ${message.entityId}`);

      return {
        streamKey,
        messageId: result,
        success: true
      };

    } catch (error) {
      console.error(`❌ Failed to publish to Redis Stream ${streamKey}:`, error);
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
   * Trim old stream entries
   */
  async trimStream(streamKey, maxLength = 10000) {
    if (!this.redis.isConnected) {
      return;
    }

    try {
      await this.redis.client.xTrim(streamKey, 'MAXLEN', '~', maxLength);
      console.log(`🧹 Trimmed stream ${streamKey} to ${maxLength} entries`);
    } catch (error) {
      console.error(`❌ Failed to trim stream ${streamKey}:`, error);
    }
  }
}

// Create singleton instance
const crmSyncStreams = new CrmSyncStreams();

// Export the CRM sync streams instance
export { crmSyncStreams };
export { CrmSyncStreams };

// Export both the manager and the cache
export { redisManager as redis };
export { usageCache };
export { UsageCache };
export default redisManager;