import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenantUsers } from './users.js';
import { tenants } from './tenants.js';
import { notifications } from './notifications.js';
import { notificationTemplates } from './notification-templates.js';

/**
 * Admin Notification History table
 * Tracks all notifications sent by admins for auditing and analytics
 */
export const adminNotificationHistory = pgTable('admin_notification_history', {
  historyId: uuid('history_id').primaryKey().defaultRandom(),
  
  // References
  adminUserId: uuid('admin_user_id').references(() => tenantUsers.userId).notNull(),
  notificationId: uuid('notification_id').references(() => notifications.notificationId).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  templateId: uuid('template_id').references(() => notificationTemplates.templateId),
  
  // Delivery status
  status: text('status').default('sent').notNull(), // 'sent', 'failed', 'pending'
  errorMessage: text('error_message'),
  
  // Targeting information
  targetFilters: jsonb('target_filters'), // Store filters used for targeting
  
  // Timestamps
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  
  // Analytics
  metadata: jsonb('metadata').default({})
});

// Indexes for efficient querying
export const adminNotificationHistoryIndexes = {
  adminUserId: 'idx_admin_notification_history_admin_user_id',
  notificationId: 'idx_admin_notification_history_notification_id',
  tenantId: 'idx_admin_notification_history_tenant_id',
  templateId: 'idx_admin_notification_history_template_id',
  status: 'idx_admin_notification_history_status',
  sentAt: 'idx_admin_notification_history_sent_at'
};
