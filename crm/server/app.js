import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

// Allowlist domains that must bypass strict CSP (Kinde auth, CDN assets, etc.)
const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const KINDE_DOMAIN = (process.env.KINDE_DOMAIN || process.env.VITE_KINDE_DOMAIN || 'https://auth.zopkit.com').replace(/\/$/, '');
const API_ORIGIN = (process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
const ALLOWED_CONNECT_SRCS = ["'self'", FRONTEND_ORIGIN, KINDE_DOMAIN];
if (API_ORIGIN) ALLOWED_CONNECT_SRCS.push(API_ORIGIN);

// Import services
import { initializeConsumerManager } from './services/CRMConsumerManager.js';
import tenantMiddleware from './middleware/tenantMiddleware.js';
import auth from './middleware/auth.js';

// Import routes
// API routes (use actual file paths under routes/api)
import authRoutes from './routes/api/auth.js';
import opportunityRoutes from './routes/api/opportunities.js';
import accountRoutes from './routes/api/accounts.js';
import contactsRoutes from './routes/api/contacts.js';
import creditsRoutes from './routes/api/credits.js';
import leadsRoutes from './routes/api/leads.js';
import formsRoutes from './routes/api/forms.js';
import quotationsRoutes from './routes/api/quotations.js';
import invoicesRoutes from './routes/api/invoices.js';
import inventoryRoutes from './routes/api/inventory.js';
import ticketsRoutes from './routes/api/tickets.js';
import productOrdersRoutes from './routes/api/productOrders.js';
import analyticsRoutes from './routes/api/analytics.js';
import wrapperRoutes from './routes/wrapperRoutes.js';

// Import admin routes
import adminDropdownRoutes from './routes/api/admin/dropdowns.js';
import adminReportsRoutes from './routes/api/admin/reports.js';
import adminUsersRoutes from './routes/api/admin/users.js';

// Import sync routes (ES module - use dynamic import)
let syncRoutes;
(async () => {
  const syncModule = await import('./routes/api/sync.js');
  syncRoutes = syncModule.default;
})();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust proxy so rate limiting/IP detection work correctly behind ALB/proxy
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,   // turn off CSP for test
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Note: CRM is now hosted on subdomain (crm.zopkit.com) instead of path (/crm)
// No path rewriting needed - requests come directly to root

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain a minimum of 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
})
.then(async () => {
  console.log('✅ Connected to MongoDB');

  // Initialize Sync Orchestration Service after MongoDB connection
  try {
    const { default: syncOrchestrationService } = await import('./services/syncOrchestrationService.js');
    await syncOrchestrationService.initialize();
    console.log('✅ Sync Orchestration Service initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Sync Orchestration Service:', err);
  }
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Initialize CRM Consumer Manager
initializeConsumerManager({
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  wrapperApiUrl: process.env.WRAPPER_API_URL || 'http://localhost:3001',
  wrapperApiKey: process.env.WRAPPER_API_KEY,
  maxConsumers: 100
}).then(() => {
  console.log('✅ CRM Consumer Manager initialized');
}).catch((err) => {
  console.error('❌ Failed to initialize CRM Consumer Manager:', err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: 'checking...' // This would be checked by the consumer manager
    }
  });
});

// Wrapper API routes (for CRM consumers)
app.use('/api/wrapper', wrapperRoutes);

// CRM API routes with tenant isolation
app.use('/api/auth', authRoutes);

// Sync management routes (tenant data sync)
app.use('/api/sync', (req, res, next) => {
  if (syncRoutes) {
    syncRoutes(req, res, next);
  } else {
    res.status(503).json({ success: false, message: 'Sync routes not yet loaded' });
  }
});

// All CRM routes require authentication and tenant isolation
app.use('/api/opportunities',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  opportunityRoutes
);

app.use('/api/accounts',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  accountRoutes
);

app.use('/api/contacts',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  contactsRoutes
);

app.use('/api/credits',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  creditsRoutes
);

app.use('/api/leads',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  tenantMiddleware.requirePermission('crm.leads.read'),
  leadsRoutes
);

app.use('/api/forms',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  formsRoutes
);

app.use('/api/quotations',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  quotationsRoutes
);

app.use('/api/invoices',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  invoicesRoutes
);

app.use('/api/inventory',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  inventoryRoutes
);

app.use('/api/tickets',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  ticketsRoutes
);

app.use('/api/product-orders',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  productOrdersRoutes
);

app.use('/api/analytics',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  analyticsRoutes
);

// Admin routes (system configuration)
app.use('/api/admin/dropdowns',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  adminDropdownRoutes
);

// Alias route for sys-config (maintains compatibility with frontend)
app.use('/api/admin/sys-config/dropdowns',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  adminDropdownRoutes
);

app.use('/api/admin/reports',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  adminReportsRoutes
);

app.use('/api/admin/users',
  auth,
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  adminUsersRoutes
);

