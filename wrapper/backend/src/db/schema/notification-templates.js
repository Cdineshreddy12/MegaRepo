import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenantUsers } from './users.js';

/**
 * Notification template categories
 */
export const TEMPLATE_CATEGORIES = {
  ANNOUNCEMENT: 'announcement',
  UPDATE: 'update',
  ALERT: 'alert',
  PROMOTION: 'promotion',
  SYSTEM: 'system',
  BILLING: 'billing',
  SECURITY: 'security',
  CUSTOM: 'custom'
};

/**
 * Notification Templates table
 * Stores reusable notification templates for admin use
 */
export const notificationTemplates = pgTable('notification_templates', {
  templateId: uuid('template_id').primaryKey().defaultRandom(),
  
  // Template identification
  name: text('name').notNull(),
  category: text('category').default('custom').notNull(),
  description: text('description'),
  
  // Template content
  type: text('type').notNull(), // Notification type
  priority: text('priority').default('medium').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'),
  actionLabel: text('action_label'),
  
  // Template variables (for substitution)
  variables: jsonb('variables').default({}), // e.g., {tenantName: 'string', date: 'date'}
  
  // UI Customization - Matches current NotificationItem.tsx styling
  uiConfig: jsonb('ui_config').default({
    // Colors - Priority-based backgrounds (matching getPriorityColor)
    backgroundColor: '#ffffff', // Base white
    borderColor: '#d1d5db', // gray-300 base
    textColor: '#111827', // gray-900
    titleColor: '#111827', // gray-900 (unread) or #374151 (gray-700 read)
    messageColor: '#1f2937', // gray-800 (unread) or #4b5563 (gray-600 read)
    accentColor: '#3b82f6', // blue-500
    // Priority-based background colors (with opacity)
    priorityBackgrounds: {
      low: '#f0fdf4', // green-50/50
      medium: '#eff6ff', // blue-50/50
      high: '#fffbeb', // orange-50/50
      urgent: '#fef2f2' // red-50/50
    },
    // Priority-based border colors
    priorityBorders: {
      low: '#86efac', // green-300
      medium: '#93c5fd', // blue-300
      high: '#fcd34d', // orange-300
      urgent: '#fca5a5' // red-300
    },
    // Type indicator colors (matching getNotificationIndicator)
    typeIndicatorColors: {
      seasonal_credits: '#10b981', // green-500
      credit_expiry_warning: '#f97316', // orange-500
      purchase_success: '#3b82f6', // blue-500
      plan_upgrade: '#a855f7', // purple-500
      system_update: '#6366f1', // indigo-500
      feature_announcement: '#ec4899', // pink-500
      maintenance_scheduled: '#eab308', // yellow-500
      security_alert: '#ef4444', // red-500
      billing_reminder: '#dc2626', // red-600
      default: '#6b7280' // gray-500
    },
    // Typography - Matching NotificationItem
    fontFamily: 'system-ui, -apple-system, sans-serif',
    titleFontSize: '16px', // text-base
    titleFontWeight: '600', // font-semibold
    titleLineHeight: '1.25', // leading-tight
    messageFontSize: '14px', // text-sm
    messageFontWeight: '400', // normal
    messageLineHeight: '1.75', // leading-relaxed
    // Layout - Matching Card structure
    borderRadius: '6px', // rounded-md (Card default)
    padding: '16px', // p-4
    borderWidth: '0px', // No border except left
    borderLeftWidth: '4px', // border-l-4
    gap: '12px', // gap-3
    // Type Indicator
    showTypeIndicator: true,
    typeIndicatorSize: '8px', // w-2 h-2
    typeIndicatorLabelSize: '12px', // text-xs
    typeIndicatorLabelWeight: '500', // font-medium
    typeIndicatorLabelColor: '#6b7280', // text-gray-500
    // Priority Icons
    showPriorityIcon: true,
    priorityIconSize: '16px', // w-4 h-4
    // Action Buttons
    showActionButtons: true,
    buttonStyle: 'outline', // variant="outline"
    buttonSize: 'sm', // size="sm"
    buttonHeight: '32px', // h-8
    buttonPadding: '12px', // px-3
    buttonFontSize: '12px', // text-xs
    buttonFontWeight: '500', // font-medium
    // Separator
    showSeparator: true,
    separatorColor: '#f3f4f6', // border-gray-100
    separatorMarginTop: '16px', // mt-4
    separatorPaddingTop: '12px', // pt-3
    // Timestamp
    showTimestamp: true,
    timestampFontSize: '12px', // text-xs
    timestampColor: '#6b7280', // text-gray-500
    timestampFontWeight: '500', // font-medium
    // Shadow & Effects
    shadow: 'md', // hover:shadow-md
    hoverEffect: true,
    transitionDuration: '200ms', // transition-all duration-200
    // Read/Unread states
    unreadTitleColor: '#111827', // text-gray-900
    readTitleColor: '#374151', // text-gray-700
    unreadMessageColor: '#1f2937', // text-gray-800
    readMessageColor: '#4b5563' // text-gray-600
  }),
  
  // Default metadata
  metadata: jsonb('metadata').default({}),
  
  // Template management
  isActive: boolean('is_active').default(true).notNull(),
  isSystem: boolean('is_system').default(false).notNull(), // System templates cannot be deleted
  version: text('version').default('1.0.0'),
  
  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at')
});

// Indexes for efficient querying
export const notificationTemplatesIndexes = {
  category: 'idx_notification_templates_category',
  type: 'idx_notification_templates_type',
  isActive: 'idx_notification_templates_is_active',
  createdBy: 'idx_notification_templates_created_by',
  createdAt: 'idx_notification_templates_created_at'
};
