import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';

// Check if logging should be disabled (set this to true or use DISABLE_LOGGING env var)
const DISABLE_ALL_LOGGING = process.env.DISABLE_LOGGING === 'true' || 'true' === 'true';

// Optionally suppress all console output (uncomment if you want to disable console.log too)
if (DISABLE_ALL_LOGGING && process.env.SUPPRESS_CONSOLE === 'true') {
  const noop = () => { };
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  // Keep console.error for critical errors
  // console.error = noop;
}

// Import routes
import { authRoutes, simplifiedAuthRoutes } from './features/auth/index.js';
import tenantRoutes from './routes/tenants.js';
import { usersRoutes, userRoutes, userSyncRoutes, userVerificationRoutes } from './features/users/index.js';
import { subscriptionsRoutes, paymentsRoutes, paymentUpgradeRoutes, paymentProfileCompletionRoutes } from './features/subscriptions/index.js';
import permissionRoutes from './routes/permissions.js';
import { rolesRoutes, customRolesRoutes } from './features/roles/index.js';
import analyticsRoutes from './routes/analytics.js';
import usageRoutes from './routes/usage.js';
import internalRoutes from './routes/internal.js';
import enhancedInternalRoutes from './routes/internal-enhanced.js';
import webhookRoutes from './routes/webhooks.js';
import proxyRoutes from './routes/proxy.js';
import onboardingRoutes from './routes/onboarding-router.js';
import dnsManagementRoutes from './routes/dns-management.js';
// Admin feature routes
import {
  adminRoutes,
  adminDashboardRoutes,
  adminTenantManagementRoutes,
  adminEntityManagementRoutes,
  adminCreditOverviewRoutes,
  adminCreditConfigurationRoutes,
  adminApplicationAssignmentRoutes,
  adminOperationCostRoutes,
  seasonalCreditsRoutes
} from './features/admin/index.js';
import invitationRoutes from './routes/invitations.js';
import suiteRoutes from './routes/suite.js';
// paymentRoutes moved to subscriptions feature
import activityRoutes from './routes/activity.js';
import trialRoutes from './routes/trial.js';
// customRolesRoutes moved to roles feature
import adminPromotionRoutes from './routes/admin-promotion.js';
import permissionMatrixRoutes from './routes/permission-matrix.js';
import enhancedCrmIntegrationRoutes from './routes/enhanced-crm-integration.js';
import wrapperCrmSyncRoutes from './routes/wrapper-crm-sync.js';
// userVerificationRoutes moved to users feature
import healthRoutes from './routes/health.js';
import permissionSyncRoutes from './routes/permission-sync.js';
// userSyncRoutes moved to users feature
import userApplicationRoutes from './routes/user-applications.js';
import { organizationsRoutes, locationsRoutes, entitiesRoutes } from './features/organizations/index.js';
// paymentUpgradeRoutes moved to subscriptions feature
import { creditsRoutes, creditExpiryRoutes } from './features/credits/index.js';
import demoRoutes from './routes/demo.js';
import notificationRoutes from './routes/notifications.js';
import entityScopeRoutes from './routes/entity-scope.js';
// import { createRLSRoutes } from './routes/rls-examples.js'; // Temporarily disabled


// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { usageTrackingPlugin } from './middleware/usage-tracking.js';
import { trialRestrictionMiddleware } from './middleware/trial-restriction.js';
import { fastifyCacheMetrics } from './middleware/cache-metrics.js';
import { RLSTenantIsolationService } from './middleware/rls-tenant-isolation.js';
import { trackActivity } from './middleware/activityTracker.js';

// Import utilities
import trialManager from './utils/trial-manager.js';
import creditExpiryManager from './utils/credit-expiry-manager.js';

// Import database connection manager
import { dbManager } from './db/connection-manager.js';

const fastify = Fastify({
  logger: DISABLE_ALL_LOGGING ? false : {
    level: process.env.LOG_LEVEL || 'info',
  },
  // Enable raw body support for webhooks
  bodyLimit: 1048576, // 1MB limit
  requestIdHeader: 'x-request-id'
});

// Initialize Elasticsearch logger and hook into Fastify logs
let enhancedLogger = null;

