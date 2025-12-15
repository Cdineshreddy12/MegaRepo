import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import analyticsService from '../services/analyticsService.js';
import { db } from '../db/index.js';
import { subscriptions, payments } from '../db/schema/index.js';
import { eq, and, desc, gte, lte, count, sum, sql } from 'drizzle-orm';
import { SubscriptionService } from '../features/subscriptions/index.js';

// Fastify plugin for analytics routes
export default async function analyticsRoutes(fastify, options) {

// Get dashboard overview
fastify.get('/dashboard', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage]
}, async (request, reply) => {
  try {
    const overview = await analyticsService.getDashboardOverview(request.user.tenantId);
    
    return {
      success: true,
      data: overview
    };
  } catch (error) {
    fastify.log.error('Error fetching dashboard overview:', error);
    return reply.code(500).send({ error: 'Failed to fetch dashboard overview' });
  }
});

// Get usage metrics
fastify.get('/usage', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['hour', 'day', 'week', 'month', 'year'], default: 'day' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        app: { type: 'string', enum: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'] },
        granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { period, startDate, endDate, app, granularity } = request.query;
    const metrics = await analyticsService.getUsageMetrics(request.user.tenantId, {
      period,
      startDate,
      endDate,
      app,
      granularity
    });
    
    return {
      success: true,
      data: metrics
    };
  } catch (error) {
    fastify.log.error('Error fetching usage metrics:', error);
    return reply.code(500).send({ error: 'Failed to fetch usage metrics' });
  }
});

// Get real-time usage
fastify.get('/usage/realtime', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage]
}, async (request, reply) => {
  try {
    const realtimeData = await analyticsService.getRealtimeUsage(request.user.tenantId);
    
    return {
      success: true,
      data: realtimeData
    };
  } catch (error) {
    fastify.log.error('Error fetching realtime usage:', error);
    return reply.code(500).send({ error: 'Failed to fetch realtime usage' });
  }
});

// Get user activity
fastify.get('/users/activity', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        period: { type: 'string', enum: ['day', 'week', 'month'], default: 'week' },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { userId, period, page, limit } = request.query;
    const activity = await analyticsService.getUserActivity(request.user.tenantId, {
      userId,
      period,
      page,
      limit
    });
    
    return {
      success: true,
      data: activity
    };
  } catch (error) {
    fastify.log.error('Error fetching user activity:', error);
    return reply.code(500).send({ error: 'Failed to fetch user activity' });
  }
});

// Get performance metrics
fastify.get('/performance', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
        metric: { type: 'string', enum: ['response_time', 'error_rate', 'throughput', 'availability'] },
        app: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { period, metric, app } = request.query;
    const performance = await analyticsService.getPerformanceMetrics(request.user.tenantId, {
      period,
      metric,
      app
    });
    
    return {
      success: true,
      data: performance
    };
  } catch (error) {
    fastify.log.error('Error fetching performance metrics:', error);
    return reply.code(500).send({ error: 'Failed to fetch performance metrics' });
  }
});

// Get API usage statistics
fastify.get('/api-usage', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['day', 'week', 'month'], default: 'week' },
        endpoint: { type: 'string' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        statusCode: { type: 'integer' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const filters = request.query;
    const apiUsage = await analyticsService.getApiUsage(request.user.tenantId, filters);
    
    return {
      success: true,
      data: apiUsage
    };
  } catch (error) {
    fastify.log.error('Error fetching API usage:', error);
    return reply.code(500).send({ error: 'Failed to fetch API usage' });
  }
});

