import mongoose from 'mongoose';

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);

    console.log('🗑️ Clearing all CRM collections...');

    // Clear all collections in the correct order (children first, then parents)
    const collections = [
      'crmentitycredits',     // References organizations and users
      'crmcreditconfigs',     // References organizations
      'crmroleassignments',   // References users, roles, organizations
      'employeeorgassignments', // References users, organizations
      'userprofiles',         // Referenced by assignments
      'crmroles',             // Referenced by assignments
      'organizations',        // Referenced by many
      'tenants'               // Referenced by organizations
    ];

    let totalDeleted = 0;

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments();

        if (count > 0) {
          const result = await collection.deleteMany({});
          console.log(`✅ Cleared ${result.deletedCount} documents from ${collectionName}`);
          totalDeleted += result.deletedCount;
        } else {
          console.log(`ℹ️ Collection ${collectionName} was already empty`);
        }
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} doesn't exist or error: ${error.message}`);
      }
    }

    console.log(`\n🎯 Database clearing completed!`);
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    console.log(`📝 Ready for fresh data sync from wrapper API`);

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

clearDatabase();
