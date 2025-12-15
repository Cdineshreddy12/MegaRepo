import mongoose from 'mongoose';
//assignmentId ,tenantId,userId,roleId,entityId,assignedBy,assignedAt,expiresAt,isActive,metadata are fetched from the wrapper
//no ids are generated in the crmRoleAssignmentSchema
const crmRoleAssignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  // References with backward-compatible string fields
  // ObjectId fields are optional - use when we have MongoDB ObjectIds
  // String fields are used when we have external UUIDs
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    required: false, // Made optional to support UUID strings
    index: true
  },
  userIdString: {
    type: String,
    index: true, // For queries using external IDs (UUIDs)
    required: true // At least one of userId or userIdString must be provided
  },

  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmRole',
    required: false, // Made optional to support UUID strings
    index: true
  },
  roleIdString: {
    type: String,
    index: true, // For queries using external IDs (UUIDs)
    required: true // At least one of roleId or roleIdString must be provided
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false, // Made optional to support UUID strings
    index: true
  },
  entityIdString: {
    type: String,
    index: true, // For queries using external IDs (UUIDs)
    required: true // At least one of entityId or entityIdString must be provided
  },
  assignedBy: {
    type: String,
    required: true,
    index: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: true,
    sparse: true // Optional expiration
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
crmRoleAssignmentSchema.index({ tenantId: 1, userId: 1, entityId: 1 });
crmRoleAssignmentSchema.index({ tenantId: 1, roleId: 1, entityId: 1 });
crmRoleAssignmentSchema.index({ tenantId: 1, assignedBy: 1 });
crmRoleAssignmentSchema.index({ tenantId: 1, isActive: 1 });
crmRoleAssignmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound unique constraint (use string fields for business logic uniqueness)
crmRoleAssignmentSchema.index({
  tenantId: 1,
  userIdString: 1,
  roleIdString: 1,
  entityIdString: 1
}, {
  unique: true,
  partialFilterExpression: { isActive: true }
});

// Pre-save middleware to auto-generate assignmentId
crmRoleAssignmentSchema.pre('save', function(next) {
  if (this.isNew && !this.assignmentId) {
    this.assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Instance method to check if assignment is expired
crmRoleAssignmentSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Instance method to deactivate assignment
crmRoleAssignmentSchema.methods.deactivate = function(deactivatedBy) {
  this.isActive = false;
  this.metadata = {
    ...this.metadata,
    deactivatedAt: new Date(),
    deactivatedBy: deactivatedBy
  };
  return this.save();
};

export default mongoose.model('CrmRoleAssignment', crmRoleAssignmentSchema);
