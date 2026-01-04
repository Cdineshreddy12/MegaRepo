/**
 * Shared Temporal Configuration
 * Used by all applications (CRM, HR, wrapper, etc.)
 * 
 * Note: This uses a getter function to ensure process.env is read at access time
 * rather than at module load time, allowing dotenv.config() to run first.
 */

function getTemporalConfig() {
  return {
    // Connection settings
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    
    // Task queues per application
    taskQueues: {
      CRM: 'crm-workflows',
      HR: 'hr-workflows',
      WRAPPER: 'wrapper-workflows',
      FINANCE: 'finance-workflows',
      MARKETING: 'marketing-workflows',
      INVENTORY: 'inventory-workflows',
      PROJECTS: 'projects-workflows',
    },
    
    // Connection options
    connectionOptions: {
      connectTimeout: '10s',
      maxRetries: 3,
    },
    
    // Feature flag - read at access time
    enabled: process.env.TEMPORAL_ENABLED === 'true' || process.env.TEMPORAL_ENABLED === '1',
    
    // Auth sync feature flag - separate from general Temporal enabled
    useTemporalForAuth: process.env.USE_TEMPORAL_FOR_AUTH === 'true' || process.env.USE_TEMPORAL_FOR_AUTH === '1',
    
    // Auth sync timeout (default: 60 seconds)
    authTimeoutMs: parseInt(process.env.TEMPORAL_AUTH_TIMEOUT_MS || '60000', 10),
    
    // Tenant-based routing (optional: comma-separated tenant IDs)
    temporalTenants: process.env.TEMPORAL_TENANTS 
      ? process.env.TEMPORAL_TENANTS.split(',').map(t => t.trim())
      : [],
    
    // Sync method selection logic
    shouldUseTemporalForTenant: function(tenantId) {
      // If useTemporalForAuth is false, don't use Temporal
      if (!this.useTemporalForAuth) {
        return false;
      }
      
      // If temporalTenants is empty, use Temporal for all tenants
      if (this.temporalTenants.length === 0) {
        return true;
      }
      
      // Otherwise, only use Temporal for specified tenants
      return this.temporalTenants.includes(tenantId);
    }
  };
}

// Export as a getter object that reads from process.env at access time
export const TEMPORAL_CONFIG = new Proxy({}, {
  get(target, prop) {
    const config = getTemporalConfig();
    return config[prop];
  },
  ownKeys() {
    const config = getTemporalConfig();
    return Object.keys(config);
  },
  getOwnPropertyDescriptor(target, prop) {
    const config = getTemporalConfig();
    if (prop in config) {
      return {
        enumerable: true,
        configurable: true,
        value: config[prop],
      };
    }
  }
});

