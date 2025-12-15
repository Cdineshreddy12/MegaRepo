import mongoose from 'mongoose';
//assignmentId ,tenantId,userId,entityId,assignmentType,isActive,assignedAt,expiresAt,assignedBy,deactivatedAt,deactivatedBy,priority,metadata are fetched from the wrapper
//no ids are generated in the employeeOrgAssignmentSchema
const employeeOrgAssignmentSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    required: true,
    index: true
  },
  userIdString: {
    type: String,
    index: true // For queries using external IDs
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  entityIdString: {
    type: String,
    index: true // For queries using external IDs
  },
  assignmentType: {
    type: String,
    required: true,
    default: 'primary'
  },
  isActive: {
    type: Boolean,
    default: true,
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
  assignedBy: {
    type: String,
    required: true,
    index: true
  },
  deactivatedAt: {
    type: Date,
    index: true,
    sparse: true
  },
  deactivatedBy: {
    type: String,
    index: true,
    sparse: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10 // Higher number = higher priority
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
employeeOrgAssignmentSchema.index({ tenantId: 1, userId: 1, entityId: 1 });
employeeOrgAssignmentSchema.index({ tenantId: 1, userId: 1, isActive: 1 });
employeeOrgAssignmentSchema.index({ tenantId: 1, entityId: 1, isActive: 1 });
employeeOrgAssignmentSchema.index({ tenantId: 1, assignedBy: 1 });
employeeOrgAssignmentSchema.index({ tenantId: 1, assignmentType: 1 });
employeeOrgAssignmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
employeeOrgAssignmentSchema.index({ deactivatedAt: 1 });

// Compound unique constraint for active assignments (use string fields for business logic uniqueness)
employeeOrgAssignmentSchema.index({
  tenantId: 1,
  userIdString: 1,
  entityIdString: 1
}, {
  unique: true,
  partialFilterExpression: { isActive: true }
});

// Pre-save middleware to auto-generate assignmentId
employeeOrgAssignmentSchema.pre('save', function(next) {
  if (this.isNew && !this.assignmentId) {
    this.assignmentId = `emp_org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Instance method to check if assignment is expired
employeeOrgAssignmentSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Instance method to deactivate assignment
employeeOrgAssignmentSchema.methods.deactivate = function(deactivatedBy) {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.deactivatedBy = deactivatedBy;

  this.metadata = {
    ...this.metadata,
    deactivationReason: 'manual_deactivation',
    deactivatedAt: this.deactivatedAt
  };

  return this.save();
};

// Instance method to extend assignment
employeeOrgAssignmentSchema.methods.extend = function(newExpiryDate, extendedBy) {
  this.expiresAt = newExpiryDate;

  this.metadata = {
    ...this.metadata,
    extensions: [
      ...(this.metadata.extensions || []),
      {
        extendedAt: new Date(),
        extendedBy: extendedBy,
        newExpiryDate: newExpiryDate
      }
    ]
  };

  return this.save();
};

// Static method to get user's active assignments
employeeOrgAssignmentSchema.statics.getUserActiveAssignments = function(tenantId, userId) {
  return this.find({
    tenantId: tenantId,
    userId: userId,
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, assignedAt: 1 });
};

// Static method to get entity members
employeeOrgAssignmentSchema.statics.getEntityMembers = function(tenantId, entityId, includeInactive = false) {
  const query = {
    tenantId: tenantId,
    entityId: entityId
  };

  if (!includeInactive) {
    query.isActive = true;
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];
  }

  return this.find(query)
    .populate('userId', 'firstName lastName email')
    .sort({ priority: -1, assignedAt: 1 });
};

export default mongoose.model('EmployeeOrgAssignment', employeeOrgAssignmentSchema);
