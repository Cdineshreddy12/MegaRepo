/**
 * Test Hierarchy System
 * This script tests the complete entity hierarchy workflow
 */

import { db } from '../src/db/index.js';
import OrganizationService from '../src/services/organization-service.js';
import { LocationService } from '../src/services/location-service.js';

async function testHierarchySystem() {
  console.log('🧪 Testing Entity Hierarchy System...\n');

  try {
    // Test 1: Create a parent organization
    console.log('📝 Test 1: Creating parent organization...');
    const parentOrg = await OrganizationService.createSubOrganization({
      name: 'Test Corporation',
      description: 'Test parent organization',
      tenantId: 'test-tenant-123',
      organizationType: 'business_unit'
    }, 'test-user-123');

    if (parentOrg.success) {
      console.log('✅ Parent organization created:', parentOrg.organization.entityId);
      console.log('   Hierarchy Path:', parentOrg.organization.hierarchyPath);
      console.log('   Entity Level:', parentOrg.organization.entityLevel);
    } else {
      console.log('❌ Failed to create parent organization:', parentOrg.message);
      return;
    }

    const parentId = parentOrg.organization.entityId;

    // Test 2: Create a sub-organization
    console.log('\n📝 Test 2: Creating sub-organization...');
    const subOrg = await OrganizationService.createSubOrganization({
      name: 'Marketing Department',
      description: 'Marketing sub-organization',
      parentOrganizationId: parentId,
      organizationType: 'department'
    }, 'test-user-123');

    if (subOrg.success) {
      console.log('✅ Sub-organization created:', subOrg.organization.entityId);
      console.log('   Hierarchy Path:', subOrg.organization.hierarchyPath);
      console.log('   Entity Level:', subOrg.organization.entityLevel);
    } else {
      console.log('❌ Failed to create sub-organization:', subOrg.message);
    }

    const subOrgId = subOrg.organization?.entityId;

    // Test 3: Create a location under the sub-organization
    console.log('\n📍 Test 3: Creating location...');
    const location = await LocationService.createLocation({
      name: 'NYC Office',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      organizationId: subOrgId || parentId,
      responsiblePersonId: 'test-user-123'
    }, 'test-user-123');

    if (location.success) {
      console.log('✅ Location created:', location.location.entityId);
      console.log('   Hierarchy Path:', location.location.hierarchyPath);
      console.log('   Entity Level:', location.location.entityLevel);
    } else {
      console.log('❌ Failed to create location:', location.message);
    }

    // Test 4: Get organization hierarchy
    console.log('\n🌳 Test 4: Getting organization hierarchy...');
    const hierarchy = await OrganizationService.getOrganizationHierarchy('test-tenant-123');

    if (hierarchy.success) {
      console.log('✅ Hierarchy retrieved successfully');
      console.log('   Total organizations:', hierarchy.totalOrganizations);
      console.log('   Hierarchy structure:');
      hierarchy.hierarchy.forEach(org => {
        console.log(`   - ${org.entityName} (Level ${org.entityLevel})`);
        if (org.children && org.children.length > 0) {
          org.children.forEach(child => {
            console.log(`     └─ ${child.entityName} (Level ${child.entityLevel})`);
          });
        }
      });
    } else {
      console.log('❌ Failed to get hierarchy:', hierarchy.message);
    }

    // Test 5: Get complete entity hierarchy with locations
    console.log('\n🏢 Test 5: Getting complete entity hierarchy...');
    const completeHierarchy = await LocationService.getEntityHierarchyWithLocations('test-tenant-123');

    if (completeHierarchy.success) {
      console.log('✅ Complete hierarchy retrieved successfully');
      console.log('   Total entities:', completeHierarchy.totalEntities);
      console.log('   Entity types found:', [...new Set(completeHierarchy.hierarchy.map(e => e.entityType))]);
    } else {
      console.log('❌ Failed to get complete hierarchy:', completeHierarchy.message);
    }

    // Test 6: Move organization
    if (subOrgId) {
      console.log('\n🔄 Test 6: Moving organization...');
      const moveResult = await OrganizationService.moveOrganization(subOrgId, null, 'test-user-123');

      if (moveResult.success) {
        console.log('✅ Organization moved successfully');
        console.log('   New hierarchy path:', moveResult.organization.hierarchyPath);
        console.log('   New entity level:', moveResult.organization.entityLevel);
      } else {
        console.log('❌ Failed to move organization:', moveResult.message);
      }
    }

    console.log('\n🎉 All hierarchy tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHierarchySystem();
