import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';
import { customRoles } from './permissions.js';
import { entities } from './unified-entities.js';

// User membership across organizations and locations
export const organizationMemberships = pgTable('organization_memberships', {
  membershipId: uuid('membership_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => tenantUsers.userId, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Membership - FIXED REFERENCES
  entityId: uuid('entity_id').references(() => entities.entityId).notNull(), // References unified entities table
  entityType: varchar('entity_type', { length: 20 }).default('organization'), // For compatibility, derived from entities table

  // Role Assignment
  roleId: uuid('role_id').references(() => customRoles.roleId),
  roleName: varchar('role_name', { length: 100 }), // Cached for performance
  permissions: jsonb('permissions').default({}), // Cached permissions for performance

  // Membership Details
  membershipType: varchar('membership_type', { length: 20 }).default('direct'), // 'direct', 'inherited', 'temporary'
  membershipStatus: varchar('membership_status', { length: 20 }).default('active'), // 'active', 'inactive', 'suspended', 'pending'

  // Access Control
  accessLevel: varchar('access_level', { length: 20 }).default('standard'), // 'admin', 'manager', 'standard', 'limited'
  isPrimary: boolean('is_primary').default(false), // Is this the user's primary membership for this entity type
  canAccessSubEntities: boolean('can_access_sub_entities').default(false), // Can access child organizations/locations

  // Credit Permissions
  creditPermissions: jsonb('credit_permissions').default({
    canPurchaseCredits: false,
    canTransferCredits: false,
    canApproveTransfers: false,
    canViewCreditUsage: true,
    creditLimit: null // NULL = no limit
  }),

  // Time-based Access
  isTemporary: boolean('is_temporary').default(false),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),

  // Department/Team Assignment
  department: varchar('department', { length: 100 }),
  team: varchar('team', { length: 100 }),
  jobTitle: varchar('job_title', { length: 100 }),
  employeeId: varchar('employee_id', { length: 50 }),

  // Contact Override (entity-specific contact info)
  contactOverride: jsonb('contact_override').default({}), // Override user's primary contact info

  // Preferences
  preferences: jsonb('preferences').default({
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    dashboard: {
      theme: 'default',
      layout: 'standard'
    }
  }),

  // Audit & Tracking
  invitedBy: uuid('invited_by').references(() => tenantUsers.userId),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at'),
  lastAccessedAt: timestamp('last_accessed_at'),

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Membership invitations
export const membershipInvitations = pgTable('membership_invitations', {
  invitationId: uuid('invitation_id').primaryKey().defaultRandom(),
  membershipId: uuid('membership_id').references(() => organizationMemberships.membershipId, { onDelete: 'cascade' }),

  // Invitation Details
  invitedUserId: uuid('invited_user_id').references(() => tenantUsers.userId),
  invitedEmail: varchar('invited_email', { length: 255 }).notNull(),
  invitationToken: varchar('invitation_token', { length: 255 }).notNull().unique(),

  // Entity Context - FIXED REFERENCES
  entityId: uuid('entity_id').references(() => entities.entityId).notNull(), // References unified entities table
  entityType: varchar('entity_type', { length: 20 }).default('organization'), // For compatibility, derived from entities table
  roleId: uuid('role_id').references(() => customRoles.roleId),

  // Invitation Status
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'accepted', 'declined', 'expired', 'cancelled'
  sentAt: timestamp('sent_at'),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  declinedAt: timestamp('declined_at'),
  cancelledAt: timestamp('cancelled_at'),

  // Invitation Content
  message: text('message'),
  invitationUrl: varchar('invitation_url', { length: 1000 }),

  // Audit
  invitedBy: uuid('invited_by').references(() => tenantUsers.userId).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Membership history (for audit trails)
export const membershipHistory = pgTable('membership_history', {
  historyId: uuid('history_id').primaryKey().defaultRandom(),
  membershipId: uuid('membership_id').references(() => organizationMemberships.membershipId, { onDelete: 'cascade' }).notNull(),
  entityId: uuid('entity_id').references(() => entities.entityId), // Add entity reference for history

  // Change Details
  changeType: varchar('change_type', { length: 50 }).notNull(), // 'created', 'updated', 'deactivated', 'reactivated', 'role_changed'
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changeReason: text('change_reason'),

  // Context
  changedBy: uuid('changed_by').references(() => tenantUsers.userId).notNull(),
  changeSource: varchar('change_source', { length: 50 }).default('manual'), // 'manual', 'import', 'api', 'system'

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

