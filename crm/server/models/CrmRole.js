import mongoose from 'mongoose';
//roleId,tenantId,roleName,permissions,priority,isActive,description are fetched from the wrapper
//no ids are generated in the crmRoleSchema
const crmRoleSchema = new mongoose.Schema({
  roleId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  roleName: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  // Complex permission structure storage
  permissionsStructure: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Restrictions (time/IP restrictions)
  restrictions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Metadata (tags, templates, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Soft delete fields
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: String,
    default: null
  },
  // Role transfer information
  transferredToRoleId: {
    type: String,
    default: null
  },
  // Audit fields
  createdBy: {
    type: String,
    default: null
  },
  updatedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
crmRoleSchema.index({ tenantId: 1, roleId: 1 }, { unique: true });
crmRoleSchema.index({ tenantId: 1, roleName: 1 });
crmRoleSchema.index({ tenantId: 1, isActive: 1 });
crmRoleSchema.index({ tenantId: 1, priority: -1 });

// Instance methods
crmRoleSchema.methods.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

crmRoleSchema.methods.getPermissionCount = function() {
  return this.permissions ? this.permissions.length : 0;
};

// Static methods
crmRoleSchema.statics.findActiveByTenant = function(tenantId) {
  return this.find({ tenantId, isActive: true }).sort({ priority: -1, roleName: 1 });
};

crmRoleSchema.statics.findByPermission = function(tenantId, permission) {
  return this.find({
    tenantId,
    isActive: true,
    permissions: permission
  });
};

export default mongoose.model('CrmRole', crmRoleSchema);
