import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { notificationTemplates } from './notification-templates.js';
import { tenantUsers } from './users.js';

/**
 * Tenant Template Customizations table
 * Allows tenants to override UI configurations for specific templates
 */
export const tenantTemplateCustomizations = pgTable('tenant_template_customizations', {
  customizationId: uuid('customization_id').primaryKey().defaultRandom(),
  
  // Relationships
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  templateId: uuid('template_id').references(() => notificationTemplates.templateId).notNull(),
  
  // UI Override Configuration
  uiConfig: jsonb('ui_config').notNull(), // Same structure as template.uiConfig, but overrides template defaults
  
  // Custom branding
  logoUrl: text('logo_url'),
  brandColors: jsonb('brand_colors').default({
    primary: null,
    secondary: null,
    accent: null
  }),
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  
  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Indexes for efficient querying
export const tenantTemplateCustomizationsIndexes = {
  tenantTemplate: 'idx_tenant_template_customizations_tenant_template',
  tenantId: 'idx_tenant_template_customizations_tenant_id',
  templateId: 'idx_tenant_template_customizations_template_id',
  isActive: 'idx_tenant_template_customizations_is_active'
};











