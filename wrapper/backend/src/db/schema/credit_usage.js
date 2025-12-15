import { pgTable, uuid, varchar, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';
import { entities } from './unified-entities.js';

// Detailed credit usage tracking per operation - SIMPLIFIED
export const creditUsage = pgTable('credit_usage', {
  usageId: uuid('usage_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context - FIXED REFERENCES
  entityId: uuid('entity_id').references(() => entities.entityId).notNull(), // References unified entities table

  // User Context - SIMPLIFIED
  userId: uuid('user_id').references(() => tenantUsers.userId),

  // Operation Details - SIMPLIFIED
  operationCode: varchar('operation_code', { length: 255 }).notNull(), // 'crm.leads.create', 'hr.payroll.process'
  operationId: uuid('operation_id'), // ID of the specific operation

  // Credit Consumption - SIMPLIFIED
  creditsDebited: decimal('credits_debited', { precision: 10, scale: 4 }).notNull(),

  // Context Information - SIMPLIFIED
  ipAddress: varchar('ip_address', { length: 45 }),
  requestId: varchar('request_id', { length: 100 }), // For tracking related operations

  // Status - SIMPLIFIED
  success: boolean('success').default(true),

  // Audit - SIMPLIFIED
  createdAt: timestamp('created_at').defaultNow(),
});

// REMOVED: usageAggregation table - Use queries on credit_usage for analytics

