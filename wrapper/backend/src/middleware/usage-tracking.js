import { UsageCache } from '../utils/redis.js';

export async function usageTrackingMiddleware(request, reply) {
  // Skip tracking for certain routes
  if (shouldSkipTracking(request.url)) {
    return;
  }

  const startTime = Date.now();
  
  // Store start time for later use
  request.usageStartTime = startTime;
}

// Plugin to register usage tracking hooks
export async function usageTrackingPlugin(fastify, options) {
  // Register onResponse hook for usage tracking
  fastify.addHook('onResponse', async (request, reply) => {
    // Skip tracking for certain routes
    if (shouldSkipTracking(request.url)) {
      return;
    }

    const responseTime = Date.now() - (request.usageStartTime || Date.now());
    
    // Extract app from URL or default to 'wrapper'
    const app = extractAppFromUrl(request.url) || 'wrapper';
    
    // Track usage if we have user context
    if (request.userContext?.tenantId) {
      try {
        await Promise.all([
          // Increment API call counter
          UsageCache.incrementApiCalls(request.userContext.tenantId, app),
          
          // Track active user
          request.userContext.userId && 
            UsageCache.trackActiveUser(request.userContext.tenantId, request.userContext.userId),
        ]);

        // Log detailed usage (in background)
        setImmediate(() => {
          logDetailedUsage({
            tenantId: request.userContext.tenantId,
            userId: request.userContext.userId,
            app,
            endpoint: request.url,
            method: request.method,
            statusCode: reply.statusCode,
            responseTime,
            source: 'wrapper_gateway',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            requestSize: getRequestSize(request),
            responseSize: getResponseSize(reply.payload),
          });
        });

      } catch (error) {
        // Don't fail the request if usage tracking fails
        console.error('Usage tracking error:', error);
      }
    }
  });
}

// Check if we should skip tracking for this route
function shouldSkipTracking(url) {
  const skipRoutes = [
    '/health',
    '/docs',
    '/api/usage', // Don't track usage API calls
    '/favicon.ico',
  ];
  
  return skipRoutes.some(route => url.startsWith(route));
}

// Extract app name from URL
function extractAppFromUrl(url) {
  // For proxy routes: /api/proxy/crm/...
  const proxyMatch = url.match(/^\/api\/proxy\/([^\/]+)/);
  if (proxyMatch) {
    return proxyMatch[1];
  }
  
  // For direct routes, default to wrapper
  return 'wrapper';
}

// Log detailed usage to database (async)
async function logDetailedUsage(data) {
  try {
    const { db } = await import('../db/index.js');
    const { usageLogs } = await import('../db/schema/index.js');
    
    await db.insert(usageLogs).values({
      tenantId: data.tenantId,
      userId: data.userId,
      app: data.app,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime.toString(),
      source: data.source,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestSize: data.requestSize,
      responseSize: data.responseSize,
      metadata: {},
    });
  } catch (error) {
    console.error('Failed to log detailed usage:', error);
  }
}

// Get request size in bytes
function getRequestSize(request) {
  try {
    if (request.body) {
      return JSON.stringify(request.body).length;
    }
    return 0;
  } catch {
    return 0;
  }
}

// Get response size in bytes
function getResponseSize(payload) {
  try {
    if (typeof payload === 'string') {
      return Buffer.byteLength(payload, 'utf8');
    }
    if (Buffer.isBuffer(payload)) {
      return payload.length;
    }
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
} 