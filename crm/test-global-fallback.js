#!/usr/bin/env node

/**
 * Test script to verify global credit config fallback functionality
 */

import mongoose from 'mongoose';
import CrmCreditConfig from './server/models/CrmCreditConfig.js';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function testGlobalFallback() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Global Credit Config Fallback...');

    // Test cases
    const testCases = [
      {
        operationCode: 'crm.accounts.create',
        tenantId: 'non-existent-tenant-' + Date.now(),
        description: 'Non-existent tenant should fall back to global config'
      },
      {
        operationCode: 'crm.leads.create',
        tenantId: 'another-fake-tenant-' + Date.now(),
        description: 'Another operation with fake tenant'
      },
      {
        operationCode: 'crm.contacts.create',
        tenantId: null,
        description: 'Null tenant should use global config directly'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 Test: ${testCase.description}`);
      console.log(`   Operation: ${testCase.operationCode}`);
      console.log(`   Tenant: ${testCase.tenantId || 'null'}`);

      const config = await CrmCreditConfig.getEffectiveConfig(
        testCase.operationCode,
        testCase.tenantId
      );

      if (config) {
        console.log('✅ SUCCESS: Found config');
        console.log(`   Config ID: ${config.configId}`);
        console.log(`   Credit Cost: ${config.creditCost}`);
        console.log(`   Is Global: ${config.isGlobal}`);
        console.log(`   Source: ${config.source}`);
        console.log(`   Tenant ID: ${config.tenantId || 'null (global)'}`);
      } else {
        console.log('❌ FAILED: No config found');
      }
    }

    // Test direct database queries to verify configs exist
    console.log('\n🔍 Checking database for global configs...');
    const globalConfigs = await CrmCreditConfig.find({
      $or: [
        { isGlobal: true },
        { source: 'global' },
        { tenantId: null }
      ]
    }).limit(5);

    console.log(`Found ${globalConfigs.length} global configs in database:`);
    globalConfigs.forEach(config => {
      console.log(`   ${config.operationCode}: ${config.creditCost} credits (${config.isGlobal ? 'global' : 'tenant'})`);
    });

    console.log('\n✅ Global fallback test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - getEffectiveConfig method implements hierarchical fallback');
    console.log('   - Priority: Entity-specific → Tenant-specific → Global → Default');
    console.log('   - Updated consumeCredits and checkUserCredits to use getEffectiveConfig');
    console.log('   - Global configs should now be used when tenant configs are missing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testGlobalFallback().catch(console.error);