// Get billing analytics
fastify.get('/billing', {
  preHandler: [authenticateToken, requirePermission('billing:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['month', 'quarter', 'year'], default: 'month' },
        breakdown: { type: 'string', enum: ['app', 'feature', 'user'], default: 'app' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { period, breakdown } = request.query;
    const billing = await analyticsService.getBillingAnalytics(request.user.tenantId, {
      period,
      breakdown
    });
    
    return {
      success: true,
      data: billing
    };
  } catch (error) {
    fastify.log.error('Error fetching billing analytics:', error);
    return reply.code(500).send({ error: 'Failed to fetch billing analytics' });
  }
});

// Get feature usage
fastify.get('/features', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        app: { type: 'string' },
        period: { type: 'string', enum: ['day', 'week', 'month'], default: 'month' },
        userId: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { app, period, userId } = request.query;
    const features = await analyticsService.getFeatureUsage(request.user.tenantId, {
      app,
      period,
      userId
    });
    
    return {
      success: true,
      data: features
    };
  } catch (error) {
    fastify.log.error('Error fetching feature usage:', error);
    return reply.code(500).send({ error: 'Failed to fetch feature usage' });
  }
});

// Get error analytics
fastify.get('/errors', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        app: { type: 'string' },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const filters = request.query;
    const errors = await analyticsService.getErrorAnalytics(request.user.tenantId, filters);
    
    return {
      success: true,
      data: errors
    };
  } catch (error) {
    fastify.log.error('Error fetching error analytics:', error);
    return reply.code(500).send({ error: 'Failed to fetch error analytics' });
  }
});

// Get custom reports
fastify.get('/reports', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { reportId, page, limit } = request.query;
    const reports = await analyticsService.getCustomReports(request.user.tenantId, {
      reportId,
      page,
      limit
    });
    
    return {
      success: true,
      data: reports
    };
  } catch (error) {
    fastify.log.error('Error fetching custom reports:', error);
    return reply.code(500).send({ error: 'Failed to fetch custom reports' });
  }
});

