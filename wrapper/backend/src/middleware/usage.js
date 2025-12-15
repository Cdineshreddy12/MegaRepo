import { usageTrackingMiddleware } from './usage-tracking.js';

// Export trackUsage for backward compatibility
export const trackUsage = usageTrackingMiddleware;

// Additional usage tracking utilities
export async function trackFeatureUsage(tenantId, feature, metadata = {}) {
  try {
    const { UsageCache } = await import('../utils/redis.js');
    await UsageCache.incrementFeatureUsage(tenantId, feature, metadata);
  } catch (error) {
    console.error('Feature usage tracking error:', error);
  }
}

export async function trackApiCall(tenantId, app = 'wrapper', endpoint, metadata = {}) {
  try {
    const { UsageCache } = await import('../utils/redis.js');
    await UsageCache.incrementApiCalls(tenantId, app);
    
    // Log detailed API call
    const { db } = await import('../db/index.js');
    const { usageLogs } = await import('../db/schema/index.js');
    
    await db.insert(usageLogs).values({
      tenantId,
      app,
      endpoint,
      method: metadata.method || 'GET',
      statusCode: metadata.statusCode || 200,
      responseTime: metadata.responseTime?.toString() || '0',
      source: 'manual_tracking',
      metadata: metadata,
    });
  } catch (error) {
    console.error('API call tracking error:', error);
  }
}

export async function trackUserActivity(tenantId, userId, activity, metadata = {}) {
  try {
    const { UsageCache } = await import('../utils/redis.js');
    await UsageCache.trackActiveUser(tenantId, userId);
    
    // Log user activity
    const { db } = await import('../db/index.js');
    const { usageLogs } = await import('../db/schema/index.js');
    
    await db.insert(usageLogs).values({
      tenantId,
      userId,
      app: 'wrapper',
      endpoint: activity,
      method: 'ACTIVITY',
      statusCode: 200,
      responseTime: '0',
      source: 'user_activity',
      metadata: metadata,
    });
  } catch (error) {
    console.error('User activity tracking error:', error);
  }
}

export default {
  trackUsage,
  trackFeatureUsage,
  trackApiCall,
  trackUserActivity
}; 