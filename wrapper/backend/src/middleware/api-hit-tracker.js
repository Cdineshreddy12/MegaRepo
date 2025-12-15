import DistributedSSOCache from '../utils/distributed-sso-cache.js';
import { cacheMetrics } from './cache-metrics.js';

/**
 * API Hit Tracker
 * Measures API hits to the wrapper from all applications
 * Shows the dramatic reduction achieved through caching
 */

class APIHitTracker {
  constructor() {
    this.metrics = {
      // API hits by application
      totalHits: {
        crm: 0,
        hr: 0,
        affiliate: 0,
        accounting: 0,
        inventory: 0,
        wrapper: 0
      },
      
      // API hits by endpoint
      endpointHits: {
        '/api/internal/user-permissions': 0,
        '/api/internal/tenant/features': 0,
        '/api/internal/user-roles': 0,
        '/api/internal/subscription-status': 0,
        '/api/internal/validate-access': 0
      },
      
      // Cache impact metrics
      cacheImpact: {
        totalAPICallsAvoided: 0,
        estimatedWithoutCache: 0,
        actualWithCache: 0,
        reductionPercentage: 0
      },
      
      // Time-based metrics
      hourlyStats: {},
      dailyStats: {},
      
      // Performance metrics
      responseTimesByApp: {},
      errorsByApp: {},
      
      startTime: new Date()
    };
  }

  /**
   * Track API hit from external application
   */
  trackAPIHit(appCode, endpoint, responseTime, cacheStatus = 'miss') {
    const now = new Date();
    const hour = now.getHours();
    const day = now.toDateString();
    
    // Track total hits by app
    if (this.metrics.totalHits[appCode] !== undefined) {
      this.metrics.totalHits[appCode]++;
    }
    
    // Track endpoint hits
    if (this.metrics.endpointHits[endpoint] !== undefined) {
      this.metrics.endpointHits[endpoint]++;
    }
    
    // Track hourly stats
    if (!this.metrics.hourlyStats[hour]) {
      this.metrics.hourlyStats[hour] = { hits: 0, apps: {} };
    }
    this.metrics.hourlyStats[hour].hits++;
    if (!this.metrics.hourlyStats[hour].apps[appCode]) {
      this.metrics.hourlyStats[hour].apps[appCode] = 0;
    }
    this.metrics.hourlyStats[hour].apps[appCode]++;
    
    // Track daily stats
    if (!this.metrics.dailyStats[day]) {
      this.metrics.dailyStats[day] = { hits: 0, apps: {} };
    }
    this.metrics.dailyStats[day].hits++;
    if (!this.metrics.dailyStats[day].apps[appCode]) {
      this.metrics.dailyStats[day].apps[appCode] = 0;
    }
    this.metrics.dailyStats[day].apps[appCode]++;
    
    // Track response times
    if (!this.metrics.responseTimesByApp[appCode]) {
      this.metrics.responseTimesByApp[appCode] = [];
    }
    this.metrics.responseTimesByApp[appCode].push(responseTime);
    
    // Calculate cache impact
    this.updateCacheImpact(cacheStatus);
    
    console.log(`📊 API Hit Tracked: ${appCode} → ${endpoint} (${responseTime}ms) [${cacheStatus}]`);
  }

  /**
   * Update cache impact metrics
   */
  updateCacheImpact(cacheStatus) {
    if (cacheStatus === 'hit') {
      // This API call was avoided due to cache
      this.metrics.cacheImpact.totalAPICallsAvoided++;
    } else {
      // This was an actual API call
      this.metrics.cacheImpact.actualWithCache++;
    }
    
    // Estimate what would happen without cache (all requests would be API calls)
    this.metrics.cacheImpact.estimatedWithoutCache = 
      this.metrics.cacheImpact.actualWithCache + this.metrics.cacheImpact.totalAPICallsAvoided;
    
    // Calculate reduction percentage
    if (this.metrics.cacheImpact.estimatedWithoutCache > 0) {
      this.metrics.cacheImpact.reductionPercentage = 
        (this.metrics.cacheImpact.totalAPICallsAvoided / this.metrics.cacheImpact.estimatedWithoutCache) * 100;
    }
  }

