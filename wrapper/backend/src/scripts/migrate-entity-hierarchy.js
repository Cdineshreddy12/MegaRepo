/**
 * Migrate Entity Hierarchy Script
 * This script rebuilds hierarchy paths for existing entity data
 */

import HierarchyManager from '../utils/hierarchy-manager.js';
import { db } from '../db/index.js';
import { entities } from '../db/schema/unified-entities.js';
import { eq, sql } from 'drizzle-orm';

async function migrateEntityHierarchy() {
  console.log('🔄 Starting entity hierarchy migration...');

  try {
    // Get all tenants with entities
    const tenantsWithEntities = await db
      .select({
        tenantId: entities.tenantId
      })
      .from(entities)
      .groupBy(entities.tenantId);

    console.log(`📊 Found ${tenantsWithEntities.length} tenants with entities`);

    let totalProcessed = 0;
    let totalUpdated = 0;

    for (const { tenantId } of tenantsWithEntities) {
      console.log(`\n🏢 Processing tenant: ${tenantId}`);

      // Check how many entities need hierarchy paths
      console.log('🔍 Checking entities without hierarchy paths...');

      // Get all entities for this tenant
      const allEntities = await db
        .select({
          entityId: entities.entityId,
          hierarchyPath: entities.hierarchyPath
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId));

      // Filter entities without paths (simple JavaScript filter)
      const entitiesWithoutPaths = allEntities.filter(entity =>
        !entity.hierarchyPath || entity.hierarchyPath.trim() === ''
      );

      console.log(`📈 Found ${entitiesWithoutPaths.length} entities without hierarchy paths out of ${allEntities.length} total`);

        if (entitiesWithoutPaths.length > 0) {
          console.log('🔧 Rebuilding hierarchy paths...');
          try {
            const rebuildResult = await HierarchyManager.rebuildAllHierarchyPaths(tenantId);

            if (rebuildResult.success) {
              console.log(`✅ Updated ${rebuildResult.updatedCount} entities for tenant ${tenantId}`);
              totalUpdated += rebuildResult.updatedCount;
            } else {
              console.error(`❌ Failed to rebuild paths for tenant ${tenantId}:`, rebuildResult.error);
            }
          } catch (error) {
            console.error(`❌ Error rebuilding hierarchy for tenant ${tenantId}:`, error.message);
            console.log('   Continuing with other tenants...');
          }
        } else {
          console.log('✅ All entities already have hierarchy paths');
        }

      // Validate hierarchy integrity
      console.log('🔍 Validating hierarchy integrity...');
      const validationResult = await validateTenantHierarchy(tenantId);
      if (validationResult.valid) {
        console.log('✅ Hierarchy integrity is valid');
      } else {
        console.log('⚠️  Hierarchy issues found:', validationResult.issues);
      }

      totalProcessed++;
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   - Tenants processed: ${totalProcessed}`);
    console.log(`   - Entities updated: ${totalUpdated}`);
    console.log('✅ Entity hierarchy migration completed successfully!');

  } catch (error) {
    console.error('❌ Entity hierarchy migration failed:', error);
    throw error;
  }
}

/**
 * Validate hierarchy integrity for a tenant
 */
async function validateTenantHierarchy(tenantId) {
  try {
    const allEntities = await db
      .select({
        entityId: entities.entityId,
        entityName: entities.entityName,
        parentEntityId: entities.parentEntityId,
        hierarchyPath: entities.hierarchyPath,
        entityLevel: entities.entityLevel
      })
      .from(entities)
      .where(eq(entities.tenantId, tenantId))
      .where(eq(entities.isActive, true));

    const issues = [];
    const entityMap = new Map();

    // Build entity map
    allEntities.forEach(entity => {
      entityMap.set(entity.entityId, entity);
    });

    // Check each entity
    for (const entity of allEntities) {
      // Check if parent exists
      if (entity.parentEntityId && !entityMap.has(entity.parentEntityId)) {
        issues.push(`Entity ${entity.entityId} (${entity.entityName}) references non-existent parent ${entity.parentEntityId}`);
      }

      // Check hierarchy path consistency
      if (entity.hierarchyPath) {
        const pathParts = entity.hierarchyPath.split('.');
        const expectedLevel = pathParts.length;

        if (entity.entityLevel !== expectedLevel) {
          issues.push(`Entity ${entity.entityId} (${entity.entityName}) has level ${entity.entityLevel} but path suggests ${expectedLevel}`);
        }

        // Check if path starts with root entity
        if (entity.parentEntityId === null && pathParts.length !== 1) {
          issues.push(`Root entity ${entity.entityId} (${entity.entityName}) should have single-part hierarchy path`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues: issues
    };

  } catch (error) {
    console.error('❌ Error validating hierarchy:', error);
    return {
      valid: false,
      issues: [`Validation error: ${error.message}`]
    };
  }
}

// Run the migration
migrateEntityHierarchy()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