if (!DISABLE_ALL_LOGGING) {
  try {
    enhancedLogger = (await import('./utils/logger-enhanced.js')).default;
    console.log('✅ Elasticsearch logger initialized');
  } catch (error) {
    console.warn('⚠️ Could not load Elasticsearch logger:', error.message);
  }

  // Hook into Fastify's logging to send logs to Elasticsearch
  if (enhancedLogger && enhancedLogger.winstonLogger) {
    // Override Fastify's log methods to also send to Elasticsearch
    const originalLog = fastify.log;

    fastify.addHook('onRequest', async (request, reply) => {
      // Log incoming requests to Elasticsearch
      enhancedLogger.winstonLogger.info('Incoming request', {
        method: request.method,
        url: request.url,
        hostname: request.hostname,
        remoteAddress: request.ip,
        requestId: request.id,
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        env: process.env.NODE_ENV || 'development'
      });
    });

    fastify.addHook('onResponse', async (request, reply) => {
      // Log completed requests to Elasticsearch
      enhancedLogger.winstonLogger.info('Request completed', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
        requestId: request.id,
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        env: process.env.NODE_ENV || 'development'
      });
    });

    // Hook into Fastify's error logging
    fastify.addHook('onError', async (request, reply, error) => {
      // Log errors to Elasticsearch
      enhancedLogger.winstonLogger.error('Request error', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode || 500,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        requestId: request.id,
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        env: process.env.NODE_ENV || 'development'
      });
    });

    console.log('✅ Fastify logs will be sent to Elasticsearch');
  }
} else {
  console.log('🔇 All logging disabled');
}

// Helper function to log important messages to both console and Elasticsearch
// Usage: logToES('info', 'Important message', { key: 'value' })
global.logToES = (level, message, data = {}) => {
  if (DISABLE_ALL_LOGGING) return; // Skip logging if disabled

  console.log(`[${level.toUpperCase()}] ${message}`, data);
  if (enhancedLogger && enhancedLogger.winstonLogger) {
    const logData = {
      message,
      ...data,
      service: process.env.SERVICE_NAME || 'wrapper-backend',
      env: process.env.NODE_ENV || 'development'
    };

    switch (level.toLowerCase()) {
      case 'error':
        enhancedLogger.winstonLogger.error(message, logData);
        break;
      case 'warn':
        enhancedLogger.winstonLogger.warn(message, logData);
        break;
      case 'debug':
        enhancedLogger.winstonLogger.debug(message, logData);
        break;
      default:
        enhancedLogger.winstonLogger.info(message, logData);
    }
  }
};

