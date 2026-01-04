#!/usr/bin/env node

/**
 * Script to retry failed Temporal workflows
 * 
 * This script helps reprocess events that failed due to the tenantId/roleId issue.
 * It can:
 * 1. Check for pending messages in Redis streams
 * 2. Manually retry specific failed workflows
 * 3. Replay events from Redis streams
 */

import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../temporal-shared/client.js';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from crm/server directory (parent of temporal directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const STREAMS = [
  'crm:sync:role:role_created',
  'crm:sync:role:role_updated',
  'crm:sync:role:role_deleted',
  'crm:sync:permissions:role_assigned',
  'crm:sync:permissions:role_unassigned',
];

const CONSUMER_GROUP = 'crm-temporal-bridge';
const CONSUMER_NAME = 'retry-script';

/**
 * Parse Redis message into event format
 */
function parseRedisMessage(message) {
  const event = { id: message.id };

  // Parse all fields from Redis hash
  Object.entries(message.message).forEach(([key, value]) => {
    try {
      const parsed = JSON.parse(value);
      event[key] = parsed;
    } catch {
      event[key] = value;
    }
  });

  // Handle wrapper API format where event is in 'data' field
  if (event.data && typeof event.data === 'string') {
    try {
      let dataStr = event.data;
      if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
        dataStr = dataStr.slice(1, -1);
      }
      const parsedData = JSON.parse(dataStr);
      Object.assign(event, parsedData);
      delete event.data;
    } catch (parseError) {
      console.warn(`⚠️ Failed to parse data field: ${parseError.message}`);
    }
  } else if (event.data && typeof event.data === 'object') {
    Object.assign(event, event.data);
    delete event.data;
  }

  return event;
}

/**
 * Get event type from stream name
 */
function getEventTypeFromStream(stream) {
  const mapping = {
    'crm:sync:role:role_created': 'role.created',
    'crm:sync:role:role_updated': 'role.updated',
    'crm:sync:role:role_deleted': 'role.deleted',
    'crm:sync:permissions:role_assigned': 'role.assigned',
    'crm:sync:permissions:role_unassigned': 'role.unassigned',
  };

  return mapping[stream] || stream.split(':').pop();
}

/**
 * Retry a single event by starting a new workflow
 */
async function retryEvent(redisClient, temporalClient, stream, message) {
  try {
    const event = parseRedisMessage(message);
    const eventType = event.eventType || getEventTypeFromStream(stream);

    console.log(`🔄 Retrying event: ${eventType} for tenant ${event.tenantId || 'unknown'}`);

    // Start Temporal workflow
    const workflowId = `crm-${eventType}-${event.tenantId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await temporalClient.workflow.start('crmSyncWorkflow', {
      args: [{
        eventType,
        tenantId: event.tenantId,
        ...event,
      }],
      taskQueue: getTaskQueue('CRM'),
      workflowId,
      workflowIdReusePolicy: 'ALLOW_DUPLICATE',
    });

    // Acknowledge the message in Redis
    await redisClient.xAck(stream, CONSUMER_GROUP, message.id);
    
    console.log(`✅ Retried event ${message.id} → workflow ${workflowId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to retry event ${message.id}:`, error.message);
    return false;
  }
}

/**
 * Check and retry pending messages
 */
async function retryPendingMessages() {
  if (!TEMPORAL_CONFIG.enabled) {
    console.log('⚠️ Temporal is disabled. Set TEMPORAL_ENABLED=true to enable.');
    return;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }

  const redisClient = createClient({ url: redisUrl });
  await redisClient.connect();

  const temporalClient = await getTemporalClient();

  let totalRetried = 0;

  try {
    for (const stream of STREAMS) {
      try {
        // Check if consumer group exists
        try {
          await redisClient.xGroupCreate(stream, CONSUMER_GROUP, '0', { MKSTREAM: true });
          console.log(`✅ Created consumer group for stream: ${stream}`);
        } catch (error) {
          if (!error.message.includes('BUSYGROUP')) {
            throw error;
          }
        }

        // Get pending messages
        const pendingInfo = await redisClient.xPending(stream, CONSUMER_GROUP);
        
        if (!pendingInfo || pendingInfo.pending === 0) {
          console.log(`ℹ️ No pending messages in ${stream}`);
          continue;
        }

        console.log(`📋 Found ${pendingInfo.pending} pending messages in ${stream}`);

        // Get detailed pending messages
        const pendingMessages = await redisClient.xPendingRange(
          stream,
          CONSUMER_GROUP,
          '-',
          '+',
          100
        );

        if (!pendingMessages || pendingMessages.length === 0) {
          continue;
        }

        // Claim and retry each pending message
        for (const msg of pendingMessages) {
          try {
            const claimedMessages = await redisClient.xClaim(
              stream,
              CONSUMER_GROUP,
              CONSUMER_NAME,
              3600000, // 1 hour visibility timeout
              [msg.id]
            );

            if (claimedMessages && claimedMessages.length > 0) {
              for (const message of claimedMessages) {
                const success = await retryEvent(redisClient, temporalClient, stream, message);
                if (success) {
                  totalRetried++;
                }
              }
            }
          } catch (claimError) {
            console.warn(`⚠️ Could not claim message ${msg.id}: ${claimError.message}`);
          }
        }
      } catch (error) {
        if (error.message.includes('NOGROUP')) {
          console.log(`ℹ️ Consumer group doesn't exist for ${stream}, skipping`);
          continue;
        }
        console.error(`❌ Error processing stream ${stream}:`, error.message);
      }
    }

    console.log(`\n✅ Retry complete: ${totalRetried} events retried`);
  } finally {
    await redisClient.quit();
  }
}

