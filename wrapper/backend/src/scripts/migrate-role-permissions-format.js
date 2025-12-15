/**
 * Migration Script: Convert role permissions from flat array to hierarchical format
 *
 * This script updates all custom roles to use the hierarchical permission format
 * consistent with the Super Administrator role.
 */

import { dbManager, initializeDrizzleInstances } from '../db/connection-manager.js';
import { eq, and, not, count } from 'drizzle-orm';
import { customRoles } from '../db/schema/index.js';

/**
 * Convert flat permission array to hierarchical object format
 * @param {string[]} permissionsArray - Array of permission strings like ['crm.leads.read', 'crm.leads.create']
 * @returns {object} Hierarchical permission object like { crm: { leads: ['read', 'create'] } }
 */
function convertPermissionsToHierarchical(permissionsArray) {
  if (!Array.isArray(permissionsArray)) {
    return permissionsArray; // Return as-is if already in correct format
  }

  const hierarchical = {};

  permissionsArray.forEach(permission => {
    const parts = permission.split('.');
    if (parts.length >= 3) {
      const [app, module, operation] = parts;

      if (!hierarchical[app]) {
        hierarchical[app] = {};
      }
      if (!hierarchical[app][module]) {
        hierarchical[app][module] = [];
      }
      if (!hierarchical[app][module].includes(operation)) {
        hierarchical[app][module].push(operation);
      }
    }
  });

  return hierarchical;
}

/**
 * Check if permissions are already in hierarchical format
 * @param {*} permissions - Permissions data from database
 * @returns {boolean} True if already hierarchical
 */
function isHierarchicalFormat(permissions) {
  return permissions && typeof permissions === 'object' && !Array.isArray(permissions);
}

/**
 * Check if permissions are in flat array format
 * @param {*} permissions - Permissions data from database
 * @returns {boolean} True if flat array format
 */
function isFlatArrayFormat(permissions) {
  return Array.isArray(permissions) && permissions.length > 0 && typeof permissions[0] === 'string';
}

async function migrateRolePermissions() {
  console.log('🚀 Starting role permissions format migration...');
  console.log('📁 Current working directory:', process.cwd());
  console.log('🔍 Script location:', import.meta.url);

  // Initialize database connection
  console.log('🔌 Initializing database connection...');
  await dbManager.initialize();
  const { appDb: db } = initializeDrizzleInstances();
  console.log('✅ Database connection initialized');

  try {
    console.log('🔌 Testing database connection...');

    // First, let's see how many roles total exist
    const totalRoles = await db
      .select({ count: count() })
      .from(customRoles);

    console.log(`📊 Total roles in database:`, totalRoles[0]?.count || 0);

    // Get all custom roles (not system roles)
    const roles = await db
      .select({
        roleId: customRoles.roleId,
        roleName: customRoles.roleName,
        permissions: customRoles.permissions,
        tenantId: customRoles.tenantId,
        isSystemRole: customRoles.isSystemRole
      })
      .from(customRoles)
      .where(and(
        eq(customRoles.isSystemRole, false),
        not(eq(customRoles.permissions, null))
      ));

    console.log(`📊 Found ${roles.length} custom roles to check`);
    console.log('🔍 First few roles:', roles.slice(0, 3).map(r => ({
      name: r.roleName,
      permissionsType: typeof r.permissions,
      permissionsLength: typeof r.permissions === 'string' ? r.permissions.length : (Array.isArray(r.permissions) ? r.permissions.length : 'N/A')
    })));

    let updatedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      try {
        let permissionsData;

        // Parse permissions if it's a string
        if (typeof role.permissions === 'string') {
          try {
            permissionsData = JSON.parse(role.permissions);
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse permissions for role ${role.roleName}:`, parseError.message);
            continue;
          }
        } else {
          permissionsData = role.permissions;
        }

        // Check if already in hierarchical format
        if (isHierarchicalFormat(permissionsData)) {
          console.log(`⏭️ Skipping role "${role.roleName}" - already in hierarchical format`);
          skippedCount++;
          continue;
        }

        // Check if it's in flat array format
        if (isFlatArrayFormat(permissionsData)) {
          console.log(`🔄 Converting role "${role.roleName}" from flat array to hierarchical format`);

          const hierarchicalPermissions = convertPermissionsToHierarchical(permissionsData);

          // Update the role
          await db
            .update(customRoles)
            .set({
              permissions: JSON.stringify(hierarchicalPermissions),
              updatedAt: new Date()
            })
            .where(eq(customRoles.roleId, role.roleId));

          console.log(`✅ Updated role "${role.roleName}" with hierarchical permissions`);
          updatedCount++;
        } else {
          console.warn(`⚠️ Unknown permissions format for role "${role.roleName}":`, typeof permissionsData);
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing role "${role.roleName}":`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Updated: ${updatedCount} roles`);
    console.log(`⏭️ Skipped: ${skippedCount} roles`);
    console.log(`📊 Total processed: ${roles.length} roles`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateRolePermissions()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });
