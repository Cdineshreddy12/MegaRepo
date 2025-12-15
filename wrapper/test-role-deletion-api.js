#!/usr/bin/env node

/**
 * Test script to test role deletion event publishing via API
 */

// Redis URL should be set via environment variable
if (!process.env.REDIS_URL) {
  console.error('❌ REDIS_URL environment variable is required');
  process.exit(1);
}

import { CustomRoleService } from './backend/src/services/custom-role-service.js';

async function testRoleDeletionAPI() {
  console.log('🧪 Testing role deletion event publishing via API...\n');

  const tenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';

  try {
    // First create a role
    console.log('🏗️ Creating test role for deletion...');
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

    console.log('Role creation result:', roleResult);
    const role = Array.isArray(roleResult) ? roleResult[0] : roleResult;
    console.log('✅ Role created:', role?.roleId);

    if (!role?.roleId) {
      throw new Error('Role creation failed');
    }

    // Now test the DELETE API route by simulating what it does
    console.log('🗑️ Simulating API role deletion...');

    // Import required modules
    const { publishRoleEventToApplications } = await import('./backend/src/routes/roles.js');
    const { db } = await import('./backend/src/db/index.js');
    const { customRoles } = await import('./backend/src/db/schema/index.js');
    const { eq, and } = await import('drizzle-orm');

    // First get the role data before deletion (like the API does)
    const [roleToDelete] = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, role.roleId)
        )
      )
      .limit(1);

    console.log('Role to delete:', roleToDelete ? 'Found' : 'Not found');

    if (!roleToDelete) {
      throw new Error('Role not found for deletion');
    }

    // Delete the role from database directly
    await db
      .delete(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, role.roleId)
        )
      );

    console.log('✅ Role deleted from database');

    // Now publish the deletion event (like the API does)
    console.log('📡 Publishing deletion event...');
    console.log('🗑️ Publishing role deletion event for role:', role.roleId, 'users affected: 0');
    try {
      await publishRoleEventToApplications(
        'role.deleted',
        tenantId,
        role.roleId,
        {
          roleName: roleToDelete.roleName || roleToDelete.name,
          description: roleToDelete.description,
          permissions: roleToDelete.permissions,
          restrictions: roleToDelete.restrictions,
          metadata: roleToDelete.metadata,
          deletedBy: 'test-user',
          deletedAt: new Date().toISOString(),
          transferredToRoleId: null,
          affectedUsersCount: 0
        }
      );
      console.log('✅ Role deletion event published successfully');
    } catch (publishError) {
      console.warn('⚠️ Failed to publish role deletion event:', publishError.message);
      throw publishError;
    }

    console.log('✅ Role deletion event published successfully!');
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testRoleDeletionAPI().catch(console.error);