/**
 * Retry a specific workflow by event data
 */
async function retryWorkflowByEvent(eventData) {
  if (!TEMPORAL_CONFIG.enabled) {
    console.log('⚠️ Temporal is disabled. Set TEMPORAL_ENABLED=true to enable.');
    return;
  }

  try {
    const temporalClient = await getTemporalClient();
    const eventType = eventData.eventType || 'role.deleted';
    
    const workflowId = `crm-${eventType}-${eventData.tenantId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const handle = await temporalClient.workflow.start('crmSyncWorkflow', {
      args: [{
        eventType,
        tenantId: eventData.tenantId,
        ...eventData,
      }],
      taskQueue: getTaskQueue('CRM'),
      workflowId,
      workflowIdReusePolicy: 'ALLOW_DUPLICATE',
    });

    console.log(`✅ Started retry workflow: ${workflowId}`);
    console.log(`   Run ID: ${handle.firstExecutionRunId}`);
    
    return handle;
  } catch (error) {
    console.error(`❌ Failed to retry workflow:`, error.message);
    throw error;
  }
}

// Main execution
const command = process.argv[2];

if (command === 'pending') {
  console.log('🔄 Retrying pending messages from Redis streams...\n');
  retryPendingMessages().catch(console.error);
} else if (command === 'workflow') {
  // Example: node retry-failed-events.js workflow '{"eventType":"role.deleted","tenantId":"...","roleId":"..."}'
  const eventDataStr = process.argv[3];
  if (!eventDataStr) {
    console.error('❌ Usage: node retry-failed-events.js workflow \'{"eventType":"role.deleted","tenantId":"...","roleId":"..."}\'');
    process.exit(1);
  }
  
  try {
    const eventData = JSON.parse(eventDataStr);
    console.log('🔄 Retrying workflow with event data...\n');
    retryWorkflowByEvent(eventData).catch(console.error);
  } catch (error) {
    console.error('❌ Invalid JSON:', error.message);
    process.exit(1);
  }
} else {
  console.log(`
Usage:
  node retry-failed-events.js pending              # Retry all pending messages from Redis streams
  node retry-failed-events.js workflow '<json>'     # Retry a specific workflow with event data

Examples:
  # Retry all pending messages
  node retry-failed-events.js pending

  # Retry a specific role deletion event
  node retry-failed-events.js workflow '{"eventType":"role.deleted","tenantId":"62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8","roleId":"e2064fd3-533d-4b51-a25e-95500ef01eab"}'
  `);
  process.exit(1);
}

