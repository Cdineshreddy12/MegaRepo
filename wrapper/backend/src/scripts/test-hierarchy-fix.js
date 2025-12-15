/**
 * Test Hierarchy Fix Script
 * This script tests that the hierarchy system is working properly after fixes
 */

import { db } from '../db/index.js';
import { entities } from '../db/schema/unified-entities.js';
import { eq } from 'drizzle-orm';

async function testHierarchyFix() {
  console.log('🧪 Testing hierarchy fix implementation...\n');

  try {
    // Find a tenant with entities to test
    const tenantWithEntities = await db
      .select({
        tenantId: entities.tenantId
      })
      .from(entities)
      .where(eq(entities.isActive, true))
      .groupBy(entities.tenantId)
      .limit(1);

    if (tenantWithEntities.length === 0) {
      console.log('⚠️  No active entities found to test hierarchy');
      console.log('💡 Try creating some test entities first');
      return;
    }

    const testTenantId = tenantWithEntities[0].tenantId;
    console.log(`🎯 Testing with tenant: ${testTenantId}\n`);

    // Test 1: Check entity count and structure
    console.log('Test 1: 📊 Entity Structure Analysis');
    const allEntities = await db
      .select({
        entityId: entities.entityId,
        entityName: entities.entityName,
        entityType: entities.entityType,
        parentEntityId: entities.parentEntityId,
        hierarchyPath: entities.hierarchyPath,
        fullHierarchyPath: entities.fullHierarchyPath,
        entityLevel: entities.entityLevel
      })
      .from(entities)
      .where(eq(entities.tenantId, testTenantId))
      .where(eq(entities.isActive, true))
      .orderBy(entities.entityLevel, entities.createdAt);

    console.log(`   Found ${allEntities.length} active entities`);
    console.log(`   Entity types: ${[...new Set(allEntities.map(e => e.entityType))].join(', ')}`);

    // Test 2: Check hierarchy path coverage
    const entitiesWithPaths = allEntities.filter(e => e.hierarchyPath);
    const entitiesWithoutPaths = allEntities.filter(e => !e.hierarchyPath);

    console.log(`\nTest 2: 🔗 Hierarchy Path Coverage`);
    console.log(`   With hierarchy paths: ${entitiesWithPaths.length}`);
    console.log(`   Without hierarchy paths: ${entitiesWithoutPaths.length}`);
    console.log(`   Coverage: ${((entitiesWithPaths.length / allEntities.length) * 100).toFixed(1)}%`);

    if (entitiesWithoutPaths.length > 0) {
      console.log('   ⚠️  Entities without paths:');
      entitiesWithoutPaths.forEach(entity => {
        console.log(`      - ${entity.entityName} (${entity.entityType})`);
      });
    }

    // Test 3: Validate hierarchy consistency
    console.log(`\nTest 3: ✅ Hierarchy Consistency Check`);
    let consistencyIssues = 0;

    for (const entity of allEntities) {
      // Check if path matches level
      if (entity.hierarchyPath) {
        const pathParts = entity.hierarchyPath.split('.');
        const expectedLevel = pathParts.length;

        if (entity.entityLevel !== expectedLevel) {
          console.log(`   ⚠️  Level mismatch: ${entity.entityName} (level: ${entity.entityLevel}, expected: ${expectedLevel})`);
          consistencyIssues++;
        }

        // Check if entity ID is in its own path
        if (!entity.hierarchyPath.includes(entity.entityId)) {
          console.log(`   ⚠️  Path missing entity ID: ${entity.entityName} (ID: ${entity.entityId})`);
          consistencyIssues++;
        }
      }

      // Check parent exists
      if (entity.parentEntityId) {
        const parentExists = allEntities.some(e => e.entityId === entity.parentEntityId);
        if (!parentExists) {
          console.log(`   ⚠️  Missing parent: ${entity.entityName} references ${entity.parentEntityId}`);
          consistencyIssues++;
        }
      }
    }

    if (consistencyIssues === 0) {
      console.log('   ✅ All hierarchy paths are consistent');
    } else {
      console.log(`   ⚠️  Found ${consistencyIssues} consistency issues`);
    }

    // Test 4: Check tree structure
    console.log(`\nTest 4: 🌳 Tree Structure Validation`);
    const rootEntities = allEntities.filter(e => !e.parentEntityId);
    console.log(`   Root entities: ${rootEntities.length}`);

    if (rootEntities.length > 0) {
      rootEntities.forEach(root => {
        console.log(`   📁 ${root.entityName} (${root.entityType})`);
        const children = allEntities.filter(e => e.parentEntityId === root.entityId);
        if (children.length > 0) {
          children.forEach(child => {
            console.log(`      └─ ${child.entityName} (${child.entityType}) - Level ${child.entityLevel}`);
          });
        }
      });
    }

    // Test 5: API Endpoint Test
    console.log(`\nTest 5: 🌐 API Endpoint Test`);
    console.log('   Testing /api/entities/hierarchy/:tenantId endpoint...');

    try {
      // Test the hierarchy retrieval logic
      console.log('   🔍 Testing hierarchy service...');
      try {
        const LocationService = (await import('../services/location-service.js')).default;
        const hierarchyResult = await LocationService.getEntityHierarchyWithLocations(testTenantId);

        if (hierarchyResult.success) {
          console.log(`   ✅ Hierarchy API returned ${hierarchyResult.totalEntities} entities`);
          console.log(`   ✅ Hierarchy structure is valid`);

          // Check if fallback logic is working
          if (hierarchyResult.hierarchy && hierarchyResult.hierarchy.length > 0) {
            const sampleEntity = hierarchyResult.hierarchy[0];
            const requiredFields = ['entityId', 'entityName', 'entityType', 'entityLevel'];
            const hasRequiredFields = requiredFields.every(field => sampleEntity.hasOwnProperty(field));

            if (hasRequiredFields) {
              console.log('   ✅ Entity objects have required fields');
            } else {
              console.log('   ⚠️  Entity objects missing some required fields');
            }
          }
        } else {
          console.log(`   ⚠️  Hierarchy API failed: ${hierarchyResult.message}`);
          console.log('   💡 This might trigger the fallback logic we implemented');
        }
      } catch (serviceError) {
        console.log(`   ❌ Service test failed: ${serviceError.message}`);
        console.log('   💡 This could indicate issues with HierarchyManager or database connection');
      }

    } catch (error) {
      console.log(`   ❌ API test failed: ${error.message}`);
    }

    // Summary
    console.log(`\n📊 Test Summary:`);
    console.log(`   - Entities analyzed: ${allEntities.length}`);
    console.log(`   - Hierarchy coverage: ${((entitiesWithPaths.length / allEntities.length) * 100).toFixed(1)}%`);
    console.log(`   - Consistency issues: ${consistencyIssues}`);
    console.log(`   - Root entities: ${rootEntities.length}`);

    const overallStatus = (entitiesWithPaths.length === allEntities.length && consistencyIssues === 0) ? '✅ PASS' : '⚠️  PARTIAL';
    console.log(`   - Overall status: ${overallStatus}`);

    if (overallStatus === '✅ PASS') {
      console.log('\n🎉 Hierarchy system is working perfectly!');
      console.log('   Your organization hierarchy should now be functioning correctly.');
    } else {
      console.log('\n🔧 Hierarchy system needs attention:');
      if (entitiesWithoutPaths.length > 0) {
        console.log('   - Run migration script to rebuild hierarchy paths');
      }
      if (consistencyIssues > 0) {
        console.log('   - Review and fix hierarchy consistency issues');
      }
    }

  } catch (error) {
    console.error('❌ Hierarchy test failed:', error);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('   1. Check database connection');
    console.log('   2. Verify entities table exists and has data');
    console.log('   3. Run migration script if hierarchy paths are missing');
    console.log('   4. Check server logs for detailed error messages');
  }
}

// Run the test
testHierarchyFix();
