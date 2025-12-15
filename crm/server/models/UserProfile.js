import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  kindeUserId: {
    type: String,
    index: true,
    sparse: true // Optional field for Kinde integration
  },
  employeeCode: {
    type: String,
    trim: true,
    index: true
  },
  personalInfo: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    }
  },
  // Organization data is now derived from organizationAssignments references
  // Removed direct organization storage to avoid redundancy
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivityAt: {
      type: Date,
      default: null
    }
  },
  // References to separate collections
  roleAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmRoleAssignment'
  }],

  // References to organization assignments
  organizationAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeOrgAssignment'
  }],
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
userProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
userProfileSchema.index({ tenantId: 1, 'status.isActive': 1 });
userProfileSchema.index({ tenantId: 1, employeeCode: 1 });

// Instance method to get primary organization assignment
userProfileSchema.methods.getPrimaryOrganization = async function() {
  const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

  // Try resolved assignments first
  let assignment = await EmployeeOrgAssignment.findOne({
    userId: this._id,
    isActive: true,
    assignmentType: 'primary'
  }).populate('entityId', 'orgCode orgName hierarchy');

  if (!assignment) {
    // Fallback to string-based search for unresolved assignments
    assignment = await EmployeeOrgAssignment.findOne({
      userIdString: this.userId,
      isActive: true,
      assignmentType: 'primary'
    });

    // For unresolved assignments, try to find the organization by orgCode
    if (assignment && assignment.entityIdString) {
      const Organization = mongoose.model('Organization');
      assignment.entityId = await Organization.findOne({
        tenantId: this.tenantId,
        orgCode: assignment.entityIdString
      }).select('orgCode orgName hierarchy');
    }
  }

  return assignment?.entityId || null;
};

// Instance method to get all organization assignments
userProfileSchema.methods.getOrganizationAssignments = async function(includeInactive = false) {
  const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

  // Get resolved assignments
  const resolvedAssignments = await EmployeeOrgAssignment.find({
    userId: this._id,
    ...(includeInactive ? {} : { isActive: true })
  }).populate('entityId', 'orgCode orgName hierarchy');

  // Get unresolved assignments (those without ObjectId references)
  const unresolvedAssignments = await EmployeeOrgAssignment.find({
    userIdString: this.userId,
    userId: null, // Only unresolved ones
    ...(includeInactive ? {} : { isActive: true })
  }).populate({
    path: 'entityId',
    match: { orgCode: { $exists: true } },
    select: 'orgCode orgName hierarchy'
  });

  // Combine and sort
  const allAssignments = [...resolvedAssignments, ...unresolvedAssignments];
  return allAssignments.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(a.assignedAt) - new Date(b.assignedAt);
  });
};

// Instance method to get credits allocated by this user
userProfileSchema.methods.getAllocatedCredits = async function(includeInactive = false) {
  const CrmEntityCredit = mongoose.model('CrmEntityCredit');
  const query = {
    allocatedBy: this._id,
    ...(includeInactive ? {} : { isActive: true })
  };

  return await CrmEntityCredit.find(query)
    .populate('entityId', 'orgCode orgName')
    .sort({ allocatedAt: -1 });
};

export default mongoose.model('UserProfile', userProfileSchema);
