import mongoose, { Schema, model } from 'mongoose';
//configId, tenantId, entityId, configName, operationCode, description, creditCost are fetched from the wrapper
//no ids are generated in the crmCreditConfigSchema
const crmCreditConfigSchema = new Schema({
  configId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    index: true
    // NOT required anymore - null for global configs
  },
  // Reference with backward-compatible string field
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
    sparse: true // Optional - for entity-specific overrides
  },
  entityIdString: {
    type: String,
    index: true,
    sparse: true // For queries using external IDs
  },
  configName: {
    type: String,
    required: true,
    trim: true,
  },
  operationCode: {
    type: String,
    required: true,
    trim: true,
    index: true // For efficient lookup by operation
  },
  description: {
    type: String,
    trim: true,
  },
  creditCost: {
    type: Number,
    required: true,
    min: 0
  },
  // Hierarchical configuration fields
  isGlobal: {
    type: Boolean,
    default: false,
    index: true
  },
  source: {
    type: String,
    enum: ['global', 'tenant', 'entity'],
    default: 'tenant',
    index: true
  },
  overridesGlobal: {
    type: Boolean,
    default: false,
    index: true
  },
  inheritedFrom: {
    type: String, // configId of global config if inherited
    sparse: true
  },
  // Sync metadata
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  syncSource: {
    type: String,
    enum: ['wrapper', 'manual', 'system'],
    default: 'wrapper'
  },
  unit: {
    type: String,
    default: 'operation',
    trim: true
  },
  moduleName: {
    type: String,
    trim: true,
    index: true
  },
  permissionName: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for hierarchical queries
crmCreditConfigSchema.index({ tenantId: 1, configId: 1 });
crmCreditConfigSchema.index({ tenantId: 1, operationCode: 1 });
crmCreditConfigSchema.index({ isGlobal: 1, operationCode: 1 });
crmCreditConfigSchema.index({ tenantId: 1, entityId: 1, operationCode: 1 });
crmCreditConfigSchema.index({ source: 1, isGlobal: 1 });

/**
 * Static method to get effective configuration for an operation
 * Implements hierarchical fallback: Tenant-specific → Global → Default
 * 
 * @param {string} operationCode - Operation code (e.g., 'crm.accounts.create')
 * @param {string} tenantId - Tenant ID
 * @param {string} entityId - Optional entity ID for entity-specific config
 * @returns {Promise<Object|null>} - Effective configuration or null
 */
