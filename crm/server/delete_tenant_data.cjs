require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Script to delete all data related to a tenant from the database
 * 
 * Usage:
 *   node server/delete_tenant_data.cjs <tenantId>
 * 
 * Example:
 *   node server/delete_tenant_data.cjs 395031ab-dad1-4b9a-b1b5-e3878477edad
 * 
 * WARNING: This operation is IRREVERSIBLE!
 */

const TENANT_ID_PLACEHOLDER = 'TENANT_ID_PLACEHOLDER';

// Models that have tenantId field
const MODELS_WITH_TENANT_ID = [
  'Tenant',
  'Organization',
  'UserProfile',
  'CrmRole',
  'CrmRoleAssignment',
  'EmployeeOrgAssignment',
  'CrmCreditConfig',
  'CrmEntityCredit',
  'CrmCreditUsage',
  'CreditTransaction',
  'TenantSyncStatus',
  'CrmEventProcessingRecord',
  'CrmTenantUser',
  'Activity',
  'CrmActivityLog'
];

// Models that might reference tenant data indirectly (through orgCode, entityId, etc.)
// These will be handled separately if needed
const MODELS_WITH_INDIRECT_REFERENCES = [
  // Add models here if they reference tenant data indirectly
  // For example: Account, Contact, Opportunity, etc. might reference orgCode
];

async function deleteTenantData(tenantId, dryRun = false) {
  if (!tenantId || tenantId === TENANT_ID_PLACEHOLDER) {
    throw new Error('Please provide a valid tenantId. Usage: node server/delete_tenant_data.cjs <tenantId>');
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${dryRun ? '🔍 DRY RUN MODE' : '🗑️  DELETE MODE'}: Deleting data for tenant: ${tenantId}`);
  console.log('='.repeat(80) + '\n');

  const results = {
    tenantId,
    dryRun,
    deleted: {},
    errors: {},
    totalDeleted: 0,
    startTime: new Date()
  };

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected\n');

    // First, verify tenant exists
    const { default: Tenant } = await import('./models/Tenant.js');
    const tenant = await Tenant.findOne({ tenantId });
    
    if (!tenant) {
      console.log(`⚠️  Tenant ${tenantId} not found in database. Proceeding with deletion anyway...\n`);
    } else {
      console.log(`✅ Found tenant: ${tenant.tenantName} (${tenant.tenantId})\n`);
    }

    // Delete data from each model
    for (const modelName of MODELS_WITH_TENANT_ID) {
      try {
        console.log(`📋 Processing ${modelName}...`);
        
        // Dynamically import the model
        let Model;
        try {
          Model = (await import(`./models/${modelName}.js`)).default;
        } catch (importError) {
          console.log(`   ⚠️  Could not import model ${modelName}: ${importError.message}`);
          results.errors[modelName] = `Import error: ${importError.message}`;
          continue;
        }

        // Count records before deletion
        const countBefore = await Model.countDocuments({ tenantId });
        console.log(`   📊 Found ${countBefore} record(s)`);

        if (countBefore === 0) {
          console.log(`   ✅ No records to delete\n`);
          results.deleted[modelName] = { count: 0, skipped: true };
          continue;
        }

        if (dryRun) {
          console.log(`   🔍 DRY RUN: Would delete ${countBefore} record(s)`);
          results.deleted[modelName] = { count: countBefore, dryRun: true };
        } else {
          // Perform deletion
          const deleteResult = await Model.deleteMany({ tenantId });
          const deletedCount = deleteResult.deletedCount || 0;
          console.log(`   ✅ Deleted ${deletedCount} record(s)`);
          results.deleted[modelName] = { count: deletedCount };
          results.totalDeleted += deletedCount;
        }

        console.log(''); // Empty line for readability

      } catch (error) {
        console.error(`   ❌ Error deleting ${modelName}:`, error.message);
        results.errors[modelName] = error.message;
        console.log('');
      }
    }

    // Handle models with indirect references (if any)
    // For example, if Account model references orgCode, we need to:
    // 1. Find all organizations for this tenant
    // 2. Get their orgCodes
    // 3. Delete accounts with those orgCodes
    if (MODELS_WITH_INDIRECT_REFERENCES.length > 0) {
      console.log('\n📋 Processing models with indirect references...\n');
      
      // Get all orgCodes for this tenant
      const { default: Organization } = await import('./models/Organization.js');
      const organizations = await Organization.find({ tenantId }).select('orgCode');
      const orgCodes = organizations.map(org => org.orgCode);
      
      console.log(`   Found ${orgCodes.length} organization(s) for this tenant`);
      
      // Process each model with indirect references
      for (const modelName of MODELS_WITH_INDIRECT_REFERENCES) {
        try {
          // This is a placeholder - implement based on actual model structure
          console.log(`   ⚠️  Skipping ${modelName} - indirect reference handling not implemented`);
        } catch (error) {
          console.error(`   ❌ Error processing ${modelName}:`, error.message);
        }
      }
    }

    // Summary
    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'DELETE'}`);
    console.log(`Total Records ${dryRun ? 'Would Be Deleted' : 'Deleted'}: ${results.totalDeleted}`);
    console.log(`Duration: ${results.duration}ms`);
    console.log('\n📋 Per-Model Results:');
    
    for (const [modelName, result] of Object.entries(results.deleted)) {
      if (result.skipped) {
        console.log(`   ${modelName}: Skipped (no records)`);
      } else if (result.dryRun) {
        console.log(`   ${modelName}: ${result.count} record(s) would be deleted`);
      } else {
        console.log(`   ${modelName}: ${result.count} record(s) deleted`);
      }
    }

    if (Object.keys(results.errors).length > 0) {
      console.log('\n❌ Errors:');
      for (const [modelName, error] of Object.entries(results.errors)) {
        console.log(`   ${modelName}: ${error}`);
      }
    }

    console.log('\n' + '='.repeat(80));

    if (dryRun) {
      console.log('\n💡 This was a DRY RUN. No data was actually deleted.');
      console.log('   To perform the actual deletion, run without --dry-run flag.\n');
    } else {
      console.log('\n✅ Deletion completed!\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  }

  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Check for dry-run flag
  const dryRunIndex = args.indexOf('--dry-run');
  const dryRun = dryRunIndex !== -1;
  if (dryRun) {
    args.splice(dryRunIndex, 1);
  }

  // Get tenantId from command line arguments
  const tenantId = args[0] || TENANT_ID_PLACEHOLDER;

  if (tenantId === TENANT_ID_PLACEHOLDER) {
    console.error('\n❌ Error: tenantId is required');
    console.error('\nUsage:');
    console.error('  node server/delete_tenant_data.cjs <tenantId> [--dry-run]');
    console.error('\nExample:');
    console.error('  node server/delete_tenant_data.cjs 395031ab-dad1-4b9a-b1b5-e3878477edad');
    console.error('  node server/delete_tenant_data.cjs 395031ab-dad1-4b9a-b1b5-e3878477edad --dry-run');
    console.error('\n⚠️  WARNING: This operation is IRREVERSIBLE!\n');
    process.exit(1);
  }

  // Confirmation prompt (unless dry-run)
  if (!dryRun) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`\n⚠️  WARNING: This will PERMANENTLY DELETE all data for tenant "${tenantId}".\n   This operation is IRREVERSIBLE!\n\n   Type "DELETE" to confirm: `, resolve);
    });

    rl.close();

    if (answer !== 'DELETE') {
      console.log('\n❌ Deletion cancelled. No data was deleted.\n');
      process.exit(0);
    }
  }

  try {
    await deleteTenantData(tenantId, dryRun);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { deleteTenantData };

