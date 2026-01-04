#!/usr/bin/env node

/**
 * Script to extract event data from failed Temporal workflows
 * 
 * This script:
 * 1. Queries Temporal for failed workflows
 * 2. Extracts event data from each failed workflow
 * 3. Displays the event data in a format ready for retry
 * 4. Optionally retries the workflows with the fixed code
 */

import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../temporal-shared/client.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from crm/server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Extract event data from a workflow execution
 */
async function extractWorkflowData(temporalClient, workflowId, runId) {
  try {
    // Get handle (with or without runId)
    const handle = runId 
      ? temporalClient.workflow.getHandle(workflowId, runId)
      : temporalClient.workflow.getHandle(workflowId);
    
    // Get workflow description
    let description;
    try {
      description = await handle.describe();
    } catch (describeError) {
      console.warn(`⚠️ Could not describe workflow ${workflowId}:`, describeError.message);
      // Try to continue with just the workflowId
      description = null;
    }
    
    const workflowInfo = {
      workflowId: description?.workflowExecutionInfo?.workflowId || workflowId,
      runId: description?.workflowExecutionInfo?.runId || runId || 'latest',
      status: description?.workflowExecutionInfo?.status?.name || 'UNKNOWN',
      workflowType: description?.workflowExecutionInfo?.type?.name || 'unknown',
      startTime: description?.workflowExecutionInfo?.startTime || null,
      closeTime: description?.workflowExecutionInfo?.closeTime || null,
    };

    // Try to get the workflow result or failure details
    let eventData = null;
    let error = null;
    
    try {
      // Fetch workflow history to get input arguments
      const history = await handle.fetchHistory();
      
      // Find the WorkflowExecutionStarted event which contains the input
      const startedEvent = history.events?.find(
        e => e.workflowExecutionStartedEventAttributes
      );
      
      if (startedEvent?.workflowExecutionStartedEventAttributes?.input) {
        const input = startedEvent.workflowExecutionStartedEventAttributes.input;
        
        // Temporal stores input as payloads array
        if (input.payloads && input.payloads.length > 0) {
          try {
            // Use Temporal's converter to decode the payload
            // The payload is typically a JSON-encoded string in the data field
            const payload = input.payloads[0];
            
            // Try different ways to extract the data
            if (payload.data) {
              if (payload.data instanceof Uint8Array) {
                const jsonStr = new TextDecoder().decode(payload.data);
                eventData = JSON.parse(jsonStr);
              } else if (typeof payload.data === 'string') {
                // Might be double-encoded
                try {
                  eventData = JSON.parse(payload.data);
                } catch {
                  eventData = payload.data;
                }
              } else if (typeof payload.data === 'object') {
                eventData = payload.data;
              }
            } else if (payload.metadata) {
              // Sometimes data is in metadata
              const encoding = payload.metadata?.encoding;
              if (encoding === 'json/plain') {
                const dataStr = Buffer.from(payload.data || '').toString('utf-8');
                eventData = JSON.parse(dataStr);
              }
            }
            
            // If still no data, try to access the raw payload
            if (!eventData && payload) {
              // Try to stringify and parse
              try {
                const payloadStr = JSON.stringify(payload);
                const parsed = JSON.parse(payloadStr);
                if (parsed.data) {
                  eventData = typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed.data;
                }
              } catch (e) {
                // Last resort: check if payload has direct properties
                if (payload.constructor === Object && Object.keys(payload).length > 0) {
                  eventData = payload;
                }
              }
            }
          } catch (parseError) {
            console.warn(`⚠️ Could not parse input for ${workflowId}:`, parseError.message);
            // Log the raw payload for debugging
            console.warn(`   Raw payload keys:`, Object.keys(input.payloads[0] || {}));
          }
        }
      }
    } catch (historyError) {
      console.warn(`⚠️ Could not fetch history for ${workflowId}:`, historyError.message);
    }

    // Try to get failure information from the workflow result and history
    try {
      const result = await handle.result();
      // If we get here, workflow didn't fail
    } catch (resultError) {
      // Expected for failed workflows - extract error info
      if (resultError.cause) {
        error = {
          message: resultError.cause.message || resultError.message,
          type: resultError.cause.type || resultError.constructor?.name,
          stack: resultError.cause.stackTrace || resultError.stack,
        };
      } else {
        error = {
          message: resultError.message,
          type: resultError.constructor?.name || 'Error',
          stack: resultError.stack,
        };
      }
      
      // Try to get more detailed error from workflow history
      try {
        const history = await handle.fetchHistory();
        // Find the WorkflowExecutionFailed event
        const failedEvent = history.events?.find(
          e => e.workflowExecutionFailedEventAttributes
        );
        
        if (failedEvent?.workflowExecutionFailedEventAttributes?.failure) {
          const failure = failedEvent.workflowExecutionFailedEventAttributes.failure;
          
          // Get the root cause
          let rootCause = failure;
          while (rootCause.cause) {
            rootCause = rootCause.cause;
          }
          
          // Get activity failure if it exists
          const activityFailure = failure.activityFailureInfo;
          
          error = {
            message: rootCause.message || failure.message || error.message,
            type: rootCause.type || failure.type || error.type,
            stack: rootCause.stackTrace || failure.stackTrace || error.stack,
            activityType: activityFailure?.activityType?.name,
            activityId: activityFailure?.activityId,
            scheduledEventId: activityFailure?.scheduledEventId,
            startedEventId: activityFailure?.startedEventId,
            retryState: activityFailure?.retryState,
            fullFailure: failure, // Include full failure object for debugging
          };
        }
      } catch (historyError) {
        // If we can't get history, use the error we already have
        console.warn(`⚠️ Could not fetch detailed error from history: ${historyError.message}`);
      }
    }

    return {
      ...workflowInfo,
      eventData,
      error,
    };
  } catch (error) {
    console.error(`❌ Failed to extract data from ${workflowId}:`, error.message);
    return null;
  }
}

