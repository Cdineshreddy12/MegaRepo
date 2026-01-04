#!/usr/bin/env node

/**
 * Wrapper Temporal Worker
 * Connects to Temporal (local or cloud) and processes wrapper workflows
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Load environment variables BEFORE importing config
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from wrapper/backend directory (one level up from temporal/worker.js)
// Use resolve to get absolute path to ensure it works regardless of cwd
const envPath = resolve(__dirname, '../.env');
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error('❌ Failed to load .env file:', dotenvResult.error.message);
  console.error('   Attempted path:', envPath);
}

import { NativeConnection, Worker } from '@temporalio/worker';
import { TEMPORAL_CONFIG, getTaskQueue } from '../../../temporal-shared/client.js';
import * as interAppActivities from './activities/inter-app-activities.js';
import * as organizationActivities from './activities/organization-activities.js';

async function run() {
  console.log('🚀 Starting Wrapper Temporal Worker...');
  console.log(`🔗 Temporal Address: ${TEMPORAL_CONFIG.address}`);
  console.log(`📋 Namespace: ${TEMPORAL_CONFIG.namespace}`);
  console.log(`📋 Task Queue: ${getTaskQueue('WRAPPER')}`);
  console.log(`✅ Temporal Enabled: ${TEMPORAL_CONFIG.enabled}`);

  if (!TEMPORAL_CONFIG.enabled) {
    console.log('⚠️ Temporal is disabled via TEMPORAL_ENABLED flag. Exiting.');
    process.exit(0);
  }

  try {
    const connection = await NativeConnection.connect({
      address: TEMPORAL_CONFIG.address,
      ...TEMPORAL_CONFIG.connectionOptions,
    });

    // Combine all activities
    const activities = {
      ...interAppActivities,
      ...organizationActivities,
    };

    const workflowsPath = join(__dirname, 'workflows', 'inter-app-workflow.js');

    const worker = await Worker.create({
      connection,
      namespace: TEMPORAL_CONFIG.namespace,
      taskQueue: getTaskQueue('WRAPPER'),
      workflowsPath,
      activities,
    });

    console.log('✅ Wrapper Temporal Worker started');
    console.log(`📋 Listening on task queue: ${getTaskQueue('WRAPPER')}`);

    // Handle graceful shutdown
    let isShuttingDown = false;
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      try {
        await worker.shutdown();
        console.log('✅ Worker shut down successfully');
      } catch (error) {
        console.error('❌ Error shutting down worker:', error);
      }
      try {
        await connection.close();
        console.log('✅ Connection closed successfully');
      } catch (error) {
        console.error('❌ Error closing connection:', error);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    await worker.run();
  } catch (error) {
    console.error('❌ Wrapper Worker error:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Failed to start Wrapper Worker:', err);
  process.exit(1);
});

