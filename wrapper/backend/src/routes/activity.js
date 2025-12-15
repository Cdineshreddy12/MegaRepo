import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../services/activityLogger.js';
import { authenticateToken } from '../middleware/auth.js';
import { trackActivity } from '../middleware/activityTracker.js';

/**
 * Activity Logs API Routes
 * Provides endpoints for accessing user activities and audit logs
 */
export default async function activityRoutes(fastify, opts) {
  // Apply authentication and activity tracking to all routes
  fastify.addHook('preHandler', authenticateToken);
  fastify.addHook('preHandler', trackActivity());

  /**
   * Get current user's activity logs
   * GET /api/activity/user
   */
  fastify.get('/user', {
    schema: {
      description: 'Get current user activity logs',
      tags: ['Activity'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          action: { type: 'string' },
          app: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                activities: { type: 'array' },
                pagination: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Use the internal user ID, not the Kinde user ID
      const userId = request.user.internalUserId || request.user.userId;
      console.log('Activity API - User context:', { userId, internalUserId: request.user.internalUserId, userId: request.user.userId });

      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: 'User ID not found'
        });
      }

      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        action,
        app
      } = request.query;

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        actionFilter: action,
        appFilter: app,
        includeMetadata: true
      };

      if (startDate) {
        options.startDate = new Date(startDate);
      }
      if (endDate) {
        options.endDate = new Date(endDate);
      }

      const result = await ActivityLogger.getUserActivity(userId, options);
      console.log('Activity API - Result for user', userId, ':', result.activities.length, 'activities found');

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Failed to get user activity:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch user activity'
      });
    }
  });

  /**
   * Get tenant audit logs (admin only)
   * GET /api/activity/audit
   */
  fastify.get('/audit', {
    schema: {
      description: 'Get tenant audit logs (admin only)',
      tags: ['Activity'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          includeDetails: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Check if user is admin (simplified check - in production use proper permission system)
      const { tenantId, email, isTenantAdmin } = request.user;
      
      if (!isTenantAdmin && !email?.includes('admin')) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const {
        limit = 100,
        offset = 0,
        startDate,
        endDate,
        action,
        resourceType,
        userId,
        includeDetails = true
      } = request.query;

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        actionFilter: action,
        resourceTypeFilter: resourceType,
        userFilter: userId,
        includeDetails: includeDetails === 'true'
      };

      if (startDate) {
        options.startDate = new Date(startDate);
      }
      if (endDate) {
        options.endDate = new Date(endDate);
      }

      const result = await ActivityLogger.getTenantAuditLogs(tenantId, options);
      console.log('Audit API - Result for tenant', tenantId, ':', result.logs.length, 'logs found');

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Failed to get audit logs:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  });

  /**
   * Get activity statistics
   * GET /api/activity/stats
   */
  fastify.get('/stats', {
    schema: {
      description: 'Get activity statistics for dashboard',
      tags: ['Activity'],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d'],
            default: '24h'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, isTenantAdmin, email } = request.user;
      const { period = '24h' } = request.query;

      // Check if user has permission to view stats
      if (!isTenantAdmin && !email?.includes('admin')) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const stats = await ActivityLogger.getActivityStats(tenantId, period);

      return reply.send({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Failed to get activity stats:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch activity statistics'
      });
    }
  });

  /**
   * Get user activity summary
   * GET /api/activity/user/:userId/summary
   */
  fastify.get('/user/:userId/summary', {
    schema: {
      description: 'Get user activity summary (admin only)',
      tags: ['Activity'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' }
        },
        required: ['userId']
      },
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 90, default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { isTenantAdmin, email } = request.user;
      const { userId } = request.params;
      const { days = 30 } = request.query;

      // Check admin permissions
      if (!isTenantAdmin && !email?.includes('admin')) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Use the userId parameter directly as it should be the internal UUID
      const result = await ActivityLogger.getUserActivity(userId, {
        limit: 1000, // Get more data for summary
        startDate,
        endDate,
        includeMetadata: false
      });

      // Process activities to create summary
      const activities = result.activities;
      const summary = {
        totalActivities: activities.length,
        period: { days, startDate, endDate },
        activityBreakdown: {},
        appUsage: {},
        dailyActivity: [],
        mostActiveDay: null,
        lastActivity: activities.length > 0 ? activities[0].createdAt : null
      };

      // Group by activity type
      activities.forEach(activity => {
        const action = activity.action;
        const appName = activity.appName || 'System';
        const date = new Date(activity.createdAt).toDateString();

        // Activity breakdown
        summary.activityBreakdown[action] = (summary.activityBreakdown[action] || 0) + 1;

        // App usage
        summary.appUsage[appName] = (summary.appUsage[appName] || 0) + 1;

        // Daily activity
        const existingDay = summary.dailyActivity.find(d => d.date === date);
        if (existingDay) {
          existingDay.count++;
        } else {
          summary.dailyActivity.push({ date, count: 1 });
        }
      });

      // Sort daily activity and find most active day
      summary.dailyActivity.sort((a, b) => new Date(a.date) - new Date(b.date));
      summary.mostActiveDay = summary.dailyActivity.reduce((max, day) => 
        day.count > (max?.count || 0) ? day : max, null);

      return reply.send({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('❌ Failed to get user activity summary:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch user activity summary'
      });
    }
  });

  /**
   * Export activity logs
   * POST /api/activity/export
   */
  fastify.post('/export', {
    schema: {
      description: 'Export activity logs (admin only)',
      tags: ['Activity'],
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['user', 'audit'], default: 'audit' },
          format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          filters: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date-time' },
              endDate: { type: 'string', format: 'date-time' },
              userId: { type: 'string', format: 'uuid' },
              action: { type: 'string' },
              resourceType: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, isTenantAdmin, email } = request.user;
      
      // Check admin permissions
      if (!isTenantAdmin && !email?.includes('admin')) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const { type = 'audit', format = 'json', filters = {} } = request.body;

      let data;
      let filename;

      if (type === 'audit') {
        const result = await ActivityLogger.getTenantAuditLogs(tenantId, {
          limit: 10000, // Large limit for export
          ...filters,
          // Convert userFilter to internal ID if it's a Kinde ID
          userFilter: filters.userId
        });
        data = result.logs;
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}`;
      } else {
        // Export all user activities (admin only)
        // Use the userFilter directly as it should be the internal UUID for export
        const result = await ActivityLogger.getUserActivity(filters.userId, {
          limit: 10000,
          ...filters
        });
        data = result.activities;
        filename = `user-activities-${new Date().toISOString().split('T')[0]}`;
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = convertToCSV(data, type);
        
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
        
        return reply.send(csvData);
      } else {
        // JSON format
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', `attachment; filename="${filename}.json"`);
        
        return reply.send({
          exportedAt: new Date().toISOString(),
          type,
          count: data.length,
          data
        });
      }

    } catch (error) {
      console.error('❌ Failed to export activity logs:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to export activity logs'
      });
    }
  });

  /**
   * Get available activity types and resource types
   * GET /api/activity/types
   */
  fastify.get('/types', {
    schema: {
      description: 'Get available activity and resource types',
      tags: ['Activity']
    }
  }, async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        activityTypes: ACTIVITY_TYPES,
        resourceTypes: RESOURCE_TYPES
      }
    });
  });
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data, type) {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  const headers = type === 'audit' 
    ? ['Date', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address']
    : ['Date', 'Action', 'Application', 'IP Address'];

  const rows = data.map(item => {
    if (type === 'audit') {
      return [
        new Date(item.createdAt).toISOString(),
        `${item.userName || 'Unknown'} (${item.userEmail || 'unknown'})`,
        item.action,
        item.resourceType,
        item.resourceId || '',
        item.ipAddress || ''
      ];
    } else {
      return [
        new Date(item.createdAt).toISOString(),
        item.action,
        item.appName || 'System',
        item.ipAddress || ''
      ];
    }
  });

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
} 