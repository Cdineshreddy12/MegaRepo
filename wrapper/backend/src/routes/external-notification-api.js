import { externalAppService } from '../services/external-app-service.js';
import { NotificationService } from '../services/notification-service.js';
import { NotificationTemplateService } from '../services/notification-template-service.js';
import { notificationQueueService } from '../services/notification-queue-service.js';
import { notificationRateLimiter } from '../middleware/notification-rate-limiter.js';
import { webhookService } from '../services/webhook-service.js';
import { broadcastToTenant } from '../utils/websocket-server.js';
import { db } from '../db/index.js';
import { tenants, notifications } from '../db/schema/index.js';
import { eq, sql, desc } from 'drizzle-orm';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../db/schema/notifications.js';

/**
 * External Notification API Routes
 * Public API for external applications to send notifications
 */
export default async function externalNotificationApiRoutes(fastify, options) {
  const notificationService = new NotificationService();
  const templateService = new NotificationTemplateService();

  /**
   * Middleware: Authenticate API key
   */
  async function authenticateApiKey(request, reply) {
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'API key required in X-API-Key header'
      });
    }

    try {
      const app = await externalAppService.getApplicationByApiKey(apiKey);

      if (!app || !app.isActive) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or inactive API key'
        });
      }

      // Check tenant access if restricted
      if (app.allowedTenants) {
        const allowedTenants = JSON.parse(app.allowedTenants);
        const requestedTenantId = request.body?.tenantId || request.params?.tenantId;
        
        if (requestedTenantId && !allowedTenants.includes(requestedTenantId)) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Access denied for this tenant'
          });
        }
      }

      // Attach app to request
      request.externalApp = app;

      // Track usage
      await externalAppService.trackUsage(app.appId);

    } catch (error) {
      console.error('API key authentication error:', error);
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
    }
  }

  /**
   * POST /api/v1/notifications/send
   * Send notification to a single tenant
   */
  fastify.post('/send', {
    preHandler: [authenticateApiKey, notificationRateLimiter.perApplication()],
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'title', 'message'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          type: { type: 'string', default: 'system_update' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          title: { type: 'string', maxLength: 255 },
          message: { type: 'string' },
          actionUrl: { type: 'string' },
          actionLabel: { type: 'string' },
          metadata: { type: 'object' },
          expiresAt: { type: 'string', format: 'date-time' },
          scheduledAt: { type: 'string', format: 'date-time' },
          targetUserId: { type: 'string', format: 'uuid' },
          useQueue: { type: 'boolean', default: false } // Use queue for async processing
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, useQueue, ...notificationData } = request.body;
      const app = request.externalApp;

      // Verify tenant exists
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Add app metadata
      const metadata = {
        ...(notificationData.metadata || {}),
        sentByExternalApp: true,
        appId: app.appId,
        appName: app.appName,
        sentAt: new Date().toISOString()
      };

      if (useQueue) {
        // Add to queue for async processing
        const job = await notificationQueueService.addImmediate(
          { ...notificationData, metadata },
          tenantId
        );

        return reply.send({
          success: true,
          queued: true,
          jobId: job.jobId,
          message: 'Notification queued for processing'
        });
      } else {
        // Process immediately
        const notification = await notificationService.createNotification({
          tenantId,
          ...notificationData,
          type: notificationData.type || NOTIFICATION_TYPES.SYSTEM_UPDATE,
          priority: notificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM,
          metadata
        });

        // Broadcast via WebSocket
        try {
          broadcastToTenant(tenantId, notification);
        } catch (wsError) {
          console.warn('WebSocket broadcast failed:', wsError);
        }

        // Send webhook
        try {
          await webhookService.notifyNotificationSent(app.appId, notification);
        } catch (webhookError) {
          console.warn('Webhook delivery failed:', webhookError);
        }

        return reply.send({
          success: true,
          data: {
            notificationId: notification.notificationId,
            tenantId: notification.tenantId,
            title: notification.title,
            createdAt: notification.createdAt
          }
        });
      }
    } catch (error) {
      request.log.error('Error sending notification:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to send notification',
        message: error.message
      });
    }
  });

  /**
   * POST /api/v1/notifications/bulk-send
   * Send notification to multiple tenants
   */
  fastify.post('/bulk-send', {
    preHandler: [authenticateApiKey, notificationRateLimiter.bulkSend()],
    schema: {
      body: {
        type: 'object',
        required: ['tenantIds', 'title', 'message'],
        properties: {
          tenantIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
            maxItems: 1000
          },
          type: { type: 'string', default: 'system_update' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          title: { type: 'string', maxLength: 255 },
          message: { type: 'string' },
          actionUrl: { type: 'string' },
          actionLabel: { type: 'string' },
          metadata: { type: 'object' },
          useQueue: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantIds, useQueue, ...notificationData } = request.body;
      const app = request.externalApp;

      if (tenantIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'At least one tenant ID is required'
        });
      }

      const metadata = {
        ...(notificationData.metadata || {}),
        sentByExternalApp: true,
        appId: app.appId,
        appName: app.appName,
        sentAt: new Date().toISOString(),
        bulkSend: true,
        totalRecipients: tenantIds.length
      };

      if (useQueue) {
        // Prepare notifications for queue
        const notifications = tenantIds.map(tenantId => ({
          notificationData: {
            ...notificationData,
            type: notificationData.type || NOTIFICATION_TYPES.SYSTEM_UPDATE,
            priority: notificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM,
            metadata
          },
          tenantId
        }));

        const job = await notificationQueueService.addBulk(notifications);

        return reply.send({
          success: true,
          queued: true,
          jobId: job.jobId,
          totalTenants: tenantIds.length,
          message: 'Notifications queued for processing'
        });
      } else {
        // Process immediately (may be slow for large batches)
        const notificationsToCreate = tenantIds.map(tenantId => ({
          tenantId,
          ...notificationData,
          type: notificationData.type || NOTIFICATION_TYPES.SYSTEM_UPDATE,
          priority: notificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM,
          metadata
        }));

        const createdNotifications = await notificationService.bulkCreateNotifications(notificationsToCreate);

        // Broadcast via WebSocket
        createdNotifications.forEach(notification => {
          try {
            broadcastToTenant(notification.tenantId, notification);
          } catch (wsError) {
            console.warn(`WebSocket broadcast failed for tenant ${notification.tenantId}:`, wsError);
          }
        });

        return reply.send({
          success: true,
          data: {
            sentCount: createdNotifications.length,
            totalTenants: tenantIds.length,
            notifications: createdNotifications.slice(0, 10) // Return first 10
          }
        });
      }
    } catch (error) {
      request.log.error('Error bulk sending notifications:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to bulk send notifications',
        message: error.message
      });
    }
  });

  /**
   * POST /api/v1/notifications/send-with-template
   * Send notification using a template
   */
  fastify.post('/send-with-template', {
    preHandler: [authenticateApiKey, notificationRateLimiter.perApplication()],
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'templateId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          templateId: { type: 'string', format: 'uuid' },
          variables: { type: 'object' },
          useQueue: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, templateId, variables = {}, useQueue } = request.body;
      const app = request.externalApp;

      // Get template
      const template = await templateService.getTemplate(templateId);
      if (!template) {
        return reply.code(404).send({
          success: false,
          error: 'Template not found'
        });
      }

      // Render template
      const rendered = await templateService.renderTemplate(templateId, variables);

      // Send notification
      const notification = await notificationService.createNotification({
        tenantId,
        ...rendered,
        metadata: {
          ...rendered.metadata,
          sentByExternalApp: true,
          appId: app.appId,
          appName: app.appName,
          templateId,
          sentAt: new Date().toISOString()
        }
      });

      // Broadcast via WebSocket
      try {
        broadcastToTenant(tenantId, notification);
      } catch (wsError) {
        console.warn('WebSocket broadcast failed:', wsError);
      }

      return reply.send({
        success: true,
        data: {
          notificationId: notification.notificationId,
          tenantId: notification.tenantId,
          title: notification.title
        }
      });
    } catch (error) {
      request.log.error('Error sending notification with template:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to send notification',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v1/notifications/status/:notificationId
   * Check notification status
   */
  fastify.get('/status/:notificationId', {
    preHandler: [authenticateApiKey]
  }, async (request, reply) => {
    try {
      const { notificationId } = request.params;

      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.notificationId, notificationId))
        .limit(1);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found'
        });
      }

      return reply.send({
        success: true,
        data: {
          notificationId: notification.notificationId,
          tenantId: notification.tenantId,
          title: notification.title,
          type: notification.type,
          priority: notification.priority,
          isRead: notification.isRead,
          isDismissed: notification.isDismissed,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      request.log.error('Error getting notification status:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get notification status',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v1/notifications/history
   * Get sent notification history
   */
  fastify.get('/history', {
    preHandler: [authenticateApiKey],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
          tenantId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 50, tenantId, startDate, endDate } = request.query;
      const app = request.externalApp;
      const offset = (page - 1) * limit;

      const whereConditions = [
        sql`${notifications.metadata}->>'sentByExternalApp' = 'true'`,
        sql`${notifications.metadata}->>'appId' = ${app.appId}`
      ];

      if (tenantId) {
        whereConditions.push(eq(notifications.tenantId, tenantId));
      }

      if (startDate) {
        whereConditions.push(sql`${notifications.createdAt} >= ${new Date(startDate)}`);
      }

      if (endDate) {
        whereConditions.push(sql`${notifications.createdAt} <= ${new Date(endDate)}`);
      }

      const [notificationsList, totalResult] = await Promise.all([
        db
          .select({
            notificationId: notifications.notificationId,
            tenantId: notifications.tenantId,
            type: notifications.type,
            priority: notifications.priority,
            title: notifications.title,
            message: notifications.message,
            isRead: notifications.isRead,
            isDismissed: notifications.isDismissed,
            createdAt: notifications.createdAt
          })
          .from(notifications)
          .where(sql`${sql.join(whereConditions, sql` AND `)}`)
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(notifications)
          .where(sql`${sql.join(whereConditions, sql` AND `)}`)
      ]);

      const total = parseInt(totalResult[0]?.count || 0);

      return reply.send({
        success: true,
        data: {
          notifications: notificationsList,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      request.log.error('Error fetching notification history:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch notification history',
        message: error.message
      });
    }
  });

  /**
   * POST /api/v1/notifications/preview
   * Preview notification before sending
   */
  fastify.post('/preview', {
    preHandler: [authenticateApiKey]
  }, async (request, reply) => {
    try {
      const previewData = {
        ...request.body,
        notificationId: 'preview-' + Date.now(),
        tenantId: 'preview-tenant',
        isRead: false,
        isDismissed: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: previewData
      });
    } catch (error) {
      request.log.error('Error generating preview:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate preview',
        message: error.message
      });
    }
  });
}