// Create custom report
fastify.post('/reports', {
  preHandler: [authenticateToken, requirePermission('analytics:create'), trackUsage],
  schema: {
    body: {
      type: 'object',
      required: ['name', 'config'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        config: {
          type: 'object',
          required: ['metrics', 'dimensions'],
          properties: {
            metrics: { type: 'array', items: { type: 'string' } },
            dimensions: { type: 'array', items: { type: 'string' } },
            filters: { type: 'object' },
            period: { type: 'string' },
            granularity: { type: 'string' }
          }
        },
        schedule: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
            recipients: { type: 'array', items: { type: 'string', format: 'email' } }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const reportData = {
      ...request.body,
      tenantId: request.user.tenantId,
      createdBy: request.user.id
    };
    
    const report = await analyticsService.createCustomReport(reportData);
    
    return {
      success: true,
      data: report,
      message: 'Custom report created successfully'
    };
  } catch (error) {
    fastify.log.error('Error creating custom report:', error);
    return reply.code(500).send({ error: 'Failed to create custom report' });
  }
});

// Export analytics data
fastify.post('/export', {
  preHandler: [authenticateToken, requirePermission('analytics:export'), trackUsage],
  schema: {
    body: {
      type: 'object',
      required: ['type', 'format'],
      properties: {
        type: { type: 'string', enum: ['usage', 'performance', 'billing', 'users', 'errors'] },
        format: { type: 'string', enum: ['csv', 'xlsx', 'json'] },
        period: { type: 'string' },
        filters: { type: 'object' },
        email: { type: 'string', format: 'email' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const exportData = {
      ...request.body,
      tenantId: request.user.tenantId,
      requestedBy: request.user.id
    };
    
    const exportJob = await analyticsService.exportData(exportData);
    
    return {
      success: true,
      data: exportJob,
      message: 'Export job started successfully'
    };
  } catch (error) {
    fastify.log.error('Error starting export job:', error);
    return reply.code(500).send({ error: 'Failed to start export job' });
  }
});

// Get alerts and notifications
fastify.get('/alerts', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'resolved', 'acknowledged'] },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const filters = request.query;
    const alerts = await analyticsService.getAlerts(request.user.tenantId, filters);
    
    return {
      success: true,
      data: alerts
    };
  } catch (error) {
    fastify.log.error('Error fetching alerts:', error);
    return reply.code(500).send({ error: 'Failed to fetch alerts' });
  }
});

// Create alert rule
fastify.post('/alerts/rules', {
  preHandler: [authenticateToken, requirePermission('analytics:create'), trackUsage],
  schema: {
    body: {
      type: 'object',
      required: ['name', 'metric', 'condition', 'threshold'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        metric: { type: 'string' },
        condition: { type: 'string', enum: ['>', '<', '>=', '<=', '==', '!='] },
        threshold: { type: 'number' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        notifications: {
          type: 'object',
          properties: {
            email: { type: 'boolean', default: true },
            webhook: { type: 'string', format: 'uri' },
            recipients: { type: 'array', items: { type: 'string', format: 'email' } }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const ruleData = {
      ...request.body,
      tenantId: request.user.tenantId,
      createdBy: request.user.id
    };
    
    const rule = await analyticsService.createAlertRule(ruleData);
    
    return {
      success: true,
      data: rule,
      message: 'Alert rule created successfully'
    };
  } catch (error) {
    fastify.log.error('Error creating alert rule:', error);
    return reply.code(500).send({ error: 'Failed to create alert rule' });
  }
});

// Get usage predictions
fastify.get('/predictions', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      properties: {
        metric: { type: 'string', enum: ['usage', 'cost', 'users', 'storage'] },
        period: { type: 'string', enum: ['week', 'month', 'quarter'], default: 'month' },
        app: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { metric, period, app } = request.query;
    const predictions = await analyticsService.getUsagePredictions(request.user.tenantId, {
      metric,
      period,
      app
    });
    
    return {
      success: true,
      data: predictions
    };
  } catch (error) {
    fastify.log.error('Error fetching predictions:', error);
    return reply.code(500).send({ error: 'Failed to fetch predictions' });
  }
});

// Get comparative analytics
fastify.get('/compare', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
  schema: {
    querystring: {
      type: 'object',
      required: ['metric'],
      properties: {
        metric: { type: 'string' },
        period1: { type: 'string' },
        period2: { type: 'string' },
        dimension: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { metric, period1, period2, dimension } = request.query;
    const comparison = await analyticsService.getComparativeAnalytics(request.user.tenantId, {
      metric,
      period1,
      period2,
      dimension
    });
    
    return {
      success: true,
      data: comparison
    };
  } catch (error) {
    fastify.log.error('Error fetching comparative analytics:', error);
    return reply.code(500).send({ error: 'Failed to fetch comparative analytics' });
  }
});

// GET /api/analytics/payments - Get comprehensive payment analytics
fastify.get('/payments', {
  preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage]
}, async (request, reply) => {
  try {
    console.log('📊 Fetching payment analytics...');

    // Date ranges for calculations
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Overview Metrics
    const totalRevenueQuery = await db
      .select({
        total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        count: sql`COUNT(*)`
      })
      .from(payments)
      .where(eq(payments.status, 'succeeded'));

    const totalRevenue = parseFloat(totalRevenueQuery[0]?.total || '0');
    const totalPayments = totalRevenueQuery[0]?.count || 0;

    // Active subscriptions
    const activeSubscriptions = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    // Trial subscriptions
    const trialSubscriptions = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'trialing'));

    // Conversion rate (trials that became paid)
    const totalTrials = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.plan, 'free'));

    // Trial conversions are now tracked via subscription status changes
    const convertedTrials = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.plan, 'professional'),
        eq(subscriptions.hasEverUpgraded, true)
      ));

    const conversionRate = totalTrials[0]?.count > 0 
      ? (convertedTrials[0]?.count / totalTrials[0]?.count) * 100 
      : 0;

    // 2. Revenue Chart Data (last 30 days)
    const revenueChartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPayments = await db
        .select({
          revenue: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
          count: sql`COUNT(*)`
        })
        .from(payments)
        .where(and(
          eq(payments.status, 'succeeded'),
          gte(payments.createdAt, date),
          lte(payments.createdAt, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        ));

      revenueChartData.push({
        date: dateStr,
        revenue: parseFloat(dayPayments[0]?.revenue || '0'),
        payments: dayPayments[0]?.count || 0
      });
    }

    // 3. Subscription Metrics
    const newTrialsLastWeek = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'trialing'),
        gte(subscriptions.createdAt, sevenDaysAgo)
      ));

    const expiredTrialsLastWeek = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'suspended'),
        gte(subscriptions.updatedAt, sevenDaysAgo)
      ));

    const convertedLastWeek = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.hasEverUpgraded, true),
        gte(subscriptions.firstUpgradeAt, sevenDaysAgo)
      ));

    // 4. Payment Status Distribution
    const paymentsByStatus = await db
      .select({
        status: payments.status,
        count: sql`COUNT(*)`,
        amount: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`
      })
      .from(payments)
      .groupBy(payments.status);

    const statusColors = {
      'succeeded': '#10b981',
      'failed': '#dc2626',
      'pending': '#f59e0b',
      'refunded': '#6b7280',
      'disputed': '#8b5cf6'
    };

    const formattedPaymentsByStatus = paymentsByStatus.map(status => ({
      status: status.status,
      count: status.count,
      amount: parseFloat(status.amount.toString()),
      color: statusColors[status.status] || '#64748b'
    }));

    // 5. Plan Distribution
    const planDistribution = await db
      .select({
        plan: subscriptions.plan,
        subscribers: sql`COUNT(*)`,
        revenue: sql`COALESCE(SUM(CAST(monthly_price AS DECIMAL)), 0)`
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
      .groupBy(subscriptions.plan);

    const planColors = {
      'free': '#64748b',
      'basic': '#3b82f6',
      'starter': '#10b981',
      'professional': '#f59e0b',
      'enterprise': '#8b5cf6'
    };

    const formattedPlanDistribution = planDistribution.map(plan => ({
      plan: plan.plan,
      subscribers: plan.subscribers,
      revenue: parseFloat(plan.revenue.toString()),
      color: planColors[plan.plan] || '#64748b'
    }));

    // 6. Recent Payments
    const recentPayments = await db
      .select({
        id: payments.paymentId,
        amount: payments.amount,
        status: payments.status,
        description: payments.description,
        createdAt: payments.createdAt
      })
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(10);

    const formattedRecentPayments = recentPayments.map(payment => ({
      id: payment.id,
      amount: parseFloat(payment.amount),
      status: payment.status,
      description: payment.description || 'Payment',
      createdAt: payment.createdAt.toISOString()
    }));

    // 7. Cron Job Status
    const cronJobStatus = CronService.getStatus();

    // Compile analytics data
    const analyticsData = {
      overview: {
        totalRevenue,
        totalPayments,
        averagePayment: totalPayments > 0 ? totalRevenue / totalPayments : 0,
        conversionRate,
        activeSubscriptions: activeSubscriptions[0]?.count || 0,
        trialSubscriptions: trialSubscriptions[0]?.count || 0
      },
      revenueChart: revenueChartData,
      subscriptionMetrics: {
        newTrials: newTrialsLastWeek[0]?.count || 0,
        converted: convertedLastWeek[0]?.count || 0,
        expired: expiredTrialsLastWeek[0]?.count || 0,
        churnRate: activeSubscriptions[0]?.count > 0 
          ? (expiredTrialsLastWeek[0]?.count / activeSubscriptions[0]?.count) * 100 
          : 0
      },
      paymentsByStatus: formattedPaymentsByStatus,
      planDistribution: formattedPlanDistribution,
      recentPayments: formattedRecentPayments,
      cronJobStatus
    };

    console.log('✅ Payment analytics compiled successfully');
    return analyticsData;

  } catch (error) {
    console.error('❌ Error fetching payment analytics:', error);
    return reply.code(500).send({
      error: 'Failed to fetch payment analytics',
      message: error.message
    });
  }
});

// GET /api/analytics/revenue-trends - Get detailed revenue trends
fastify.get('/revenue-trends', async (request, reply) => {
  try {
    const { period = '30d', granularity = 'day' } = request.query;
    
    let daysBack;
    switch (period) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '1y': daysBack = 365; break;
      default: daysBack = 30;
    }

    const periodStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const revenueTrends = await db
      .select({
        date: sql`DATE(created_at)`,
        revenue: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        payments: sql`COUNT(*)`,
        refunds: sql`COALESCE(SUM(CASE WHEN amount < 0 THEN CAST(amount AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(payments)
      .where(and(
        eq(payments.status, 'succeeded'),
        gte(payments.createdAt, periodStart)
      ))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    return {
      period,
      granularity,
      data: revenueTrends.map(trend => ({
        date: trend.date,
        revenue: parseFloat(trend.revenue.toString()),
        payments: trend.payments,
        refunds: Math.abs(parseFloat(trend.refunds.toString())),
        netRevenue: parseFloat(trend.revenue.toString()) - Math.abs(parseFloat(trend.refunds.toString()))
      }))
    };

  } catch (error) {
    console.error('❌ Error fetching revenue trends:', error);
    return reply.code(500).send({
      error: 'Failed to fetch revenue trends',
      message: error.message
    });
  }
});

// GET /api/analytics/subscription-funnel - Get subscription conversion funnel
fastify.get('/subscription-funnel', async (request, reply) => {
  try {
    const { period = '30d' } = request.query;
    const daysBack = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const periodStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Funnel stages
    const stages = [
      {
        name: 'Trial Started',
        query: db.select({ count: count() })
          .from(subscriptions)
          .where(and(
            eq(subscriptions.status, 'trialing'),
            gte(subscriptions.createdAt, periodStart)
          ))
      },
      {
        name: 'Trial Completed',
        query: db.select({ count: count() })
          .from(subscriptions)
          .where(and(
            sql`trial_end < NOW()`,
            gte(subscriptions.createdAt, periodStart)
          ))
      },
      {
        name: 'Converted to Paid',
        query: db.select({ count: count() })
          .from(subscriptions)
          .where(and(
            eq(subscriptions.hasEverUpgraded, true),
            gte(subscriptions.firstUpgradeAt, periodStart)
          ))
      }
    ];

    const funnelData = [];
    for (const stage of stages) {
      const result = await stage.query;
      funnelData.push({
        stage: stage.name,
        count: result[0]?.count || 0
      });
    }

    // Calculate conversion rates
    const funnelWithRates = funnelData.map((stage, index) => {
      const previousStage = funnelData[index - 1];
      const conversionRate = previousStage && previousStage.count > 0
        ? (stage.count / previousStage.count) * 100
        : 0;

      return {
        ...stage,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      };
    });

    return {
      period,
      funnel: funnelWithRates,
      overallConversionRate: funnelData[0]?.count > 0 
        ? ((funnelData[2]?.count || 0) / funnelData[0].count) * 100 
        : 0
    };

  } catch (error) {
    console.error('❌ Error fetching subscription funnel:', error);
    return reply.code(500).send({
      error: 'Failed to fetch subscription funnel',
      message: error.message
    });
  }
});

// POST /api/analytics/cron/start - Start cron jobs
fastify.post('/cron/start', async (request, reply) => {
  try {
    CronService.startAllJobs();
    return {
      message: 'Cron jobs started successfully',
      status: CronService.getStatus()
    };
  } catch (error) {
    console.error('❌ Error starting cron jobs:', error);
    return reply.code(500).send({
      error: 'Failed to start cron jobs',
      message: error.message
    });
  }
});

// POST /api/analytics/cron/stop - Stop cron jobs
fastify.post('/cron/stop', async (request, reply) => {
  try {
    CronService.stopAllJobs();
    return {
      message: 'Cron jobs stopped successfully',
      status: CronService.getStatus()
    };
  } catch (error) {
    console.error('❌ Error stopping cron jobs:', error);
    return reply.code(500).send({
      error: 'Failed to stop cron jobs',
      message: error.message
    });
  }
});

// GET /api/analytics/cron/status - Get cron job status
fastify.get('/cron/status', async (request, reply) => {
  try {
    return CronService.getStatus();
  } catch (error) {
    console.error('❌ Error getting cron status:', error);
    return reply.code(500).send({
      error: 'Failed to get cron status',
      message: error.message
    });
  }
});

} 