  /**
   * Get comprehensive API hit metrics
   */
  getAPIHitMetrics() {
    const totalHitsAllApps = Object.values(this.metrics.totalHits).reduce((sum, hits) => sum + hits, 0);
    const totalEndpointHits = Object.values(this.metrics.endpointHits).reduce((sum, hits) => sum + hits, 0);
    
    // Calculate average response times by app
    const avgResponseTimesByApp = {};
    Object.entries(this.metrics.responseTimesByApp).forEach(([app, times]) => {
      if (times.length > 0) {
        avgResponseTimesByApp[app] = (times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(2);
      }
    });
    
    // Get current hour and day stats
    const currentHour = new Date().getHours();
    const currentDay = new Date().toDateString();
    const currentHourHits = this.metrics.hourlyStats[currentHour]?.hits || 0;
    const currentDayHits = this.metrics.dailyStats[currentDay]?.hits || 0;
    
    return {
      summary: {
        totalAPIHits: totalHitsAllApps,
        totalEndpointHits: totalEndpointHits,
        currentHourHits: currentHourHits,
        currentDayHits: currentDayHits,
        uptime: this.getUptime()
      },
      
      byApplication: this.metrics.totalHits,
      
      byEndpoint: this.metrics.endpointHits,
      
      cacheImpact: {
        ...this.metrics.cacheImpact,
        reductionPercentage: this.metrics.cacheImpact.reductionPercentage.toFixed(1)
      },
      
      performance: {
        avgResponseTimesByApp: avgResponseTimesByApp,
        errorsByApp: this.metrics.errorsByApp
      },
      
      trends: {
        hourlyStats: this.metrics.hourlyStats,
        last24Hours: this.getLast24HoursStats()
      },
      
      projections: this.calculateProjections(),
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate projections and savings
   */
  calculateProjections() {
    const { actualWithCache, totalAPICallsAvoided, estimatedWithoutCache } = this.metrics.cacheImpact;
    
    // Project daily, weekly, monthly savings
    const hoursRunning = this.getUptimeHours();
    const hitsPerHour = hoursRunning > 0 ? estimatedWithoutCache / hoursRunning : 0;
    
    const projections = {
      withoutCache: {
        daily: Math.round(hitsPerHour * 24),
        weekly: Math.round(hitsPerHour * 24 * 7),
        monthly: Math.round(hitsPerHour * 24 * 30)
      },
      withCache: {
        daily: Math.round((actualWithCache / hoursRunning) * 24),
        weekly: Math.round((actualWithCache / hoursRunning) * 24 * 7),
        monthly: Math.round((actualWithCache / hoursRunning) * 24 * 30)
      }
    };
    
    projections.savings = {
      daily: projections.withoutCache.daily - projections.withCache.daily,
      weekly: projections.withoutCache.weekly - projections.withCache.weekly,
      monthly: projections.withoutCache.monthly - projections.withCache.monthly
    };
    
    return projections;
  }

  /**
   * Get last 24 hours statistics
   */
  getLast24HoursStats() {
    const last24Hours = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000)).getHours();
      const hits = this.metrics.hourlyStats[hour]?.hits || 0;
      last24Hours.push({
        hour: hour,
        hits: hits,
        timestamp: new Date(now.getTime() - (i * 60 * 60 * 1000)).toISOString()
      });
    }
    
    return last24Hours;
  }

  /**
   * Get uptime in human readable format
   */
  getUptime() {
    const uptimeMs = Date.now() - this.metrics.startTime.getTime();
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Get uptime in hours (for calculations)
   */
  getUptimeHours() {
    const uptimeMs = Date.now() - this.metrics.startTime.getTime();
    return uptimeMs / (1000 * 60 * 60);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalHits: { crm: 0, hr: 0, affiliate: 0, accounting: 0, inventory: 0, wrapper: 0 },
      endpointHits: {
        '/api/internal/user-permissions': 0,
        '/api/internal/tenant/features': 0,
        '/api/internal/user-roles': 0,
        '/api/internal/subscription-status': 0,
        '/api/internal/validate-access': 0
      },
      cacheImpact: {
        totalAPICallsAvoided: 0,
        estimatedWithoutCache: 0,
        actualWithCache: 0,
        reductionPercentage: 0
      },
      hourlyStats: {},
      dailyStats: {},
      responseTimesByApp: {},
      errorsByApp: {},
      startTime: new Date()
    };
    
    console.log('📊 API Hit Tracker metrics reset');
  }
}

// Global API hit tracker instance
const apiHitTracker = new APIHitTracker();

/**
 * Middleware to track API hits
 */
export function trackAPIHit(appCode) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.json to capture response and track metrics
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      const cacheStatus = data?.source === 'cache' ? 'hit' : 'miss';
      
      // Track the API hit
      apiHitTracker.trackAPIHit(appCode, req.originalUrl, responseTime, cacheStatus);
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware to track internal API calls
 */
export function trackInternalAPIHit(req, res, next) {
  const appCode = req.headers['x-app-code'] || req.headers['user-agent']?.includes('crm') ? 'crm' : 'unknown';
  const startTime = Date.now();
  
  // Override res.json to capture response and track metrics
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    const cacheStatus = data?.source === 'cache' ? 'hit' : 'miss';
    
    // Track the API hit
    apiHitTracker.trackAPIHit(appCode, req.originalUrl, responseTime, cacheStatus);
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Simulate API hits for demonstration
 */
export function simulateAPIHits() {
  const apps = ['crm', 'hr', 'affiliate', 'accounting', 'inventory'];
  const endpoints = [
    '/api/internal/user-permissions',
    '/api/internal/tenant/features',
    '/api/internal/user-roles',
    '/api/internal/subscription-status',
    '/api/internal/validate-access'
  ];
  
  // Simulate realistic API hit patterns
  setInterval(() => {
    const app = apps[Math.floor(Math.random() * apps.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const responseTime = Math.random() * 50 + 10; // 10-60ms with cache
    const cacheHit = Math.random() > 0.05; // 95% cache hit rate
    
    apiHitTracker.trackAPIHit(app, endpoint, responseTime, cacheHit ? 'hit' : 'miss');
  }, 1000); // Every second
  
  console.log('🎭 API hit simulation started');
}

export { apiHitTracker };
export default apiHitTracker; 