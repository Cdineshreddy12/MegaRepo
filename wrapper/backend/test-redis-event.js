import 'dotenv/config';
import { crmSyncStreams } from './src/utils/redis.js';
import { publishRoleEventToApplications } from './src/features/roles/routes/roles.js';

async function testRedisEventPublishing() {
  console.log('🧪 Testing Redis Event Publishing...\n');

  try {
    // Step 1: Connect to Redis
    console.log('1️⃣ Connecting to Redis...');
    if (!crmSyncStreams.redis.isConnected) {
      console.log('   Redis not connected, attempting connection...');
      await crmSyncStreams.redis.connect();
    }
    console.log(`   ✅ Redis connection status: ${crmSyncStreams.redis.isConnected ? 'Connected' : 'Disconnected'}\n`);

    // Step 2: Test direct publishToStream call
    console.log('2️⃣ Testing direct publishToStream call...');
    try {
      const testStreamKey = 'crm:sync:role:role_deleted';
      const testMessage = {
        eventId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        eventType: 'role.deleted',
        tenantId: 'test-tenant-id',
        entityType: 'role',
        entityId: 'test-role-id',
        data: JSON.stringify({
          roleId: 'test-role-id',
          roleName: 'Test Role',
          deletedBy: 'test-user-id',
          deletedAt: new Date().toISOString()
        }),
        publishedBy: 'test-user-id'
      };

      console.log(`   Publishing to stream: ${testStreamKey}`);
      console.log(`   Message:`, JSON.stringify(testMessage, null, 2));
      
      const result = await crmSyncStreams.publishToStream(testStreamKey, testMessage);
      console.log(`   ✅ Direct publish successful! Result:`, result);
      console.log(`   ✅ Stream ID: ${result?.messageId}\n`);
    } catch (error) {
      console.error(`   ❌ Direct publish failed:`, error);
      console.error(`   Error details:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno
      });
      console.log();
    }

    // Step 3: Test publishRoleEventToApplications function
    console.log('3️⃣ Testing publishRoleEventToApplications function...');
    try {
      const testTenantId = 'test-tenant-id';
      const testRoleId = 'test-role-id';
      const testRoleData = {
        roleName: 'Test Role',
        description: 'Test role description',
        permissions: {
          crm: {
            leads: ['read', 'create']
          }
        },
        restrictions: {},
        metadata: {},
        deletedBy: 'test-user-id',
        deletedAt: new Date().toISOString(),
        transferredToRoleId: null,
        affectedUsersCount: 0
      };

      console.log(`   Calling publishRoleEventToApplications...`);
      console.log(`   Role data:`, JSON.stringify(testRoleData, null, 2));
      
      await publishRoleEventToApplications(
        'role.deleted',
        testTenantId,
        testRoleId,
        testRoleData
      );
      
      console.log(`   ✅ publishRoleEventToApplications completed successfully!\n`);
    } catch (error) {
      console.error(`   ❌ publishRoleEventToApplications failed:`, error);
      console.error(`   Error details:`, {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      console.log();
    }

    // Step 4: Check Redis client methods
    console.log('4️⃣ Checking Redis client methods...');
    try {
      const client = crmSyncStreams.redis.client;
      console.log(`   Client type: ${typeof client}`);
      console.log(`   Client methods available:`, Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(name => typeof client[name] === 'function').slice(0, 20));
      
      // Check if xAdd method exists
      if (client && typeof client.xAdd === 'function') {
        console.log(`   ✅ xAdd method exists`);
      } else {
        console.log(`   ❌ xAdd method NOT found`);
        console.log(`   Available methods with 'x':`, Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(name => name.includes('x') || name.includes('X')).slice(0, 10));
      }
      console.log();
    } catch (error) {
      console.error(`   ❌ Error checking client methods:`, error.message);
      console.log();
    }

    // Step 5: Test Redis connection with ping
    console.log('5️⃣ Testing Redis connection with PING...');
    try {
      const pingResult = await crmSyncStreams.redis.client.ping();
      console.log(`   ✅ PING result: ${pingResult}\n`);
    } catch (error) {
      console.error(`   ❌ PING failed:`, error.message);
      console.log();
    }

    console.log('✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      await crmSyncStreams.redis.disconnect();
      console.log('✅ Disconnected from Redis');
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error.message);
    }
    process.exit(0);
  }
}

// Run the test
testRedisEventPublishing().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});



