import { db } from '../db/index.js';
import { notifications, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../db/schema/notifications.js';
import { and, eq, or, lt, gte, desc, sql, isNull } from 'drizzle-orm';
import { notificationCacheService } from './notification-cache-service.js';

class NotificationService {

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        tenantId,
        type,
        priority = NOTIFICATION_PRIORITIES.MEDIUM,
        title,
        message,
        actionUrl,
        actionLabel,
        metadata = {},
        expiresAt,
        scheduledAt,
        targetUserId
      } = notificationData;

      const [notification] = await db
        .insert(notifications)
        .values({
          tenantId,
          type,
          priority,
          title,
          message,
          actionUrl,
          actionLabel,
          metadata,
          expiresAt,
          scheduledAt,
          targetUserId
        })
        .returning();

      console.log(`📧 Created notification: ${title} for tenant ${tenantId}`);
      return notification;

    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a tenant/user
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (optional, for user-specific notifications)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Notifications
   */
  async getNotifications(tenantId, userId = null, options = {}) {
    try {

      const {
        limit = 50,
        offset = 0,
        includeRead = true,
        includeDismissed = false,
        type = null,
        priority = null
      } = options;

      let whereConditions = [
        eq(notifications.tenantId, tenantId),
        eq(notifications.isActive, true)
      ];

      // Filter by user (if specified, include both user-specific and general notifications)
      if (userId) {
        whereConditions.push(
          or(
            eq(notifications.targetUserId, userId),
            isNull(notifications.targetUserId)
          )
        );
      } else {
        // If no userId, only get general notifications
        whereConditions.push(isNull(notifications.targetUserId));
      }

      // Filter by read status
      if (!includeRead) {
        whereConditions.push(eq(notifications.isRead, false));
      }

      // Filter by dismissed status
      if (!includeDismissed) {
        whereConditions.push(eq(notifications.isDismissed, false));
      }

      // Filter by type
      if (type) {
        whereConditions.push(eq(notifications.type, type));
      }

      // Filter by priority
      if (priority) {
        whereConditions.push(eq(notifications.priority, priority));
      }

      // Filter out expired notifications
      whereConditions.push(
        or(
          isNull(notifications.expiresAt),
          gte(notifications.expiresAt, new Date())
        )
      );

      const notificationList = await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return notificationList;

    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a tenant/user
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(tenantId, userId = null) {
    try {
      let whereConditions = [
        eq(notifications.tenantId, tenantId),
        eq(notifications.isActive, true),
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false)
      ];

      // Filter by user
      if (userId) {
        whereConditions.push(
          or(
            eq(notifications.targetUserId, userId),
            isNull(notifications.targetUserId)
          )
        );
      } else {
        whereConditions.push(isNull(notifications.targetUserId));
      }

      // Filter out expired notifications
      whereConditions.push(
        or(
          isNull(notifications.expiresAt),
          gte(notifications.expiresAt, new Date())
        )
      );

      const result = await db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(and(...whereConditions));

      return parseInt(result[0].count) || 0;

    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} tenantId - Tenant ID (for security)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, tenantId) {
    try {
      const [notification] = await db
        .update(notifications)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.tenantId, tenantId)
        ))
        .returning();

      if (notification) {
        console.log(`✅ Marked notification as read: ${notificationId}`);
      }

      return notification;

    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark notification as dismissed
   * @param {string} notificationId - Notification ID
   * @param {string} tenantId - Tenant ID (for security)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsDismissed(notificationId, tenantId) {
    try {
      const [notification] = await db
        .update(notifications)
        .set({
          isDismissed: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.tenantId, tenantId)
        ))
        .returning();

      if (notification) {
        console.log(`🚫 Dismissed notification: ${notificationId}`);
      }

      return notification;

    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a tenant/user
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAllAsRead(tenantId, userId = null) {
    try {
      let whereConditions = [
        eq(notifications.tenantId, tenantId),
        eq(notifications.isActive, true),
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false)
      ];

      // Filter by user
      if (userId) {
        whereConditions.push(
          or(
            eq(notifications.targetUserId, userId),
            isNull(notifications.targetUserId)
          )
        );
      } else {
        whereConditions.push(isNull(notifications.targetUserId));
      }

      const result = await db
        .update(notifications)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(and(...whereConditions))
        .returning();

      console.log(`✅ Marked ${result.length} notifications as read for tenant ${tenantId}`);
      return result.length;

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete expired notifications
   * @returns {Promise<number>} Number of notifications deleted
   */
  async cleanupExpiredNotifications() {
    try {
      const result = await db
        .delete(notifications)
        .where(and(
          lt(notifications.expiresAt, new Date()),
          eq(notifications.isActive, true)
        ))
        .returning();

      console.log(`🧹 Cleaned up ${result.length} expired notifications`);
      return result.length;

    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Create a seasonal credit notification
   * @param {string} tenantId - Tenant ID
   * @param {Object} creditData - Credit allocation data
   * @returns {Promise<Object>} Created notification
   */
  async createSeasonalCreditNotification(tenantId, creditData) {
    const { campaignName, campaignId, allocatedCredits, creditType, expiresAt, applications = [] } = creditData;

    const emoji = this.getCreditTypeEmoji(creditType);
    const title = `${emoji} Credits Added to Your Account`;
    const message = `You've received ${allocatedCredits.toLocaleString()} ${campaignName} credits!`;
    const actionUrl = '/dashboard?tab=credits';
    const actionLabel = 'View Credits';

    const expiresDate = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    console.log(`📧 Creating seasonal credit notification for tenant ${tenantId}:`, {
      title,
      message,
      creditType,
      allocatedCredits,
      campaignName
    });

    const notificationData = {
      tenantId,
      type: NOTIFICATION_TYPES.SEASONAL_CREDITS,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      title,
      message,
      actionUrl,
      actionLabel,
      metadata: {
        campaignId,
        campaignName,
        allocatedCredits,
        creditType,
        expiresAt,
        daysUntilExpiry,
        applications
      },
      expiresAt: expiresDate,
      targetUserId: null // Explicitly set to null to ensure it's a general notification
    };

    console.log('📧 Notification data:', notificationData);

    const result = await this.createNotification(notificationData);
    console.log('📧 Notification created successfully:', result);
    return result;
  }

  /**
   * Create a purchase success notification
   * @param {string} tenantId - Tenant ID
   * @param {Object} purchaseData - Purchase data
   * @returns {Promise<Object>} Created notification
   */
  async createPurchaseNotification(tenantId, purchaseData) {
    const { itemName, amount, currency = 'USD', purchaseId } = purchaseData;

    const title = '🎉 Purchase Successful';
    const message = `Your purchase of ${itemName} for ${currency} ${amount} has been completed!`;
    const actionUrl = '/dashboard?tab=billing';
    const actionLabel = 'View Receipt';

    return this.createNotification({
      tenantId,
      type: NOTIFICATION_TYPES.PURCHASE_SUCCESS,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      title,
      message,
      actionUrl,
      actionLabel,
      metadata: {
        itemName,
        amount,
        currency,
        purchaseId
      }
    });
  }

  /**
   * Create a credit expiry warning notification
   * @param {string} tenantId - Tenant ID
   * @param {Object} expiryData - Expiry warning data
   * @returns {Promise<Object>} Created notification
   */
  async createExpiryWarningNotification(tenantId, expiryData) {
    const { credits, daysUntilExpiry } = expiryData;
    const totalCredits = credits.reduce((sum, c) => sum + c.availableCredits, 0);

    const title = '⏰ Credits Expiring Soon';
    const message = `${totalCredits.toLocaleString()} credits will expire in ${daysUntilExpiry} days`;
    const actionUrl = '/dashboard?tab=credits';
    const actionLabel = 'View Credits';

    const priority = daysUntilExpiry <= 3 ? NOTIFICATION_PRIORITIES.HIGH :
                    daysUntilExpiry <= 7 ? NOTIFICATION_PRIORITIES.MEDIUM :
                    NOTIFICATION_PRIORITIES.LOW;

    return this.createNotification({
      tenantId,
      type: NOTIFICATION_TYPES.CREDIT_EXPIRY_WARNING,
      priority,
      title,
      message,
      actionUrl,
      actionLabel,
      metadata: {
        credits,
        daysUntilExpiry,
        totalCredits
      },
      expiresAt: new Date(Date.now() + (daysUntilExpiry * 24 * 60 * 60 * 1000))
    });
  }

  /**
   * Create a system update notification
   * @param {string} tenantId - Tenant ID
   * @param {Object} updateData - Update information
   * @returns {Promise<Object>} Created notification
   */
  async createSystemUpdateNotification(tenantId, updateData) {
    const { version, features = [], scheduledAt } = updateData;

    const title = '🚀 System Update Available';
    const message = `New version ${version} is now available with exciting new features!`;
    const actionUrl = '/dashboard?tab=settings';
    const actionLabel = 'View Details';

    return this.createNotification({
      tenantId,
      type: NOTIFICATION_TYPES.SYSTEM_UPDATE,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      title,
      message,
      actionUrl,
      actionLabel,
      metadata: {
        version,
        features,
        scheduledAt
      },
      scheduledAt
    });
  }

  /**
   * Create a billing reminder notification
   * @param {string} tenantId - Tenant ID
   * @param {Object} billingData - Billing reminder data
   * @returns {Promise<Object>} Created notification
   */
  async createBillingReminderNotification(tenantId, billingData) {
    const { daysUntilDue, amount, currency = 'USD' } = billingData;

    const title = '💳 Payment Due Soon';
    const message = `Your payment of ${currency} ${amount} is due in ${daysUntilDue} days`;
    const actionUrl = '/dashboard?tab=billing';
    const actionLabel = 'Pay Now';

    const priority = daysUntilDue <= 3 ? NOTIFICATION_PRIORITIES.URGENT :
                    daysUntilDue <= 7 ? NOTIFICATION_PRIORITIES.HIGH :
                    NOTIFICATION_PRIORITIES.MEDIUM;

    return this.createNotification({
      tenantId,
      type: NOTIFICATION_TYPES.BILLING_REMINDER,
      priority,
      title,
      message,
      actionUrl,
      actionLabel,
      metadata: {
        daysUntilDue,
        amount,
        currency
      }
    });
  }

  /**
   * Bulk create notifications
   * @param {Array<Object>} notificationsData - Array of notification data objects
   * @returns {Promise<Array>} Created notifications
   */
  async bulkCreateNotifications(notificationsData) {
    try {
      if (!Array.isArray(notificationsData) || notificationsData.length === 0) {
        throw new Error('Notifications data must be a non-empty array');
      }

      // Batch insert in chunks of 100 to avoid overwhelming the database
      const batchSize = 100;
      const allNotifications = [];

      for (let i = 0; i < notificationsData.length; i += batchSize) {
        const batch = notificationsData.slice(i, i + batchSize);
        
        const created = await db
          .insert(notifications)
          .values(batch.map(data => ({
            tenantId: data.tenantId,
            type: data.type || NOTIFICATION_TYPES.SYSTEM_UPDATE,
            priority: data.priority || NOTIFICATION_PRIORITIES.MEDIUM,
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl,
            actionLabel: data.actionLabel,
            metadata: data.metadata || {},
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
            targetUserId: data.targetUserId || null
          })))
          .returning();

        allNotifications.push(...created);
      }

      console.log(`📧 Bulk created ${allNotifications.length} notifications`);
      return allNotifications;

    } catch (error) {
      console.error('Error bulk creating notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple tenants
   * @param {Array<string>} tenantIds - Array of tenant IDs
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Result with sent count and notifications
   */
  async sendToTenants(tenantIds, notificationData) {
    try {
      const notificationsToCreate = tenantIds.map(tenantId => ({
        tenantId,
        ...notificationData
      }));

      const createdNotifications = await this.bulkCreateNotifications(notificationsToCreate);

      return {
        sentCount: createdNotifications.length,
        totalTenants: tenantIds.length,
        notifications: createdNotifications
      };
    } catch (error) {
      console.error('Error sending notifications to tenants:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Statistics
   */
  async getNotificationStats(tenantId, options = {}) {
    try {
      const { startDate, endDate } = options;

      const whereConditions = [
        eq(notifications.tenantId, tenantId),
        eq(notifications.isActive, true)
      ];

      if (startDate) {
        whereConditions.push(gte(notifications.createdAt, new Date(startDate)));
      }

      if (endDate) {
        whereConditions.push(lte(notifications.createdAt, new Date(endDate)));
      }

      const stats = await db
        .select({
          total: sql`count(*)`,
          unread: sql`count(case when ${notifications.isRead} = false then 1 end)`,
          read: sql`count(case when ${notifications.isRead} = true then 1 end)`,
          dismissed: sql`count(case when ${notifications.isDismissed} = true then 1 end)`,
          byType: sql`json_object_agg(${notifications.type}, count(*))`,
          byPriority: sql`json_object_agg(${notifications.priority}, count(*))`
        })
        .from(notifications)
        .where(and(...whereConditions));

      return stats[0] || {
        total: 0,
        unread: 0,
        read: 0,
        dismissed: 0,
        byType: {},
        byPriority: {}
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Get sent notifications history (admin)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} History with pagination
   */
  async getSentNotificationsHistory(filters = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        tenantId,
        startDate,
        endDate,
        type,
        adminUserId
      } = filters;

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

      if (adminUserId) {
        whereConditions.push(sql`${notifications.metadata}->>'adminUserId' = ${adminUserId}`);
      }

      const [notificationsList, totalResult] = await Promise.all([
        db
          .select()
          .from(notifications)
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

      return {
        notifications: notificationsList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting sent notifications history:', error);
      throw error;
    }
  }

  /**
   * Helper function to get emoji for credit type
   * @param {string} creditType - Credit type
   * @returns {string} Emoji
   */
  getCreditTypeEmoji(creditType) {
    switch (creditType) {
      case 'seasonal': return '🎄';
      case 'bonus': return '🎁';
      case 'promotional': return '📢';
      case 'event': return '🎉';
      case 'partnership': return '🤝';
      case 'trial_extension': return '⏰';
      default: return '💰';
    }
  }
}

export { NotificationService };
export default NotificationService;



