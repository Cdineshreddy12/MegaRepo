import { db } from '../db/index.js';
import { usageLogs, tenants, tenantUsers } from '../db/schema/index.js';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { UsageCache } from '../utils/redis.js';

class AnalyticsService {
  /**
   * Get dashboard overview with key metrics
   */
  async getDashboardOverview(tenantId) {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get real-time metrics from Redis
      const [
        totalApiCalls,
        activeUsers,
        currentUsage
      ] = await Promise.all([
        UsageCache.getApiCalls(tenantId),
        UsageCache.getActiveUsers(tenantId),
        UsageCache.getCurrentUsage(tenantId)
      ]);

      // Get historical data from database
      const [
        dailyStats,
        weeklyStats,
        monthlyStats,
        topEndpoints,
        errorRate
      ] = await Promise.all([
        this.getUsageStats(tenantId, yesterday, now),
        this.getUsageStats(tenantId, lastWeek, now),
        this.getUsageStats(tenantId, lastMonth, now),
        this.getTopEndpoints(tenantId, lastWeek, 5),
        this.getErrorRate(tenantId, lastWeek, now)
      ]);

      return {
        overview: {
          totalApiCalls: totalApiCalls || 0,
          activeUsers: activeUsers || 0,
          currentUsage: currentUsage || {},
          errorRate: errorRate || 0
        },
        trends: {
          daily: dailyStats,
          weekly: weeklyStats,
          monthly: monthlyStats
        },
        insights: {
          topEndpoints,
          performanceScore: this.calculatePerformanceScore(dailyStats, errorRate),
          usageGrowth: this.calculateGrowth(weeklyStats, monthlyStats)
        }
      };
    } catch (error) {
      console.error('Dashboard overview error:', error);
      throw new Error('Failed to generate dashboard overview');
    }
  }

  /**
   * Get usage metrics with filtering and time periods
   */
  async getUsageMetrics(tenantId, options = {}) {
    try {
      const {
        period = 'day',
        startDate,
        endDate,
        app,
        granularity = 'day'
      } = options;

      let start, end;
      
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        switch (period) {
          case 'hour':
            start = new Date(end.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        }
      }

      const whereConditions = [
        eq(usageLogs.tenantId, tenantId),
        gte(usageLogs.createdAt, start),
        lte(usageLogs.createdAt, end)
      ];

      if (app) {
        whereConditions.push(eq(usageLogs.app, app));
      }

      // Get time series data based on granularity
      const timeSeriesData = await this.getTimeSeriesData(
        tenantId,
        start,
        end,
        granularity,
        app
      );

      // Get aggregated metrics
      const aggregated = await db
        .select({
          totalCalls: count(),
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`,
          totalErrors: sql`SUM(CASE WHEN ${usageLogs.statusCode} >= 400 THEN 1 ELSE 0 END)`,
          uniqueUsers: sql`COUNT(DISTINCT ${usageLogs.userId})`,
          appsUsed: sql`COUNT(DISTINCT ${usageLogs.app})`
        })
        .from(usageLogs)
        .where(and(...whereConditions));

      // Get app breakdown
      const appBreakdown = await db
        .select({
          app: usageLogs.app,
          calls: count(),
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`
        })
        .from(usageLogs)
        .where(and(...whereConditions))
        .groupBy(usageLogs.app);

      return {
        timeSeries: timeSeriesData,
        aggregated: aggregated[0] || {},
        breakdown: {
          byApp: appBreakdown
        },
        period: { start, end, granularity }
      };
    } catch (error) {
      console.error('Usage metrics error:', error);
      throw new Error('Failed to fetch usage metrics');
    }
  }

  /**
   * Get real-time usage data
   */
  async getRealtimeUsage(tenantId) {
    try {
      const [
        currentUsers,
        apiCallsToday,
        responseTimeAvg,
        errorRate,
        topEndpoints
      ] = await Promise.all([
        UsageCache.getActiveUsers(tenantId),
        UsageCache.getApiCalls(tenantId, 'today'),
        this.getCurrentResponseTime(tenantId),
        this.getCurrentErrorRate(tenantId),
        this.getTopEndpoints(tenantId, new Date(Date.now() - 60 * 60 * 1000), 5)
      ]);

      return {
        activeUsers: currentUsers || 0,
        apiCallsToday: apiCallsToday || 0,
        avgResponseTime: responseTimeAvg || 0,
        errorRate: errorRate || 0,
        topEndpoints: topEndpoints || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Realtime usage error:', error);
      throw new Error('Failed to fetch realtime usage');
    }
  }

  /**
   * Get user activity data
   */
  async getUserActivity(tenantId, options = {}) {
    try {
      const {
        userId,
        period = 'week',
        page = 1,
        limit = 20
      } = options;

      const end = new Date();
      let start;
      switch (period) {
        case 'day':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const whereConditions = [
        eq(usageLogs.tenantId, tenantId),
        gte(usageLogs.createdAt, start),
        lte(usageLogs.createdAt, end)
      ];

      if (userId) {
        whereConditions.push(eq(usageLogs.userId, userId));
      }

      const activities = await db
        .select()
        .from(usageLogs)
        .where(and(...whereConditions))
        .orderBy(desc(usageLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const totalCount = await db
        .select({ count: count() })
        .from(usageLogs)
        .where(and(...whereConditions));

      return {
        activities,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          hasMore: (page * limit) < (totalCount[0]?.count || 0)
        }
      };
    } catch (error) {
      console.error('User activity error:', error);
      throw new Error('Failed to fetch user activity');
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(tenantId, options = {}) {
    try {
      const { period = 'day', metric, app } = options;

      const end = new Date();
      let start;
      switch (period) {
        case 'hour':
          start = new Date(end.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      }

      const whereConditions = [
        eq(usageLogs.tenantId, tenantId),
        gte(usageLogs.createdAt, start),
        lte(usageLogs.createdAt, end)
      ];

      if (app) {
        whereConditions.push(eq(usageLogs.app, app));
      }

      const metrics = await db
        .select({
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`,
          maxResponseTime: sql`MAX(CAST(${usageLogs.responseTime} AS INTEGER))`,
          minResponseTime: sql`MIN(CAST(${usageLogs.responseTime} AS INTEGER))`,
          errorRate: sql`(SUM(CASE WHEN ${usageLogs.statusCode} >= 400 THEN 1 ELSE 0 END) * 100.0) / COUNT(*)`,
          throughput: sql`COUNT(*) / EXTRACT(EPOCH FROM (MAX(${usageLogs.createdAt}) - MIN(${usageLogs.createdAt}))) * 3600`,
          availability: sql`((COUNT(*) - SUM(CASE WHEN ${usageLogs.statusCode} = 503 THEN 1 ELSE 0 END)) * 100.0) / COUNT(*)`
        })
        .from(usageLogs)
        .where(and(...whereConditions));

      return {
        period: { start, end },
        metrics: metrics[0] || {},
        specific: metric ? metrics[0]?.[metric] : null
      };
    } catch (error) {
      console.error('Performance metrics error:', error);
      throw new Error('Failed to fetch performance metrics');
    }
  }

  /**
   * Get API usage statistics
   */
  async getApiUsage(tenantId, filters = {}) {
    try {
      const { period = 'week', endpoint, method, statusCode } = filters;

      const end = new Date();
      let start;
      switch (period) {
        case 'day':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const whereConditions = [
        eq(usageLogs.tenantId, tenantId),
        gte(usageLogs.createdAt, start),
        lte(usageLogs.createdAt, end)
      ];

      if (endpoint) {
        whereConditions.push(sql`${usageLogs.endpoint} LIKE ${`%${endpoint}%`}`);
      }
      if (method) {
        whereConditions.push(eq(usageLogs.method, method));
      }
      if (statusCode) {
        whereConditions.push(eq(usageLogs.statusCode, statusCode));
      }

      const usage = await db
        .select({
          endpoint: usageLogs.endpoint,
          method: usageLogs.method,
          calls: count(),
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`,
          errorCount: sql`SUM(CASE WHEN ${usageLogs.statusCode} >= 400 THEN 1 ELSE 0 END)`
        })
        .from(usageLogs)
        .where(and(...whereConditions))
        .groupBy(usageLogs.endpoint, usageLogs.method)
        .orderBy(desc(count()));

      return {
        usage,
        period: { start, end },
        filters
      };
    } catch (error) {
      console.error('API usage error:', error);
      throw new Error('Failed to fetch API usage');
    }
  }

  /**
   * Get billing analytics
   */
  async getBillingAnalytics(tenantId, options = {}) {
    try {
      const { period = 'month', breakdown = 'app' } = options;

      // Mock billing data for now - replace with real billing logic
      const billingData = {
        currentPeriod: {
          totalCost: 149.99,
          apiCalls: 45000,
          storage: '2.3 GB',
          bandwidth: '15.2 GB'
        },
        breakdown: {
          byApp: [
            { app: 'crm', cost: 59.99, usage: 18000 },
            { app: 'hr', cost: 39.99, usage: 12000 },
            { app: 'accounting', cost: 29.99, usage: 8000 },
            { app: 'affiliate', cost: 19.99, usage: 5000 },
            { app: 'inventory', cost: 0.03, usage: 2000 }
          ],
          byFeature: [
            { feature: 'api_calls', cost: 89.99, usage: 45000 },
            { feature: 'storage', cost: 30.00, usage: '2.3 GB' },
            { feature: 'bandwidth', cost: 30.00, usage: '15.2 GB' }
          ]
        },
        trends: {
          lastMonth: 129.99,
          growth: 15.5
        }
      };

      return billingData;
    } catch (error) {
      console.error('Billing analytics error:', error);
      throw new Error('Failed to fetch billing analytics');
    }
  }

  // Helper methods
  async getUsageStats(tenantId, start, end) {
    try {
      const stats = await db
        .select({
          totalCalls: count(),
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`,
          errorRate: sql`(SUM(CASE WHEN ${usageLogs.statusCode} >= 400 THEN 1 ELSE 0 END) * 100.0) / COUNT(*)`
        })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, tenantId),
          gte(usageLogs.createdAt, start),
          lte(usageLogs.createdAt, end)
        ));

      return stats[0] || { totalCalls: 0, avgResponseTime: 0, errorRate: 0 };
    } catch (error) {
      console.error('Usage stats error:', error);
      return { totalCalls: 0, avgResponseTime: 0, errorRate: 0 };
    }
  }

  async getTopEndpoints(tenantId, since, limit = 5) {
    try {
      const endpoints = await db
        .select({
          endpoint: usageLogs.endpoint,
          calls: count(),
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`
        })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, tenantId),
          gte(usageLogs.createdAt, since)
        ))
        .groupBy(usageLogs.endpoint)
        .orderBy(desc(count()))
        .limit(limit);

      return endpoints;
    } catch (error) {
      console.error('Top endpoints error:', error);
      return [];
    }
  }

  async getErrorRate(tenantId, start, end) {
    try {
      const result = await db
        .select({
          errorRate: sql`(SUM(CASE WHEN ${usageLogs.statusCode} >= 400 THEN 1 ELSE 0 END) * 100.0) / COUNT(*)`
        })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, tenantId),
          gte(usageLogs.createdAt, start),
          lte(usageLogs.createdAt, end)
        ));

      return result[0]?.errorRate || 0;
    } catch (error) {
      console.error('Error rate error:', error);
      return 0;
    }
  }

  async getCurrentResponseTime(tenantId) {
    try {
      const result = await db
        .select({
          avgResponseTime: sql`AVG(CAST(${usageLogs.responseTime} AS INTEGER))`
        })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, tenantId),
          gte(usageLogs.createdAt, new Date(Date.now() - 60 * 60 * 1000)) // Last hour
        ));

      return result[0]?.avgResponseTime || 0;
    } catch (error) {
      console.error('Current response time error:', error);
      return 0;
    }
  }

  async getCurrentErrorRate(tenantId) {
    try {
      const result = await db
        .select({
          errorRate: sql`(SUM(CASE WHEN ${usageLogs.statusCode} >= 400 THEN 1 ELSE 0 END) * 100.0) / COUNT(*)`
        })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, tenantId),
          gte(usageLogs.createdAt, new Date(Date.now() - 60 * 60 * 1000)) // Last hour
        ));

      return result[0]?.errorRate || 0;
    } catch (error) {
      console.error('Current error rate error:', error);
      return 0;
    }
  }

  async getTimeSeriesData(tenantId, start, end, granularity, app) {
    // This would generate time series data based on granularity
    // For now, return mock data
    const data = [];
    const interval = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    for (let time = start.getTime(); time <= end.getTime(); time += interval) {
      data.push({
        timestamp: new Date(time).toISOString(),
        calls: Math.floor(Math.random() * 1000),
        responseTime: Math.floor(Math.random() * 500),
        errors: Math.floor(Math.random() * 50)
      });
    }
    
    return data;
  }

  calculatePerformanceScore(stats, errorRate) {
    // Simple performance score calculation
    const responseTimeScore = Math.max(0, 100 - (stats.avgResponseTime || 0) / 10);
    const errorRateScore = Math.max(0, 100 - (errorRate || 0) * 2);
    return Math.round((responseTimeScore + errorRateScore) / 2);
  }

  calculateGrowth(current, previous) {
    if (!previous || !previous.totalCalls || !current || !current.totalCalls) {
      return 0;
    }
    return Math.round(((current.totalCalls - previous.totalCalls) / previous.totalCalls) * 100);
  }
}

export default new AnalyticsService(); 