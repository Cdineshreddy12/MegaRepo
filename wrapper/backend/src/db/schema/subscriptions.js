import { pgTable, uuid, varchar, timestamp, jsonb, decimal, integer, boolean, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { entities } from './unified-entities.js';

// Main subscriptions
export const subscriptions = pgTable('subscriptions', {
  subscriptionId: uuid('subscription_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Plan information
  plan: varchar('plan', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'active', 'past_due', 'canceled', 'trialing', 'suspended'

  // Stripe subscription details
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

  // Trial information
  isTrialUser: boolean('is_trial_user').default(false),

  // Upgrade tracking
  hasEverUpgraded: boolean('has_ever_upgraded').default(false), // Track if user ever had a paid plan

  // Usage and limits
  subscribedTools: jsonb('subscribed_tools').default([]),
  usageLimits: jsonb('usage_limits').default({}),

  // Billing cycle and pricing
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly'), // 'monthly', 'yearly'
  yearlyPrice: decimal('yearly_price', { precision: 10, scale: 2 }).default('0'),

  // Current period information
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),

  // Cancellation information
  cancelAt: timestamp('cancel_at'),
  canceledAt: timestamp('canceled_at'),
  suspendedAt: timestamp('suspended_at'),
  suspendedReason: text('suspended_reason'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Payment history - STREAMLINED
export const payments = pgTable('payments', {
  paymentId: uuid('payment_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.subscriptionId),

  // Stripe Payment Details
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),

  // Payment Info
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { length: 20 }).notNull(), // 'succeeded', 'failed', 'pending', 'canceled'
  paymentMethod: varchar('payment_method', { length: 50 }), // 'card', 'bank_transfer', etc.
  paymentMethodDetails: jsonb('payment_method_details').default({}), // Card brand, last4, etc.

  // Payment Type & Context
  paymentType: varchar('payment_type', { length: 30 }).default('subscription'), // 'subscription', 'credit_purchase'
  billingReason: varchar('billing_reason', { length: 50 }), // 'subscription_cycle', 'credit_topup'

  // Invoice Details
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  description: text('description'),

  // Tax Information
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),

  // Metadata
  metadata: jsonb('metadata').default({}),
  stripeRawData: jsonb('stripe_raw_data').default({}), // Full Stripe event data for debugging

  // Dates
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
