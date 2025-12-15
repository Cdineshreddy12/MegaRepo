#!/usr/bin/env node

/**
 * 🔄 Global Credit Configuration Sync Script
 *
 * This script fetches global credit configurations from the admin API
 * and syncs them to the CRM database, mapping only necessary fields.
 *
 * The script transforms the API response structure to match the CrmCreditConfig schema:
 * - Extracts operations from allOperations array
 * - Generates unique configIds using operation codes
 * - Maps API fields to schema fields (only essential fields)
 * - Sets global configuration flags (tenantId: null, isGlobal: true)
 *
 * Usage:
 *   node server/sync-global-credit-configs.js [authToken] [--dry-run] [--delete-all]
 *
 * Examples:
 *   # Full sync (create/update existing)
 *   WRAPPER_AUTH_TOKEN=your-token node server/sync-global-credit-configs.js
 *
 *   # Delete all existing global configs first, then sync fresh
 *   node server/sync-global-credit-configs.js your-token --delete-all
 *
 *   # Dry run (fetch and transform only, no database sync)
 *   node server/sync-global-credit-configs.js your-token --dry-run
 *
 * Environment variables:
 *   ADMIN_API_URL - Admin API base URL (default: http://localhost:3000)
 *   WRAPPER_AUTH_TOKEN - Authentication token
 *   MONGODB_URI - MongoDB connection string
 */

import mongoose from 'mongoose';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import CrmCreditConfig from './models/CrmCreditConfig.js';
import dotenv from 'dotenv';
dotenv.config();
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

/**
 * Fetch global credit configurations from admin API
 */
