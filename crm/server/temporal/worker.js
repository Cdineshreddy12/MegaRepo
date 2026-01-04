#!/usr/bin/env node

/**
 * CRM Temporal Worker
 * Connects to Temporal (local or cloud) and processes CRM workflows
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Load environment variables BEFORE importing config
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from crm/server directory (one level up from temporal/worker.js)
// Use resolve to get absolute path to ensure it works regardless of cwd
const envPath = resolve(__dirname, '../.env');
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error('❌ Failed to load .env file:', dotenvResult.error.message);
  console.error('   Attempted path:', envPath);
}

import { NativeConnection, Worker } from '@temporalio/worker';
import { TEMPORAL_CONFIG, getTaskQueue } from '../../../temporal-shared/client.js';
import * as crmActivities from './activities/crm-activities.js';
import * as syncActivities from './activities/sync-activities.js';
import monitoring from './monitoring.js';

// Combine all activities
const allActivities = {
  ...crmActivities,
  ...syncActivities,
};

async function run() {
  console.log('🚀 Starting CRM Temporal Worker...');
  console.log(`🔗 Temporal Address: ${TEMPORAL_CONFIG.address}`);
  console.log(`📋 Namespace: ${TEMPORAL_CONFIG.namespace}`);
  console.log(`📋 Task Queue: ${getTaskQueue('CRM')}`);
  console.log(`✅ Temporal Enabled: ${TEMPORAL_CONFIG.enabled}`);

  if (!TEMPORAL_CONFIG.enabled) {
    console.log('⚠️ Temporal is disabled via TEMPORAL_ENABLED flag. Exiting.');
    process.exit(0);
  }

  let connection = null;
  let worker = null;
  let connectionRetries = 0;
  const maxConnectionRetries = 5;
  const connectionRetryDelay = 5000; // 5 seconds

  // Health check function
  const healthCheck = () => {
    return {
      healthy: worker !== null && connection !== null,
      uptime: Date.now() - monitoring.metrics.startTime,
      metrics: monitoring.getMetrics(),
    };
  };

  // Expose health check via process signal (for monitoring tools)
  process.on('SIGUSR2', () => {
    const health = healthCheck();
    console.log('🏥 Health Check:', JSON.stringify(health, null, 2));
  });

  while (connectionRetries < maxConnectionRetries) {
    try {
      console.log(`🔄 Attempting to connect to Temporal (attempt ${connectionRetries + 1}/${maxConnectionRetries})...`);
      
      connection = await NativeConnection.connect({
        address: TEMPORAL_CONFIG.address,
        ...TEMPORAL_CONFIG.connectionOptions,
      });

      console.log('✅ Connected to Temporal');

      // Register workflows using index file (absolute path like wrapper worker)
      const workflowsPath = join(__dirname, 'workflows', 'index.js');

      console.log(`📋 Loading workflows from: ${workflowsPath}`);

      worker = await Worker.create({
        connection,
        namespace: TEMPORAL_CONFIG.namespace,
        taskQueue: getTaskQueue('CRM'),
        workflowsPath,
        activities: allActivities,
      });

      console.log('✅ CRM Temporal Worker started');
      console.log(`📋 Listening on task queue: ${getTaskQueue('CRM')}`);
      console.log(`📋 Registered workflows: crmSyncWorkflow, tenantSyncWorkflow, dlqHandlerWorkflow, organizationAssignmentWorkflow`);
      console.log(`📋 Registered activities: ${Object.keys(allActivities).length} activities`);

      // Reset retry counter on successful connection
      connectionRetries = 0;

      // Handle graceful shutdown
      let isShuttingDown = false;
      const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        try {
          if (worker) {
            await worker.shutdown();
            console.log('✅ Worker shut down successfully');
          }
        } catch (error) {
          console.error('❌ Error shutting down worker:', error);
        }
        try {
          if (connection) {
            await connection.close();
            console.log('✅ Connection closed successfully');
          }
        } catch (error) {
          console.error('❌ Error closing connection:', error);
        }
        process.exit(0);
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));

      // Log metrics periodically
      const metricsInterval = setInterval(() => {
        const metrics = monitoring.getMetrics();
        console.log('📊 Worker Metrics:', {
          workflows: {
            started: metrics.workflows.started,
            completed: metrics.workflows.completed,
            failed: metrics.workflows.failed,
          },
          activities: {
            executed: metrics.activities.executed,
            failed: metrics.activities.failed,
          },
          uptime: `${metrics.uptime.minutes} minutes`,
        });

        // Check for alerts
        const alerts = monitoring.checkAlerts();
        if (alerts.length > 0) {
          console.warn('⚠️ Alerts detected:', alerts);
        }
      }, 5 * 60 * 1000); // Every 5 minutes

      // Clear interval on shutdown
      process.on('SIGINT', () => clearInterval(metricsInterval));
      process.on('SIGTERM', () => clearInterval(metricsInterval));

      await worker.run();
      break; // Exit retry loop if worker runs successfully
    } catch (error) {
      connectionRetries++;
      console.error(`❌ CRM Worker error (attempt ${connectionRetries}/${maxConnectionRetries}):`, error.message);

      // Clean up failed connection
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          // Ignore close errors
        }
        connection = null;
      }
      worker = null;

      if (connectionRetries >= maxConnectionRetries) {
        console.error('❌ Max connection retries reached. Exiting.');
        process.exit(1);
      }

      console.log(`⏳ Retrying connection in ${connectionRetryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, connectionRetryDelay));
    }
  }
}

run().catch((err) => {
  console.error('❌ Failed to start CRM Worker:', err);
  process.exit(1);
});

