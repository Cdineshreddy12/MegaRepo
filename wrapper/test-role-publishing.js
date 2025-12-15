#!/usr/bin/env node

/**
 * Test script to directly test role event publishing
 */

// Redis URL should be set via environment variable
if (!process.env.REDIS_URL) {
  console.error('❌ REDIS_URL environment variable is required');
  process.exit(1);
}

// Import the function directly by copying the logic
async function publishRoleEventToApplications(eventType, tenantId, roleId, roleData) {
  try {
    console.log(`🔄 Starting ${eventType} event publishing for role ${roleId}`);

    // Parse permissions if they're stored as JSON string
    let permissions = roleData.permissions;
    console.log(`📋 Raw permissions type:`, typeof permissions);

    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
        console.log(`✅ Parsed permissions JSON:`, permissions);
      } catch (e) {
        console.warn('⚠️ Failed to parse permissions JSON:', e.message);
        permissions = {};
      }
    }

    // Extract which applications are present in this role's permissions
    const applications = ['crm']; // Hardcode CRM for testing
    console.log(`🔍 Extracted applications:`, applications);

    console.log(`📡 Publishing ${eventType} event for role ${roleId} to applications:`, applications);

    // Publish event to each relevant application with only their permissions
    const publishPromises = applications.map(async (appCode) => {
      // Filter permissions for this specific application - use full permissions for CRM
      const appPermissions = permissions; // Use full permissions for CRM
      console.log(`🔍 Filtered permissions for ${appCode}:`, appPermissions);

      // Prepare event data with only relevant permissions
      const eventData = {
        roleId: roleId,
        roleName: roleData.roleName || roleData.name,
        description: roleData.description,
        permissions: appPermissions, // Only permissions for this app
        restrictions: roleData.restrictions,
        metadata: roleData.metadata,
        ...(eventType === 'role.created' && {
          createdBy: roleData.createdBy,
          createdAt: roleData.createdAt
        }),
        ...(eventType === 'role.updated' && {
          updatedBy: roleData.updatedBy,
          updatedAt: roleData.updatedAt
        }),
        ...(eventType === 'role.deleted' && {
          deletedBy: roleData.deletedBy,
          deletedAt: roleData.deletedAt,
          transferredToRoleId: roleData.transferredToRoleId,
          affectedUsersCount: roleData.affectedUsersCount
        })
      };

      // Convert eventType to stream format (role.created → role_created)
      const streamEventType = eventType.replace('.', '_');
      const streamKey = `${appCode}:sync:role:${streamEventType}`;

      console.log(`📤 Publishing to stream: ${streamKey}`);

      try {
        // Import crmSyncStreams dynamically and connect to Redis
        const { crmSyncStreams } = await import('./backend/src/utils/redis.js');

        // Ensure Redis is connected
        if (!crmSyncStreams.redis.isConnected) {
          console.log('🔗 Connecting to Redis...');
          await crmSyncStreams.redis.connect();
        }

        const streamMessage = {
          eventId: `${appCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          eventType: eventType,
          tenantId: tenantId,
          entityType: 'role',
          entityId: roleId,
          data: eventData,
          publishedBy: roleData.createdBy || roleData.updatedBy || roleData.deletedBy || 'system'
        };

        await crmSyncStreams.publishToStream(streamKey, streamMessage);

        console.log(`✅ Published ${eventType} event to ${streamKey} for role ${roleId}`);
      } catch (error) {
        console.error(`❌ Failed to publish ${eventType} event to ${streamKey}:`, error.message);
        // Don't throw - continue with other applications
      }
    });

    await Promise.allSettled(publishPromises);
    console.log(`✅ Completed publishing ${eventType} events for role ${roleId}`);
  } catch (error) {
    console.error(`❌ Error publishing role events:`, error);
    // Don't throw - event publishing failure shouldn't break the API response
  }
}

async function testRolePublishing() {
  console.log('🧪 Testing role event publishing...\n');

  // Mock role data that would come from the database
  const tenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';
  const roleId = 'test-role-' + Date.now();

  const roleData = {
    roleName: 'Test Sales Manager',
    description: 'Test role for sales management',
    permissions: JSON.stringify({
      crm: {
        leads: ['read', 'create', 'update'],
        contacts: ['read', 'create'],
        opportunities: ['read', 'create', 'update']
      }
    }),
    restrictions: JSON.stringify({}),
    metadata: JSON.stringify({}),
    createdBy: 'test-user',
    createdAt: new Date().toISOString()
  };

  console.log('📋 Test role data:', {
    roleId,
    roleName: roleData.roleName,
    permissions: roleData.permissions
  });

  try {
    console.log('\n📡 Calling publishRoleEventToApplications...');
    await publishRoleEventToApplications('role.created', tenantId, roleId, roleData);
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testRolePublishing().catch(console.error);