// Raw body parser for webhooks
fastify.addContentTypeParser(['application/json'], { parseAs: 'buffer' }, function (req, body, done) {
  req.rawBody = body;

  console.log('🔍 CONTENT PARSER - URL:', req.url, 'Method:', req.method);

  // For webhook endpoints, keep raw body and don't parse JSON
  if (req.url.includes('/webhook')) {
    console.log('🎣 GLOBAL WEBHOOK DETECTED:', req.url, '- preserving raw body for signature verification');
    console.log('🎣 WEBHOOK BODY LENGTH:', body.length);
    done(null, body);
    return;
  }

  try {
    const json = JSON.parse(body);

    // Handle double-stringified restrictions field issue
    if (json.restrictions && typeof json.restrictions === 'string') {
      try {
        json.restrictions = JSON.parse(json.restrictions);
        console.log('🔧 Fixed double-stringified restrictions field');
      } catch (e) {
        // If parsing fails, keep as string for validation to catch it
        console.log('⚠️ Could not parse restrictions string, keeping as is for validation');
      }
    }

    done(null, json);
  } catch (err) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

// Register plugins
async function registerPlugins() {
  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false // Disable CSP for development
  });

  // CORS
  await fastify.register(cors, {
    // Allow localhost for dev and *.zopkit.com for production
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Always allow localhost origins (for development)
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log(`✅ CORS allowed origin: ${origin}`);
        callback(null, true);
        return;
      }

      // Check against allowed production origins
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        /^https?:\/\/[a-z0-9-]+\.zopkit\.com$/i, // Any subdomain of zopkit.com (prod)
        /^https?:\/\/zopkit\.com$/i // Root domain if used
      ];

      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        console.log(`✅ CORS allowed origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Required so browser can send cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Application',
      'X-Kinde-User-ID',      // CRM sends this
      'X-Organization-ID',    // CRM sends this
      'X-Tenant-ID',          // Frontend sends this
      'x-tenant-id',          // Alternative casing
      'Origin',               // Browser sends this
      'Accept',               // Browser sends this
      'Accept-Language',      // Browser sends this
      'Accept-Encoding',      // Browser sends this
      'Cache-Control',        // Browser sends this
      'Pragma',               // Browser sends this
      'Sec-Fetch-Dest',       // Modern browser security
      'Sec-Fetch-Mode',       // Modern browser security
      'Sec-Fetch-Site',       // Modern browser security
      'User-Agent'            // Browser identification
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page'
    ],
    // Let the plugin echo the specific Origin back (not *) so cookies are accepted
    strictPreflight: true,
    // Handle preflight requests properly
    preflightContinue: false,
    // Set max age for preflight cache
    maxAge: 86400 // 24 hours
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Cookies
  await fastify.register(cookie, {
    secret: process.env.SESSION_SECRET,
    parseOptions: {},
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '800'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    skipOnError: true,
    keyGenerator: (request) => {
      // Rate limit by tenant + IP for authenticated requests
      if (request.userContext?.tenantId) {
        return `${request.userContext.tenantId}:${request.ip}`;
      }
      return request.ip;
    },
  });

  // File upload
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000'), // 50MB
      files: 5,
      headerPairs: 2000,
    },
  });

  // Swagger documentation
  if (process.env.NODE_ENV === 'development') {
    await fastify.register(swagger, {
      routePrefix: '/docs',
      swagger: {
        info: {
          title: 'Wrapper API',
          description: 'Multi-tenant SaaS wrapper platform API',
          version: '1.0.0',
        },
        host: `localhost:${process.env.PORT || 3000}`,
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Tenants', description: 'Tenant management' },
          { name: 'Users', description: 'User management' },
          { name: 'Subscriptions', description: 'Billing and subscriptions' },
          { name: 'Permissions', description: 'Role and permission management' },
          { name: 'Usage', description: 'Usage tracking and analytics' },
          { name: 'Activity', description: 'Activity logs and audit trails' },
          { name: 'Organization', description: 'Organization resolution and validation' },
          { name: 'Internal', description: 'Internal API for tools' },
          { name: 'Webhooks', description: 'Webhook handlers' },
        ],
        securityDefinitions: {
          Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
          },
        },
      },
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      exposeRoute: true,
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  // Usage tracking plugin
  await fastify.register(usageTrackingPlugin);

  // Cache metrics plugin
  await fastify.register(fastifyCacheMetrics);
}

// Initialize RLS service
let rlsService = null;

async function initializeRLS() {
  try {
    console.log('🚀 Initializing RLS Tenant Isolation Service...');

    // Import database connection
    const { db, connectionString } = await import('./db/index.js');

    // Initialize RLS service
    rlsService = new RLSTenantIsolationService(db, connectionString);

    // Import and set tenants table reference
    const { tenants } = await import('./db/schema/index.js');
    rlsService.setTenantsTable(tenants);

    // Make RLS service globally available for health checks
    global.rlsService = rlsService;

    console.log('✅ RLS Tenant Isolation Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize RLS service:', error);
    // Don't exit - continue without RLS for now
  }
}

// Register global middleware
async function registerMiddleware() {
  // Activity tracking middleware (runs on all requests for comprehensive logging)
  fastify.addHook('onRequest', trackActivity());

  // Auth middleware (will set userContext if authenticated) - runs on all requests
  fastify.addHook('preHandler', authMiddleware);

  // Trial restriction middleware (after auth, before routes)
  // Keep as preHandler but add better error handling
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      // Only run trial restriction if auth has been processed
      await trialRestrictionMiddleware(request, reply);
    } catch (error) {
      console.error('❌ Trial restriction middleware error:', error);
      // Don't block the request on middleware errors
      console.log('⚠️ Continuing request despite trial restriction error');
    }
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    };
  });

  // Debug endpoint to test route registration
  fastify.get('/debug-routes', async (request, reply) => {
    const routes = [];
    fastify.routes.forEach(route => {
      routes.push({
        method: route.method,
        url: route.url,
        prefix: route.prefix
      });
    });

    return {
      success: true,
      message: 'Route debugging info',
      totalRoutes: routes.length,
      routes: routes.slice(0, 20), // Show first 20 routes
      timestamp: new Date().toISOString()
    };
  });

  // Test endpoint that bypasses all middleware
  fastify.get('/test-no-middleware', async (request, reply) => {
    return {
      success: true,
      message: 'This endpoint bypasses all middleware',
      timestamp: new Date().toISOString(),
      headers: request.headers,
      url: request.url,
      method: request.method
    };
  });



  // API routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(tenantRoutes, { prefix: '/api/tenants' });
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  await fastify.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });

  // Handle double /api/api/ prefix issue (register routes with both prefixes)
  // This happens when frontend API base URL already includes /api

  await fastify.register(permissionRoutes, { prefix: '/api/permissions' });
  await fastify.register(rolesRoutes, { prefix: '/api/roles' });
  // Register custom-roles routes with both prefixes for compatibility
  await fastify.register(customRolesRoutes, { prefix: '/api/custom-roles' });
  await fastify.register(customRolesRoutes, { prefix: '/api/api/custom-roles' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(usageRoutes, { prefix: '/api/usage' });
  await fastify.register(internalRoutes, { prefix: '/api/internal' });
  await fastify.register(enhancedInternalRoutes, { prefix: '/api' }); // Add proper prefix for consistency
  await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
  await fastify.register(proxyRoutes, { prefix: '/api/proxy' });
  await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' });
  await fastify.register(dnsManagementRoutes, { prefix: '/api/dns' });
  await fastify.register(adminRoutes, { prefix: '/api/admin' });
  await fastify.register(adminCreditConfigurationRoutes, { prefix: '/api/admin/credit-configurations' });
  await fastify.register(adminApplicationAssignmentRoutes, { prefix: '/api/admin/application-assignments' });
  await fastify.register(adminOperationCostRoutes, { prefix: '/api/admin/operation-costs' });

  // New independent admin dashboard routes
  await fastify.register(adminDashboardRoutes, { prefix: '/api/admin/dashboard' });
  await fastify.register(adminTenantManagementRoutes, { prefix: '/api/admin/tenants' });
  await fastify.register(adminEntityManagementRoutes, { prefix: '/api/admin/entities' });
  await fastify.register(adminCreditOverviewRoutes, { prefix: '/api/admin/credits' });
  await fastify.register(seasonalCreditsRoutes, { prefix: '/api/admin/seasonal-credits' });
  await fastify.register(suiteRoutes, { prefix: '/api/suite' });
  await fastify.register(paymentsRoutes, { prefix: '/api/payments' });
  await fastify.register(activityRoutes, { prefix: '/api/activity' });
  await fastify.register(trialRoutes, { prefix: '/api/trial' });
  await fastify.register(adminPromotionRoutes, { prefix: '/api/admin-promotion' });
  await fastify.register(permissionMatrixRoutes, { prefix: '/api/permission-matrix' });
  await fastify.register(permissionSyncRoutes, { prefix: '/api/permission-sync' });
  await fastify.register(userSyncRoutes, { prefix: '/api/user-sync' });
  await fastify.register(userApplicationRoutes, { prefix: '/api/user-applications' });
  await fastify.register(organizationsRoutes, { prefix: '/api/organizations' });
  await fastify.register(locationsRoutes, { prefix: '/api/locations' });
  console.log('📋 Registering entities routes...');
  await fastify.register(entitiesRoutes, { prefix: '/api/entities' });
  console.log('✅ Entities routes registered successfully');
  await fastify.register(paymentUpgradeRoutes, { prefix: '/api/payment-upgrade' });
  await fastify.register(creditsRoutes, { prefix: '/api/credits' });
  await fastify.register(creditExpiryRoutes, { prefix: '/api/credits/expiry' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
  await fastify.register(demoRoutes, { prefix: '/api/demo' });
  await fastify.register(enhancedCrmIntegrationRoutes, { prefix: '/api/enhanced-crm-integration' });
  await fastify.register(wrapperCrmSyncRoutes, { prefix: '/api/wrapper' });
  await fastify.register(userVerificationRoutes, { prefix: '/api' });
  await fastify.register(healthRoutes, { prefix: '/api' });
  console.log('📋 Registering entity-scope routes...');
  await fastify.register(entityScopeRoutes, { prefix: '/api/admin' });
  console.log('✅ Entity-scope routes registered successfully');

  // RLS Example Routes (temporarily disabled - need Fastify compatibility)
  // TODO: Implement Fastify-compatible RLS routes
  /*
  if (rlsService) {
    await fastify.register(async (fastifyInstance) => {
      createRLSRoutes(fastifyInstance, rlsService.db, rlsService.sql);
    });
  }
  */

  // Applications endpoint (direct database query)
  fastify.get('/api/applications', async (request, reply) => {
    try {
      // Get organization applications directly from database
      const { tenantId } = request.userContext;

      if (!tenantId) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      console.log('📱 Getting applications for tenant:', { tenantId });

      // Import required schemas
      const { applications, organizationApplications } = await import('./db/schema/suite-schema.js');
      const { eq, and } = await import('drizzle-orm');

      // Get applications enabled for this organization
      const userApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          isCore: applications.isCore,
          sortOrder: applications.sortOrder,
          isEnabled: organizationApplications.isEnabled,
          subscriptionTier: organizationApplications.subscriptionTier,
          enabledModules: organizationApplications.enabledModules
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(and(
          eq(organizationApplications.tenantId, tenantId),
          eq(organizationApplications.isEnabled, true)
        ))
        .orderBy(applications.sortOrder, applications.appName);

      return {
        success: true,
        data: userApps
      };

    } catch (error) {
      console.error('❌ Failed to get applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  // Public routes (no authentication required)
  await fastify.register(invitationRoutes, { prefix: '/api/invitations' });

  // Redirect root /auth to /api/auth/auth for CRM compatibility
  fastify.get('/auth', async (request, reply) => {
    const { app_code, redirect_url, ...otherParams } = request.query;

    console.log('🎯 ROOT /auth ENDPOINT HIT!', {
      app_code,
      redirect_url,
      method: request.method,
      url: request.url,
      fullUrl: request.protocol + '://' + request.hostname + request.url,
      headers: request.headers['user-agent']
    });

    // Instead of redirecting, let's handle it directly here
    // This avoids redirect loops and ensures proper handling
    try {
      // Validate app_code
      const validAppCodes = ['crm', 'hr', 'affiliate', 'accounting', 'inventory'];
      if (!app_code || !validAppCodes.includes(app_code)) {
        console.log('❌ Invalid app_code:', app_code);
        return reply.code(400).send({
          error: 'Invalid app_code',
          message: `app_code must be one of: ${validAppCodes.join(', ')}`
        });
      }

      if (!redirect_url) {
        console.log('❌ Missing redirect_url');
        return reply.code(400).send({
          error: 'Missing redirect_url',
          message: 'redirect_url parameter is required'
        });
      }

      console.log('✅ Valid CRM auth request, processing... (SSO removed)');

      // User not authenticated, redirect to Kinde auth with app context
      const kindeService = await import('./services/kinde-service.js');
      // Use backend callback URL - this is the most reliable approach
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/callback`;
      const stateData = {
        app_code,
        redirect_url,
        timestamp: Date.now()
      };

      console.log('🔍 Generating Kinde auth URL with:', {
        redirectUri,
        stateData,
        fullState: JSON.stringify(stateData)
      });

      const kindeAuthUrl = kindeService.default.generateSocialLoginUrl({
        redirectUri,
        state: JSON.stringify(stateData),
        prompt: 'login'
      });

      console.log('🚀 Redirecting to Kinde authentication:', kindeAuthUrl);
      console.log('🔍 Decoded redirect URI:', decodeURIComponent(redirectUri));
      return reply.redirect(kindeAuthUrl);

    } catch (error) {
      console.error('❌ Root auth handler error:', error);
      return reply.code(500).send({
        error: 'Authentication failed',
        message: error.message
      });
    }
  });

  // Test endpoint for CRM authentication (bypasses Kinde for testing)
  fastify.get('/test-auth', async (request, reply) => {
    const { app_code, redirect_url } = request.query;

    console.log('🧪 Test auth endpoint called:', { app_code, redirect_url });

    if (!app_code || !redirect_url) {
      return reply.code(400).send({
        error: 'Missing parameters',
        message: 'app_code and redirect_url are required'
      });
    }

    try {
      // Create a simple test token without database queries
      const jwt = await import('jsonwebtoken');

      const testTokenPayload = {
        iss: 'unified-wrapper-sso',
        sub: 'test-user-123',
        aud: app_code,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours

        // Test user data
        user: {
          id: 'test-user-123',
          kindeId: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: true,
          isActive: true
        },

        // Test organization data
        organization: {
          id: 'test-org-123',
          name: 'Test Organization',
          subdomain: 'test',
          kindeOrgId: 'test-org'
        },

        // Test permissions
        permissions: {
          crm: {
            contacts: ['read', 'write', 'delete'],
            deals: ['read', 'write'],
            reports: ['read']
          }
        },

        // Test subscription
        subscription: {
          tier: 'premium',
          status: 'active',
          subscribedFeatures: ['crm', 'analytics', 'billing']
        }
      };

      const testToken = jwt.default.sign(
        testTokenPayload,
        process.env.JWT_SECRET || 'test-secret-key',
        { algorithm: 'HS256' }
      );

      const expiresAt = new Date(Date.now() + (8 * 60 * 60 * 1000)); // 8 hours from now

      const targetUrl = new URL(redirect_url);
      targetUrl.searchParams.set('token', testToken);
      targetUrl.searchParams.set('expires_at', expiresAt.toISOString());
      targetUrl.searchParams.set('app_code', app_code);
      targetUrl.searchParams.set('test_mode', 'true');

      console.log('🧪 Test auth: Redirecting to CRM with test token');
      console.log('🔍 Target URL:', targetUrl.toString());
      console.log('🔍 Token length:', testToken.length);
      console.log('🔍 App code:', app_code);
      console.log('🔍 Test mode:', 'true');

      return reply.redirect(targetUrl.toString());

    } catch (error) {
      console.error('❌ Test auth error:', error);
      return reply.code(500).send({
        error: 'Test authentication failed',
        message: error.message
      });
    }
  });

  // Redirect root /logout to /api/auth/logout for CRM compatibility
  fastify.get('/logout', async (request, reply) => {
    const { app_code, redirect_url, ...otherParams } = request.query;

    console.log('🔍 Root /logout redirect:', { app_code, redirect_url });

    // Build the redirect URL
    const redirectUrl = new URL('/api/auth/logout', `${process.env.BACKEND_URL || 'http://localhost:3000'}`);

    // Add all query parameters
    if (app_code) redirectUrl.searchParams.set('app_code', app_code);
    if (redirect_url) redirectUrl.searchParams.set('redirect_url', redirect_url);

    // Add any other parameters
    Object.keys(otherParams).forEach(key => {
      redirectUrl.searchParams.set(key, otherParams[key]);
    });

    console.log('🚀 Redirecting to:', redirectUrl.toString());
    return reply.redirect(redirectUrl.toString());
  });

  // Note: Static files should be served by nginx/reverse proxy in production
  // No catch-all route needed here - let nginx handle frontend routes
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log('🛑 Starting graceful shutdown...');

  try {
    // Close Fastify server first
    await fastify.close();
    console.log('✅ Fastify server closed.');

    // Disconnect Redis connections
    try {
      const redisManager = (await import('./utils/redis.js')).default;
      await redisManager.disconnect();
      console.log('✅ Redis connections closed.');
    } catch (redisError) {
      console.warn('⚠️ Error closing Redis connections:', redisError.message);
    }

    console.log('✅ Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    console.log('🚀 Starting Wrapper API Server...');

    // Initialize database connection manager FIRST
    console.log('🔌 Initializing database connections...');
    await dbManager.initialize();
    console.log('✅ Database connections initialized successfully');

    // Register everything
    await registerPlugins();
    await registerMiddleware();

    // Initialize RLS before registering routes
    await initializeRLS();

    await registerRoutes();

    // Start the server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    const server = await fastify.listen({ port, host });

    // Initialize WebSocket server for real-time notifications
    try {
      const { initWebSocketServer } = await import('./utils/websocket-server.js');
      // Get the underlying HTTP server from Fastify
      initWebSocketServer(fastify.server);
      console.log('✅ WebSocket server initialized for real-time notifications');
    } catch (error) {
      console.warn('⚠️ Failed to initialize WebSocket server:', error.message);
      // Don't fail startup if WebSocket fails
    }

    console.log(`✅ Server listening on http://${host}:${port}`);
    console.log(`📚 API Documentation: http://${host}:${port}/docs`);
    console.log(`🏥 Health Check: http://${host}:${port}/health`);

    // TEST: Force a log to Elasticsearch
    try {
      const enhancedLogger = (await import('./utils/logger-enhanced.js')).default;
      enhancedLogger.winstonLogger.info('Server started successfully', {
        port,
        host,
        environment: process.env.NODE_ENV || 'development',
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        timestamp: new Date().toISOString()
      });
      console.log('📝 Test log sent to Elasticsearch');
    } catch (error) {
      console.error('❌ Failed to send test log:', error.message);
      // Check for Elasticsearch connection errors
      if (error.message.includes('Elasticsearch') || error.message.includes('ECONNREFUSED')) {
        console.warn('⚠️ Elasticsearch may not be running or accessible');
        console.warn('   Make sure Elasticsearch is running: docker compose ps');
        console.warn('   Check ELASTICSEARCH_URL environment variable');
      }
    }

    // // Initialize trial monitoring system after app setup
    // await initializeTrialSystem();

    // Initialize Redis connection for sync services
    try {
      const redisManager = (await import('./utils/redis.js')).default;
      await redisManager.connect();
      console.log('✅ Redis sync services initialized');

      // Verify Redis connection
      if (!redisManager.isConnected) {
        console.warn('⚠️ Redis connected but isConnected flag is false');
      } else {
        console.log('✅ Redis connection verified');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis services:', error);
      console.error('Redis error details:', error.message);
      // Don't fail startup for Redis issues, but log prominently
    }

    // Setup graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}` || process.env.NODE_ENV !== 'production') {
  start();
}

// // Initialize trial monitoring system after app setup
// export async function initializeTrialSystem() {
//   try {
//     console.log('🚀 Initializing trial monitoring system...');

//     // Start trial monitoring
//     trialManager.startTrialMonitoring();

//     // Verify it's running
//     const status = trialManager.getMonitoringStatus();
//     if (status.isRunning) {
//       console.log('✅ Trial monitoring system initialized successfully');
//       console.log(`📊 Active jobs: ${status.activeJobs}`);
//     } else {
//       console.error('❌ Failed to initialize trial monitoring system');
//     }

//   } catch (error) {
//     console.error('❌ Error initializing trial system:', error);
//   }
// }

// Initialize credit expiry monitoring system after app setup
export async function initializeCreditExpirySystem() {
  try {
    console.log('🚀 Initializing credit expiry monitoring system...');

    // Start credit expiry monitoring
    creditExpiryManager.startExpiryMonitoring();

    // Verify it's running
    const status = creditExpiryManager.getMonitoringStatus();
    if (status.isRunning) {
      console.log('✅ Credit expiry monitoring system initialized successfully');
      console.log(`📊 Active jobs: ${status.activeJobs}`);
    } else {
      console.error('❌ Failed to initialize credit expiry monitoring system');
    }

  } catch (error) {
    console.error('❌ Error initializing credit expiry system:', error);
  }
}

// // Call initialization after database connection is established
// if (process.env.NODE_ENV !== 'test') {
//   // Delay initialization to ensure database is ready
//   setTimeout(() => {
//     initializeTrialSystem().catch(error => {
//       console.error('Failed to initialize trial system:', error);
//     });
//   }, 2000);
// }

// Call credit expiry initialization after database connection is established
if (process.env.NODE_ENV !== 'test') {
  // Delay initialization to ensure database is ready
  setTimeout(() => {
    initializeCreditExpirySystem().catch(error => {
      console.error('Failed to initialize credit expiry system:', error);
    });
  }, 3000);
}

export default fastify;
