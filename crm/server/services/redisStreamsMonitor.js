import { createClient } from 'redis';

/**
 * 📊 Comprehensive Redis Streams Monitoring Service
 * 
 * Provides detailed monitoring of:
 * - Stream health and metrics
 * - Consumer groups and their status
 * - Individual consumers and their activity
 * - Pending messages and their details
 * - Consumer lag and performance metrics
 */
class RedisStreamsMonitor {
  constructor(options = {}) {
    this.options = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      ...options
    };
    
    this.redisClient = null;
    this.isConnected = false;
  }

  /**
   * Initialize the monitor
   */
  async initialize() {
    try {
      this.redisClient = createClient({ url: this.options.redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('❌ Redis monitor error:', err);
        this.isConnected = false;
      });

      await this.redisClient.connect();
      this.isConnected = true;
      console.log('✅ Redis Streams Monitor initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Redis monitor:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive monitoring data for all streams
   */
  async getComprehensiveMonitoring(streamNames = null) {
    if (!this.isConnected) {
      throw new Error('Monitor not connected');
    }

    try {
      // If no streams specified, discover all streams
      if (!streamNames) {
        streamNames = await this.discoverStreams();
      }

      const monitoring = {
        timestamp: new Date().toISOString(),
        summary: {
          totalStreams: streamNames.length,
          totalConsumerGroups: 0,
          totalConsumers: 0,
          totalPendingMessages: 0,
          totalStreamLength: 0
        },
        streams: []
      };

      // Monitor each stream
      for (const streamName of streamNames) {
        try {
          const streamData = await this.getStreamMonitoring(streamName);
          monitoring.streams.push(streamData);
          
          // Update summary
          monitoring.summary.totalConsumerGroups += streamData.consumerGroups.length;
          monitoring.summary.totalConsumers += streamData.totalConsumers;
          monitoring.summary.totalPendingMessages += streamData.totalPendingMessages;
          monitoring.summary.totalStreamLength += streamData.length;
        } catch (error) {
          console.warn(`⚠️ Error monitoring stream ${streamName}:`, error.message);
          monitoring.streams.push({
            name: streamName,
            error: error.message,
            status: 'error'
          });
        }
      }

      return monitoring;
    } catch (error) {
      console.error('❌ Error getting comprehensive monitoring:', error);
      throw error;
    }
  }

  /**
   * Get detailed monitoring for a specific stream
   */
  async getStreamMonitoring(streamName) {
    if (!this.isConnected) {
      throw new Error('Monitor not connected');
    }

    try {
      // Get stream info
      const streamInfo = await this.redisClient.xInfoStream(streamName);
      
      // Get consumer groups
      let consumerGroups = [];
      try {
        const groups = await this.redisClient.xInfoGroups(streamName);
        consumerGroups = await Promise.all(
          groups.map(group => this.getConsumerGroupMonitoring(streamName, group.name))
        );
      } catch (error) {
        // Stream might not have consumer groups yet
        console.log(`ℹ️ No consumer groups for stream ${streamName}`);
      }

      // Calculate totals
      const totalConsumers = consumerGroups.reduce((sum, group) => sum + group.consumers.length, 0);
      const totalPendingMessages = consumerGroups.reduce((sum, group) => sum + group.pendingSummary.total, 0);

      // Get memory usage
      let memoryUsage = null;
      try {
        memoryUsage = await this.redisClient.memoryUsage(streamName);
      } catch (error) {
        // Memory usage might not be available
      }

      return {
        name: streamName,
        status: 'healthy',
        length: streamInfo.length,
        firstEntry: streamInfo['first-entry']?.[0] || null,
        lastEntry: streamInfo['last-entry']?.[0] || null,
        memoryUsage: memoryUsage ? this.formatBytes(memoryUsage) : null,
        consumerGroups: consumerGroups.length,
        consumerGroupsDetails: consumerGroups,
        totalConsumers,
        totalPendingMessages,
        health: this.assessStreamHealth(streamInfo, totalPendingMessages, consumerGroups)
      };
    } catch (error) {
      if (error.message.includes('no such key')) {
        return {
          name: streamName,
          status: 'not_found',
          error: 'Stream does not exist'
        };
      }
      throw error;
    }
  }

  /**
   * Get detailed monitoring for a consumer group
   */
  async getConsumerGroupMonitoring(streamName, groupName) {
    if (!this.isConnected) {
      throw new Error('Monitor not connected');
    }

    try {
      // Get group info
      const groupInfo = await this.redisClient.xInfoGroups(streamName);
      const group = groupInfo.find(g => g.name === groupName);
      
      if (!group) {
        throw new Error(`Consumer group ${groupName} not found`);
      }

      // Get consumers
      let consumers = [];
      try {
        const consumersInfo = await this.redisClient.xInfoConsumers(streamName, groupName);
        consumers = await Promise.all(
          consumersInfo.map(consumer => this.getConsumerMonitoring(streamName, groupName, consumer.name))
        );
      } catch (error) {
        console.warn(`⚠️ Error getting consumers for group ${groupName}:`, error.message);
      }

      // Get pending messages summary
      let pendingSummary = { total: 0, minId: null, maxId: null, consumers: {} };
      try {
        const pending = await this.redisClient.xPending(streamName, groupName);
        pendingSummary = {
          total: pending.pending || 0,
          minId: pending.min || null,
          maxId: pending.max || null,
          consumers: pending.consumers || {}
        };
      } catch (error) {
        // No pending messages or group doesn't exist
      }

      // Get detailed pending messages
      let pendingMessages = [];
      if (pendingSummary.total > 0) {
        try {
          const pendingDetails = await this.redisClient.xPendingRange(
            streamName,
            groupName,
            '-',
            '+',
            Math.min(100, pendingSummary.total) // Limit to 100 for performance
          );
          
          pendingMessages = pendingDetails.map(msg => ({
            messageId: msg.id,
            consumer: msg.consumer || 'unassigned',
            idleTime: msg.idle,
            idleTimeFormatted: this.formatDuration(msg.idle),
            deliveryCount: msg.delivered || 0
          }));
        } catch (error) {
          console.warn(`⚠️ Error getting pending details:`, error.message);
        }
      }

      // Calculate lag (difference between last message and last delivered)
      let lag = null;
      try {
        const streamInfo = await this.redisClient.xInfoStream(streamName);
        const lastMessageId = streamInfo['last-entry']?.[0];
        const lastDeliveredId = group['last-delivered-id'];
        
        if (lastMessageId && lastDeliveredId) {
          lag = this.calculateLag(lastMessageId, lastDeliveredId);
        }
      } catch (error) {
        // Can't calculate lag
      }

      return {
        name: groupName,
        consumers: group.consumers || 0,
        pending: group.pending || 0,
        lastDeliveredId: group['last-delivered-id'] || null,
        consumersDetails: consumers,
        pendingSummary,
        pendingMessages,
        lag,
        health: this.assessConsumerGroupHealth(group, pendingSummary.total, consumers)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed monitoring for a specific consumer
   */
  async getConsumerMonitoring(streamName, groupName, consumerName) {
    if (!this.isConnected) {
      throw new Error('Monitor not connected');
    }

    try {
      const consumersInfo = await this.redisClient.xInfoConsumers(streamName, groupName);
      const consumer = consumersInfo.find(c => c.name === consumerName);
      
      if (!consumer) {
        return {
          name: consumerName,
          status: 'not_found',
          error: 'Consumer not found'
        };
      }

      // Get pending messages for this consumer
      let pendingMessages = [];
      try {
        const pending = await this.redisClient.xPendingRange(
          streamName,
          groupName,
          '-',
          '+',
          100,
          consumerName
        );
        
        pendingMessages = pending.map(msg => ({
          messageId: msg.id,
          idleTime: msg.idle,
          idleTimeFormatted: this.formatDuration(msg.idle),
          deliveryCount: msg.delivered || 0
        }));
      } catch (error) {
        // No pending messages
      }

      return {
        name: consumerName,
        pending: consumer.pending || 0,
        idleTime: consumer.idle || 0,
        idleTimeFormatted: this.formatDuration(consumer.idle || 0),
        pendingMessages,
        health: this.assessConsumerHealth(consumer, pendingMessages)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Discover all streams in Redis
   */
  async discoverStreams() {
    if (!this.isConnected) {
      throw new Error('Monitor not connected');
    }

    try {
      // Use SCAN to find all stream keys
      const streams = [];
      let cursor = 0;
      
      do {
        const result = await this.redisClient.scan(cursor, {
          MATCH: '*',
          COUNT: 100
        });
        
        cursor = result.cursor;
        
        // Check if each key is a stream
        for (const key of result.keys) {
          try {
            const info = await this.redisClient.xInfoStream(key);
            if (info) {
              streams.push(key);
            }
          } catch (error) {
            // Not a stream, skip
          }
        }
      } while (cursor !== 0);

      return streams;
    } catch (error) {
      console.warn('⚠️ Error discovering streams:', error.message);
      // Fallback: return known streams
      return [
        'credit-events',
        'crm:sync:user:user_created',
        'crm:sync:user:user_deactivated',
        'crm:sync:permissions:role_assigned',
        'crm:sync:permissions:role_unassigned',
        'crm:sync:role_permissions',
        'crm:sync:organization:org_created',
        'crm:sync:credits:credit_allocated',
        'crm:sync:credits:credit_config_updated',
        'crm:organization-assignments'
      ];
    }
  }

  /**
   * Assess stream health
   */
  assessStreamHealth(streamInfo, pendingMessages, consumerGroups) {
    const health = {
      status: 'healthy',
      warnings: [],
      critical: []
    };

    // Check stream length
    if (streamInfo.length > 100000) {
      health.status = 'critical';
      health.critical.push('Stream length exceeds 100,000 messages');
    } else if (streamInfo.length > 50000) {
      health.status = 'warning';
      health.warnings.push('Stream length exceeds 50,000 messages');
    }

    // Check pending messages
    if (pendingMessages > 10000) {
      health.status = 'critical';
      health.critical.push(`High pending messages: ${pendingMessages}`);
    } else if (pendingMessages > 1000) {
      health.status = health.status === 'critical' ? 'critical' : 'warning';
      health.warnings.push(`Elevated pending messages: ${pendingMessages}`);
    }

    // Check consumer groups
    if (consumerGroups.length === 0) {
      health.warnings.push('No consumer groups configured');
    }

    return health;
  }

  /**
   * Assess consumer group health
   */
  assessConsumerGroupHealth(group, pendingMessages, consumers) {
    const health = {
      status: 'healthy',
      warnings: [],
      critical: []
    };

    // Check pending messages
    if (pendingMessages > 5000) {
      health.status = 'critical';
      health.critical.push(`High pending messages: ${pendingMessages}`);
    } else if (pendingMessages > 500) {
      health.status = health.status === 'critical' ? 'critical' : 'warning';
      health.warnings.push(`Elevated pending messages: ${pendingMessages}`);
    }

    // Check consumers
    if (consumers.length === 0) {
      health.status = 'critical';
      health.critical.push('No active consumers');
    }

    // Check for idle consumers
    const idleConsumers = consumers.filter(c => c.idleTime > 2 * 60 * 60 * 1000); // 2 hours
    if (idleConsumers.length > 0) {
      health.warnings.push(`${idleConsumers.length} idle consumer(s)`);
    }

    return health;
  }

  /**
   * Assess consumer health
   */
  assessConsumerHealth(consumer, pendingMessages) {
    const health = {
      status: 'healthy',
      warnings: [],
      critical: []
    };

    // Check pending messages
    if (consumer.pending > 1000) {
      health.status = 'critical';
      health.critical.push(`High pending messages: ${consumer.pending}`);
    } else if (consumer.pending > 100) {
      health.status = health.status === 'critical' ? 'critical' : 'warning';
      health.warnings.push(`Elevated pending messages: ${consumer.pending}`);
    }

    // Check idle time
    if (consumer.idle > 2 * 60 * 60 * 1000) { // 2 hours
      health.status = 'critical';
      health.critical.push('Consumer idle for more than 2 hours');
    } else if (consumer.idle > 30 * 60 * 1000) { // 30 minutes
      health.warnings.push('Consumer idle for more than 30 minutes');
    }

    return health;
  }

  /**
   * Calculate lag between two message IDs
   */
  calculateLag(lastMessageId, lastDeliveredId) {
    try {
      const [lastTimestamp] = lastMessageId.split('-');
      const [deliveredTimestamp] = lastDeliveredId.split('-');
      
      const lag = parseInt(lastTimestamp) - parseInt(deliveredTimestamp);
      return {
        messages: null, // Can't calculate exact message count without reading stream
        timeMs: lag,
        timeFormatted: this.formatDuration(lag)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
   * Generate monitoring report (formatted for console/logging)
   */
  async generateReport(streamNames = null) {
    const monitoring = await this.getComprehensiveMonitoring(streamNames);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 REDIS STREAMS MONITORING REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${monitoring.timestamp}\n`);

    console.log('📈 SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total Streams: ${monitoring.summary.totalStreams}`);
    console.log(`Total Consumer Groups: ${monitoring.summary.totalConsumerGroups}`);
    console.log(`Total Consumers: ${monitoring.summary.totalConsumers}`);
    console.log(`Total Pending Messages: ${monitoring.summary.totalPendingMessages}`);
    console.log(`Total Stream Length: ${monitoring.summary.totalStreamLength}\n`);

    // Per-stream details
    for (const stream of monitoring.streams) {
      if (stream.status === 'error' || stream.status === 'not_found') {
        console.log(`\n❌ STREAM: ${stream.name} - ${stream.status.toUpperCase()}`);
        if (stream.error) console.log(`   Error: ${stream.error}`);
        continue;
      }

      console.log(`\n📨 STREAM: ${stream.name}`);
      console.log('-'.repeat(80));
      console.log(`   Length: ${stream.length}`);
      console.log(`   Memory Usage: ${stream.memoryUsage || 'N/A'}`);
      console.log(`   Consumer Groups: ${stream.consumerGroups}`);
      console.log(`   Total Consumers: ${stream.totalConsumers}`);
      console.log(`   Total Pending: ${stream.totalPendingMessages}`);
      console.log(`   Health: ${stream.health.status.toUpperCase()}`);
      
      if (stream.health.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${stream.health.warnings.join(', ')}`);
      }
      if (stream.health.critical.length > 0) {
        console.log(`   🚨 Critical: ${stream.health.critical.join(', ')}`);
      }

      // Consumer groups
      for (const group of stream.consumerGroupsDetails) {
        console.log(`\n   👥 CONSUMER GROUP: ${group.name}`);
        console.log(`      Consumers: ${group.consumers}`);
        console.log(`      Pending: ${group.pending}`);
        console.log(`      Last Delivered: ${group.lastDeliveredId || 'N/A'}`);
        if (group.lag) {
          console.log(`      Lag: ${group.lag.timeFormatted}`);
        }
        console.log(`      Health: ${group.health.status.toUpperCase()}`);

        // Consumers
        for (const consumer of group.consumersDetails) {
          console.log(`\n      👤 CONSUMER: ${consumer.name}`);
          console.log(`         Pending: ${consumer.pending}`);
          console.log(`         Idle Time: ${consumer.idleTimeFormatted}`);
          console.log(`         Health: ${consumer.health.status.toUpperCase()}`);
          
          if (consumer.pendingMessages.length > 0) {
            console.log(`         Pending Messages (showing first 5):`);
            consumer.pendingMessages.slice(0, 5).forEach(msg => {
              console.log(`            - ${msg.messageId} (idle: ${msg.idleTimeFormatted}, deliveries: ${msg.deliveryCount})`);
            });
          }
        }

        // Pending messages summary
        if (group.pendingMessages.length > 0) {
          console.log(`\n      📋 PENDING MESSAGES (showing first 10):`);
          group.pendingMessages.slice(0, 10).forEach(msg => {
            console.log(`         - ${msg.messageId} (consumer: ${msg.consumer}, idle: ${msg.idleTimeFormatted})`);
          });
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    return monitoring;
  }

  /**
   * Disconnect
   */
  async disconnect() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
      this.isConnected = false;
    }
  }
}

export default RedisStreamsMonitor;

