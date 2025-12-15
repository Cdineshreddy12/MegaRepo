import { pgTable, uuid, varchar, timestamp, jsonb, boolean, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';
import { entities } from './unified-entities.js';

// Application credit allocations table
// This tracks how many credits are allocated from organization pool to specific applications
export const creditAllocations = pgTable('credit_allocations', {
  allocationId: uuid('allocation_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Source entity (usually organization)
  sourceEntityId: uuid('source_entity_id').references(() => entities.entityId).notNull(),

  // Target application
  targetApplication: varchar('target_application', { length: 50 }).notNull(), // 'crm', 'hr', 'affiliate', 'system'

  // Allocation details
  allocatedCredits: decimal('allocated_credits', { precision: 15, scale: 4 }).notNull(),
  usedCredits: decimal('used_credits', { precision: 15, scale: 4 }).default('0'),
  availableCredits: decimal('available_credits', { precision: 15, scale: 4 }).default('0'), // computed: allocated - used

  // Credit type differentiation
  creditType: varchar('credit_type', { length: 50 }).default('free'), // 'free', 'paid', 'seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'

  // Seasonal credit metadata
  creditMetadata: jsonb('credit_metadata'), // Additional metadata for seasonal/promotional credits
  campaignId: varchar('campaign_id', { length: 100 }), // Identifier for the credit campaign or promotion
  campaignName: varchar('campaign_name', { length: 255 }), // Human-readable name for the credit campaign
  expiryRule: varchar('expiry_rule', { length: 50 }).default('fixed_date'), // 'fixed_date', 'rolling_window', 'never_expire'
  expiryWarningDays: decimal('expiry_warning_days', { precision: 5, scale: 0 }).default('7'), // Days before expiry to show warning notifications

  // Allocation metadata
  allocationType: varchar('allocation_type', { length: 30 }).default('manual'), // 'manual', 'automatic', 'bulk', 'subscription', 'campaign'
  allocationPurpose: text('allocation_purpose'), // Description of why credits were allocated

  // Validity period
  isActive: boolean('is_active').default(true),
  allocatedAt: timestamp('allocated_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Optional expiry date
  autoReplenish: boolean('auto_replenish').default(false), // Auto-replenish when low

  // Audit
  allocatedBy: uuid('allocated_by').references(() => tenantUsers.userId),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
});

// Credit allocation transactions (track allocation changes)
export const creditAllocationTransactions = pgTable('credit_allocation_transactions', {
  transactionId: uuid('transaction_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Allocation reference
  allocationId: uuid('allocation_id').references(() => creditAllocations.allocationId).notNull(),

  // Transaction details
  transactionType: varchar('transaction_type', { length: 30 }).notNull(),
  // 'allocation', 'deallocation', 'consumption', 'replenishment', 'expiry', 'transfer'

  amount: decimal('amount', { precision: 15, scale: 4 }).notNull(),
  previousAllocated: decimal('previous_allocated', { precision: 15, scale: 4 }),
  newAllocated: decimal('new_allocated', { precision: 15, scale: 4 }),
  previousUsed: decimal('previous_used', { precision: 15, scale: 4 }),
  newUsed: decimal('new_used', { precision: 15, scale: 4 }),

  // Context
  operationCode: varchar('operation_code', { length: 255 }), // Which operation consumed the credits
  description: text('description'),

  // Audit
  initiatedBy: uuid('initiated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
});
