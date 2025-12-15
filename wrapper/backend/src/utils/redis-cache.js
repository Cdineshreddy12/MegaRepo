/**
 * Redis Cache Utility
 * Provides caching layer for frequently accessed data
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;

/**
 * Initialize Redis client
 */
export function initRedis() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Client Ready');
    });

    // Connect lazily
    redisClient.connect().catch(() => {
      console.warn('⚠️ Redis not available, caching disabled');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Cache wrapper with automatic serialization/deserialization
 */
export class CacheService {
  constructor(prefix = 'app') {
    this.prefix = prefix;
    this.client = getRedisClient();
  }

  /**
   * Generate cache key
   */
  _getKey(key) {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get(key, defaultValue = null) {
    if (!this.client) {
      return defaultValue;
    }

    try {
      const cacheKey = this._getKey(key);
      const value = await this.client.get(cacheKey);
      
      if (value === null) {
        return defaultValue;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error(`❌ Cache GET error for key ${key}:`, error.message);
      return defaultValue;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = 300) {
    if (!this.client) {
      return false;
    }

    try {
      const cacheKey = this._getKey(key);
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds > 0) {
        await this.client.setex(cacheKey, ttlSeconds, serialized);
      } else {
        await this.client.set(cacheKey, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Cache SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    if (!this.client) {
      return false;
    }

    try {
      const cacheKey = this._getKey(key);
      await this.client.del(cacheKey);
      return true;
    } catch (error) {
      console.error(`❌ Cache DELETE error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern) {
    if (!this.client) {
      return false;
    }

    try {
      const cacheKey = this._getKey(pattern);
      const keys = await this.client.keys(cacheKey);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Cache DELETE PATTERN error for ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.client) {
      return false;
    }

    try {
      const cacheKey = this._getKey(key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error(`❌ Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get or set with callback (cache-aside pattern)
   */
  async getOrSet(key, callback, ttlSeconds = 300) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute callback
    const value = await callback();
    
    // Store in cache
    await this.set(key, value, ttlSeconds);
    
    return value;
  }

  /**
   * Invalidate cache for tenant/user
   */
  async invalidateTenant(tenantId) {
    await this.deletePattern(`tenant:${tenantId}:*`);
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUser(userId, tenantId) {
    await this.deletePattern(`user:${userId}:*`);
    await this.deletePattern(`tenant:${tenantId}:user:${userId}:*`);
  }
}

// Export singleton instances
export const creditCache = new CacheService('credits');
export const subscriptionCache = new CacheService('subscriptions');
export const entityCache = new CacheService('entities');

// Initialize Redis on import
initRedis();

export default CacheService;

