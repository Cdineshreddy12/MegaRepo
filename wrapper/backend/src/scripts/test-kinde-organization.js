/**
 * Test script for adding users to Kinde organizations
 *
 * Usage:
 * cd /Users/chintadineshreddy/Downloads/Wrapper-main/backend
 * node src/scripts/test-kinde-organization.js
 *
 * This script tests the Kinde organization assignment functionality
 * that runs during invitation acceptance.
 */

import { dbManager, initializeDrizzleInstances } from '../db/connection-manager.js';
import { eq } from 'drizzle-orm';
import { tenantUsers } from '../db/schema/index.js';
import kindeService from '../services/kinde-service.js';

/**
 * Test adding a user to a Kinde organization
 */
async function testAddUserToOrganization() {
  console.log('🚀 Testing Kinde Organization User Assignment');
  console.log('==============================================\n');

  let db = null;

  try {
    // Initialize database connection
    console.log('🔌 Initializing database connection...');
    await dbManager.initialize();
    const { appDb } = initializeDrizzleInstances();
    db = appDb;
    console.log('✅ Database connection initialized\n');

    // Get a test user from the database
    console.log('👤 Finding a test user...');
    const [testUser] = await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.isActive, true))
      .limit(1);

    if (!testUser) {
      console.log('❌ No active users found in database');
      console.log('ℹ️ Please ensure you have at least one active user in your system');
      console.log('💡 You can create users through the invitation system first');
      return;
    }

    console.log('✅ Found test user:', {
      userId: testUser.userId,
      email: testUser.email,
      name: testUser.name,
      kindeUserId: testUser.kindeUserId
    });
    console.log('');

    // Get tenant info to find organization code
    console.log('🏢 Getting tenant information...');
    const { tenants: tenantsTable } = await import('../db/schema/index.js');
    const tenantResults = await db
      .select()
      .from(tenantsTable)
      .limit(1);

    if (!tenantResults.length) {
      console.log('❌ No tenant found');
      console.log('ℹ️ Make sure you have completed the onboarding process');
      return;
    }

    const tenant = tenantResults[0];
    console.log('✅ Found tenant:', {
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      kindeOrgId: tenant.kindeOrgId
    });
    console.log('');

    // Check if we have a valid Kinde user ID
    const userIdForTest = testUser.kindeUserId || testUser.userId;
    if (!userIdForTest) {
      console.log('❌ Test user has no valid ID for Kinde operations');
      return;
    }

    // Test adding user to organization
    console.log('🎯 Testing user addition to Kinde organization...');
    console.log(`📧 User ID: ${userIdForTest}`);
    console.log(`🏢 Organization: ${tenant.kindeOrgId}`);
    console.log('');

    const result = await kindeService.addUserToOrganization(
      userIdForTest,
      tenant.kindeOrgId,
      { exclusive: false }
    );

    console.log('\n📊 Test Result:');
    console.log('==============');
    if (result.success) {
      console.log('✅ SUCCESS: User added to organization');
      console.log('📋 Details:', {
        userId: result.userId,
        method: result.method,
        endpoint: result.endpoint,
        message: result.message
      });
    } else {
      console.log('❌ FAILED: Could not add user to organization');
      console.log('📋 Error Details:', {
        error: result.error,
        message: result.message,
        details: result.details
      });

      if (result.error?.includes('invalid_scope')) {
        console.log('\n🔧 M2M CONFIGURATION REQUIRED:');
        console.log('===============================');
        console.log('Your M2M client needs organization management permissions.');
        console.log('');
        console.log('In your Kinde dashboard:');
        console.log('1. Go to Settings → Applications');
        console.log('2. Find your M2M application');
        console.log('3. Add these scopes: admin, organizations:read, organizations:write');
        console.log('4. Ensure the M2M client has Organization Admin role');
        console.log('5. The organization must allow M2M management');
        console.log('');
        console.log('If you can\'t configure this, the invitation system will still work');
        console.log('for internal user management - Kinde org assignment is optional.');
      }
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);

    if (error.message.includes('ENETUNREACH') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🔌 DATABASE CONNECTION ISSUE:');
      console.log('=============================');
      console.log('The database is not accessible from this script.');
      console.log('Make sure:');
      console.log('1. Your database is running');
      console.log('2. Database connection string is correct');
      console.log('3. Network connectivity to database');
      console.log('');
      console.log('Alternatively, run this test from within the backend server context.');
    } else {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Clean up
    try {
      if (dbManager) {
        await dbManager.closeAll();
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error during cleanup:', cleanupError.message);
    }
  }
}

/**
 * Test getting M2M token
 */
async function testM2MToken() {
  console.log('🔑 Testing M2M Token Generation');
  console.log('===============================\n');

  try {
    const token = await kindeService.getM2MToken();
    if (token) {
      console.log('✅ M2M token obtained successfully');
      console.log(`📏 Token length: ${token.length} characters`);
      console.log(`🔍 Token starts with: ${token.substring(0, 20)}...`);
    } else {
      console.log('❌ Failed to obtain M2M token');
    }
  } catch (error) {
    console.log('❌ M2M token test failed:', error.message);

    if (error.message.includes('M2M credentials not configured')) {
      console.log('\n🔧 M2M CREDENTIALS REQUIRED:');
      console.log('============================');
      console.log('Add these to your .env file:');
      console.log('KINDE_M2M_CLIENT_ID=your_m2m_client_id');
      console.log('KINDE_M2M_CLIENT_SECRET=your_m2m_client_secret');
      console.log('KINDE_MANAGEMENT_AUDIENCE=https://your-domain.kinde.com/api');
      console.log('KINDE_MANAGEMENT_SCOPES=admin,organizations:read,organizations:write');
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Kinde Organization Assignment Test Suite');
  console.log('==========================================\n');

  // Test M2M token first
  await testM2MToken();
  console.log('\n' + '='.repeat(50) + '\n');

  // Test user addition
  await testAddUserToOrganization();
}

// Run the tests
runTests()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  });
