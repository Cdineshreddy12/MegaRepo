/**
 * Important Feature API Hit Tracker
 * Only measures API calls for critical/important features
 * Provides focused metrics for enterprise decision making
 */

/**
 * Define Important Features to Track
 * These are the critical features that impact business operations
 */
const IMPORTANT_FEATURES = {
  // Authentication & Authorization (Critical)
  'user-permissions': {
    endpoints: ['/api/internal/user-permissions', '/api/permissions/check'],
    priority: 'critical',
    description: 'User permission validation',
    businessImpact: 'Security & Access Control'
  },
  
  // Subscription & Billing (High Revenue Impact)
  'subscription-status': {
    endpoints: ['/api/internal/subscription-status', '/api/subscriptions/validate'],
    priority: 'critical',
    description: 'Subscription validation',
    businessImpact: 'Revenue Protection'
  },
  
  // Trial Management (Conversion Critical)
  'trial-validation': {
    endpoints: ['/api/internal/trial-status', '/api/trial/validate'],
    priority: 'high',
    description: 'Trial status checking',
    businessImpact: 'User Conversion'
  },
  
  // Role Management (Security Critical)
  'role-validation': {
    endpoints: ['/api/internal/user-roles', '/api/roles/check'],
    priority: 'critical',
    description: 'Role-based access control',
    businessImpact: 'Security & Compliance'
  },
  
  // Feature Access (Product Usage)
  'feature-access': {
    endpoints: ['/api/internal/tenant/features', '/api/features/validate'],
    priority: 'high',
    description: 'Feature availability checking',
    businessImpact: 'Product Experience'
  },
  
  // Usage Tracking (Billing Critical)
  'usage-tracking': {
    endpoints: ['/api/internal/track-usage', '/api/usage/increment'],
    priority: 'high',
    description: 'Usage limit enforcement',
    businessImpact: 'Fair Usage & Billing'
  },
  
  // Organization Validation (Multi-tenancy)
  'org-validation': {
    endpoints: ['/api/internal/validate-access', '/api/tenants/validate'],
    priority: 'critical',
    description: 'Organization access validation',
    businessImpact: 'Data Isolation & Security'
  }
};

class ImportantFeatureTracker {
  constructor() {
    this.metrics = {
      // Feature-specific metrics
      features: {},
      
      // Overall summary
      summary: {
        totalImportantCalls: 0,
        criticalFeatureCalls: 0,
        highPriorityFeatureCalls: 0,
        startTime: new Date()
      },
      
      // Cache impact for important features only
      cacheImpact: {
        criticalFeatureHits: 0,
        criticalFeatureMisses: 0,
        highPriorityHits: 0,
        highPriorityMisses: 0,
        businessImpactSavings: {}
      },
      
      // Performance by business impact
      businessImpact: {},
      
      // Time-based tracking
      hourlyStats: {},
      
      // Application usage of important features
      applicationUsage: {}
    };
    
    // Initialize feature metrics
    Object.keys(IMPORTANT_FEATURES).forEach(featureKey => {
      this.metrics.features[featureKey] = {
        totalCalls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        avgResponseTime: 0,
        responseTimeTotal: 0,
        byApplication: {},
        lastHour: 0,
        errors: 0
      };
      
      const feature = IMPORTANT_FEATURES[featureKey];
      if (!this.metrics.businessImpact[feature.businessImpact]) {
        this.metrics.businessImpact[feature.businessImpact] = {
          totalCalls: 0,
          cacheHits: 0,
          cacheMisses: 0,
          features: []
        };
      }
      this.metrics.businessImpact[feature.businessImpact].features.push(featureKey);
    });
  }

  /**
   * Check if an endpoint represents an important feature
   */
  getImportantFeature(endpoint) {
    for (const [featureKey, feature] of Object.entries(IMPORTANT_FEATURES)) {
      if (feature.endpoints.some(ep => endpoint.includes(ep) || ep.includes(endpoint))) {
        return { key: featureKey, ...feature };
      }
    }
    return null;
  }

