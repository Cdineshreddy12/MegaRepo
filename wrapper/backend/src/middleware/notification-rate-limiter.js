import { redisManager } from '../utils/redis.js';

/**
 * Notification Rate Limiter Middleware
 * Implements sliding window rate limiting using Redis
 */
class NotificationRateLimiter {
  constructor() {
    this.redis = redisManager;
    this.defaultLimits = {
      single: 100,      // 100 notifications per minute per app
      bulk: 10,         // 10 bulk sends per minute per app
      tenant: 20        // 20 notifications per minute per tenant
    };
  }

  /**
   * Create rate limiter middleware
   */
  createLimiter(options = {}) {
    const {
      limit = this.defaultLimits.single,
      window = 60, // 1 minute in seconds
      keyGenerator = null,
      skipOnError = true
    } = options;

    return async (request, reply) => {
      try {
        if (!this.redis.isConnected) {
          if (skipOnError) {
            return; // Skip rate limiting if Redis is unavailable
          }
          throw new Error('Rate limiter unavailable');
        }

        // Generate rate limit key
        const key = keyGenerator 
          ? keyGenerator(request)
          : this._defaultKeyGenerator(request, limit, window);

        // Check current count
        const current = await this._getCurrentCount(key);
        
        if (current >= limit) {
          const ttl = await this._getTTL(key);
          return reply.code(429).send({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${limit} per ${window} seconds`,
            retryAfter: ttl
          });
        }

        // Increment counter
        await this._increment(key, window);

        // Add rate limit headers
        reply.header('X-RateLimit-Limit', limit);
        reply.header('X-RateLimit-Remaining', Math.max(0, limit - current - 1));
        reply.header('X-RateLimit-Reset', Date.now() + (ttl * 1000));

      } catch (error) {
        console.error('Rate limiter error:', error);
        if (!skipOnError) {
          return reply.code(500).send({
            error: 'Rate limiter error',
            message: error.message
          });
        }
      }
    };
  }

  /**
   * Default key generator
   */
  _defaultKeyGenerator(request, limit, window) {
    const appId = request.headers['x-api-key'] || request.userContext?.userId || 'anonymous';
    const endpoint = request.url.split('?')[0];
    const windowKey = Math.floor(Date.now() / (window * 1000));
    
    return `rate_limit:notifications:${appId}:${endpoint}:${windowKey}`;
  }

  /**
   * Get current count for key
   */
  async _getCurrentCount(key) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return 0; // Fail open if Redis unavailable
      }
      const count = await this.redis.client.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      console.error('Error getting rate limit count:', error);
      return 0;
    }
  }

  /**
   * Increment counter
   */
  async _increment(key, window) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return 1; // Fail open if Redis unavailable
      }
      const count = await this.redis.client.incr(key);
      if (count === 1) {
        // Set expiry on first increment
        await this.redis.client.expire(key, window);
      }
      return count;
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
      return 1; // Fail open
    }
  }

  /**
   * Get TTL for key
   */
  async _getTTL(key) {
    try {
      if (!this.redis.isConnected || !this.redis.client) {
        return 60; // Default TTL if Redis unavailable
      }
      const ttl = await this.redis.client.ttl(key);
      return ttl > 0 ? ttl : 60; // Default to 60 seconds if key doesn't exist
    } catch (error) {
      console.error('Error getting TTL:', error);
      return 60;
    }
  }

  /**
   * Per-application rate limiter
   */
  perApplication(limit = this.defaultLimits.single) {
    return this.createLimiter({
      limit,
      keyGenerator: (request) => {
        const appId = request.headers['x-api-key'] || 'anonymous';
        const windowKey = Math.floor(Date.now() / 60000); // 1 minute windows
        return `rate_limit:app:${appId}:${windowKey}`;
      }
    });
  }

  /**
   * Per-tenant rate limiter
   */
  perTenant(limit = this.defaultLimits.tenant) {
    return this.createLimiter({
      limit,
      keyGenerator: (request) => {
        const tenantId = request.body?.tenantId || request.params?.tenantId || 'unknown';
        const windowKey = Math.floor(Date.now() / 60000);
        return `rate_limit:tenant:${tenantId}:${windowKey}`;
      }
    });
  }

  /**
   * Bulk send rate limiter
   */
  bulkSend(limit = this.defaultLimits.bulk) {
    return this.createLimiter({
      limit,
      window: 60,
      keyGenerator: (request) => {
        const appId = request.headers['x-api-key'] || request.userContext?.userId || 'anonymous';
        const windowKey = Math.floor(Date.now() / 60000);
        return `rate_limit:bulk:${appId}:${windowKey}`;
      }
    });
  }

  /**
   * Check rate limit (for programmatic use)
   */
  async checkLimit(key, limit, window) {
    try {
      if (!this.redis.isConnected) {
        return { allowed: true, remaining: limit };
      }

      const fullKey = `rate_limit:${key}`;
      const current = await this._getCurrentCount(fullKey);
      
      if (current >= limit) {
        const ttl = await this._getTTL(fullKey);
        return {
          allowed: false,
          remaining: 0,
          retryAfter: ttl
        };
      }

      await this._increment(fullKey, window);
      
      return {
        allowed: true,
        remaining: limit - current - 1
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true, remaining: limit }; // Fail open
    }
  }
}

export const notificationRateLimiter = new NotificationRateLimiter();
export default notificationRateLimiter;

