// FIXED: Enhanced credit configuration schema with entity-specific support
import { pgTable, uuid, varchar, timestamp, boolean, decimal, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';
import { entities } from './unified-entities.js';

// Enhanced credit configuration system with entity-level support
export const creditConfigurations = pgTable('credit_configurations', {
  configId: uuid('config_id').primaryKey().defaultRandom(),

  // Configuration Target - ENHANCED
  tenantId: uuid('tenant_id').references(() => tenants.tenantId), // NULL for global, set for tenant-specific
  entityId: uuid('entity_id').references(() => entities.entityId), // NULL for tenant-wide, set for entity-specific
  operationCode: varchar('operation_code', { length: 255 }).notNull(), // 'crm.leads.create', 'hr.payroll.process'

  // Configuration Type
  isGlobal: boolean('is_global').default(false), // True for global, false for tenant/entity-specific

  // Credit Cost Configuration
  creditCost: decimal('credit_cost', { precision: 10, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }).default('operation'), // 'operation', 'record', 'minute', 'MB', 'GB'
  unitMultiplier: decimal('unit_multiplier', { precision: 10, scale: 4 }).default('1'), // How many units per operation

  // Status
  isActive: boolean('is_active').default(true),

  // Audit & Tracking
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

}, (table) => ({
  // Enhanced unique constraint: tenant + entity + operation
  uniqueCreditConfig: uniqueIndex('unique_credit_config_entity')
    .on(table.tenantId, table.entityId, table.operationCode)
}));

/*
🎯 CONFIGURATION HIERARCHY (Resolution Order):

1. Entity-Specific Config (highest priority)
   - tenant_id = 'tenant-uuid'
   - entity_id = 'branch-uuid'
   - operation_code = 'crm.leads.create'

2. Tenant-Wide Config (fallback)
   - tenant_id = 'tenant-uuid'
   - entity_id = NULL
   - operation_code = 'crm.leads.create'

3. Global Config (final fallback)
   - tenant_id = NULL
   - entity_id = NULL
   - operation_code = 'crm.leads.create'

✅ ADVANTAGES OF THIS APPROACH:

1. **Granular Control**: Different pricing for each branch/organization
2. **Fallback System**: Automatic fallback to tenant/global configs
3. **Scalable**: Easy to add new entity-specific configurations
4. **Flexible**: Can mix entity-specific and tenant-wide configurations
5. **Maintainable**: Single table with clear hierarchy

📋 USAGE EXAMPLES:

// Create Mumbai Branch premium pricing
INSERT INTO credit_configurations (
  tenant_id, entity_id, operation_code, credit_cost, unit
) VALUES (
  'tenant-uuid', 'mumbai-branch-uuid', 'crm.leads.create', 3.75, 'operation'
);

// Create Delhi Office cost-effective pricing
INSERT INTO credit_configurations (
  tenant_id, entity_id, operation_code, credit_cost, unit
) VALUES (
  'tenant-uuid', 'delhi-office-uuid', 'crm.leads.create', 2.0, 'operation'
);

// Create tenant-wide default pricing (entity_id = NULL)
INSERT INTO credit_configurations (
  tenant_id, operation_code, credit_cost, unit
) VALUES (
  'tenant-uuid', 'hr.employees.create', 3.0, 'operation'
);

🔍 QUERY EXAMPLES:

// Get effective cost for Mumbai branch operation
SELECT COALESCE(
  (SELECT credit_cost FROM credit_configurations
   WHERE tenant_id = 'tenant-uuid' AND entity_id = 'mumbai-branch-uuid'
   AND operation_code = 'crm.leads.create' AND is_active = true),
  (SELECT credit_cost FROM credit_configurations
   WHERE tenant_id = 'tenant-uuid' AND entity_id IS NULL
   AND operation_code = 'crm.leads.create' AND is_active = true),
  (SELECT credit_cost FROM credit_configurations
   WHERE tenant_id IS NULL AND entity_id IS NULL
   AND operation_code = 'crm.leads.create' AND is_active = true)
) as effective_cost;

// Get all configurations for a tenant
SELECT
  cc.operation_code,
  cc.credit_cost,
  cc.unit,
  CASE
    WHEN cc.entity_id IS NOT NULL THEN e.entity_name || ' (' || e.entity_type || ')'
    WHEN cc.tenant_id IS NOT NULL THEN 'Tenant-wide'
    ELSE 'Global'
  END as scope
FROM credit_configurations cc
LEFT JOIN entities e ON cc.entity_id = e.entity_id
WHERE cc.tenant_id = 'tenant-uuid' OR cc.tenant_id IS NULL
ORDER BY cc.operation_code, cc.entity_id;

✅ MIGRATION IMPACT:

This schema change requires:
1. Adding entity_id column to existing table
2. Updating unique constraint to include entity_id
3. Migrating existing data (if any)
4. Updating application code to handle entity-specific lookups

The fix script (fix-credit-config-entity.js) handles all these changes automatically.
*/
