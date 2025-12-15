import { NotificationService } from '../services/notification-service.js';

const notificationService = new NotificationService();

/**
 * Notification routes for tenant dashboard
 * Handles CRUD operations for notifications
 */
export default async function notificationRoutes(fastify, options) {

  /**
   * GET /api/notifications
   * Get notifications for the current tenant/user
   */
  fastify.get('/', async (request, reply) => {
    try {
      const { tenantId, internalUserId: userId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // For dashboard notifications, always load all tenant notifications (both user-specific and general)
      // This ensures seasonal credit notifications (which have targetUserId=null) are visible to all users
      const effectiveUserId = null; // Always pass null to get all tenant notifications

      const {
        limit = 50,
        offset = 0,
        includeRead = true,
        includeDismissed = false,
        type,
        priority
      } = request.query;

      const notifications = await notificationService.getNotifications(
        tenantId,
        effectiveUserId,
        {
          limit: parseInt(limit),
          offset: parseInt(offset),
          includeRead: includeRead === 'true',
          includeDismissed: includeDismissed === 'true',
          type,
          priority
        }
      );

      reply.send({
        success: true,
        data: notifications
      });

    } catch (error) {
      console.error('Error getting notifications:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve notifications'
      });
    }
  });

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count for the current tenant/user
   */
  fastify.get('/unread-count', async (request, reply) => {
    try {
      const { tenantId, internalUserId: userId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // For dashboard notifications, if no specific userId, load all tenant notifications
      const effectiveUserId = userId || null;
      const count = await notificationService.getUnreadCount(tenantId, effectiveUserId);

      reply.send({
        success: true,
        data: { count }
      });

    } catch (error) {
      console.error('Error getting unread notification count:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to get unread notification count'
      });
    }
  });

  /**
   * PUT /api/notifications/:notificationId/read
   * Mark a notification as read
   */
  fastify.put('/:notificationId/read', async (request, reply) => {
    try {
      const { tenantId } = request.userContext || {};
      const { notificationId } = request.params;

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const notification = await notificationService.markAsRead(notificationId, tenantId);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found'
        });
      }

      reply.send({
        success: true,
        data: notification
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  });

  /**
   * PUT /api/notifications/:notificationId/dismiss
   * Mark a notification as dismissed
   */
  fastify.put('/:notificationId/dismiss', async (request, reply) => {
    try {
      const { tenantId } = request.userContext || {};
      const { notificationId } = request.params;

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const notification = await notificationService.markAsDismissed(notificationId, tenantId);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found'
        });
      }

      reply.send({
        success: true,
        data: notification
      });

    } catch (error) {
      console.error('Error dismissing notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to dismiss notification'
      });
    }
  });

  /**
   * PUT /api/notifications/mark-all-read
   * Mark all notifications as read for the current tenant/user
   */
  fastify.put('/mark-all-read', async (request, reply) => {
    try {
      const { tenantId, internalUserId: userId } = request.userContext || {};

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // For dashboard notifications, if no specific userId, mark all tenant notifications as read
      const effectiveUserId = userId || null;
      const count = await notificationService.markAllAsRead(tenantId, effectiveUserId);

      reply.send({
        success: true,
        data: { markedAsRead: count }
      });

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to mark notifications as read'
      });
    }
  });



  /**
   * GET /api/notifications/debug-notifications
   * Debug endpoint to see actual notification data
   */
  fastify.get('/debug-notifications', async (request, reply) => {
    try {
      const { tenantId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { db } = await import('../db/index.js');
      const { notifications } = await import('../db/schema/notifications.js');
      const { eq } = await import('drizzle-orm');

      const tenantNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tenantId, tenantId));

      reply.send({
        success: true,
        data: {
          tenantId,
          notifications: tenantNotifications.map(n => ({
            id: n.notificationId,
            type: n.type,
            title: n.title,
            message: n.message.substring(0, 50) + '...',
            isRead: n.isRead,
            isDismissed: n.isDismissed,
            isActive: n.isActive,
            createdAt: n.createdAt,
            metadata: n.metadata
          }))
        }
      });

    } catch (error) {
      console.error('Error in debug-notifications endpoint:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/notifications/test-seasonal
   * Create a test seasonal credit notification (for debugging)
   */
  fastify.post('/test-seasonal', async (request, reply) => {
    try {
      const { tenantId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const testNotification = await notificationService.createSeasonalCreditNotification(tenantId, {
        campaignId: `test-campaign-${Date.now()}`,
        campaignName: 'Test Holiday Campaign',
        allocatedCredits: 1000,
        creditType: 'seasonal',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        applications: ['crm', 'hr', 'finance']
      });

      reply.send({
        success: true,
        data: testNotification,
        message: 'Test seasonal credit notification created'
      });

    } catch (error) {
      console.error('Error creating test seasonal notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to create test seasonal notification'
      });
    }
  });

  /**
   * POST /api/notifications/test
   * Create a test notification (for development/testing only)
   */
  fastify.post('/test', async (request, reply) => {
    try {
      const { tenantId, internalUserId } = request.userContext || {};
      const { type, title, message, priority } = request.body;

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const notification = await notificationService.createNotification({
        tenantId,
        targetUserId: internalUserId, // Make it user-specific for testing
        type: type || 'system_update',
        priority: priority || 'medium',
        title: title || 'Test Notification',
        message: message || 'This is a test notification for development purposes.',
        actionUrl: '/dashboard',
        actionLabel: 'View Dashboard'
      });

      reply.send({
        success: true,
        data: notification
      });

    } catch (error) {
      console.error('Error creating test notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to create test notification'
      });
    }
  });

  /**
   * DELETE /api/notifications/cleanup
   * Clean up expired notifications (admin only)
   */
  fastify.delete('/cleanup', async (request, reply) => {
    try {
      const { tenantId, userId } = request.userContext || {};

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // In a real app, you'd check for admin permissions here
      const deletedCount = await notificationService.cleanupExpiredNotifications();

      reply.send({
        success: true,
        data: { deletedCount }
      });

    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to cleanup notifications'
      });
    }
  });
}
