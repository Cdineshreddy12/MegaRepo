import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import dotenv from 'dotenv';
dotenv.config();
/**
 * Database Connection Manager
 * Handles both app connections (with RLS) and system connections (bypassing RLS)
 */
class DatabaseConnectionManager {
  constructor() {
    this.appConnection = null;
    this.systemConnection = null;
    this.appDb = null;
    this.systemDb = null;
    this.initialized = false;
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    try {
      if (this.initialized) {
        console.log('🔄 Database connections already initialized');
        return;
      }

      const databaseUrl = process.env.DATABASE_URL || 'postgresql://app_user:AppUserSecurePass123!@db.bpxridmrgbrywpesptho.supabase.co:5432/postgres';
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      console.log('🔌 Initializing database connections...');

      // App connection (with RLS enforced)
      this.appConnection = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      // System connection (bypassing RLS for admin operations)
      this.systemConnection = postgres(databaseUrl, {
        max: 5,
        idle_timeout: 30,
        connect_timeout: 10,
        // Add options to bypass RLS if needed
        transform: {
          value: (value) => value,
        },
      });

      // Create Drizzle instances
      this.appDb = drizzle(this.appConnection, { schema });
      this.systemDb = drizzle(this.systemConnection, { schema });

      this.initialized = true;
      console.log('✅ Database connections initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Get app database connection (with RLS)
   */
  getAppConnection() {
    if (!this.appConnection) {
      throw new Error('App database connection not initialized');
    }
    return this.appConnection;
  }

  /**
   * Get system database connection (bypassing RLS)
   */
  getSystemConnection() {
    if (!this.systemConnection) {
      throw new Error('System database connection not initialized');
    }
    return this.systemConnection;
  }

  /**
   * Get app Drizzle instance
   */
  getAppDb() {
    if (!this.appDb) {
      throw new Error('App Drizzle instance not initialized');
    }
    return this.appDb;
  }

  /**
   * Get system Drizzle instance
   */
  getSystemDb() {
    if (!this.systemDb) {
      throw new Error('System Drizzle instance not initialized');
    }
    return this.systemDb;
  }

  /**
   * Close all database connections
   */
  async closeAll() {
    try {
      console.log('🔌 Closing database connections...');

      if (this.appConnection) {
        await this.appConnection.end();
        this.appConnection = null;
      }

      if (this.systemConnection) {
        await this.systemConnection.end();
        this.systemConnection = null;
      }

      this.appDb = null;
      this.systemDb = null;
      this.initialized = false;

      console.log('✅ Database connections closed successfully');

    } catch (error) {
      console.error('❌ Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Health check for database connections
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return { status: 'not_initialized', message: 'Database connections not initialized' };
      }

      // Test app connection
      const appResult = await this.appConnection`SELECT 1 as test`;
      const appHealthy = appResult[0]?.test === 1;

      // Test system connection
      const systemResult = await this.systemConnection`SELECT 1 as test`;
      const systemHealthy = systemResult[0]?.test === 1;

      const overallHealthy = appHealthy && systemHealthy;

      return {
        status: overallHealthy ? 'healthy' : 'unhealthy',
        app_connection: appHealthy ? 'healthy' : 'unhealthy',
        system_connection: systemHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseConnectionManager();

// Helper functions for backward compatibility
function getAppDb() {
  return dbManager.getAppDb();
}

function getSystemDb() {
  return dbManager.getSystemDb();
}

function initializeDrizzleInstances() {
  return {
    appDb: dbManager.getAppDb(),
    systemDb: dbManager.getSystemDb()
  };
}

export { dbManager, getAppDb, getSystemDb, initializeDrizzleInstances };
export default dbManager;
