import { pgTable, uuid, varchar, timestamp, integer, decimal, jsonb, boolean, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Daily usage metrics (aggregated)
export const usageMetricsDaily = pgTable('usage_metrics_daily', {
  metricId: uuid('metric_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context for Hierarchical Usage Tracking
  organizationId: uuid('organization_id').references(() => tenants.tenantId),
  locationId: uuid('location_id'),

  // Metric Details
  app: varchar('app', { length: 50 }).notNull(), // 'crm', 'hr', 'affiliate', 'wrapper'
  date: timestamp('date').notNull(), // Day of usage

  // Usage Counts
  apiCalls: integer('api_calls').default(0),
  storageUsed: decimal('storage_used', { precision: 15, scale: 2 }).default('0'), // bytes
  activeUsers: integer('active_users').default(0),
  totalRequests: integer('total_requests').default(0),

  // Credit Consumption Tracking
  creditConsumed: decimal('credit_consumed', { precision: 15, scale: 4 }).default('0'),
  creditBatchesUsed: jsonb('credit_batches_used').default([]), // Track which batches were consumed

  // Performance Metrics
  avgResponseTime: decimal('avg_response_time', { precision: 8, scale: 2 }).default('0'), // ms
  errorCount: integer('error_count').default(0),

  // Feature Usage
  featureUsage: jsonb('feature_usage').default({}),

  // Breakdown by source
  usageBySource: jsonb('usage_by_source').default({}),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Detailed usage logs (for audit and debugging)
export const usageLogs = pgTable('usage_logs', {
  logId: uuid('log_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: uuid('user_id').references(() => tenantUsers.userId),

  // Entity Context for Hierarchical Usage Tracking
  organizationId: uuid('organization_id').references(() => tenants.tenantId),
  locationId: uuid('location_id'),

  // Request Details
  app: varchar('app', { length: 50 }).notNull(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  statusCode: integer('status_code'),
  responseTime: decimal('response_time', { precision: 8, scale: 2 }), // ms

  // Source & Context
  source: varchar('source', { length: 50 }).notNull(), // 'wrapper_gateway', 'direct_access'
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Credit Consumption Tracking
  operationCode: varchar('operation_code', { length: 255 }), // 'crm.leads.create'
  creditConsumed: decimal('credit_consumed', { precision: 10, scale: 4 }).default('0'),
  creditBatchId: uuid('credit_batch_id'), // Which batch was debited
  pricingMode: varchar('pricing_mode', { length: 20 }).default('credits'), // 'credits', 'overage'

  // Additional Data
  requestSize: integer('request_size'), // bytes
  responseSize: integer('response_size'), // bytes
  metadata: jsonb('metadata').default({}),

  // Error Details (if any)
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),

  createdAt: timestamp('created_at').defaultNow(),
});


 