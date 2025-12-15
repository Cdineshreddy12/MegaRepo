import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text, integer, decimal, date } from 'drizzle-orm/pg-core';

// Main tenants table
export const tenants = pgTable('tenants', {

  //phase of extracting data from users
  tenantId: uuid('tenant_id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).notNull().unique(),
  kindeOrgId: varchar('kinde_org_id', { length: 255 }).notNull().unique(),
  adminEmail: varchar('admin_email', { length: 255 }).notNull(),
  
  // Essential Company Profile Fields
  legalCompanyName: varchar('legal_company_name', { length: 255 }),
  gstin: varchar('gstin', { length: 15 }), // Keep for Indian market
  companyType: varchar('company_type', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  website: varchar('website', { length: 500 }),

  // Essential Contact & Address Fields
  billingStreet: varchar('billing_street', { length: 255 }),
  billingCity: varchar('billing_city', { length: 100 }),
  billingState: varchar('billing_state', { length: 100 }),
  billingZip: varchar('billing_zip', { length: 20 }),
  billingCountry: varchar('billing_country', { length: 100 }),
  phone: varchar('phone', { length: 50 }),

  // Essential Localization Settings
  defaultLanguage: varchar('default_language', { length: 10 }).default('en'),
  defaultLocale: varchar('default_locale', { length: 20 }).default('en-US'),
  defaultCurrency: varchar('default_currency', { length: 3 }).default('USD'),
  defaultTimeZone: varchar('default_timezone', { length: 50 }).default('UTC'),

  // Essential Branding & Customization
  logoUrl: varchar('logo_url', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 7 }).default('#2563eb'),
  customDomain: varchar('custom_domain', { length: 255 }),
  brandingConfig: jsonb('branding_config').default({}),

  // Essential Status & Settings
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  settings: jsonb('settings').default({}),

  // Stripe Integration
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

  // Simplified Onboarding & Setup Tracking
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardedAt: timestamp('onboarded_at'),
  onboardingStartedAt: timestamp('onboarding_started_at'),

  // Trial & Subscription Tracking
  trialEndsAt: timestamp('trial_ends_at'),
  trialStartedAt: timestamp('trial_started_at'),

  // Activity Tracking
  firstLoginAt: timestamp('first_login_at'),
  lastActivityAt: timestamp('last_activity_at'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



// Tenant invitations for team members
export const tenantInvitations = pgTable('tenant_invitations', {
  invitationId: uuid('invitation_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  email: varchar('email', { length: 255 }).notNull(),

  // Legacy role field for backward compatibility (single role)
  roleId: uuid('role_id'), // Reference to role they'll get (deprecated for multi-entity)

  // Multi-entity invitation support
  targetEntities: jsonb('target_entities').default([]), // Array of {entityId, roleId, entityType, membershipType}
  invitationScope: varchar('invitation_scope', { length: 20 }).default('tenant'), // 'tenant', 'organization', 'location', 'multi-entity'
  primaryEntityId: uuid('primary_entity_id'), // User's primary organization/location (references entities table)

  invitedBy: uuid('invited_by').notNull(),
  invitationToken: varchar('invitation_token', { length: 255 }).notNull().unique(),
  invitationUrl: varchar('invitation_url', { length: 1000 }), // Full invitation URL for easy access
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'accepted', 'expired', 'cancelled'
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: uuid('cancelled_by'), // Who cancelled the invitation
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Onboarding events tracking for analytics and scalability
export const onboardingEvents = pgTable('onboarding_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'trial_onboarding_started', 'trial_onboarding_completed', 'upgrade_onboarding_started', etc.
  eventPhase: varchar('event_phase', { length: 50 }).notNull(), // 'trial', 'profile', 'upgrade', 'team', 'integration'
  eventAction: varchar('event_action', { length: 50 }).notNull(), // 'started', 'completed', 'skipped', 'abandoned'

  // Context and metadata
  userId: uuid('user_id'), // Which user performed the action
  sessionId: varchar('session_id', { length: 255 }), // For session tracking
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4/IPv6
  userAgent: text('user_agent'), // Browser/device info

  // Event data
  eventData: jsonb('event_data').default({}), // Flexible data storage for event-specific info
  metadata: jsonb('metadata').default({}), // Additional metadata

  // Analytics fields
  timeSpent: integer('time_spent'), // Time spent on this phase/step in seconds
  completionRate: integer('completion_rate'), // Completion percentage at this point
  stepNumber: integer('step_number'), // Which step in the phase
  totalSteps: integer('total_steps'), // Total steps in this phase

  // A/B testing and variants
  variantId: varchar('variant_id', { length: 50 }), // A/B test variant
  experimentId: varchar('experiment_id', { length: 50 }), // Which experiment this event belongs to

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  eventTimestamp: timestamp('event_timestamp').defaultNow() // When the event actually occurred
}); 