// Example of using middleware for specific operations
app.post('/api/leads',
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  tenantMiddleware.requirePermission('crm.leads.create'),
  tenantMiddleware.checkCreditCost('crm.leads.create'),
  tenantMiddleware.logActivity('crm.leads.create', 'lead'),
  async (req, res) => {
    try {
      const consumer = req.crmConsumer;
      const userId = req.user?.id || req.user?.userId;
      const tenantId = req.tenantId;
      const creditCost = req.creditCost;

      // Your lead creation logic here
      const leadData = {
        ...req.body,
        tenantId,
        createdBy: userId
      };

      // Simulate lead creation
      const lead = {
        id: Date.now().toString(),
        ...leadData,
        createdAt: new Date().toISOString()
      };

      // Log activity (this will be done automatically by the middleware)
      // But you can also log additional details
      await consumer.logActivity({
        userId,
        operation: 'crm.leads.create',
        entityType: 'lead',
        entityId: lead.id,
        entityName: lead.name || 'New Lead',
        entityStatus: lead.status || 'new',
        creditCost,
        creditsUsed: creditCost,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          leadName: lead.name,
          source: lead.source,
          status: lead.status
        }
      });

      res.json({
        success: true,
        lead,
        creditsUsed: creditCost,
        userContext: req.userContext
      });
    } catch (error) {
      console.error('❌ Error creating lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// User activity dashboard
app.get('/api/users/:userId/activity',
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  async (req, res) => {
    try {
      const consumer = req.crmConsumer;
      const { userId } = req.params;
      const { limit = 50, since = '7d', includeDetails = true } = req.query;

      // Get user activities
      const activities = await consumer.getUserActivities(userId, {
        limit: parseInt(limit),
        since,
        includeDetails
      });

      // Get user context
      const userContext = await consumer.getUserOrganizationContext(userId);

      // Aggregate activity statistics
      const stats = activities.reduce((acc, activity) => {
        acc.totalOperations++;
        acc.totalCredits += activity.creditsUsed || 0;
        acc.operationsByType[activity.operation] = (acc.operationsByType[activity.operation] || 0) + 1;
        return acc;
      }, {
        totalOperations: 0,
        totalCredits: 0,
        operationsByType: {}
      });

      res.json({
        success: true,
        userId,
        userContext,
        activities,
        statistics: {
          ...stats,
          lastActivity: activities[0]?.timestamp,
          activePeriod: since
        }
      });
    } catch (error) {
      console.error('❌ Error getting user activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Organizational activity report
app.get('/api/reports/organizational-activity',
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.userContext(),
  tenantMiddleware.requirePermission('reports.organizational'),
  async (req, res) => {
    try {
      const consumer = req.crmConsumer;
      const { orgCode } = req.query;
      const { since = '30d', groupBy = 'day' } = req.query;

      // Get organizational activities
      const activities = await consumer.getOrganizationalActivities(orgCode, since);

      // Get organization hierarchy
      const hierarchy = await consumer.getOrganizationHierarchy(orgCode);

      // Generate report
      const report = activities.reduce((acc, activity) => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            totalOperations: 0,
            totalCredits: 0,
            operationsByType: {},
            users: new Set()
          };
        }
        
        acc[date].totalOperations++;
        acc[date].totalCredits += activity.creditsUsed || 0;
        acc[date].operationsByType[activity.operation] = (acc[date].operationsByType[activity.operation] || 0) + 1;
        acc[date].users.add(activity.userId);
        
        return acc;
      }, {});

      const reportData = Object.values(report).map(day => ({
        ...day,
        uniqueUsers: day.users.size,
        users: undefined // Remove Set from response
      }));

      res.json({
        success: true,
        orgCode,
        hierarchy,
        report: reportData,
        summary: {
          totalDays: reportData.length,
          totalOperations: activities.length,
          totalCredits: activities.reduce((sum, activity) => sum + (activity.creditsUsed || 0), 0),
          period: since
        }
      });
    } catch (error) {
      console.error('❌ Error generating organizational report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Consumer metrics endpoint
app.get('/api/metrics/consumers',
  tenantMiddleware.tenantIsolation(),
  tenantMiddleware.validateTenant(),
  tenantMiddleware.requirePermission('admin.metrics'),
  async (req, res) => {
    try {
      const consumer = req.crmConsumer;
      const metrics = consumer.getMetrics();
      
      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error('❌ Error getting consumer metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Serve CRM frontend from root (subdomain structure: crm.zopkit.com)
const staticDir = path.join(__dirname, '..', 'dist');
app.use(express.static(staticDir));

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res, next) => {
  // Skip API routes - they should return 404 from the 404 handler below
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(staticDir, 'index.html'));
});

// 404 handler (API fallback)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    const { shutdownConsumerManager } = require('./services/CRMConsumerManager');
    await shutdownConsumerManager();
    console.log('✅ Consumer manager shutdown complete');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    const { shutdownConsumerManager } = require('./services/CRMConsumerManager');
    await shutdownConsumerManager();
    console.log('✅ Consumer manager shutdown complete');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 CRM Server running on port ${PORT}`);
  console.log(`📊 Multi-tenant CRM with comprehensive caching enabled`);
  console.log(`🔗 Wrapper API available at /api/wrapper`);
  console.log(`🏢 Tenant isolation enabled for all CRM routes`);
});

export default app;
