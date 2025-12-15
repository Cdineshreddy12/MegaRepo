const mongoose = require('mongoose');
require('dotenv').config();

async function simulateSyncFailure() {
  try {
    console.log('🔧 Simulating sync failure for testing...\n');

    // Connect to MongoDB using the same connection as the server
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://letszopkit:t41z0qaCIoK8vnDr@letszop.gog5bymongodb.net/zopkit_crm?retryWrites=true&w=majority&appName=letszop';

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Current tenant from logs (work tenant)
    const tenantId = '395031ab-dad1-4b9a-b1b5-e3878477edad';
    console.log(`🏢 Simulating failure for tenant: ${tenantId}\n`);

    // Import the TenantSyncStatus model
    const TenantSyncStatus = require('./models/TenantSyncStatus.js');

    // Find the current sync status
    let syncStatus = await TenantSyncStatus.findOne({ tenantId });
    if (!syncStatus) {
      console.log('📝 Creating new sync status record...');
      syncStatus = new TenantSyncStatus({ tenantId });
    }

    // Simulate some collection failures
    syncStatus.status = 'completed'; // Overall sync completed but with failures
    syncStatus.phase = 'completed';

    // Set some collections to failed status
    syncStatus.collections.tenants.status = 'completed';
    syncStatus.collections.users.status = 'completed';
    syncStatus.collections.organizations.status = 'completed';
    syncStatus.collections.roles.status = 'failed'; // Simulate role sync failure
    syncStatus.collections.roles.error = 'Failed to sync roles from wrapper API';
    syncStatus.collections.employeeAssignments.status = 'failed'; // Simulate assignment failure
    syncStatus.collections.employeeAssignments.error = 'Network timeout during employee assignments sync';

    // Other collections completed successfully
    syncStatus.collections.roleAssignments.status = 'completed';
    syncStatus.collections.creditConfigs.status = 'completed';
    syncStatus.collections.entityCredits.status = 'completed';

    // Save the sync status with failures
    await syncStatus.save();

    console.log('✅ Sync failure simulation completed!');
    console.log('📊 Failed collections:');
    const failedCollections = syncStatus.getFailedCollections();
    failedCollections.forEach(failure => {
      console.log(`  ❌ ${failure.collection}: ${failure.error}`);
    });

    console.log('\n🎯 EXPECTED RESULT:');
    console.log('- Next login will show toast notification');
    console.log('- Message: "Syncing of some records from the wrapper failed. Please contact support of Zopkit."');
    console.log('- Description will list: roles, employeeAssignments');

    await mongoose.disconnect();
    console.log('\n✅ Simulation completed successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the simulation
simulateSyncFailure();
