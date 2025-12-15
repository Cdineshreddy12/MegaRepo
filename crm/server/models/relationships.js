// =============================================================================
// CRM RELATIONSHIPS IMPLEMENTATION
// Complex multi-tenant relationship system for hierarchical permissions & credits
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// RELATIONSHIP DEFINITIONS
// =============================================================================

// Tenant Relationships
const tenantRelationships = {
  // Get all users in this tenant
  getUsers: async function() {
    const CrmTenantUser = mongoose.model('CrmTenantUser');
    return await CrmTenantUser.find({ tenantId: this.tenantId });
  },

  // Get all entities (organizations) in this tenant
  getEntities: async function() {
    const Organization = mongoose.model('Organization');
    return await Organization.find({ tenantId: this.tenantId });
  },

  // Get all active credit configurations
  getCreditConfigs: async function() {
    const CrmCreditConfig = mongoose.model('CrmCreditConfig');
    return await CrmCreditConfig.find({
      tenantId: this.tenantId,
      isActive: true
    });
  },

  // Get total credit usage for this tenant
  getCreditUsageSummary: async function(startDate, endDate) {
    const CrmCreditUsage = mongoose.model('CrmCreditUsage');
    return await CrmCreditUsage.aggregate([
      {
        $match: {
          tenantId: this.tenantId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$creditsUsed' },
          operationsCount: { $sum: 1 }
        }
      }
    ]);
  },

  // Get tenant admin users
  getTenantAdmins: async function() {
    const CrmTenantUser = mongoose.model('CrmTenantUser');
    return await CrmTenantUser.find({
      tenantId: this.tenantId,
      isTenantAdmin: true
    });
  }
};

