import { pgTable, text, timestamp, uuid, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { tenantUsers } from './users.js';

/**
 * External Applications table
 * Stores registered external applications that can send notifications
 */
export const externalApplications = pgTable('external_applications', {
  appId: uuid('app_id').primaryKey().defaultRandom(),
  
  // Application identification
  appName: text('app_name').notNull(),
  appDescription: text('app_description'),
  
  // Authentication
  apiKey: text('api_key').notNull().unique(), // Hashed API key
  apiSecret: text('api_secret'), // Hashed secret (optional)
  
  // Webhook configuration
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret'), // For webhook signature verification
  
  // Rate limiting
  rateLimit: integer('rate_limit').default(100).notNull(), // Requests per minute
  
  // Access control
  allowedTenants: jsonb('allowed_tenants'), // JSON array of tenant IDs, null = all
  permissions: jsonb('permissions').default([]).notNull(), // JSON array of permission strings
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  
  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  
  // Usage tracking
  requestCount: integer('request_count').default(0).notNull(),
  lastRequestAt: timestamp('last_request_at'),
  
  // Metadata
  metadata: jsonb('metadata').default({})
});

// Indexes for efficient querying
export const externalApplicationsIndexes = {
  apiKey: 'idx_external_applications_api_key',
  isActive: 'idx_external_applications_is_active',
  createdBy: 'idx_external_applications_created_by',
  lastUsedAt: 'idx_external_applications_last_used_at'
};











