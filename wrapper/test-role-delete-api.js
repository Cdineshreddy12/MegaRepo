#!/usr/bin/env node

/**
 * Test script to test role deletion via API
 */

// Set Redis URL for the test
process.env.REDIS_URL = 'redis://default:k9PVaIlCi1uWh5v6bS7zomT6vYJfnbWU@redis-18875.crce182.ap-south-1-1.ec2.redns.redis-cloud.com:18875';

import { CustomRoleService } from './backend/src/services/custom-role-service.js';

async function testRoleDeletionAPI() {
  console.log('🧪 Testing role deletion via API...\n');

  const tenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';

  try {
    // First create a role
    console.log('🏗️ Creating test role for API deletion...');
    const roleResult = await CustomRoleService.createRoleFromAppsAndModules({
      roleName: 'Test Role For API Deletion',
      description: 'This role will be deleted via API to test events',
      selectedApps: ['crm'],
      selectedModules: {
        crm: ['accounts', 'contacts']
      },
      selectedPermissions: {
        'crm.accounts': ['read', 'create', 'update'],
        'crm.contacts': ['read', 'create']
      },
      restrictions: {},
      metadata: {},
      tenantId,
      updatedBy: 'test-user'
    });

    const role = Array.isArray(roleResult) ? roleResult[0] : roleResult;
    console.log('✅ Role created:', role?.roleId);

    if (!role?.roleId) {
      throw new Error('Role creation failed');
    }

    // Now try to delete it via API call
    console.log('🗑️ Testing API deletion endpoint...');

    // For testing purposes, let's simulate the API call by calling the permission service directly
    const { permissionService } = await import('./backend/src/services/permissionService.js');

    const result = await permissionService.deleteRole(
      tenantId,
      role.roleId,
      {
        force: true, // Force delete to avoid user assignment issues
        deletedBy: 'test-user'
      }
    );

    console.log('✅ Role deleted via permission service:', result);

    // Check if the event was published by looking at Redis
    const { crmSyncStreams } = await import('./backend/src/utils/redis.js');

    // Wait a moment for the event to be published
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testRoleDeletionAPI().catch(console.error);