  /**
   * Track API hit for important features only
   */
  trackImportantFeatureHit(appCode, endpoint, responseTime, cacheStatus = 'miss', userId = null) {
    const feature = this.getImportantFeature(endpoint);
    
    // Only track if it's an important feature
    if (!feature) {
      return false; // Not an important feature, skip tracking
    }
    
    const now = new Date();
    const hour = now.getHours();
    
    // Update feature-specific metrics
    const featureMetrics = this.metrics.features[feature.key];
    featureMetrics.totalCalls++;
    featureMetrics.responseTimeTotal += responseTime;
    featureMetrics.avgResponseTime = featureMetrics.responseTimeTotal / featureMetrics.totalCalls;
    
    // Track by application
    if (!featureMetrics.byApplication[appCode]) {
      featureMetrics.byApplication[appCode] = { calls: 0, cacheHits: 0 };
    }
    featureMetrics.byApplication[appCode].calls++;
    
    // Track cache performance
    if (cacheStatus === 'hit') {
      featureMetrics.cacheHits++;
      featureMetrics.byApplication[appCode].cacheHits++;
      
      if (feature.priority === 'critical') {
        this.metrics.cacheImpact.criticalFeatureHits++;
      } else if (feature.priority === 'high') {
        this.metrics.cacheImpact.highPriorityHits++;
      }
    } else {
      featureMetrics.cacheMisses++;
      
      if (feature.priority === 'critical') {
        this.metrics.cacheImpact.criticalFeatureMisses++;
      } else if (feature.priority === 'high') {
        this.metrics.cacheImpact.highPriorityMisses++;
      }
    }
    
    // Update business impact metrics
    const businessImpact = this.metrics.businessImpact[feature.businessImpact];
    businessImpact.totalCalls++;
    if (cacheStatus === 'hit') {
      businessImpact.cacheHits++;
    } else {
      businessImpact.cacheMisses++;
    }
    
    // Update summary
    this.metrics.summary.totalImportantCalls++;
    if (feature.priority === 'critical') {
      this.metrics.summary.criticalFeatureCalls++;
    } else if (feature.priority === 'high') {
      this.metrics.summary.highPriorityFeatureCalls++;
    }
    
    // Track hourly stats
    if (!this.metrics.hourlyStats[hour]) {
      this.metrics.hourlyStats[hour] = { calls: 0, features: {} };
    }
    this.metrics.hourlyStats[hour].calls++;
    if (!this.metrics.hourlyStats[hour].features[feature.key]) {
      this.metrics.hourlyStats[hour].features[feature.key] = 0;
    }
    this.metrics.hourlyStats[hour].features[feature.key]++;
    
    // Track application usage
    if (!this.metrics.applicationUsage[appCode]) {
      this.metrics.applicationUsage[appCode] = { totalCalls: 0, features: {} };
    }
    this.metrics.applicationUsage[appCode].totalCalls++;
    if (!this.metrics.applicationUsage[appCode].features[feature.key]) {
      this.metrics.applicationUsage[appCode].features[feature.key] = 0;
    }
    this.metrics.applicationUsage[appCode].features[feature.key]++;
    
    console.log(`🎯 Important Feature Tracked: ${appCode.toUpperCase()} → ${feature.key} (${responseTime}ms) [${cacheStatus.toUpperCase()}] - ${feature.businessImpact}`);
    
    return true; // Successfully tracked
  }

