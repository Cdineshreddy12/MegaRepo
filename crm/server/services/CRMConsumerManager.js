import SimplifiedCRMConsumer from './CRMConsumer.js';

/**
 * Multi-Tenant CRM Consumer Manager
 * Manages multiple CRM consumers for different tenants
 */
class CRMConsumerManager {
  constructor(options = {}) {
    this.options = {
      maxConsumers: 100,
      consumerTimeout: 30000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...options
    };

    this.consumers = new Map(); // tenantId → CRMConsumer
    this.cleanupTimer = null;
    this.isShuttingDown = false;

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get or create consumer for tenant
   */
  async getConsumer(tenantId) {
    if (this.isShuttingDown) {
      throw new Error('Consumer manager is shutting down');
    }

    // Return existing consumer (simplified - no connection checks needed)
    if (this.consumers.has(tenantId)) {
      const consumer = this.consumers.get(tenantId);
      // For simplified consumer, no connection check needed
      return consumer;
    }

    // Create new consumer
    if (this.consumers.size >= this.options.maxConsumers) {
      throw new Error(`Maximum number of consumers (${this.options.maxConsumers}) reached`);
    }

    try {
      const consumer = new SimplifiedCRMConsumer(tenantId, this.options);
      await consumer.initialize();
      
      this.consumers.set(tenantId, consumer);
      console.log(`✅ Created new consumer for tenant: ${tenantId}`);
      
      return consumer;
    } catch (error) {
      console.error(`❌ Failed to create consumer for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Remove consumer for tenant
   */
  async removeConsumer(tenantId) {
    const consumer = this.consumers.get(tenantId);
    if (consumer) {
      try {
        await consumer.shutdown();
        this.consumers.delete(tenantId);
        console.log(`🗑️ Removed consumer for tenant: ${tenantId}`);
      } catch (error) {
        console.error(`❌ Error removing consumer for tenant ${tenantId}:`, error);
      }
    }
  }

  /**
   * Get all active consumers
   */
  getActiveConsumers() {
    return Array.from(this.consumers.entries()).map(([tenantId, consumer]) => ({
      tenantId,
      isConnected: consumer.isConnected,
      metrics: consumer.getMetrics()
    }));
  }

  /**
   * Get consumer metrics
   */
  getMetrics() {
    const consumers = Array.from(this.consumers.values());
    const totalMetrics = consumers.reduce((acc, consumer) => {
      const metrics = consumer.getMetrics();
      acc.criticalHits += metrics.performance.criticalHitRate * metrics.performance.totalRequests;
      acc.operationalHits += metrics.performance.operationalHitRate * metrics.performance.totalRequests;
      acc.totalRequests += metrics.performance.totalRequests || 0;
      acc.apiCalls += metrics.performance.apiCalls;
      acc.errors += metrics.performance.errors;
      return acc;
    }, {
      criticalHits: 0,
      operationalHits: 0,
      totalRequests: 0,
      apiCalls: 0,
      errors: 0
    });

    return {
      totalConsumers: this.consumers.size,
      activeConsumers: consumers.filter(c => c.isConnected).length,
      performance: {
        criticalHitRate: totalMetrics.totalRequests > 0 ? totalMetrics.criticalHits / totalMetrics.totalRequests : 0,
        operationalHitRate: totalMetrics.totalRequests > 0 ? totalMetrics.operationalHits / totalMetrics.totalRequests : 0,
        overallHitRate: totalMetrics.totalRequests > 0 ? (totalMetrics.criticalHits + totalMetrics.operationalHits) / totalMetrics.totalRequests : 0,
        totalApiCalls: totalMetrics.apiCalls,
        totalErrors: totalMetrics.errors
      },
      memory: this.calculateMemoryUsage()
    };
  }

  /**
   * Calculate memory usage
   */
  calculateMemoryUsage() {
    const consumers = Array.from(this.consumers.values());
    const totalMemory = consumers.reduce((acc, consumer) => {
      const cacheSizes = consumer.getCacheSizes();
      return acc + this.estimateMemoryUsage(cacheSizes);
    }, 0);

    return {
      totalMemory: `${(totalMemory / 1024).toFixed(2)} KB`,
      averagePerTenant: `${(totalMemory / consumers.length / 1024).toFixed(2)} KB`,
      consumers: consumers.length
    };
  }

  /**
   * Estimate memory usage from cache sizes
   */
  estimateMemoryUsage(cacheSizes) {
    // Rough estimation based on cache sizes
    const criticalMemory = Object.values(cacheSizes.critical).reduce((acc, size) => acc + size * 100, 0);
    const operationalMemory = Object.values(cacheSizes.operational).reduce((acc, size) => acc + size * 200, 0);
    const activityMemory = Object.values(cacheSizes.activity).reduce((acc, size) => acc + size * 300, 0);
    
    return criticalMemory + operationalMemory + activityMemory;
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveConsumers();
    }, this.options.cleanupInterval);
  }

  /**
   * Cleanup inactive consumers
   */
  cleanupInactiveConsumers() {
    if (this.isShuttingDown) return;

    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [tenantId, consumer] of this.consumers.entries()) {
      if (!consumer.isConnected) {
        console.log(`🧹 Cleaning up inactive consumer for tenant: ${tenantId}`);
        this.removeConsumer(tenantId);
      }
    }
  }

  /**
   * Broadcast message to all consumers
   */
  async broadcastMessage(eventType, data) {
    const promises = Array.from(this.consumers.values()).map(consumer => {
      return consumer.handleMessage('broadcast', JSON.stringify({ eventType, data }));
    });

    try {
      await Promise.allSettled(promises);
      console.log(`📢 Broadcasted ${eventType} to ${this.consumers.size} consumers`);
    } catch (error) {
      console.error(`❌ Error broadcasting message:`, error);
    }
  }

  /**
   * Shutdown all consumers
   */
  async shutdown() {
    this.isShuttingDown = true;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log(`🛑 Shutting down ${this.consumers.size} consumers...`);

    const shutdownPromises = Array.from(this.consumers.entries()).map(([tenantId, consumer]) => {
      return this.removeConsumer(tenantId);
    });

    try {
      await Promise.allSettled(shutdownPromises);
      console.log(`✅ All consumers shutdown complete`);
    } catch (error) {
      console.error(`❌ Error during shutdown:`, error);
    }
  }
}

// Singleton instance
let consumerManager = null;

/**
 * Get singleton consumer manager instance
 */
function getConsumerManager(options = {}) {
  if (!consumerManager) {
    consumerManager = new CRMConsumerManager(options);
  }
  return consumerManager;
}

/**
 * Initialize consumer manager
 */
async function initializeConsumerManager(options = {}) {
  if (!consumerManager) {
    consumerManager = new CRMConsumerManager(options);
  } else {
    // Update options if manager already exists
    consumerManager.options = { ...consumerManager.options, ...options };
  }
  console.log('🚀 CRM Consumer Manager initialized');
  return consumerManager;
}

/**
 * Shutdown consumer manager
 */
async function shutdownConsumerManager() {
  if (consumerManager) {
    await consumerManager.shutdown();
    consumerManager = null;
  }
}

export {
  CRMConsumerManager,
  getConsumerManager,
  initializeConsumerManager,
  shutdownConsumerManager
};
