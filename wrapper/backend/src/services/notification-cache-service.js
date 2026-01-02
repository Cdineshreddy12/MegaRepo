import { redisManager } from '../utils/redis.js';

/**
 * Notification Cache Service
 * Provides Redis-based caching for notification-related data
 */
class NotificationCacheService {
  constructor() {
    this.redis = redisManager;
    this.prefix = 'notif:cache:';
    
    // TTLs in seconds
    this.ttls = {
      template: 3600,        // 1 hour
      tenant: 900,            // 15 minutes
      filteredTenants: 300,   // 5 minutes
      stats: 600,             // 10 minutes
      notification: 300       // 5 minutes
    };
  }

  /**
   * Get cache key
   */
  _getKey(type, identifier) {
    return `${this.prefix}${type}:${identifier}`;
  }

  /**
   * Cache template
   */
  async cacheTemplate(templateId, template) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const key = this._getKey('template', templateId);
      await this.redis.set(key, template, this.ttls.template);
      return true;
    } catch (error) {
      console.error('Failed to cache template:', error);
      return false;
    }
  }

  /**
   * Get cached template
   */
  async getTemplate(templateId) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return null;
      }
      const key = this._getKey('template', templateId);
      return await this.redis.get(key);
    } catch (error) {
      console.error('Failed to get cached template:', error);
      return null;
    }
  }

  /**
   * Invalidate template cache
   */
  async invalidateTemplate(templateId) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const key = this._getKey('template', templateId);
      await this.redis.delete(key);
      
      // Also invalidate template list cache
      await this.redis.delete(this._getKey('templates', 'list'));
      return true;
    } catch (error) {
      console.error('Failed to invalidate template cache:', error);
      return false;
    }
  }

  /**
   * Cache template list
   */
  async cacheTemplateList(filters, templates) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const filterKey = JSON.stringify(filters || {});
      const key = `${this.prefix}templates:list:${Buffer.from(filterKey).toString('base64')}`;
      await this.redis.set(key, templates, this.ttls.template);
      return true;
    } catch (error) {
      console.error('Failed to cache template list:', error);
      return false;
    }
  }

  /**
   * Get cached template list
   */
  async getTemplateList(filters) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return null;
      }
      const filterKey = JSON.stringify(filters || {});
      const key = `${this.prefix}templates:list:${Buffer.from(filterKey).toString('base64')}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('Failed to get cached template list:', error);
      return null;
    }
  }

  /**
   * Cache tenant metadata
   */
  async cacheTenantMetadata(tenantId, metadata) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const key = this._getKey('tenant', tenantId);
      await this.redis.set(key, metadata, this.ttls.tenant);
      return true;
    } catch (error) {
      console.error('Failed to cache tenant metadata:', error);
      return false;
    }
  }

  /**
   * Get cached tenant metadata
   */
  async getTenantMetadata(tenantId) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return null;
      }
      const key = this._getKey('tenant', tenantId);
      return await this.redis.get(key);
    } catch (error) {
      console.error('Failed to get cached tenant metadata:', error);
      return null;
    }
  }

  /**
   * Invalidate tenant cache
   */
  async invalidateTenant(tenantId) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const key = this._getKey('tenant', tenantId);
      await this.redis.delete(key);
      
      // Also invalidate filtered tenant lists
      const pattern = `${this.prefix}filtered:*`;
      const keys = await this.redis.keys(pattern);
      for (const cacheKey of keys) {
        await this.redis.delete(cacheKey);
      }
      return true;
    } catch (error) {
      console.error('Failed to invalidate tenant cache:', error);
      return false;
    }
  }

  /**
   * Cache filtered tenant list
   */
  async cacheFilteredTenants(filters, tenantIds) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const filterKey = JSON.stringify(filters || {});
      const key = `${this.prefix}filtered:${Buffer.from(filterKey).toString('base64')}`;
      await this.redis.set(key, tenantIds, this.ttls.filteredTenants);
      return true;
    } catch (error) {
      console.error('Failed to cache filtered tenants:', error);
      return false;
    }
  }

  /**
   * Get cached filtered tenant list
   */
  async getFilteredTenants(filters) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return null;
      }
      const filterKey = JSON.stringify(filters || {});
      const key = `${this.prefix}filtered:${Buffer.from(filterKey).toString('base64')}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('Failed to get cached filtered tenants:', error);
      return null;
    }
  }

  /**
   * Cache notification statistics
   */
  async cacheStats(filters, stats) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const filterKey = JSON.stringify(filters || {});
      const key = `${this.prefix}stats:${Buffer.from(filterKey).toString('base64')}`;
      await this.redis.set(key, stats, this.ttls.stats);
      return true;
    } catch (error) {
      console.error('Failed to cache stats:', error);
      return false;
    }
  }

  /**
   * Get cached notification statistics
   */
  async getStats(filters) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return null;
      }
      const filterKey = JSON.stringify(filters || {});
      const key = `${this.prefix}stats:${Buffer.from(filterKey).toString('base64')}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('Failed to get cached stats:', error);
      return null;
    }
  }

  /**
   * Invalidate stats cache
   */
  async invalidateStats(filters = null) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      if (filters) {
        const filterKey = JSON.stringify(filters);
        const key = `${this.prefix}stats:${Buffer.from(filterKey).toString('base64')}`;
        await this.redis.delete(key);
      } else {
        // Invalidate all stats
        const pattern = `${this.prefix}stats:*`;
        const keys = await this.redis.keys(pattern);
        for (const cacheKey of keys) {
          await this.redis.delete(cacheKey);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to invalidate stats cache:', error);
      return false;
    }
  }

  /**
   * Warm cache for frequently accessed templates
   */
  async warmTemplateCache(templateIds) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      // This would be called with template IDs that are frequently accessed
      // Implementation would fetch templates and cache them
      console.log(`🔥 Warming cache for ${templateIds.length} templates`);
      return true;
    } catch (error) {
      console.error('Failed to warm template cache:', error);
      return false;
    }
  }

  /**
   * Clear all notification caches
   */
  async clearAll() {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return false;
      }
      const pattern = `${this.prefix}*`;
      const keys = await this.redis.keys(pattern);
      for (const key of keys) {
        await this.redis.delete(key);
      }
      console.log(`🧹 Cleared ${keys.length} cache entries`);
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }
}

export const notificationCacheService = new NotificationCacheService();
export default notificationCacheService;

