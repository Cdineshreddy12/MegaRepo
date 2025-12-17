import EventValidator from './eventValidator.js';

/**
 * Centralized Consumer Group Manager
 * 
 * Manages Redis stream consumer groups with standardized naming and lifecycle management.
 * Handles creation, cleanup, and monitoring of consumer groups across streams and tenants.
 */
class ConsumerGroupManager {
  constructor(redisClient, options = {}) {
    this.redisClient = redisClient;
    this.validator = new EventValidator();
    this.options = {
      defaultStartId: '0',
      createStreamIfNotExists: true,
      maxReconnectAttempts: 3,
      cleanupIdleConsumers: true,
      idleConsumerThreshold: 2 * 60 * 60 * 1000, // 2 hours
      ...options
    };

    // Stream configuration mapping
    this.STREAM_CONFIG = {
      'crm:sync:user:user_created': { type: 'user-events', consumerGroup: 'crm-consumers' },
      'crm:sync:user:user_deactivated': { type: 'user-events', consumerGroup: 'crm-consumers' },
      'crm:sync:user:user_deleted': { type: 'user-events', consumerGroup: 'crm-consumers' },
      'crm:sync:role:role_created': { type: 'role-events', consumerGroup: 'crm-consumers' },
      'crm:sync:role:role_updated': { type: 'role-events', consumerGroup: 'crm-consumers' },
      'crm:sync:role:role_deleted': { type: 'role-events', consumerGroup: 'crm-consumers' },
      'crm:sync:role:role_permissions_changed': { type: 'role-events', consumerGroup: 'crm-consumers' },
      'crm:sync:permissions:role_assigned': { type: 'permission-events', consumerGroup: 'crm-consumers' },
      'crm:sync:permissions:role_unassigned': { type: 'permission-events', consumerGroup: 'crm-consumers' },
      'crm:sync:organization:org_created': { type: 'org-events', consumerGroup: 'crm-consumers' },
      'crm:sync:credits:credit_allocated': { type: 'credit-events', consumerGroup: 'crm-consumers' },
      'crm:sync:credits:credit_config_updated': { type: 'credit-events', consumerGroup: 'crm-consumers' },
      'credit-events': { type: 'credit-events', consumerGroup: 'crm-consumers' },
      'crm:organization-assignments': { type: 'assignment-events', consumerGroup: 'crm-consumers' },
      'inter-app-events': { type: 'interapp-events', consumerGroup: 'wrapper-consumers' },
      'acknowledgments': { type: 'acknowledgment-events', consumerGroup: 'wrapper-consumers' }
    };
  }

  /**
   * Create consumer groups for multiple streams
   * @param {Array} streams - Array of stream keys
   * @param {string} tenantId - Tenant identifier
   * @returns {Object} - Creation results
   */
  async createConsumerGroups(streams, tenantId) {
    const results = {
      created: [],
      existing: [],
      failed: [],
      summary: {
        total: streams.length,
        created: 0,
        existing: 0,
        failed: 0
      }
    };

    for (const stream of streams) {
      try {
        const result = await this.createConsumerGroup(stream, tenantId);
        results[result.status].push(result);
        results.summary[result.status]++;
      } catch (error) {
        const errorResult = {
          stream,
          tenantId,
          status: 'failed',
          error: error.message
        };
        results.failed.push(errorResult);
        results.summary.failed++;
        console.error(`❌ Failed to create consumer group for ${stream}:`, error);
      }
    }

    console.log(`✅ Consumer group creation complete: ${results.summary.created} created, ${results.summary.existing} existing, ${results.summary.failed} failed`);
    return results;
  }

