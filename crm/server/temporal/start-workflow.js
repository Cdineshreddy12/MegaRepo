#!/usr/bin/env node

/**
 * Example script to start a CRM workflow
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

    // Example: Start a user creation workflow
    const handle = await client.workflow.start('crmSyncWorkflow', {
      args: [{
        eventType: 'user.created',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }],
      taskQueue: getTaskQueue('CRM'),
      workflowId: `crm-sync-${Date.now()}`,
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