crmCreditConfigSchema.statics.getEffectiveConfig = async function(operationCode, tenantId, entityId = null) {
  const CrmCreditConfig = this;
  
  console.log(`🔍 Looking up credit config for operation: ${operationCode}, tenant: ${tenantId}, entity: ${entityId || 'none'}`);
  
  // 1. Try entity-specific config first (if entityId provided)
  if (entityId) {
    const entityConfig = await CrmCreditConfig.findOne({
      operationCode,
      tenantId,
      entityIdString: entityId,
      source: 'entity'
    });
    if (entityConfig) {
      console.log(`✅ Using entity-specific config for ${operationCode}`);
      return entityConfig;
    }
    console.log(`⚠️ No entity-specific config found for ${operationCode} with entityId ${entityId}`);
  }
  
  // 2. Try tenant-specific config (more flexible query)
  // First try with overridesGlobal: true
  let tenantConfig = await CrmCreditConfig.findOne({
    operationCode,
    tenantId,
    $or: [
      { source: 'tenant' },
      { source: { $exists: false } } // Backward compatibility
    ],
    overridesGlobal: true
  });
  
  // If not found, try without overridesGlobal requirement
  if (!tenantConfig) {
    tenantConfig = await CrmCreditConfig.findOne({
      operationCode,
      tenantId,
      $or: [
        { source: 'tenant' },
        { source: { $exists: false } }, // Backward compatibility
        { isGlobal: false } // Not global means tenant-specific
      ],
      isGlobal: { $ne: true } // Explicitly not global
    });
  }
  
  // If still not found, try simplest query - just operationCode and tenantId
  if (!tenantConfig) {
    tenantConfig = await CrmCreditConfig.findOne({
      operationCode,
      tenantId,
      isGlobal: { $ne: true } // Not global
    });
  }
  
  // Final fallback: any config with operationCode and tenantId (most permissive)
  if (!tenantConfig) {
    tenantConfig = await CrmCreditConfig.findOne({
      operationCode,
      tenantId
    });
  }
  
  if (tenantConfig) {
    console.log(`✅ Using tenant-specific config for ${operationCode}`);
    return tenantConfig;
  }
  
  // 3. Fall back to global config (more flexible query)
  let globalConfig = await CrmCreditConfig.findOne({
    operationCode,
    $or: [
      { isGlobal: true },
      { source: 'global' },
      { tenantId: null }, // Global configs have null tenantId
      { tenantId: { $exists: false } } // Backward compatibility
    ]
  });
  
  // If still not found, try simplest query - just operationCode without tenantId
  if (!globalConfig) {
    globalConfig = await CrmCreditConfig.findOne({
      operationCode,
      $or: [
        { tenantId: null },
        { tenantId: { $exists: false } }
      ]
    });
  }
  
  if (globalConfig) {
    console.log(`✅ Using global config for ${operationCode}`);
    return globalConfig;
  }
  
  // Final fallback: Try to find ANY config with this operationCode (most permissive)
  // This handles cases where configs might have unexpected field values
  const anyConfig = await CrmCreditConfig.findOne({ operationCode });
  if (anyConfig) {
    console.log(`⚠️ Config exists for ${operationCode} but doesn't match lookup criteria:`, {
      configId: anyConfig.configId,
      tenantId: anyConfig.tenantId,
      requestedTenantId: tenantId,
      tenantIdMatch: anyConfig.tenantId === tenantId,
      isGlobal: anyConfig.isGlobal,
      source: anyConfig.source,
      overridesGlobal: anyConfig.overridesGlobal,
      entityIdString: anyConfig.entityIdString
    });
    
    // If tenantId matches, use it anyway (even if other fields don't match)
    if (anyConfig.tenantId === tenantId || !anyConfig.tenantId) {
      console.log(`✅ Using config anyway based on tenantId match or global config`);
      return anyConfig;
    }
    
    // Debug: List all configs with this operationCode to see what exists
    const allConfigsWithOpCode = await CrmCreditConfig.find({ operationCode }).lean().limit(10);
    console.log(`🔍 Found ${allConfigsWithOpCode.length} total config(s) with operationCode ${operationCode}:`, 
      allConfigsWithOpCode.map(c => ({
        configId: c.configId,
        tenantId: c.tenantId,
        isGlobal: c.isGlobal,
        source: c.source,
        creditCost: c.creditCost
      }))
    );
  } else {
    console.log(`⚠️ No config found for ${operationCode} - no config exists in database`);
    
    // Debug: Check if any configs exist for this tenant at all
    const tenantConfigsCount = await CrmCreditConfig.countDocuments({ tenantId });
    console.log(`🔍 Total configs for tenant ${tenantId}: ${tenantConfigsCount}`);
    
    // Debug: List a few configs from this tenant to see what operationCodes exist
    const sampleConfigs = await CrmCreditConfig.find({ tenantId }).select('operationCode configId creditCost').lean().limit(5);
    console.log(`🔍 Sample configs for tenant ${tenantId}:`, sampleConfigs);
  }
  
  return null;
};

/**
 * Static method to sync configurations from wrapper
 * Handles both global and tenant-specific configs
 * 
 * @param {Array} configs - Array of config objects from wrapper
 * @param {string} tenantId - Tenant ID for tenant-specific sync
 * @returns {Promise<Object>} - Sync result statistics
 */
crmCreditConfigSchema.statics.syncFromWrapper = async function(configs, tenantId) {
  const CrmCreditConfig = this;
  const stats = {
    total: configs.length,
    globalCreated: 0,
    globalUpdated: 0,
    tenantCreated: 0,
    tenantUpdated: 0,
    errors: []
  };
  
  for (const config of configs) {
    try {
      const isGlobal = config.isGlobal === true || config.source === 'global';
      const configData = {
        configId: config.configId,
        tenantId: isGlobal ? null : (config.tenantId || tenantId),
        // Don't set entityId (ObjectId) - only use entityIdString for UUIDs
        entityIdString: config.entityId || config.entityIdString || null,
        configName: config.configName,
        operationCode: config.operationCode,
        description: config.description || '',
        creditCost: config.creditCost,
        isGlobal: isGlobal,
        source: config.source || (isGlobal ? 'global' : 'tenant'),
        overridesGlobal: !isGlobal && config.tenantId !== null,
        unit: config.unit || 'operation',
        moduleName: config.moduleName || '',
        permissionName: config.permissionName || '',
        lastSyncedAt: new Date(),
        syncSource: 'wrapper'
      };
      
      const result = await CrmCreditConfig.findOneAndUpdate(
        { configId: config.configId },
        configData,
        { upsert: true, new: true }
      );
      
      if (result) {
        if (isGlobal) {
          stats.globalUpdated++;
        } else {
          stats.tenantUpdated++;
        }
      }
    } catch (error) {
      stats.errors.push({
        configId: config.configId,
        operationCode: config.operationCode,
        error: error.message
      });
    }
  }
  
  return stats;
};

export default model('CrmCreditConfig', crmCreditConfigSchema);
