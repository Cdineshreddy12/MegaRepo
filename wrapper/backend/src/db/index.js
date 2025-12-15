import { dbManager, getAppDb, getSystemDb, initializeDrizzleInstances } from './connection-manager.js';
import * as schema from './schema/index.js';
import 'dotenv/config';

// Initialize connection manager and drizzle instances
await dbManager.initialize();
const { appDb, systemDb } = initializeDrizzleInstances();

// Export connections for backward compatibility
export const db = appDb;  // Default to app connection (RLS enforced)
export const systemDbConnection = systemDb;  // System connection (RLS bypassed)

// Export dbManager for middleware usage
export { dbManager };

// Legacy exports for backward compatibility
export const sql = dbManager.getAppConnection();  // Default connection
export const systemSql = dbManager.getSystemConnection();  // System connection

// Create drizzle instance for backward compatibility
export { appDb as drizzle };

// Close connection helper
export const closeConnection = () => dbManager.closeAll();

// Health check helper
export const healthCheck = () => dbManager.healthCheck(); 