/**
 * Query failed workflows from Temporal
 */
async function queryFailedWorkflows(temporalClient, options = {}) {
  const {
    workflowType = null,
    namespace = TEMPORAL_CONFIG.namespace,
    maxResults = 100,
  } = options;

  try {
    // Use listWorkflows to query by status
    // Note: Temporal client doesn't have a direct "list failed" method,
    // so we'll need to use the workflow service or query by workflow type
    
    const workflows = [];
    
    // If workflowType is specified, query by type
    if (workflowType) {
      // List workflows of this type
      // Note: This is a simplified approach - in production you might want to use
      // Temporal's visibility API or query workflows
      console.log(`🔍 Querying workflows of type: ${workflowType}`);
      
      // For now, we'll need to use the workflow service directly
      // or iterate through known workflow IDs
      // This is a limitation - we'll provide a way to specify workflow IDs
    }

    return workflows;
  } catch (error) {
    console.error('❌ Failed to query workflows:', error.message);
    return [];
  }
}

/**
 * Extract data from specific workflow IDs
 */
async function extractFromWorkflowIds(temporalClient, workflowIds) {
  const results = [];

  for (const workflowId of workflowIds) {
    console.log(`\n📋 Extracting data from: ${workflowId}`);
    
    try {
      // Get the latest run of this workflow
      const handle = temporalClient.workflow.getHandle(workflowId);
      
      let runId = null;
      try {
        const description = await handle.describe();
        runId = description.workflowExecutionInfo?.runId;
      } catch (describeError) {
        // If describe fails, try to get runId from the workflowId itself
        // Some workflow IDs include the runId, or we can try without it
        console.warn(`⚠️ Could not describe workflow, trying without runId: ${describeError.message}`);
      }
      
      // Extract data (with or without runId)
      const data = await extractWorkflowData(
        temporalClient,
        workflowId,
        runId
      );
      
      if (data) {
        results.push(data);
        console.log(`✅ Extracted data from ${workflowId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to extract from ${workflowId}:`, error.message);
      console.error(`   Error details:`, error.stack);
    }
  }

  return results;
}

/**
 * Retry a workflow with extracted event data
 */
async function retryWorkflow(temporalClient, workflowData) {
  if (!workflowData.eventData) {
    console.error(`❌ No event data available for ${workflowData.workflowId}`);
    return null;
  }

  try {
    const eventType = workflowData.eventData.eventType || 
                     workflowData.workflowType?.replace('crmSyncWorkflow', '') ||
                     'unknown';
    
    const workflowId = `crm-${eventType}-${workflowData.eventData.tenantId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const handle = await temporalClient.workflow.start('crmSyncWorkflow', {
      args: [workflowData.eventData],
      taskQueue: getTaskQueue('CRM'),
      workflowId,
      workflowIdReusePolicy: 'ALLOW_DUPLICATE',
    });

    console.log(`✅ Started retry workflow: ${workflowId}`);
    return handle;
  } catch (error) {
    console.error(`❌ Failed to retry workflow:`, error.message);
    return null;
  }
}

/**
 * Display extracted workflow data
 */
function displayWorkflowData(workflowData) {
  console.log('\n' + '='.repeat(80));
  console.log(`Workflow ID: ${workflowData.workflowId}`);
  console.log(`Run ID: ${workflowData.runId}`);
  console.log(`Status: ${workflowData.status}`);
  console.log(`Type: ${workflowData.workflowType}`);
  console.log(`Start Time: ${workflowData.startTime}`);
  if (workflowData.closeTime) {
    console.log(`Close Time: ${workflowData.closeTime}`);
  }
  
  if (workflowData.error) {
    console.log(`\n❌ Error:`);
    console.log(`   Message: ${workflowData.error.message}`);
    console.log(`   Type: ${workflowData.error.type}`);
    if (workflowData.error.activityType) {
      console.log(`   Activity: ${workflowData.error.activityType} (ID: ${workflowData.error.activityId})`);
    }
    if (workflowData.error.retryState) {
      console.log(`   Retry State: ${workflowData.error.retryState}`);
    }
    if (workflowData.error.stack) {
      console.log(`   Stack Trace:`);
      // Print first few lines of stack trace
      const stackLines = workflowData.error.stack.split('\n').slice(0, 10);
      stackLines.forEach(line => console.log(`      ${line}`));
    }
    // Show full failure details if available
    if (workflowData.error.fullFailure?.cause) {
      console.log(`\n   Root Cause:`);
      let cause = workflowData.error.fullFailure.cause;
      let depth = 0;
      while (cause && depth < 5) {
        console.log(`      ${'  '.repeat(depth)}${cause.message || 'Unknown error'}`);
        if (cause.source) {
          console.log(`      ${'  '.repeat(depth)}Source: ${cause.source}`);
        }
        cause = cause.cause;
        depth++;
      }
    }
  }
  
  if (workflowData.eventData) {
    console.log(`\n📦 Event Data:`);
    console.log(JSON.stringify(workflowData.eventData, null, 2));
    
    console.log(`\n🔄 Retry Command:`);
    const eventDataStr = JSON.stringify(workflowData.eventData).replace(/'/g, "'\\''");
    console.log(`node retry-failed-events.js workflow '${eventDataStr}'`);
  } else {
    console.log(`\n⚠️ No event data extracted`);
  }
  console.log('='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  if (!TEMPORAL_CONFIG.enabled) {
    console.log('⚠️ Temporal is disabled. Set TEMPORAL_ENABLED=true to enable.');
    process.exit(1);
  }

  const command = process.argv[2];
  const workflowIds = process.argv.slice(3);

  try {
    const temporalClient = await getTemporalClient();
    console.log('✅ Connected to Temporal\n');

    if (command === 'extract' && workflowIds.length > 0) {
      // Extract data from specific workflow IDs
      console.log(`📋 Extracting data from ${workflowIds.length} workflow(s)...\n`);
      const results = await extractFromWorkflowIds(temporalClient, workflowIds);
      
      console.log(`\n✅ Extracted data from ${results.length} workflow(s)\n`);
      
      // Display results
      results.forEach(displayWorkflowData);
      
      // Ask if user wants to retry
      if (results.length > 0 && results.some(r => r.eventData)) {
        console.log(`\n💡 To retry these workflows, use:`);
        console.log(`   node extract-failed-workflows.js retry ${workflowIds.join(' ')}`);
      }
      
    } else if (command === 'retry' && workflowIds.length > 0) {
      // Extract and retry
      console.log(`🔄 Extracting and retrying ${workflowIds.length} workflow(s)...\n`);
      const results = await extractFromWorkflowIds(temporalClient, workflowIds);
      
      let retried = 0;
      for (const workflowData of results) {
        if (workflowData.eventData) {
          const handle = await retryWorkflow(temporalClient, workflowData);
          if (handle) {
            retried++;
          }
        }
      }
      
      console.log(`\n✅ Retried ${retried} workflow(s)`);
      
    } else if (command === 'list') {
      // List recent failed workflows (requires workflow IDs)
      console.log('📋 To extract data from workflows, provide workflow IDs:');
      console.log('   node extract-failed-workflows.js extract <workflowId1> <workflowId2> ...');
      console.log('\n💡 You can get workflow IDs from Temporal UI or from failed workflow logs.');
      
    } else {
      // Show usage
      console.log(`
Usage:
  node extract-failed-workflows.js extract <workflowId1> [workflowId2] ...   # Extract event data from workflows
  node extract-failed-workflows.js retry <workflowId1> [workflowId2] ...    # Extract and retry workflows
  node extract-failed-workflows.js list                                         # Show usage info

Examples:
  # Extract data from specific failed workflows
  node extract-failed-workflows.js extract \\
    crm-role.deleted-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346576006-ulgtb4mzg \\
    crm-role.created-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346082549-Ir61k5tve

  # Extract and automatically retry
  node extract-failed-workflows.js retry \\
    crm-role.deleted-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346576006-ulgtb4mzg

💡 Tip: Get workflow IDs from Temporal UI (localhost:8081) or from your workflow logs.
      `);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

