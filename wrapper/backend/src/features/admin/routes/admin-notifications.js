import { NotificationService } from '../../../services/notification-service.js';
import { NotificationTemplateService } from '../../../services/notification-template-service.js';
import { TenantFilterService } from '../../../services/tenant-filter-service.js';
import { TenantService } from '../../../services/tenant-service.js';
import { contentGenerationService } from '../../../services/ai/content-generation-service.js';
import { personalizationService } from '../../../services/ai/personalization-service.js';
import { smartTargetingService } from '../../../services/ai/smart-targeting-service.js';
import { sentimentService } from '../../../services/ai/sentiment-service.js';
import { notificationAnalyticsService } from '../../../services/notification-analytics-service.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers, notifications } from '../../../db/schema/index.js';
import { eq, and, inArray, sql, desc, count, gte, lte, or, like } from 'drizzle-orm';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../../../db/schema/notifications.js';
import { broadcastToTenant } from '../../../utils/websocket-server.js';

const templateService = new NotificationTemplateService();
const filterService = new TenantFilterService();
const notificationService = new NotificationService();

/**
 * Admin Notification Routes
 * Handles sending curated notifications to tenants from admin dashboard
 */
export default async function adminNotificationRoutes(fastify, options) {
  
  /**
   * POST /api/admin/notifications/send
   * Send notification to a single tenant
   */
  fastify.post('/send', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
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
          targetUserId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, ...notificationData } = request.body;
      const adminUserId = request.userContext.userId;

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

      // Create notification
      const notification = await notificationService.createNotification({
        tenantId,
        ...notificationData,
        type: notificationData.type || NOTIFICATION_TYPES.SYSTEM_UPDATE,
        priority: notificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM
      });

      // Log to admin notification history (will be created in schema)
      // For now, we'll log it in the notification metadata
      await db
        .update(notifications)
        .set({
          metadata: {
            ...(notification.metadata || {}),
            sentByAdmin: true,
            adminUserId,
            sentAt: new Date().toISOString()
          }
        })
        .where(eq(notifications.notificationId, notification.notificationId));

      // Broadcast notification via WebSocket
      try {
        broadcastToTenant(tenantId, notification);
      } catch (wsError) {
        request.log.warn('WebSocket broadcast failed:', wsError);
        // Don't fail the request if WebSocket fails
      }

      reply.send({
        success: true,
        data: notification,
        message: 'Notification sent successfully'
      });
    } catch (error) {
      request.log.error('Error sending notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to send notification',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/bulk-send
   * Send notification to multiple tenants
   */
  fastify.post('/bulk-send', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'message'],
        properties: {
          tenantIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
            maxItems: 1000
          },
          filters: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['active', 'inactive', 'trial', 'paid', 'all'] },
              industry: { type: 'string' },
              subscriptionTier: { type: 'string' },
              minCredits: { type: 'number' },
              maxCredits: { type: 'number' },
              createdAfter: { type: 'string', format: 'date-time' },
              createdBefore: { type: 'string', format: 'date-time' }
            }
          },
          type: { type: 'string', default: 'system_update' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          title: { type: 'string', maxLength: 255 },
          message: { type: 'string' },
          actionUrl: { type: 'string' },
          actionLabel: { type: 'string' },
          metadata: { type: 'object' },
          expiresAt: { type: 'string', format: 'date-time' },
          scheduledAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantIds, filters, templateId, ...notificationData } = request.body;
      const adminUserId = request.userContext.userId;
      
      // If templateId is provided, render template first
      let baseNotificationData = { ...notificationData };
      if (templateId) {
        try {
          const template = await templateService.getTemplate(templateId);
          baseNotificationData = {
            ...baseNotificationData,
            type: baseNotificationData.type || template.type,
            priority: baseNotificationData.priority || template.priority,
            title: baseNotificationData.title || template.title,
            message: baseNotificationData.message || template.message,
            actionUrl: baseNotificationData.actionUrl || template.actionUrl,
            actionLabel: baseNotificationData.actionLabel || template.actionLabel
          };
        } catch (error) {
          request.log.warn('Failed to load template, using provided data:', error);
        }
      }

      let targetTenantIds = [];

      // If tenantIds provided, use them
      if (tenantIds && tenantIds.length > 0) {
        targetTenantIds = tenantIds;
      } else if (filters) {
        // Apply filters to get tenant IDs
        const whereConditions = [];

        if (filters.status && filters.status !== 'all') {
          if (filters.status === 'active') {
            whereConditions.push(eq(tenants.isActive, true));
          } else if (filters.status === 'inactive') {
            whereConditions.push(eq(tenants.isActive, false));
          } else if (filters.status === 'trial') {
            whereConditions.push(sql`${tenants.trialEndsAt} > now()`);
          } else if (filters.status === 'paid') {
            whereConditions.push(sql`${tenants.trialEndsAt} is null or ${tenants.trialEndsAt} < now()`);
          }
        }

        if (filters.industry) {
          whereConditions.push(like(tenants.industry, `%${filters.industry}%`));
        }

        if (filters.createdAfter) {
          whereConditions.push(gte(tenants.createdAt, new Date(filters.createdAfter)));
        }

        if (filters.createdBefore) {
          whereConditions.push(lte(tenants.createdAt, new Date(filters.createdBefore)));
        }

        const filteredTenants = await db
          .select({ tenantId: tenants.tenantId })
          .from(tenants)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

        targetTenantIds = filteredTenants.map(t => t.tenantId);

        // Apply credit filters if specified
        if (filters.minCredits !== undefined || filters.maxCredits !== undefined) {
          const { credits } = await import('../../../db/schema/index.js');
          const creditQuery = db
            .select({ tenantId: credits.tenantId })
            .from(credits)
            .where(eq(credits.isActive, true))
            .groupBy(credits.tenantId);

          if (filters.minCredits !== undefined) {
            creditQuery.having(sql`sum(${credits.availableCredits}::numeric) >= ${filters.minCredits}`);
          }
          if (filters.maxCredits !== undefined) {
            creditQuery.having(sql`sum(${credits.availableCredits}::numeric) <= ${filters.maxCredits}`);
          }

          const tenantsWithCredits = await creditQuery;
          const creditTenantIds = tenantsWithCredits.map(t => t.tenantId);
          targetTenantIds = targetTenantIds.filter(id => creditTenantIds.includes(id));
        }
      } else {
        return reply.code(400).send({
          success: false,
          error: 'Either tenantIds or filters must be provided'
        });
      }

      if (targetTenantIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No tenants match the specified criteria'
        });
      }

      // Helper function to replace variables in text
      const replaceVariables = (text, variables) => {
        if (!text) return text;
        let result = text;
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          result = result.replace(regex, variables[key] || `{{${key}}}`);
        });
        return result;
      };

      // Helper function to build tenant variables
      const buildTenantVariables = (tenant) => {
        return {
          tenantName: tenant.companyName || '',
          companyName: tenant.companyName || '',
          legalCompanyName: tenant.legalCompanyName || tenant.companyName || '',
          subdomain: tenant.subdomain || '',
          industry: tenant.industry || '',
          organizationSize: tenant.organizationSize || '',
          website: tenant.website || '',
          adminEmail: tenant.adminEmail || '',
          billingEmail: tenant.billingEmail || '',
          supportEmail: tenant.supportEmail || ''
        };
      };

      // Fetch tenant details for personalization
      const tenantDetailsList = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          legalCompanyName: tenants.legalCompanyName,
          subdomain: tenants.subdomain,
          industry: tenants.industry,
          organizationSize: tenants.organizationSize,
          website: tenants.website,
          adminEmail: tenants.adminEmail,
          billingEmail: tenants.billingEmail,
          supportEmail: tenants.supportEmail
        })
        .from(tenants)
        .where(inArray(tenants.tenantId, targetTenantIds));

      // Create a map for quick lookup
      const tenantDetailsMap = new Map(
        tenantDetailsList.map(t => [t.tenantId, t])
      );

      // Bulk create personalized notifications
      const notificationsToCreate = targetTenantIds.map(tenantId => {
        const tenantDetails = tenantDetailsMap.get(tenantId);
        const variables = tenantDetails ? buildTenantVariables(tenantDetails) : {};
        
        // Personalize notification content
        const personalizedTitle = replaceVariables(baseNotificationData.title, variables);
        const personalizedMessage = replaceVariables(baseNotificationData.message, variables);
        const personalizedActionUrl = replaceVariables(baseNotificationData.actionUrl || '', variables);
        const personalizedActionLabel = replaceVariables(baseNotificationData.actionLabel || '', variables);

        return {
          tenantId,
          ...baseNotificationData,
          title: personalizedTitle,
          message: personalizedMessage,
          actionUrl: personalizedActionUrl || baseNotificationData.actionUrl,
          actionLabel: personalizedActionLabel || baseNotificationData.actionLabel,
          type: baseNotificationData.type || NOTIFICATION_TYPES.SYSTEM_UPDATE,
          priority: baseNotificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM,
          metadata: {
            ...(baseNotificationData.metadata || {}),
            sentByAdmin: true,
            adminUserId,
            sentAt: new Date().toISOString(),
            bulkSend: true,
            totalRecipients: targetTenantIds.length,
            personalized: true,
            tenantVariables: variables,
            ...(templateId && { templateId })
          }
        };
      });

      const createdNotifications = await notificationService.bulkCreateNotifications(notificationsToCreate);

      // Broadcast notifications via WebSocket
      try {
        const { broadcastToTenants } = await import('../../../utils/websocket-server.js');
        createdNotifications.forEach(notification => {
          try {
            broadcastToTenant(notification.tenantId, notification);
          } catch (wsError) {
            request.log.warn(`WebSocket broadcast failed for tenant ${notification.tenantId}:`, wsError);
          }
        });
      } catch (wsError) {
        request.log.warn('WebSocket broadcasting failed:', wsError);
        // Don't fail the request if WebSocket fails
      }

      reply.send({
        success: true,
        data: {
          sentCount: createdNotifications.length,
          totalTenants: targetTenantIds.length,
          notifications: createdNotifications.slice(0, 10) // Return first 10 for preview
        },
        message: `Notification sent to ${createdNotifications.length} tenants successfully`
      });
    } catch (error) {
      request.log.error('Error bulk sending notifications:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to bulk send notifications',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/notifications/sent
   * Get sent notifications history
   */
  fastify.get('/sent', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.view')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
          tenantId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          type: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 50, tenantId, startDate, endDate, type } = request.query;
      const offset = (page - 1) * limit;

      const whereConditions = [
        sql`${notifications.metadata}->>'sentByAdmin' = 'true'`
      ];

      if (tenantId) {
        whereConditions.push(eq(notifications.tenantId, tenantId));
      }

      if (startDate) {
        whereConditions.push(gte(notifications.createdAt, new Date(startDate)));
      }

      if (endDate) {
        whereConditions.push(lte(notifications.createdAt, new Date(endDate)));
      }

      if (type) {
        whereConditions.push(eq(notifications.type, type));
      }

      const [notificationsList, totalResult] = await Promise.all([
        db
          .select({
            notificationId: notifications.notificationId,
            tenantId: notifications.tenantId,
            companyName: tenants.companyName,
            type: notifications.type,
            priority: notifications.priority,
            title: notifications.title,
            message: notifications.message,
            createdAt: notifications.createdAt,
            metadata: notifications.metadata
          })
          .from(notifications)
          .leftJoin(tenants, eq(notifications.tenantId, tenants.tenantId))
          .where(and(...whereConditions))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(notifications)
          .where(and(...whereConditions))
      ]);

      const total = parseInt(totalResult[0]?.count || 0);

      reply.send({
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
      request.log.error('Error fetching sent notifications:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch sent notifications',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/notifications/stats
   * Get notification statistics
   */
  fastify.get('/stats', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.view')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          tenantId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, tenantId } = request.query;

      const filters = {
        startDate,
        endDate,
        tenantId,
        adminUserId: request.userContext.userId
      };

      const stats = await notificationAnalyticsService.getStats(filters);

      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      request.log.error('Error fetching notification stats:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch notification stats',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/preview
   * Preview notification before sending
   */
  fastify.post('/preview', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'message'],
        properties: {
          type: { type: 'string', default: 'system_update' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          title: { type: 'string', maxLength: 255 },
          message: { type: 'string' },
          actionUrl: { type: 'string' },
          actionLabel: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
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

      reply.send({
        success: true,
        data: previewData,
        message: 'Preview generated successfully'
      });
    } catch (error) {
      request.log.error('Error generating preview:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to generate preview',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/notifications/templates
   * Get all notification templates
   */
  fastify.get('/templates', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.view')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          type: { type: 'string' },
          isActive: { type: ['boolean', 'string'] },
          includeInactive: { type: ['boolean', 'string'] }, // Frontend sends this
          search: { type: 'string' },
          limit: { type: ['integer', 'string'], default: 100 },
          offset: { type: ['integer', 'string'], default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Normalize query parameters
      const queryParams = { ...request.query };
      
      // Handle includeInactive parameter (frontend sends this)
      if (queryParams.includeInactive !== undefined) {
        // Convert string to boolean if needed
        const includeInactive = queryParams.includeInactive === 'true' || queryParams.includeInactive === true;
        // If includeInactive=true, show all (isActive=undefined)
        // If includeInactive=false, show only active (isActive=true)
        queryParams.isActive = includeInactive ? undefined : true;
        delete queryParams.includeInactive;
      } else if (queryParams.isActive === undefined) {
        // Default behavior: if neither isActive nor includeInactive is provided, show only active
        queryParams.isActive = true;
      }
      
      // Convert string booleans to actual booleans (if isActive was explicitly set)
      if (queryParams.isActive !== undefined && typeof queryParams.isActive === 'string') {
        queryParams.isActive = queryParams.isActive === 'true';
      }
      
      // Convert string numbers to integers
      if (queryParams.limit !== undefined && typeof queryParams.limit === 'string') {
        queryParams.limit = parseInt(queryParams.limit, 10);
      }
      if (queryParams.offset !== undefined && typeof queryParams.offset === 'string') {
        queryParams.offset = parseInt(queryParams.offset, 10);
      }
      
      const templates = await templateService.getTemplates(queryParams);
      
      reply.send({
        success: true,
        data: templates
      });
    } catch (error) {
      request.log.error('Error fetching templates:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch templates',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/templates
   * Create a notification template
   */
  fastify.post('/templates', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'title', 'message'],
        properties: {
          name: { type: 'string', maxLength: 255 },
          category: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', default: 'system_update' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          title: { type: 'string', maxLength: 255 },
          message: { type: 'string' },
          actionUrl: { type: 'string' },
          actionLabel: { type: 'string' },
          variables: { type: 'object' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const template = await templateService.createTemplate({
        ...request.body,
        createdBy: request.userContext.internalUserId
      });
      
      reply.send({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      request.log.error('Error creating template:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to create template',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/notifications/templates/:templateId
   * Update a notification template
   */
  fastify.put('/templates/:templateId', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')],
    schema: {
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          title: { type: 'string' },
          message: { type: 'string' },
          actionUrl: { type: 'string' },
          actionLabel: { type: 'string' },
          variables: { type: 'object' },
          metadata: { type: 'object' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const template = await templateService.updateTemplate(
        request.params.templateId,
        request.body
      );
      
      reply.send({
        success: true,
        data: template,
        message: 'Template updated successfully'
      });
    } catch (error) {
      request.log.error('Error updating template:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to update template',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/admin/notifications/templates/:templateId
   * Delete a notification template
   */
  fastify.delete('/templates/:templateId', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')],
    schema: {
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      }
    }
  }, async (request, reply) => {
    try {
      await templateService.deleteTemplate(request.params.templateId);
      
      reply.send({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      request.log.error('Error deleting template:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to delete template',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/notifications/templates/categories
   * Get template categories
   */
  fastify.get('/templates/categories', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.view')]
  }, async (request, reply) => {
    try {
      const categories = templateService.getCategories();
      reply.send({
        success: true,
        data: Object.values(categories)
      });
    } catch (error) {
      request.log.error('Error fetching template categories:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch template categories',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/notifications/templates/:templateId
   * Get a specific template
   */
  fastify.get('/templates/:templateId', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.view')],
    schema: {
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      }
    }
  }, async (request, reply) => {
    try {
      const template = await templateService.getTemplate(request.params.templateId);
      
      reply.send({
        success: true,
        data: template
      });
    } catch (error) {
      request.log.error('Error fetching template:', error);
      reply.code(404).send({
        success: false,
        error: 'Template not found',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/templates/:templateId/render
   * Render a template with variables
   */
  fastify.post('/templates/:templateId/render', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      body: {
        type: 'object',
        properties: {
          variables: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const rendered = await templateService.renderTemplate(
        request.params.templateId,
        request.body.variables || {}
      );
      
      reply.send({
        success: true,
        data: rendered
      });
    } catch (error) {
      request.log.error('Error rendering template:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to render template',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/ai/generate
   * Generate notification content using AI
   */
  fastify.post('/ai/generate', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string' },
          tone: { type: 'string', enum: ['professional', 'casual', 'urgent', 'friendly'], default: 'professional' },
          length: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' },
          language: { type: 'string', default: 'en' },
          variables: { type: 'object' },
          variantCount: { type: 'integer', default: 1, minimum: 1, maximum: 5 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { prompt, variantCount, ...options } = request.body;

      if (variantCount > 1) {
        const variants = await contentGenerationService.generateVariants(prompt, variantCount, options);
        return reply.send({
          success: true,
          data: { variants }
        });
      } else {
        const result = await contentGenerationService.generateContent(prompt, options);
        return reply.send({
          success: true,
          data: result
        });
      }
    } catch (error) {
      request.log.error('Error generating AI content:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate content',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/ai/personalize
   * Personalize notification content for a tenant
   */
  fastify.post('/ai/personalize', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'content'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          content: {
            type: 'object',
            required: ['title', 'message'],
            properties: {
              title: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, content } = request.body;
      const personalized = await personalizationService.personalizeContent(tenantId, content);
      return reply.send({
        success: true,
        data: personalized
      });
    } catch (error) {
      request.log.error('Error personalizing content:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to personalize content',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/ai/suggest-targets
   * Suggest target tenants using AI
   */
  fastify.post('/ai/suggest-targets', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'object',
            required: ['title', 'message'],
            properties: {
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' }
            }
          },
          maxSuggestions: { type: 'integer', default: 50, minimum: 1, maximum: 200 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { content, maxSuggestions } = request.body;
      const suggestions = await smartTargetingService.suggestTargets(content, { maxSuggestions });
      return reply.send({
        success: true,
        data: suggestions
      });
    } catch (error) {
      request.log.error('Error suggesting targets:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to suggest targets',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/ai/analyze-sentiment
   * Analyze notification content sentiment
   */
  fastify.post('/ai/analyze-sentiment', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.send')],
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'object',
            required: ['title', 'message'],
            properties: {
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' },
              priority: { type: 'string' }
            }
          },
          includeSuggestions: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { content, includeSuggestions } = request.body;
      const analysis = await sentimentService.analyzeSentiment(content, { includeSuggestions });
      return reply.send({
        success: true,
        data: analysis
      });
    } catch (error) {
      request.log.error('Error analyzing sentiment:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to analyze sentiment',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/notifications/templates/ai-generate
   * Generate template using AI
   */
  fastify.post('/templates/ai-generate', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')],
    schema: {
      body: {
        type: 'object',
        required: ['description'],
        properties: {
          description: { type: 'string' },
          category: { type: 'string' },
          type: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { description, category, type, priority } = request.body;
      const adminUserId = request.userContext.internalUserId;

      // Generate content using AI
      const prompt = `Create a notification template based on this description: ${description}`;
      const generated = await contentGenerationService.generateContent(prompt, {
        tone: 'professional',
        length: 'medium'
      });

      // Create template
      const template = await templateService.createTemplate({
        name: `AI Generated: ${description.substring(0, 50)}`,
        category: category || 'custom',
        type: type || 'system_update',
        priority: priority || 'medium',
        title: generated.title,
        message: generated.message,
        createdBy: adminUserId
      });

      return reply.send({
        success: true,
        data: template,
        message: 'Template generated successfully'
      });
    } catch (error) {
      request.log.error('Error generating template with AI:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate template',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/notifications/analytics
   * Get comprehensive analytics dashboard data
   */
  fastify.get('/analytics', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.view')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          tenantId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const filters = {
        startDate: request.query.startDate,
        endDate: request.query.endDate,
        tenantId: request.query.tenantId
      };

      const dashboardData = await notificationAnalyticsService.getDashboardData(filters);

      return reply.send({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      request.log.error('Error fetching analytics:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch analytics',
        message: error.message
      });
    }
  });
}