async function fetchGlobalCreditConfigs(authToken = null) {
  try {
    const url = `${ADMIN_API_URL}/api/admin/credit-configurations/global/by-app?app=crm`;

    console.log(`📡 Fetching global credit configs from: ${url}`);

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add auth token if provided
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.get(url, {
      timeout: 30000,
      headers
    });

    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Invalid response format from admin API');
  } catch (error) {
    console.error(`❌ Failed to fetch global credit configs:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Transform API response to CrmCreditConfig schema format
 * Sync only necessary fields as per schema requirements
 */
function transformConfigs(apiData) {
  const configs = [];

  if (!apiData.applications || !Array.isArray(apiData.applications)) {
    throw new Error('Invalid API response: applications array not found');
  }

  console.log(`\n📋 Processing ${apiData.applications.length} applications...`);

  for (const app of apiData.applications) {
    console.log(`\n🏗️  Processing app: ${app.appCode} (${app.appName})`);

    // Process allOperations array (contains simplified operation data)
    if (app.allOperations && Array.isArray(app.allOperations)) {
      console.log(`   📝 Processing ${app.allOperations.length} operations from allOperations array`);

      for (const operation of app.allOperations) {
        // Create config object - configId will be generated during creation
        const config = {
          tenantId: null, // Global configs have null tenantId
          configName: `${operation.operationCode} (Global)`,
          operationCode: operation.operationCode,
          description: `Global configuration for ${operation.operationCode}`,
          creditCost: operation.creditCost !== undefined ? operation.creditCost : 0, // Default to 0 if not specified
          isGlobal: true,
          source: 'global',
          overridesGlobal: false,
          unit: operation.unit || 'operation',
          moduleName: operation.operationCode.split('.')[1] || '', // Extract module from operation code
          permissionName: operation.operationCode,
          lastSyncedAt: new Date(),
          syncSource: 'system'
        };

        configs.push(config);
        console.log(`     ✅ Mapped: ${operation.operationCode} → ${config.creditCost} credits`);
      }
    }

    // Process detailed module operations (for additional metadata)
    if (app.modules && Array.isArray(app.modules)) {
      console.log(`   📁 Processing ${app.modules.length} modules for enhanced metadata`);

      for (const module of app.modules) {
        if (module.operations && Array.isArray(module.operations)) {
          for (const operation of module.operations) {
            // Find existing config or create new one
            const configId = `global-${app.appCode}-${operation.operationCode}`;
            let existingConfig = configs.find(c => c.configId === configId);

            if (existingConfig) {
              // Update with additional metadata from detailed operation
              existingConfig.configName = operation.operationName
                ? `${operation.operationName} (${module.moduleName})`
                : existingConfig.configName;
              existingConfig.description = `Global configuration for ${operation.operationName || operation.operationCode} in ${module.moduleName} module`;

              // Add additional fields if available (commented out as they're not in schema)
              // These would need to be added to the schema if required
              /*
              if (operation.unit) existingConfig.unit = operation.unit;
              if (operation.freeAllowance !== undefined) existingConfig.freeAllowance = operation.freeAllowance;
              if (operation.freeAllowancePeriod) existingConfig.freeAllowancePeriod = operation.freeAllowancePeriod;
              if (operation.allowOverage !== undefined) existingConfig.allowOverage = operation.allowOverage;
              if (operation.overageLimit !== undefined) existingConfig.overageLimit = operation.overageLimit;
              if (operation.overagePeriod) existingConfig.overagePeriod = operation.overagePeriod;
              if (operation.overageCost !== undefined) existingConfig.overageCost = operation.overageCost;
              if (operation.isActive !== undefined) existingConfig.isActive = operation.isActive;
              */

              console.log(`     🔄 Enhanced: ${operation.operationCode} with module info`);
            }
          }
        }
      }
    }
  }

  console.log(`\n📊 Transformation Summary:`);
  console.log(`   Total configurations created: ${configs.length}`);
  console.log(`   Unique operation codes: ${new Set(configs.map(c => c.operationCode)).size}`);

  return configs;
}

/**
 * Sync transformed configurations to CRM database
 */
async function syncCreditConfigs(configs) {
  const stats = {
    total: configs.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  console.log(`\n🔄 Syncing ${configs.length} configurations to CRM database...`);

  for (const config of configs) {
    try {
      console.log(`   Processing: ${config.operationCode} (cost: ${config.creditCost})`);

      // Check if config already exists
      let existingConfig = await CrmCreditConfig.findOne({
        operationCode: config.operationCode,
        isGlobal: true,
        source: 'global'
      });

      if (existingConfig) {
        // Update existing config
        Object.assign(existingConfig, config);
        await existingConfig.save();
        stats.updated++;
        console.log(`   ✅ Updated: ${config.operationCode}`);
      } else {
        // Create new config - generate UUID since wrapper doesn't provide configIds in current API
        const newConfig = new CrmCreditConfig({
          ...config,
          configId: config.configId || uuidv4() // Use wrapper UUID if available, otherwise generate
        });
        await newConfig.save();
        stats.created++;
        console.log(`   ✅ Created: ${config.operationCode} (${newConfig.configId})`);
      }
    } catch (error) {
      console.error(`   ❌ Error syncing ${config.operationCode}:`, error.message);
      stats.errors.push({
        operationCode: config.operationCode,
        error: error.message
      });
    }
  }

  return stats;
}

/**
 * Validate configurations before syncing
 */
function validateConfigs(configs) {
  const errors = [];
  const requiredFields = ['operationCode', 'creditCost'];

  for (const [index, config] of configs.entries()) {
    // Check required fields
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Config ${index}: Missing required field '${field}'`);
      }
    }

    // Validate credit cost
    if (config.creditCost !== undefined && (typeof config.creditCost !== 'number' || config.creditCost < 0)) {
      errors.push(`Config ${index} (${config.operationCode}): Invalid creditCost: ${config.creditCost}`);
    }

    // Validate operation code format
    if (config.operationCode && !config.operationCode.includes('.')) {
      errors.push(`Config ${index}: Invalid operationCode format: ${config.operationCode} (should contain '.')`);
    }
  }

  return errors;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const deleteAll = args.includes('--delete-all');
  const tokenIndex = args.findIndex(arg => !arg.startsWith('--'));

  // Use provided token or environment variable or command line argument
  const authToken = (tokenIndex >= 0 ? args[tokenIndex] : null) ||
                   process.env.WRAPPER_AUTH_TOKEN ||
                   'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc2NTIwMzQ5MiwiaWF0IjoxNzY1MTE3MDkyLCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6Ijc0NjFmOTM5LTYwZjktNGI2My1hNTQ3LTM5ZGE3ZmQxNTc2MiIsIm9yZ19jb2RlIjoib3JnX2IwNjA3NTFlODkwIiwicGVybWlzc2lvbnMiOltdLCJzY3AiOlsiZW1haWwiLCJwcm9maWxlIiwib3BlbmlkIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9lMGI5NjE4ODNlZDI0MTcwODgxNGMyM2FiZjYzN2EyMSJ9.UXHF3_LQDKlIHZwoXALZXinbsPn2zqRUDua5P9oAF29yjz8Eduy3kxr83SPev27ggHaxX0ghJk7GkdE-6q3udnJN6VpAP8u65v4nFnRpKByhBgnbkeWBYZ6y64S1iMe7CZ1KTS0oMrphOHmto4BQPYtvcBJKqIM2SG7K8LXtBt_su0zV-c5Ph9ZxnU3_jbcJc0H_J_QuR9XANAr2FPPfcVBv8w2luKK2xFm6ij98uwd25pdhXQlqGbBupn63ygUA1lRnePFdFfQ-6crfdwfihPkrhVprGljZlCG9J2Q3EaztQQ1UIw3K6PqSLSNWJCxoCW-K5KNVZ_0AC2cT2llSNg';

  console.log('🚀 Starting Global Credit Configuration Sync');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log(`🧪 Mode: DRY RUN (fetch and transform only, no database changes)`);
  } else if (deleteAll) {
    console.log(`🗑️  Mode: DELETE ALL (delete existing global configs only)`);
  } else {
    console.log(`🔄 Mode: FULL SYNC (create/update existing configs)`);
  }

  if (authToken) {
    console.log(`🔐 Auth: Token provided (${authToken.substring(0, 10)}...)`);
  } else {
    console.log(`⚠️  Auth: No token provided`);
  }

  console.log(`📡 Admin API: ${ADMIN_API_URL}`);
  if (!dryRun) {
    console.log(`🗄️  MongoDB: ${MONGODB_URI}`);
  }
  console.log('='.repeat(60));

  try {
    if (deleteAll) {
      // Delete mode - only delete, no fetching or syncing
      console.log(`\n🔌 Connecting to MongoDB...`);
      await mongoose.connect(MONGODB_URI);
      console.log(`✅ Connected to MongoDB`);

      console.log(`\n🗑️  Deleting all existing global credit configurations...`);
      const deleteResult = await CrmCreditConfig.deleteMany({
        isGlobal: true,
        source: 'global'
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} existing global configurations`);

      console.log(`\n✅ Delete operation completed successfully!`);
      console.log('='.repeat(60));

      process.exit(0);
    }

    // Fetch configurations from admin API
    console.log(`\n📥 Fetching global configurations from admin API...`);
    const apiData = await fetchGlobalCreditConfigs(authToken);

    console.log(`✅ Retrieved data for ${apiData.applicationsCount || 0} applications`);
    console.log(`   Requested app: ${apiData.requestedApp || 'unknown'}`);
    console.log(`   Applications: ${apiData.applications?.map(app => `${app.appCode} (${app.allOperations?.length || 0} ops)`).join(', ') || 'none'}`);

    // Show sample of operations
    if (apiData.applications?.[0]?.allOperations) {
      const sampleOps = apiData.applications[0].allOperations.slice(0, 3);
      console.log(`   Sample operations: ${sampleOps.map(op => `${op.operationCode}(${op.creditCost})`).join(', ')}`);
    }

    // Transform API data to schema format
    console.log(`\n🔄 Transforming API data to CrmCreditConfig schema format...`);
    console.log(`   Mapping fields: operationCode, creditCost, unit, moduleName, etc.`);
    console.log(`   Setting global flags: isGlobal=true, source='global', tenantId=null`);
    const configs = transformConfigs(apiData);
    console.log(`✅ Transformed ${configs.length} configurations`);

    // Validate configurations
    console.log(`\n🔍 Validating configurations against schema requirements...`);
    const validationErrors = validateConfigs(configs);

    if (validationErrors.length > 0) {
      console.error(`❌ Validation failed with ${validationErrors.length} errors:`);
      validationErrors.forEach(error => console.error(`   ${error}`));
      throw new Error('Configuration validation failed');
    }

    console.log(`✅ All configurations validated successfully`);

    if (dryRun) {
      // Dry run mode - just show what would be synced
      console.log(`\n🧪 DRY RUN RESULTS:`);
      console.log(`   Would process ${configs.length} configurations`);
      console.log(`   Sample configs that would be synced:`);

      configs.slice(0, 5).forEach((config, idx) => {
        console.log(`     ${idx + 1}. ${config.operationCode}: ${config.creditCost} credits (${config.unit})`);
      });

      if (configs.length > 5) {
        console.log(`     ... and ${configs.length - 5} more`);
      }

      console.log(`\n📋 Fields that would be synced:`);
      console.log('   ✓ configId (preserved if exists, generated if new)');
      console.log('   ✓ operationCode');
      console.log('   ✓ creditCost');
      console.log('   ✓ unit');
      console.log('   ✓ moduleName (extracted from operationCode)');
      console.log('   ✓ isGlobal (set to true)');
      console.log('   ✓ source (set to "global")');
      console.log('   ✓ tenantId (set to null)');
      console.log('   ✓ lastSyncedAt (current timestamp)');
      console.log('   ✓ syncSource ("system")');
      console.log('   - Skipped: freeAllowance, overageLimit, volumeTiers (not in schema)');

      console.log(`\n✅ Dry run completed successfully - no database changes made!`);
      console.log('='.repeat(60));

      process.exit(0);
    }

    // Full sync mode - connect to database and sync
    console.log(`\n🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB`);


    // Sync configurations
    const stats = await syncCreditConfigs(configs);

    console.log(`\n📊 Sync Statistics:`);
    console.log(`   Total configs processed: ${stats.total}`);
    console.log(`   Created: ${stats.created}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Skipped: ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log(`   ❌ Errors: ${stats.errors.length}`);
      stats.errors.forEach((err, idx) => {
        console.log(`      ${idx + 1}. ${err.operationCode}: ${err.error}`);
      });
    }

    console.log(`\n✅ Sync completed successfully!`);
    console.log('\n📋 Synced Fields Summary:');
    console.log('   ✓ configId (preserved if exists, generated if new)');
    console.log('   ✓ operationCode');
    console.log('   ✓ creditCost');
    console.log('   ✓ unit');
    console.log('   ✓ moduleName (extracted from operationCode)');
    console.log('   ✓ isGlobal (set to true)');
    console.log('   ✓ source (set to "global")');
    console.log('   ✓ tenantId (set to null)');
    console.log('   ✓ lastSyncedAt (current timestamp)');
    console.log('   ✓ syncSource ("system")');
    console.log('   - Skipped: freeAllowance, overageLimit, volumeTiers (not in schema)');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Sync failed:`, error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (!dryRun && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { fetchGlobalCreditConfigs, transformConfigs, syncCreditConfigs, validateConfigs };
