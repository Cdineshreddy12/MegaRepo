import { Connection, Client } from '@temporalio/client';
import { TEMPORAL_CONFIG } from './config.js';

let connection = null;
let client = null;

/**
 * Get shared Temporal client connection
 * All applications use this same connection
 */
export async function getTemporalClient() {
  if (client) return client;

  try {
    connection = await Connection.connect({
      address: TEMPORAL_CONFIG.address,
      ...TEMPORAL_CONFIG.connectionOptions,
    });

    client = new Client({
      connection,
      namespace: TEMPORAL_CONFIG.namespace,
    });

    console.log(`✅ Connected to Temporal at ${TEMPORAL_CONFIG.address}`);
    return client;
  } catch (error) {
    console.error(`❌ Failed to connect to Temporal at ${TEMPORAL_CONFIG.address}:`, error);
    throw error;
  }
}

/**
 * Get Temporal client for a specific namespace (if needed)
 */
export async function getTemporalClientForNamespace(namespace) {
  if (!connection) {
    connection = await Connection.connect({
      address: TEMPORAL_CONFIG.address,
      ...TEMPORAL_CONFIG.connectionOptions,
    });
  }

  return new Client({
    connection,
    namespace: namespace || TEMPORAL_CONFIG.namespace,
  });
}

/**
 * Close shared connection (cleanup)
 */
export async function closeTemporalClient() {
  if (connection) {
    await connection.close();
    connection = null;
    client = null;
  }
}

/**
 * Get task queue for an application
 */
export function getTaskQueue(appCode) {
  return TEMPORAL_CONFIG.taskQueues[appCode.toUpperCase()] || 'default-workflows';
}

export { TEMPORAL_CONFIG };


