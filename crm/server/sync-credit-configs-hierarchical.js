#!/usr/bin/env node

/**
 * 🔄 Hierarchical Credit Configuration Sync Script
 * 
 * This script syncs BOTH global and tenant-specific credit configurations from the wrapper.
 * It supports the hierarchical configuration model:
 * - Global configs (tenantId: null, isGlobal: true)
 * - Tenant-specific configs (tenantId: <id>, overridesGlobal: true)
 * - Entity-specific configs (entityId: <id>, source: 'entity')
 * 
 * Usage:
 *   node server/sync-credit-configs-hierarchical.js [tenantId] [authToken]
 *   
 *   Or with environment variable:
 *   WRAPPER_AUTH_TOKEN=your-token node server/sync-credit-configs-hierarchical.js [tenantId]
 * 
 * Examples:
 *   # Sync ALL configs for a specific tenant (global + tenant-specific)
 *   node server/sync-credit-configs-hierarchical.js b0a6e370-c1e5-43d1-94e0-55ed792274c4 YOUR_TOKEN
 * 
 *   # Sync ONLY global configs (no tenant ID)
 *   WRAPPER_AUTH_TOKEN=YOUR_TOKEN node server/sync-credit-configs-hierarchical.js
 */

import mongoose from 'mongoose';
import axios from 'axios';
import CrmCreditConfig from './models/CrmCreditConfig.js';

const WRAPPER_BASE_URL = process.env.WRAPPER_API_URL || 'http://localhost:3000/api/wrapper';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

/**
 * Fetch credit configurations from wrapper
 */
async function fetchCreditConfigsFromWrapper(tenantId = null, authToken = null) {
  try {
    const url = tenantId 
      ? `${WRAPPER_BASE_URL}/tenants/${tenantId}/credit-configs`
      : `${WRAPPER_BASE_URL}/credit-configs/global`;
    
    console.log(`📡 Fetching credit configs from: ${url}`);
    
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
    
    if (response.data && response.data.data) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    
    throw new Error('Invalid response format from wrapper API');
  } catch (error) {
    console.error(`❌ Failed to fetch credit configs:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Sync credit configurations to CRM database
 */
async function syncCreditConfigs(configs, tenantId) {
  const stats = await CrmCreditConfig.syncFromWrapper(configs, tenantId);
  
  console.log('\n📊 Sync Statistics:');
  console.log(`   Total configs processed: ${stats.total}`);
  console.log(`   Global configs: ${stats.globalUpdated}`);
  console.log(`   Tenant configs: ${stats.tenantUpdated}`);
  
  if (stats.errors.length > 0) {
    console.log(`   ❌ Errors: ${stats.errors.length}`);
    stats.errors.forEach((err, idx) => {
      console.log(`      ${idx + 1}. ${err.operationCode}: ${err.error}`);
    });
  }
  
  return stats;
}

/**
 * Cleanup orphaned tenant configs when global config is deleted
 */
async function cleanupOrphanedConfigs(tenantId) {
  try {
    // Find all global operation codes
    const globalConfigs = await CrmCreditConfig.find({
      isGlobal: true,
      source: 'global'
    }).select('operationCode');
    
    const globalOperationCodes = new Set(globalConfigs.map(c => c.operationCode));
    
    // Find tenant configs that don't have a corresponding global config
    const orphanedConfigs = await CrmCreditConfig.find({
      tenantId: tenantId,
      source: 'global',
      inheritedFrom: { $nin: Array.from(globalOperationCodes) }
    });
    
    if (orphanedConfigs.length > 0) {
      const deleteResult = await CrmCreditConfig.deleteMany({
        _id: { $in: orphanedConfigs.map(c => c._id) }
      });
      
      console.log(`🧹 Cleaned up ${deleteResult.deletedCount} orphaned inherited configs`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to cleanup orphaned configs:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  const tenantId = process.argv[2];
  const authToken = process.env.WRAPPER_AUTH_TOKEN || process.argv[3];
  
  console.log('🚀 Starting Hierarchical Credit Configuration Sync');
  console.log('='.repeat(60));
  
  if (tenantId) {
    console.log(`📋 Tenant ID: ${tenantId}`);
    console.log(`📍 Mode: Full sync (global + tenant-specific)`);
  } else {
    console.log(`📍 Mode: Global configs only`);
  }
  
  if (authToken) {
    console.log(`🔐 Auth: Token provided (${authToken.substring(0, 10)}...)`);
  } else {
    console.log(`⚠️  Auth: No token provided (wrapper endpoint must be public)`);
  }
  
  console.log('='.repeat(60));
  
  try {
    // Connect to MongoDB
    console.log(`\n🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB`);
    
    // Fetch configurations from wrapper
    console.log(`\n📥 Fetching configurations from wrapper...`);
    const configs = await fetchCreditConfigsFromWrapper(tenantId, authToken);
    console.log(`✅ Retrieved ${configs.length} configurations`);
    
    // Analyze configuration breakdown
    const globalCount = configs.filter(c => c.isGlobal === true || c.source === 'global').length;
    const tenantCount = configs.filter(c => c.isGlobal === false && c.source === 'tenant').length;
    
    console.log(`\n📊 Configuration Breakdown:`);
    console.log(`   Global configs: ${globalCount}`);
    console.log(`   Tenant-specific configs: ${tenantCount}`);
    console.log(`   Total: ${configs.length}`);
    
    // Sync configurations
    console.log(`\n🔄 Syncing configurations to CRM database...`);
    const stats = await syncCreditConfigs(configs, tenantId);
    
    // Cleanup orphaned configs if this is a tenant sync
    if (tenantId) {
      console.log(`\n🧹 Checking for orphaned configs...`);
      await cleanupOrphanedConfigs(tenantId);
    }
    
    console.log(`\n✅ Sync completed successfully!`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Sync failed:`, error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
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

export { fetchCreditConfigsFromWrapper, syncCreditConfigs };

