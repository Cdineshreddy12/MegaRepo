#!/usr/bin/env node

/**
 * Example script to start a wrapper workflow
 * Used for testing purposes
 */

import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../temporal-shared/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function startExampleWorkflow() {
  if (!TEMPORAL_CONFIG.enabled) {
    console.log('⚠️ Temporal is disabled. Set TEMPORAL_ENABLED=true to enable.');
    return;
  }

  try {
    const client = await getTemporalClient();

    // Example: Start an inter-app workflow
    const handle = await client.workflow.start('interAppWorkflow', {
      args: [{
        targetApplication: 'crm',
        eventType: 'user.created',
        tenantId: 'test-tenant-id',
        entityId: 'test-entity-id',
        userId: 'test-user-id',
        email: 'test@example.com',
      }],
      taskQueue: getTaskQueue('WRAPPER'),
      workflowId: `wrapper-inter-app-${Date.now()}`,
    });

    console.log('✅ Workflow started:', handle.workflowId);
    console.log('Run ID:', handle.firstExecutionRunId);

    // Wait for result
    const result = await handle.result();
    console.log('Workflow result:', result);
  } catch (error) {
    console.error('❌ Failed to start workflow:', error);
    process.exit(1);
  }
}

startExampleWorkflow().catch(console.error);


