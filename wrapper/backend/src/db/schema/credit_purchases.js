import { pgTable, uuid, varchar, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';
import { entities } from './unified-entities.js';

// Credit purchase orders - SIMPLIFIED
export const creditPurchases = pgTable('credit_purchases', {
  purchaseId: uuid('purchase_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Purchase Context - FIXED REFERENCES
  entityId: uuid('entity_id').references(() => entities.entityId), // References unified entities table

  // Purchase Details - SIMPLIFIED
  creditAmount: decimal('credit_amount', { precision: 15, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 4 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),

  // Credit Batch Details - SIMPLIFIED
  batchId: uuid('batch_id').notNull().unique(), // Unique identifier for this credit batch
  expiryDate: timestamp('expiry_date'), // When these credits expire

  // Payment Information - SIMPLIFIED
  paymentMethod: varchar('payment_method', { length: 50 }), // 'stripe', 'bank_transfer', 'check'
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending'),

  // Purchase Status - SIMPLIFIED
  status: varchar('status', { length: 20 }).default('pending'),
  // 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'

  // Timestamps - SIMPLIFIED
  requestedAt: timestamp('requested_at').defaultNow(),
  paidAt: timestamp('paid_at'),
  creditedAt: timestamp('credited_at'), // When credits were added to balance

  // Audit - SIMPLIFIED
  requestedBy: uuid('requested_by').references(() => tenantUsers.userId).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// REMOVED: All complex tables for MVP simplicity
// - discountTiers: No volume discounts needed
// - purchaseTemplates: Handle auto-purchase in application code
// - purchaseHistory: Track status changes in main purchase table
