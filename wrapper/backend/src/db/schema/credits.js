import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';
import { entities } from './unified-entities.js';

// Main credit balance table
export const credits = pgTable('credits', {
  creditId: uuid('credit_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context
  entityId: uuid('entity_id').references(() => entities.entityId), // References unified entities table

  // Credit Balance
  availableCredits: decimal('available_credits', { precision: 15, scale: 4 }).default('0'),

  // Status
  isActive: boolean('is_active').default(true),

  // Audit
  lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Credit transaction ledger (immutable record of all credit movements) - SIMPLIFIED
export const creditTransactions = pgTable('credit_transactions', {
  transactionId: uuid('transaction_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context - Now references unified entities table
  entityId: uuid('entity_id').references(() => entities.entityId), // References unified entities table

  // Transaction Details - SIMPLIFIED
  transactionType: varchar('transaction_type', { length: 30 }).notNull(),
  // 'purchase', 'consumption', 'expiry', 'adjustment'

  amount: decimal('amount', { precision: 15, scale: 4 }).notNull(),
  previousBalance: decimal('previous_balance', { precision: 15, scale: 4 }),
  newBalance: decimal('new_balance', { precision: 15, scale: 4 }),

  // Transaction Context - SIMPLIFIED
  operationCode: varchar('operation_code', { length: 255 }), // 'crm.leads.create', 'hr.payroll.process'

  // Audit - SIMPLIFIED
  initiatedBy: uuid('initiated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
});

// REMOVED: creditAlerts table - Use external monitoring for alerts
