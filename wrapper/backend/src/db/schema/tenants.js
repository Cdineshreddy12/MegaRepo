import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text, integer, decimal, date, numeric } from 'drizzle-orm/pg-core';

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

  // New Essential Fields from Onboarding Analysis
  taxRegistered: boolean('tax_registered').default(false),
  vatGstRegistered: boolean('vat_gst_registered').default(false),
  organizationSize: varchar('organization_size', { length: 50 }), // '1-10', '11-50', etc.
  billingEmail: varchar('billing_email', { length: 255 }),
  contactJobTitle: varchar('contact_job_title', { length: 150 }),
  preferredContactMethod: varchar('preferred_contact_method', { length: 20 }), // 'email', 'phone', 'sms'

  // Mailing Address (if different from registered)
  mailingAddressSameAsRegistered: boolean('mailing_address_same_as_registered').default(true),
  mailingStreet: varchar('mailing_street', { length: 255 }),
  mailingCity: varchar('mailing_city', { length: 100 }),
  mailingState: varchar('mailing_state', { length: 100 }),
  mailingZip: varchar('mailing_zip', { length: 20 }),
  mailingCountry: varchar('mailing_country', { length: 100 }),

  // Additional Contact Details
  supportEmail: varchar('support_email', { length: 255 }),
  contactSalutation: varchar('contact_salutation', { length: 20 }),
  contactMiddleName: varchar('contact_middle_name', { length: 100 }),
  contactDepartment: varchar('contact_department', { length: 100 }),
  contactDirectPhone: varchar('contact_direct_phone', { length: 50 }),
  contactMobilePhone: varchar('contact_mobile_phone', { length: 50 }),
  contactPreferredContactMethod: varchar('contact_preferred_contact_method', { length: 20 }),
  contactAuthorityLevel: varchar('contact_authority_level', { length: 50 }),

  // Country-specific tax registration details (flexible storage)
  taxRegistrationDetails: jsonb('tax_registration_details').default('{}'),

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
  
  // Fiscal Year Settings
  fiscalYearStartMonth: integer('fiscal_year_start_month').default(1),
  fiscalYearEndMonth: integer('fiscal_year_end_month').default(12),
  fiscalYearStartDay: integer('fiscal_year_start_day').default(1),
  fiscalYearEndDay: integer('fiscal_year_end_day').default(31),
  
  // Banking & Financial Information
  bankName: varchar('bank_name', { length: 255 }),
  bankBranch: varchar('bank_branch', { length: 255 }),
  accountHolderName: varchar('account_holder_name', { length: 255 }),
  accountNumber: varchar('account_number', { length: 50 }), // Encrypted in application
  accountType: varchar('account_type', { length: 50 }),
  bankAccountCurrency: varchar('bank_account_currency', { length: 3 }),
  swiftBicCode: varchar('swift_bic_code', { length: 11 }),
  iban: varchar('iban', { length: 34 }),
  routingNumberUs: varchar('routing_number_us', { length: 9 }),
  sortCodeUk: varchar('sort_code_uk', { length: 6 }),
  ifscCodeIndia: varchar('ifsc_code_india', { length: 11 }),
  bsbNumberAustralia: varchar('bsb_number_australia', { length: 6 }),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }),
  preferredPaymentMethod: varchar('preferred_payment_method', { length: 50 }),
  
  // Enhanced Tax & Compliance
  taxResidenceCountry: varchar('tax_residence_country', { length: 100 }),
  taxExemptStatus: boolean('tax_exempt_status').default(false),
  taxExemptionCertificateNumber: varchar('tax_exemption_certificate_number', { length: 50 }),
  taxExemptionExpiryDate: date('tax_exemption_expiry_date'),
  withholdingTaxApplicable: boolean('withholding_tax_applicable').default(false),
  withholdingTaxRate: decimal('withholding_tax_rate', { precision: 5, scale: 2 }),
  taxTreatyCountry: varchar('tax_treaty_country', { length: 100 }),
  w9StatusUs: varchar('w9_status_us', { length: 50 }),
  w8FormTypeUs: varchar('w8_form_type_us', { length: 50 }),
  reverseChargeMechanism: boolean('reverse_charge_mechanism').default(false),
  vatGstRateApplicable: varchar('vat_gst_rate_applicable', { length: 50 }),
  regulatoryComplianceStatus: varchar('regulatory_compliance_status', { length: 50 }).default('Pending'),
  industrySpecificLicenses: text('industry_specific_licenses'),
  dataProtectionRegistration: varchar('data_protection_registration', { length: 50 }),
  professionalIndemnityInsurance: boolean('professional_indemnity_insurance').default(false),
  insurancePolicyNumber: varchar('insurance_policy_number', { length: 50 }),
  insuranceExpiryDate: date('insurance_expiry_date'),

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