  /**
   * Create a single consumer group for a stream
   * @param {string} streamKey - Redis stream key
   * @param {string} tenantId - Tenant identifier
   * @returns {Object} - Creation result
   */
  async createConsumerGroup(streamKey, tenantId) {
    const config = this.getStreamConfig(streamKey);
    const consumerGroupName = this.generateConsumerGroupName(streamKey, tenantId);
    
    try {
      await this.redisClient.xGroupCreate(
        streamKey,
        consumerGroupName,
        this.options.defaultStartId,
        { 
          MKSTREAM: this.options.createStreamIfNotExists 
        }
      );

      const result = {
        stream: streamKey,
        tenantId,
        consumerGroup: consumerGroupName,
        status: 'created',
        streamType: config.type,
        createdAt: new Date().toISOString()
      };

      console.log(`✅ Created consumer group: ${consumerGroupName} for stream: ${streamKey}`);
      return result;

    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        // Consumer group already exists
        const result = {
          stream: streamKey,
          tenantId,
          consumerGroup: consumerGroupName,
          status: 'existing',
          streamType: config.type,
          message: 'Consumer group already exists'
        };
        console.log(`ℹ️ Consumer group already exists: ${consumerGroupName} for stream: ${streamKey}`);
        return result;
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate standardized consumer group name
   * Format: {baseConsumerGroup}:{streamType}:{tenantId}
   */
  generateConsumerGroupName(streamKey, tenantId) {
    const config = this.getStreamConfig(streamKey);
    const streamType = config.type;
    const baseGroup = config.consumerGroup;
    return `${baseGroup}:${streamType}:${tenantId}`;
  }

  /**
   * Generate standardized consumer name
   * Format: {app}-{streamType}-{tenantId}-{instanceId}
   */
  generateConsumerName(streamKey, tenantId, instanceId = '001') {
    const config = this.getStreamConfig(streamKey);
    const streamType = config.type;
    return `crm-${streamType}-${tenantId}-${instanceId}`;
  }

  /**
   * Get stream configuration
   */
  getStreamConfig(streamKey) {
    // Direct match
    if (this.STREAM_CONFIG[streamKey]) {
      return this.STREAM_CONFIG[streamKey];
    }

    // Pattern matching for dynamic stream keys
    for (const [pattern, config] of Object.entries(this.STREAM_CONFIG)) {
      if (streamKey.includes(pattern.replace('*', ''))) {
        return config;
      }
    }

    // Default fallback
    return {
      type: 'unknown-events',
      consumerGroup: 'crm-consumers'
    };
  }

  /**
   * Get all consumer groups for a stream
   */
  async getConsumerGroups(streamKey) {
    try {
      const groups = await this.redisClient.xInfoGroups(streamKey);
      return groups.map(group => ({
        name: group.name,
        consumers: group.consumers || 0,
        pending: group.pending || 0,
        lastDeliveredId: group['last-delivered-id']
      }));
    } catch (error) {
      console.warn(`⚠️ Could not get consumer groups for stream ${streamKey}:`, error.message);
      return [];
    }
  }

  /**
   * Get all consumers for a specific consumer group
   */
  async getConsumers(streamKey, consumerGroupName) {
    try {
      const consumers = await this.redisClient.xInfoConsumers(streamKey, consumerGroupName);
      return consumers.map(consumer => ({
        name: consumer.name,
        pending: consumer.pending || 0,
        idle: consumer.idle || 0,
        idleFormatted: this.formatDuration(consumer.idle || 0)
      }));
    } catch (error) {
      console.warn(`⚠️ Could not get consumers for group ${consumerGroupName}:`, error.message);
      return [];
    }
  }

  /**
   * Clean up idle consumers
   */
  async cleanupIdleConsumers(streamKey, consumerGroupName) {
    if (!this.options.cleanupIdleConsumers) {
      return { cleaned: 0, message: 'Cleanup disabled' };
    }

    try {
      const consumers = await this.getConsumers(streamKey, consumerGroupName);
      const idleThreshold = this.options.idleConsumerThreshold;
      const cleaned = [];

      for (const consumer of consumers) {
        if (consumer.idle > idleThreshold) {
          try {
            await this.redisClient.xGroupDelConsumer(streamKey, consumerGroupName, consumer.name);
            cleaned.push(consumer.name);
            console.log(`🧹 Cleaned up idle consumer: ${consumer.name} (idle: ${consumer.idleFormatted})`);
          } catch (error) {
            console.error(`❌ Failed to cleanup consumer ${consumer.name}:`, error.message);
          }
        }
      }

      return {
        cleaned: cleaned.length,
        cleanedConsumers: cleaned,
        threshold: `${Math.round(idleThreshold / 1000 / 60)} minutes`
      };

    } catch (error) {
      console.error(`❌ Error during consumer cleanup:`, error.message);
      return { cleaned: 0, error: error.message };
    }
  }

  /**
   * Get pending messages summary for a consumer group
   */
  async getPendingSummary(streamKey, consumerGroupName) {
    try {
      const pending = await this.redisClient.xPending(streamKey, consumerGroupName);
      return {
        total: pending.pending || 0,
        minId: pending.min || null,
        maxId: pending.max || null,
        consumers: pending.consumers || {}
      };
    } catch (error) {
      console.warn(`⚠️ Could not get pending summary for ${consumerGroupName}:`, error.message);
      return {
        total: 0,
        minId: null,
        maxId: null,
        consumers: {}
      };
    }
  }

  /**
   * Destroy consumer group
   */
  async destroyConsumerGroup(streamKey, consumerGroupName) {
    try {
      await this.redisClient.xGroupDestroy(streamKey, consumerGroupName);
      console.log(`🗑️ Destroyed consumer group: ${consumerGroupName}`);
      return { success: true, consumerGroup: consumerGroupName };
    } catch (error) {
      console.error(`❌ Failed to destroy consumer group ${consumerGroupName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive stream and consumer group information
   */
  async getStreamInfo(streamKey, tenantId) {
    const consumerGroupName = this.generateConsumerGroupName(streamKey, tenantId);
    const config = this.getStreamConfig(streamKey);

    try {
      // Get stream info
      const streamInfo = await this.redisClient.xInfoStream(streamKey);
      
      // Get consumer groups
      const consumerGroups = await this.getConsumerGroups(streamKey);
      
      // Get specific consumer group details
      const targetGroup = consumerGroups.find(g => g.name === consumerGroupName);
      const consumers = targetGroup ? await this.getConsumers(streamKey, consumerGroupName) : [];
      const pendingSummary = targetGroup ? await this.getPendingSummary(streamKey, consumerGroupName) : null;

      return {
        stream: {
          key: streamKey,
          length: streamInfo.length || 0,
          firstEntry: streamInfo['first-entry']?.[0] || null,
          lastEntry: streamInfo['last-entry']?.[0] || null,
          radixTreeKeys: streamInfo['radix-tree-keys'] || 0,
          radixTreeNodes: streamInfo['radix-tree-nodes'] || 0
        },
        consumerGroup: {
          name: consumerGroupName,
          streamType: config.type,
          exists: !!targetGroup,
          consumers: targetGroup?.consumers || 0,
          pending: targetGroup?.pending || 0,
          lastDeliveredId: targetGroup?.lastDeliveredId || null
        },
        consumers,
        pendingSummary,
        allConsumerGroups: consumerGroups,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error.message.includes('no such key')) {
        return {
          stream: { key: streamKey, exists: false },
          consumerGroup: { name: consumerGroupName, exists: false },
          error: 'Stream does not exist'
        };
      }
      throw error;
    }
  }

  /**
   * Format duration in milliseconds to human-readable format
   */
  formatDuration(ms) {
    if (!ms) return '0ms';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get all configured streams
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
      .map(([streamKey, _]) => streamKey);
  }

  /**
   * Health check for consumer groups
   */
  async healthCheck(tenantId) {
    const streams = this.getConfiguredStreams();
    const health = {
      timestamp: new Date().toISOString(),
      tenantId,
      summary: {
        totalStreams: streams.length,
        healthyGroups: 0,
        unhealthyGroups: 0,
        totalPending: 0
      },
      streams: []
    };

    for (const streamKey of streams) {
      try {
        const streamInfo = await this.getStreamInfo(streamKey, tenantId);
        const consumerGroupName = this.generateConsumerGroupName(streamKey, tenantId);
        
        const streamHealth = {
          stream: streamKey,
          consumerGroup: consumerGroupName,
          healthy: streamInfo.consumerGroup?.exists || false,
          pendingMessages: streamInfo.pendingSummary?.total || 0,
          consumers: streamInfo.consumers?.length || 0
        };

        if (streamHealth.healthy) {
          health.summary.healthyGroups++;
        } else {
          health.summary.unhealthyGroups++;
        }

        health.summary.totalPending += streamHealth.pendingMessages;
        health.streams.push(streamHealth);

      } catch (error) {
        health.streams.push({
          stream: streamKey,
          error: error.message,
          healthy: false
        });
        health.summary.unhealthyGroups++;
      }
    }

    return health;
  }
}

export default ConsumerGroupManager;