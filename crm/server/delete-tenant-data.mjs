import mongoose from 'mongoose';

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://letszopkit:t41z0qaCIoK8vnDr@letszop.gog5bym.mongodb.net/zopkit_crm?retryWrites=true&w=majority&appName=letszop';

/**
 * Delete all data for a specific tenant
 * @param {string} tenantId - The tenant ID to delete data for
 */
async function deleteTenantData(tenantId) {
  if (!tenantId) {
    console.error('❌ Error: tenantId is required');
    console.log('Usage: node delete-tenant-data.mjs <tenantId>');
    process.exit(1);
  }

  console.log(`🗑️ Starting tenant data deletion for tenant: ${tenantId}`);
  console.log('='.repeat(60));

  let connection;
  try {
    console.log('🔌 Connecting to MongoDB...');
    connection = await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Collections to delete from (in order: children first, then parents)
    // This order ensures foreign key constraints are respected
    const collections = [
      // Activity and audit logs (no foreign keys)
      'crmactivitylogs',
      'activities',

      // Credit-related data
      'credittransactions',
      'crmcreditusages',
      'crmentitycredits',
      'crmcreditconfigs',

      // User-related tenant data
      'crmtenantusers',
      'userprofiles',
      'employeeorgassignments',
      'crmroleassignments',

      // Role and permission data
      'crmroles',

      // Organization hierarchy
      'organizations',

      // Tenant metadata and sync status
      'tenantsyncstatuses',

      // Finally, the tenant record itself
      'tenants'
    ];

    let totalDeleted = 0;
    const deletionResults = [];

    for (const collectionName of collections) {
      try {
        console.log(`\n🔍 Processing collection: ${collectionName}`);

        const collection = mongoose.connection.db.collection(collectionName);

        // Check if collection exists
        const collectionsList = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
        if (collectionsList.length === 0) {
          console.log(`ℹ️ Collection ${collectionName} does not exist, skipping...`);
          continue;
        }

        // Count documents to delete
        let countQuery = {};
        if (collectionName !== 'tenants') {
          // For all collections except tenants, filter by tenantId
          countQuery = { tenantId: tenantId };
        } else {
          // For tenants collection, match the exact tenantId
          countQuery = { tenantId: tenantId };
        }

        const count = await collection.countDocuments(countQuery);

        if (count === 0) {
          console.log(`ℹ️ No documents found in ${collectionName} for tenant ${tenantId}`);
          continue;
        }

        console.log(`📊 Found ${count} documents to delete from ${collectionName}`);

        // Delete the documents
        const deleteQuery = collectionName === 'tenants'
          ? { tenantId: tenantId }
          : { tenantId: tenantId };

        const result = await collection.deleteMany(deleteQuery);

        console.log(`✅ Deleted ${result.deletedCount} documents from ${collectionName}`);
        totalDeleted += result.deletedCount;

        deletionResults.push({
          collection: collectionName,
          deletedCount: result.deletedCount
        });

      } catch (error) {
        console.error(`❌ Error processing collection ${collectionName}:`, error.message);
        // Continue with next collection instead of failing completely
      }
    }

    // Summary report
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TENANT DATA DELETION COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    console.log(`🏢 Tenant ID: ${tenantId}`);
    console.log('\n📋 Deletion Summary:');

    deletionResults.forEach(result => {
      if (result.deletedCount > 0) {
        console.log(`  • ${result.collection}: ${result.deletedCount} documents`);
      }
    });

    if (deletionResults.length === 0) {
      console.log('  ℹ️ No data found for this tenant');
    }

    console.log('\n✅ Tenant data deletion completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error during tenant deletion:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Get tenantId from command line arguments
const tenantId = process.argv[2];

if (!tenantId) {
  console.error('❌ Error: tenantId is required');
  console.log('Usage: node delete-tenant-data.mjs <tenantId>');
  console.log('Example: node delete-tenant-data.mjs "tenant-123"');
  process.exit(1);
}

// Validate tenantId format (basic check)
if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
  console.error('❌ Error: tenantId must be a non-empty string');
  process.exit(1);
}

// Execute the deletion
deleteTenantData(tenantId.trim());


