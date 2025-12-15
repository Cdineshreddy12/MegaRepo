#!/usr/bin/env node

/**
 * Test script to test role deletion event publishing
 */

// Redis URL should be set via environment variable
if (!process.env.REDIS_URL) {
  console.error('❌ REDIS_URL environment variable is required');
  process.exit(1);
}

import { CustomRoleService } from './backend/src/services/custom-role-service.js';
import { db } from './backend/src/db/index.js';
import { customRoles } from './backend/src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

async function testRoleDeletion() {
  console.log('🧪 Testing role deletion event publishing...\n');

  const tenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';

  try {
    // First create a role
    console.log('🏗️ Creating test role for deletion...');
    const role = await CustomRoleService.createRoleFromAppsAndModules({
      roleName: 'Test Role For Deletion',
      description: 'This role will be deleted to test events',
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

    const roleData = role[0];
    console.log('✅ Role created:', roleData.roleId);

    // Now delete the role
    console.log('🗑️ Deleting the role...');
    const deleteResult = await db
      .delete(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleData.roleId)
        )
      )
      .returning();

    console.log('✅ Role deleted from database');

    // Connect to Redis first
    console.log('🔗 Connecting to Redis...');
    const { redis } = await import('./backend/src/utils/redis.js');
    if (!redis.isConnected) {
      await redis.connect();
      console.log('✅ Redis connected');
    }

    // Now manually trigger the event publishing to simulate what the API does
    console.log('📡 Publishing deletion event...');
    const { publishRoleEventToApplications } = await import('./backend/src/routes/roles.js');

    await publishRoleEventToApplications(
      'role.deleted',
      tenantId,
      roleData.roleId,
      {
        roleName: roleData.roleName,
        description: roleData.description,
        permissions: roleData.permissions,
        restrictions: roleData.restrictions,
        metadata: roleData.metadata,
        deletedBy: 'test-user',
        deletedAt: new Date().toISOString(),
        transferredToRoleId: null,
        affectedUsersCount: 0
      }
    );

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testRoleDeletion().catch(console.error);
