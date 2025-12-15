import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  subscription: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Import relationships
import { tenantRelationships } from './relationships.js';

// Add relationship methods to tenant schema
tenantSchema.methods.getUsers = tenantRelationships.getUsers;
tenantSchema.methods.getEntities = tenantRelationships.getEntities;
tenantSchema.methods.getCreditConfigs = tenantRelationships.getCreditConfigs;
tenantSchema.methods.getCreditUsageSummary = tenantRelationships.getCreditUsageSummary;
tenantSchema.methods.getTenantAdmins = tenantRelationships.getTenantAdmins;

// Get root organization info (derived from Organization collection)
tenantSchema.methods.getRootOrganization = async function() {
  const Organization = mongoose.model('Organization');
  return await Organization.findOne({
    tenantId: this.tenantId,
    orgCode: this.tenantId // Root org has same code as tenant
  }).populate('parentId'); // Populate parent if it exists
};

// Indexes
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ status: 1 });

export default mongoose.model('Tenant', tenantSchema);
