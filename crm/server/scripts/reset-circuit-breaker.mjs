#!/usr/bin/env node
/**
 * Script to reset MongoDB circuit breaker in running consumer
 * 
 * Usage: node scripts/reset-circuit-breaker.mjs
 * 
 * This script connects to MongoDB to verify it's working,
 * then provides instructions for resetting the circuit breaker.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function main() {
  console.log('🔍 Checking MongoDB connection...\n');

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connection successful\n');

    // Test a simple query
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`✅ MongoDB is healthy - found ${collections.length} collections\n`);

    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed\n');

    console.log('📋 Circuit Breaker Reset Instructions:');
    console.log('─'.repeat(70));
    console.log('1. The circuit breaker is managed in the consumer process');
    console.log('2. To reset the circuit breaker:');
    console.log('   a) Restart the consumer process (crm-consumer-runner.js)');
    console.log('   b) OR wait 60 seconds for automatic recovery');
    console.log('3. The circuit breaker will automatically:');
    console.log('   - Transition from OPEN → HALF_OPEN after 60 seconds');
    console.log('   - Transition from HALF_OPEN → CLOSED after 2 successful operations');
    console.log('─'.repeat(70));
    console.log('\n✅ MongoDB is healthy - circuit breaker should recover automatically');
    console.log('   If issues persist, restart the consumer process.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('\n⚠️  This may be why the circuit breaker is OPEN');
    console.error('   Please check:');
    console.error('   1. MongoDB is running');
    console.error('   2. MONGODB_URI is correct');
    console.error('   3. Network connectivity to MongoDB\n');
    process.exit(1);
  }
}

main();