  /**
   * Get comprehensive important feature metrics
   */
  getImportantFeatureMetrics() {
    // Calculate overall cache performance for important features
    const totalCriticalCalls = this.metrics.cacheImpact.criticalFeatureHits + this.metrics.cacheImpact.criticalFeatureMisses;
    const totalHighPriorityCalls = this.metrics.cacheImpact.highPriorityHits + this.metrics.cacheImpact.highPriorityMisses;
    
    const criticalCacheHitRate = totalCriticalCalls > 0 ? 
      (this.metrics.cacheImpact.criticalFeatureHits / totalCriticalCalls * 100) : 0;
    const highPriorityCacheHitRate = totalHighPriorityCalls > 0 ? 
      (this.metrics.cacheImpact.highPriorityHits / totalHighPriorityCalls * 100) : 0;
    
    // Calculate business impact savings
    const businessImpactSavings = {};
    Object.entries(this.metrics.businessImpact).forEach(([impact, data]) => {
      const total = data.cacheHits + data.cacheMisses;
      const hitRate = total > 0 ? (data.cacheHits / total * 100) : 0;
      const callsAvoided = data.cacheHits;
      
      businessImpactSavings[impact] = {
        totalCalls: total,
        callsAvoided: callsAvoided,
        hitRate: hitRate.toFixed(1),
        costSavings: (callsAvoided * 0.002).toFixed(3) // Higher cost for important features
      };
    });
    
    // Get top features by usage
    const featuresByUsage = Object.entries(this.metrics.features)
      .map(([key, metrics]) => ({
        key,
        ...IMPORTANT_FEATURES[key],
        metrics: {
          totalCalls: metrics.totalCalls,
          cacheHitRate: metrics.totalCalls > 0 ? 
            ((metrics.cacheHits / metrics.totalCalls) * 100).toFixed(1) : '0',
          avgResponseTime: metrics.avgResponseTime.toFixed(0),
          callsAvoided: metrics.cacheHits
        }
      }))
      .filter(feature => feature.metrics.totalCalls > 0)
      .sort((a, b) => b.metrics.totalCalls - a.metrics.totalCalls);
    
    // Calculate projected impact
    const hoursRunning = this.getUptimeHours();
    const callsPerHour = hoursRunning > 0 ? this.metrics.summary.totalImportantCalls / hoursRunning : 0;
    
    return {
      summary: {
        totalImportantFeatureCalls: this.metrics.summary.totalImportantCalls,
        criticalFeatureCalls: this.metrics.summary.criticalFeatureCalls,
        highPriorityFeatureCalls: this.metrics.summary.highPriorityFeatureCalls,
        uptime: this.getUptime(),
        trackedFeatures: Object.keys(IMPORTANT_FEATURES).length
      },
      
      cachePerformance: {
        critical: {
          totalCalls: totalCriticalCalls,
          hits: this.metrics.cacheImpact.criticalFeatureHits,
          misses: this.metrics.cacheImpact.criticalFeatureMisses,
          hitRate: criticalCacheHitRate.toFixed(1)
        },
        highPriority: {
          totalCalls: totalHighPriorityCalls,
          hits: this.metrics.cacheImpact.highPriorityHits,
          misses: this.metrics.cacheImpact.highPriorityMisses,
          hitRate: highPriorityCacheHitRate.toFixed(1)
        }
      },
      
      businessImpact: businessImpactSavings,
      
      topFeatures: featuresByUsage.slice(0, 10),
      
      applicationUsage: this.metrics.applicationUsage,
      
      projections: {
        hourly: Math.round(callsPerHour),
        daily: Math.round(callsPerHour * 24),
        weekly: Math.round(callsPerHour * 24 * 7),
        monthly: Math.round(callsPerHour * 24 * 30)
      },
      
      featureDefinitions: IMPORTANT_FEATURES,
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get uptime in human readable format
   */
  getUptime() {
    const uptimeMs = Date.now() - this.metrics.summary.startTime.getTime();
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get uptime in hours
   */
  getUptimeHours() {
    const uptimeMs = Date.now() - this.metrics.summary.startTime.getTime();
    return uptimeMs / (1000 * 60 * 60);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.constructor();
    console.log('🎯 Important feature tracker metrics reset');
  }

  /**
   * Add new important feature to track
   */
  addImportantFeature(key, feature) {
    IMPORTANT_FEATURES[key] = feature;
    this.metrics.features[key] = {
      totalCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      responseTimeTotal: 0,
      byApplication: {},
      lastHour: 0,
      errors: 0
    };
    
    console.log(`🎯 Added important feature: ${key} - ${feature.description}`);
  }
}

// Global important feature tracker instance
const importantFeatureTracker = new ImportantFeatureTracker();

/**
 * Middleware to track important feature API hits only
 */
export function trackImportantFeatureHit(req, res, next) {
  const appCode = req.headers['x-app-code'] || 
                  req.headers['x-application'] || 
                  req.headers['user-agent']?.includes('crm') ? 'crm' : 'unknown';
  const startTime = Date.now();
  
  // Override res.json to capture response and track metrics
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    const cacheStatus = data?.source === 'cache' ? 'hit' : 'miss';
    
    // Only track if it's an important feature
    const tracked = importantFeatureTracker.trackImportantFeatureHit(
      appCode, 
      req.originalUrl, 
      responseTime, 
      cacheStatus,
      req.userContext?.userId
    );
    
    if (!tracked) {
      console.log(`⚪ Skipped tracking: ${req.originalUrl} (not an important feature)`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Simulate important feature API hits for demonstration
 */
export function simulateImportantFeatureHits() {
  const apps = ['crm', 'hr', 'affiliate', 'accounting'];
  const importantEndpoints = Object.values(IMPORTANT_FEATURES)
    .flatMap(feature => feature.endpoints);
  
  // Simulate realistic important feature usage patterns
  setInterval(() => {
    const app = apps[Math.floor(Math.random() * apps.length)];
    const endpoint = importantEndpoints[Math.floor(Math.random() * importantEndpoints.length)];
    const responseTime = Math.random() * 50 + 10; // 10-60ms with cache
    const cacheHit = Math.random() > 0.05; // 95% cache hit rate for important features
    
    importantFeatureTracker.trackImportantFeatureHit(
      app, 
      endpoint, 
      responseTime, 
      cacheHit ? 'hit' : 'miss',
      `user${Math.floor(Math.random() * 100) + 1}`
    );
  }, 2000); // Every 2 seconds
  
  console.log('🎯 Important feature simulation started - tracking only critical business features');
}

export { importantFeatureTracker, IMPORTANT_FEATURES };
export default importantFeatureTracker; 