// Organization (Entity) Relationships
const organizationRelationships = {
  // Get parent organization
  getParent: async function() {
    if (!this.parentId) return null;
    const Organization = mongoose.model('Organization');
    return await Organization.findOne({
      tenantId: this.tenantId,
      orgCode: this.parentId
    });
  },

  // Get child organizations
  getChildren: async function() {
    const Organization = mongoose.model('Organization');
    return await Organization.find({
      tenantId: this.tenantId,
      parentId: this.orgCode
    });
  },

  // Get all descendant organizations (recursive)
  getDescendants: async function() {
    const Organization = mongoose.model('Organization');
    const descendants = [];
    const queue = [this.orgCode];

    while (queue.length > 0) {
      const currentCode = queue.shift();
      const children = await Organization.find({
        tenantId: this.tenantId,
        parentId: currentCode
      });

      for (const child of children) {
        descendants.push(child);
        queue.push(child.orgCode);
      }
    }

    return descendants;
  },

  // Get users assigned to this organization
  getAssignedUsers: async function(includeInactive = false) {
    const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');
    const query = {
      tenantId: this.tenantId,
      entityId: this.orgCode
    };

    if (!includeInactive) {
      query.isActive = true;
      query.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    const assignments = await EmployeeOrgAssignment.find(query).populate('userId');
    return assignments.map(assignment => assignment.userId).filter(Boolean);
  },

  // Get credit allocation for this entity
  getCreditAllocation: async function(targetApplication = 'crm') {
    const CrmEntityCredit = mongoose.model('CrmEntityCredit');
    return await CrmEntityCredit.findOne({
      tenantId: this.tenantId,
      entityId: this.orgCode,
      targetApplication: targetApplication,
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  },

  // Get responsible person for this organization
  getResponsiblePerson: async function() {
    const CrmTenantUser = mongoose.model('CrmTenantUser');
    // Find user who has this org as their primary organization
    return await CrmTenantUser.findOne({
      tenantId: this.tenantId,
      primaryOrganizationId: this.orgCode
    });
  }
};

// User Relationships
const userRelationships = {
  // Get user's tenant
  getTenant: async function() {
    const Tenant = mongoose.model('Tenant');
    return await Tenant.findOne({ tenantId: this.orgCode });
  },

  // Get user's primary organization
  getPrimaryOrganization: async function() {
    if (!this.primaryOrganizationId) return null;
    const Organization = mongoose.model('Organization');
    return await Organization.findOne({
      tenantId: this.orgCode,
      orgCode: this.primaryOrganizationId
    });
  },

  // Get all organization assignments for this user
  getOrganizationAssignments: async function(includeInactive = false) {
    const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');
    const query = {
      tenantId: this.orgCode,
      userId: this.externalId || this.employeeCode
    };

    if (!includeInactive) {
      query.isActive = true;
      query.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    return await EmployeeOrgAssignment.find(query);
  },

  // Get all role assignments for this user
  getRoleAssignments: async function(includeInactive = false) {
    const CrmRoleAssignment = mongoose.model('CrmRoleAssignment');
    const query = {
      tenantId: this.orgCode,
      userId: this.externalId || this.employeeCode
    };

    if (!includeInactive) {
      query.isActive = true;
      query.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    return await CrmRoleAssignment.find(query);
  },

  // Get effective permissions across all user's organizations
  getEffectivePermissions: async function() {
    const assignments = await this.getRoleAssignments();
    const permissions = new Set();

    for (const assignment of assignments) {
      // Get role details (you'd need to fetch from wrapper or cache)
      // For now, return assignment info
      permissions.add(`entity:${assignment.entityId}:role:${assignment.roleId}`);
    }

    return Array.from(permissions);
  },

  // Get credit usage summary for this user
  getCreditUsageSummary: async function(startDate, endDate) {
    const CrmCreditUsage = mongoose.model('CrmCreditUsage');
    return await CrmCreditUsage.aggregate([
      {
        $match: {
          tenantId: this.orgCode,
          userId: this.externalId || this.employeeCode,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$creditsUsed' },
          operationsCount: { $sum: 1 }
        }
      }
    ]);
  }
};

// Role Relationships
const roleRelationships = {
  // Get tenant for this role
  getTenant: async function() {
    const Tenant = mongoose.model('Tenant');
    // This assumes roles are global, but in your system they should be entity-scoped
    // You'd need to modify this based on your role schema
    return await Tenant.findOne({ tenantId: this.tenantId });
  },

  // Get users assigned to this role
  getAssignedUsers: async function() {
    const CrmRoleAssignment = mongoose.model('CrmRoleAssignment');
    const assignments = await CrmRoleAssignment.find({
      roleId: this.name, // Assuming role name is used as ID
      isActive: true
    });

    const userIds = assignments.map(a => a.userId);
    const User = mongoose.model('User');
    return await User.find({
      $or: [
        { externalId: { $in: userIds } },
        { employeeCode: { $in: userIds } }
      ]
    });
  }
};

// Activity Log Relationships
const activityLogRelationships = {
  // Get user who performed this action
  getUser: async function() {
    const User = mongoose.model('User');
    return await User.findOne({
      $or: [
        { externalId: this.userId },
        { employeeCode: this.userId }
      ]
    });
  },

  // Get organization context for this activity
  getOrganization: async function() {
    if (!this.orgCode) return null;
    const Organization = mongoose.model('Organization');
    return await Organization.findOne({
      orgCode: this.orgCode
    });
  },

  // Get tenant for this activity
  getTenant: async function() {
    const Tenant = mongoose.model('Tenant');
    return await Tenant.findOne({ tenantId: this.orgCode });
  }
};

// =============================================================================
// CREDIT SYSTEM RELATIONSHIPS
// =============================================================================

// Credit Usage Relationships
const creditUsageRelationships = {
  // Get user who consumed credits
  getUser: async function() {
    const User = mongoose.model('User');
    return await User.findOne({
      $or: [
        { externalId: this.userId },
        { employeeCode: this.userId }
      ]
    });
  },

  // Get organization context
  getOrganization: async function() {
    if (!this.entityId) return null;
    const Organization = mongoose.model('Organization');
    return await Organization.findOne({
      tenantId: this.tenantId,
      orgCode: this.entityId
    });
  },

  // Get credit configuration for this operation
  getCreditConfig: async function() {
    const CrmCreditConfig = mongoose.model('CrmCreditConfig');
    return await CrmCreditConfig.findOne({
      tenantId: this.tenantId,
      configName: this.operationType,
      isActive: true
    });
  }
};

// Entity Credit Relationships
const entityCreditRelationships = {
  // Get organization this credit is allocated to
  getOrganization: async function() {
    const Organization = mongoose.model('Organization');
    return await Organization.findOne({
      tenantId: this.tenantId,
      orgCode: this.entityId
    });
  },

  // Get tenant
  getTenant: async function() {
    const Tenant = mongoose.model('Tenant');
    return await Tenant.findOne({ tenantId: this.tenantId });
  },

  // Get user who allocated credits
  getAllocatedByUser: async function() {
    if (!this.allocatedBy) return null;
    const User = mongoose.model('User');
    return await User.findOne({
      $or: [
        { externalId: this.allocatedBy },
        { employeeCode: this.allocatedBy }
      ]
    });
  },

  // Check if credits can be consumed
  canConsumeCredits: function(amount) {
    return this.isActive &&
           this.availableCredits >= amount &&
           (!this.expiresAt || this.expiresAt > new Date());
  },

  // Consume credits with validation
  consumeCredits: async function(amount, operationDetails = {}) {
    if (!this.canConsumeCredits(amount)) {
      throw new Error('Insufficient credits or allocation inactive/expired');
    }

    this.usedCredits += amount;
    this.availableCredits = Math.max(0, this.allocatedCredits - this.usedCredits);

    // Log consumption in metadata
    this.metadata = {
      ...this.metadata,
      consumptionHistory: [
        ...(this.metadata.consumptionHistory || []),
        {
          amount,
          timestamp: new Date(),
          operationDetails
        }
      ]
    };

    return await this.save();
  }
};

// =============================================================================
// PERMISSION RESOLUTION SYSTEM
// =============================================================================

// Main permission resolution function
async function resolveUserPermissions(tenantId, userId) {
  try {
    const CrmRoleAssignment = mongoose.model('CrmRoleAssignment');
    const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

    // Single aggregation pipeline to get all permissions
    const permissionData = await CrmRoleAssignment.aggregate([
      {
        $match: {
          tenantId,
          userId,
          isActive: true,
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
          ]
        }
      },
      {
        $lookup: {
          from: 'crmroles',
          let: { roleId: '$roleId', tenantId: '$tenantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$roleId', '$$roleId'] },
                    { $eq: ['$tenantId', '$$tenantId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            }
          ],
          as: 'roleDetails'
        }
      },
      {
        $unwind: {
          path: '$roleDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$roleDetails.permissions',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          rolePermissions: { $addToSet: '$roleDetails.permissions' },
          entityIds: { $addToSet: '$entityId' }
        }
      },
      {
        $lookup: {
          from: 'employeeorgassignments',
          let: { entityIds: '$entityIds', tenantId: '$tenantId', userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$entityId', '$$entityIds'] },
                    { $eq: ['$tenantId', '$$tenantId'] },
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$isActive', true] },
                    {
                      $or: [
                        { $eq: ['$expiresAt', null] },
                        { $not: { $gt: ['$expiresAt', new Date()] } }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'orgAssignments'
        }
      },
      {
        $project: {
          _id: 0,
          allPermissions: {
            $concatArrays: [
              '$rolePermissions',
              {
                $map: {
                  input: '$orgAssignments',
                  as: 'org',
                  in: { $concat: ['entity:', '$$org.entityId', ':member'] }
                }
              }
            ]
          }
        }
      }
    ]);

    if (permissionData.length > 0) {
      // Filter out null/undefined permissions
      return permissionData[0].allPermissions.filter(p => p && typeof p === 'string');
    }

    return [];
  } catch (error) {
    console.log('⚠️ Failed to resolve user permissions with aggregation:', error.message);
    // Fallback to old method
    const [assignments, orgAssignments] = await Promise.all([
      getUserRoleAssignments(tenantId, userId),
      getUserOrganizationAssignments(tenantId, userId)
    ]);

    const permissions = new Set();

    // Process role assignments - get actual permissions from role definitions
    for (const assignment of assignments) {
      if (assignment.isActive && (!assignment.expiresAt || assignment.expiresAt > new Date())) {
        // Fetch the actual role to get its permissions
        const CrmRole = mongoose.model('CrmRole');
        const role = await CrmRole.findOne({
          tenantId,
          roleId: assignment.roleId,
          isActive: true
        });

        if (role && role.permissions) {
          // Add all permissions from this role
          role.permissions.forEach(permission => permissions.add(permission));
        }
      }
    }

    // Process organization assignments (membership permissions)
    for (const orgAssignment of orgAssignments) {
      if (orgAssignment.isActive && (!orgAssignment.expiresAt || orgAssignment.expiresAt > new Date())) {
        permissions.add(`entity:${orgAssignment.entityId}:member`);
      }
    }

    return Array.from(permissions);
  }
}

// Get user's role assignments
async function getUserRoleAssignments(tenantId, userId) {
  const CrmRoleAssignment = mongoose.model('CrmRoleAssignment');
  return await CrmRoleAssignment.find({
    tenantId,
    userId,
    isActive: true,
    $or: [
      { expiresAt: null }, // Handle null values
      { expiresAt: { $exists: false } }, // Handle missing field
      { expiresAt: { $gt: new Date() } } // Handle future dates
    ]
  });
}

// Get user's organization assignments
async function getUserOrganizationAssignments(tenantId, userId) {
  const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');
  return await EmployeeOrgAssignment.find({
    tenantId,
    userId,
    isActive: true,
    $or: [
      { expiresAt: null }, // Handle null values
      { expiresAt: { $exists: false } }, // Handle missing field
      { expiresAt: { $gt: new Date() } } // Handle future dates
    ]
  });
}

// Get inherited permissions from parent entities
async function getInheritedPermissions(tenantId, entityId, roleId) {
  const permissions = new Set();
  const Organization = mongoose.model('Organization');
  const CrmRole = mongoose.model('CrmRole');

  let currentEntity = await Organization.findOne({
    tenantId,
    orgCode: entityId
  });

  // Walk up the hierarchy
  while (currentEntity && currentEntity.parentId) {
    // Check if the same role exists in the parent entity
    // If inheritance is enabled for this role, get the permissions
    const parentRole = await CrmRole.findOne({
      tenantId,
      roleId: roleId, // Same role in parent entity
      isActive: true
    });

    if (parentRole && parentRole.permissions) {
      // Add permissions from the inherited role in parent entity
      parentRole.permissions.forEach(permission => {
        permissions.add(`${permission}:inherited_from:${currentEntity.parentId}`);
      });
    }

    currentEntity = await Organization.findOne({
      tenantId,
      orgCode: currentEntity.parentId
    });
  }

  return Array.from(permissions);
}

// =============================================================================
// CREDIT CHECKING SYSTEM
// =============================================================================

// Check if user has sufficient credits for an operation
async function checkUserCredits(tenantId, userId, operationType, requiredCredits) {
  const CrmCreditConfig = mongoose.model('CrmCreditConfig');
  const config = await CrmCreditConfig.getEffectiveConfig(operationType, tenantId);

  if (!config) {
    // No credit config means operation is free
    return { allowed: true, availableCredits: Infinity, requiredCredits: 0 };
  }

  // Use the actual credit cost from config
  const actualRequiredCredits = config.creditCost || requiredCredits;

  // Get user's organization assignments
  const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');
  const orgAssignments = await EmployeeOrgAssignment.find({
    tenantId,
    userId,
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  let totalAvailableCredits = 0;

  // Check credits in each assigned organization
  for (const assignment of orgAssignments) {
    const CrmEntityCredit = mongoose.model('CrmEntityCredit');
    const entityCredits = await CrmEntityCredit.findOne({
      tenantId,
      entityId: assignment.entityId,
      targetApplication: 'crm',
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (entityCredits && entityCredits.availableCredits > 0) {
      totalAvailableCredits += entityCredits.availableCredits;
    }
  }

  return {
    allowed: totalAvailableCredits >= actualRequiredCredits,
    availableCredits: totalAvailableCredits,
    requiredCredits: actualRequiredCredits
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  tenantRelationships,
  organizationRelationships,
  userRelationships,
  roleRelationships,
  activityLogRelationships,
  creditUsageRelationships,
  entityCreditRelationships,
  resolveUserPermissions,
  checkUserCredits
};
