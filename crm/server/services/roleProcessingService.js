import mongoose from 'mongoose';

/**
 * Role Processing Service
 * Handles role creation, updates, and deletions with complex permission structures
 */
class RoleProcessingService {
  constructor() {
    this.CrmRole = null;
    this.CrmRoleAssignment = null;
    this.UserProfile = null;
    this.ActivityLog = null;
  }

  /**
   * Initialize the service with models
   */
  async initialize(models) {
    this.CrmRole = models.CrmRole;
    this.CrmRoleAssignment = models.CrmRoleAssignment;
    this.UserProfile = models.UserProfile;
    this.ActivityLog = models.ActivityLog;

    if (!this.CrmRole) {
      this.CrmRole = (await import('../models/CrmRole.js')).default;
    }
    if (!this.CrmRoleAssignment) {
      this.CrmRoleAssignment = (await import('../models/CrmRoleAssignment.js')).default;
    }
    if (!this.UserProfile) {
      this.UserProfile = (await import('../models/UserProfile.js')).default;
    }
    if (!this.ActivityLog) {
      this.ActivityLog = (await import('../models/ActivityLog.js')).default;
    }
  }

  /**
   * Process role creation
   * @param {Object} roleData - Role data from the event
   * @param {Object} context - Processing context
   * @returns {Promise<Object>} Processing result
   */
  async processRoleCreate(roleData, context = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Extract and normalize role data
      const normalizedData = this.normalizeRoleData(roleData);
      const {
        tenantId,
        roleId,
        roleName,
        description,
        permissions,
        permissionsStructure,
        restrictions,
        metadata,
        createdBy,
        priority
      } = normalizedData;

      console.log(`🔄 Processing role creation: ${roleName} (${roleId})`);

      // Validate required fields
      if (!tenantId || !roleId || !roleName) {
        throw new Error('Missing required fields: tenantId, roleId, roleName');
      }

      // Check if role already exists
      const existingRole = await this.CrmRole.findOne({
        tenantId,
        roleId
      }).session(session);

      if (existingRole) {
        console.log(`⚠️ Role ${roleId} already exists, updating instead`);
        return await this.processRoleUpdate({
          ...roleData,
          updatedBy: createdBy
        }, context);
      }

      // Process permissions into flat array for storage
      const flattenedPermissions = this.flattenPermissions(permissions);

      // Create the role with standardized permission structure
      const newRole = new this.CrmRole({
        roleId,
        tenantId,
        roleName,
        description: description || '',
        permissions: permissions, // Flat array for efficient querying
        permissionsStructure: permissionsStructure, // Nested structure for management
        restrictions: restrictions || {},
        metadata: metadata || {},
        priority: priority || 0,
        isActive: true,
        createdBy: createdBy || null
      });

      await newRole.save({ session });

      // Log the creation
      if (this.ActivityLog) {
        await this.logRoleActivity(
          tenantId,
          'role.created',
          roleId,
          createdBy || 'system',
          {
            roleName,
            permissions: flattenedPermissions,
            restrictions,
            metadata
          },
          session
        );
      }

      await session.commitTransaction();
      console.log(`✅ Role ${roleName} created successfully`);

      return {
        success: true,
        roleId,
        action: 'created',
        role: {
          roleId,
          roleName,
          description,
          permissions, // Use normalized permissions
          priority,
          isActive: true,
          createdBy,
          createdAt: newRole.createdAt,
          updatedAt: newRole.updatedAt
        }
      };

    } catch (error) {
      await session.abortTransaction();
      console.error(`❌ Role creation failed:`, error.message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process role update
   * @param {Object} roleData - Updated role data
   * @param {Object} context - Processing context
   * @returns {Promise<Object>} Processing result
   */
  async processRoleUpdate(roleData, context = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Extract and normalize role data
      const normalizedData = this.normalizeRoleData(roleData);
      const {
        tenantId,
        roleId,
        roleName,
        description,
        permissions,
        permissionsStructure,
        restrictions,
        metadata,
        updatedBy,
        priority
      } = normalizedData;

      console.log(`🔄 Processing role update: ${roleId}`);

      // Validate required fields
      if (!tenantId || !roleId) {
        throw new Error('Missing required fields: tenantId, roleId');
      }

      // Find existing role
      const existingRole = await this.CrmRole.findOne({
        tenantId,
        roleId
      }).session(session);

      if (!existingRole) {
        console.log(`⚠️ Role ${roleId} not found, creating instead`);
        return await this.processRoleCreate(roleData, context);
      }

      // Track changes for activity log
      const changes = {};
      if (roleName && roleName !== existingRole.roleName) {
        changes.roleName = { from: existingRole.roleName, to: roleName };
      }
      if (description !== undefined && description !== existingRole.description) {
        changes.description = { from: existingRole.description, to: description };
      }
      if (priority !== undefined && priority !== existingRole.priority) {
        changes.priority = { from: existingRole.priority, to: priority };
      }

      // Check for permission changes
      if (JSON.stringify(permissions.sort()) !== JSON.stringify(existingRole.permissions.sort())) {
        changes.permissions = { from: existingRole.permissions, to: permissions };
        changes.permissionsStructure = { from: existingRole.permissionsStructure, to: permissionsStructure };
      }

      // Check for restrictions changes
      if (JSON.stringify(restrictions) !== JSON.stringify(existingRole.restrictions || {})) {
        changes.restrictions = { from: existingRole.restrictions, to: restrictions };
      }

      // Update the role with only required fields
      const updateData = {};
      if (roleName !== undefined) updateData.roleName = roleName;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (permissions) updateData.permissions = permissions;
      if (permissionsStructure) updateData.permissionsStructure = permissionsStructure;
      if (restrictions !== undefined) updateData.restrictions = restrictions;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (updatedBy) updateData.updatedBy = updatedBy;

      updateData.updatedAt = new Date();

      await this.CrmRole.findOneAndUpdate(
        { tenantId, roleId },
        updateData,
        { session, new: true }
      );

      // Log the update
      if (this.ActivityLog && Object.keys(changes).length > 0) {
        await this.logRoleActivity(
          tenantId,
          'role.updated',
          roleId,
          updatedBy || 'system',
          changes,
          session
        );
      }

      await session.commitTransaction();
      console.log(`✅ Role ${roleId} updated successfully`);

      return {
        success: true,
        roleId,
        action: 'updated',
        changes: Object.keys(changes).length > 0 ? changes : null
      };

    } catch (error) {
      await session.abortTransaction();
      console.error(`❌ Role update failed:`, error.message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process role deletion (soft delete with optional transfer)
   * @param {Object} roleData - Role deletion data
   * @param {Object} context - Processing context
   * @returns {Promise<Object>} Processing result
   */
  async processRoleDelete(roleData, context = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Extract and normalize role data
      const normalizedData = this.normalizeRoleData(roleData);
      const {
        tenantId,
        roleId,
        deletedBy,
        transferredToRoleId,
        transferReason = 'Role deletion' // Default value for transferReason
      } = normalizedData;

      console.log(`🔄 Processing role deletion: ${roleId}`);

      // Validate required fields
      if (!tenantId || !roleId) {
        throw new Error('Missing required fields: tenantId, roleId');
      }

      // Find existing role
      const existingRole = await this.CrmRole.findOne({
        tenantId,
        roleId
      }).session(session);

      // Idempotent deletion: If role doesn't exist, treat as success
      if (!existingRole) {
        console.log(`⚠️ Role ${roleId} not found - treating as already deleted (idempotent)`);
        await session.commitTransaction();
        return { 
          success: true, 
          roleId, 
          action: 'not_found_already_deleted',
          affectedUsersCount: 0,
          deletedBy: deletedBy || 'system',
          deletedAt: new Date()
        };
      }

      if (!existingRole.isActive) {
        console.log(`⚠️ Role ${roleId} is already inactive`);
        await session.commitTransaction();
        return { 
          success: true, 
          roleId, 
          action: 'already_deleted',
          affectedUsersCount: 0,
          deletedBy: deletedBy || 'system',
          deletedAt: existingRole.deletedAt || new Date()
        };
      }

      // Count affected users before deletion
      const affectedUsersCount = await this.CrmRoleAssignment.countDocuments({
        tenantId,
        roleIdString: roleId,
        isActive: true
      }).session(session);

      // Handle role transfer if specified
      let transferResults = null;
      if (transferredToRoleId) {
        transferResults = await this.transferUsersToRole(
          tenantId,
          roleId,
          transferredToRoleId,
          deletedBy,
          session
        );
      }

      // Soft delete the role (mark as inactive)
      await this.CrmRole.findOneAndUpdate(
        { tenantId, roleId },
        {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: deletedBy || 'system',
          transferredToRoleId: transferredToRoleId || null,
          updatedBy: deletedBy || 'system',
          updatedAt: new Date()
        },
        { session }
      );

      // Deactivate all role assignments
      await this.CrmRoleAssignment.updateMany(
        {
          tenantId,
          roleIdString: roleId,
          isActive: true
        },
        {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: deletedBy || 'system',
          deactivationReason: 'role_deleted'
        },
        { session }
      );

      // Log the deletion
      if (this.ActivityLog) {
        await this.logRoleActivity(
          tenantId,
          'role.deleted',
          roleId,
          deletedBy || 'system',
          {
            affectedUsersCount,
            transferredToRoleId,
            transferReason,
            transferResults
          },
          session
        );
      }

      await session.commitTransaction();
      console.log(`✅ Role ${roleId} deleted successfully (affected ${affectedUsersCount} users)`);

      return {
        success: true,
        roleId,
        action: 'deleted',
        affectedUsersCount,
        transferredToRoleId,
        deletedBy,
        deletedAt: new Date()
      };

    } catch (error) {
      await session.abortTransaction();
      console.error(`❌ Role deletion failed:`, error.message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Transfer users from one role to another
   * @private
   */
  async transferUsersToRole(tenantId, fromRoleId, toRoleId, transferredBy, session) {
    try {
      console.log(`🔄 Transferring users from role ${fromRoleId} to ${toRoleId}`);

      // Verify target role exists and is active
      const targetRole = await this.CrmRole.findOne({
        tenantId,
        roleId: toRoleId,
        isActive: true
      }).session(session);

      if (!targetRole) {
        throw new Error(`Target role ${toRoleId} not found or inactive`);
      }

      // Find all active assignments for the source role
      const assignments = await this.CrmRoleAssignment.find({
        tenantId,
        roleIdString: fromRoleId,
        isActive: true
      }).session(session);

      let transferredCount = 0;
      let failedCount = 0;

      for (const assignment of assignments) {
        try {
          // Create new assignment for target role
          const newAssignmentId = `${assignment.userIdString}_${toRoleId}_${Date.now()}`;

          const newAssignment = new this.CrmRoleAssignment({
            tenantId,
            assignmentId: newAssignmentId,
            userIdString: assignment.userIdString,
            roleIdString: toRoleId,
            entityIdString: assignment.entityIdString,
            isActive: true,
            assignedAt: new Date(),
            expiresAt: null,
            assignedByString: transferredBy || 'system',
            transferReason: 'role_deletion_transfer',
            originalAssignmentId: assignment.assignmentId
          });

          await newAssignment.save({ session });

          // Deactivate old assignment
          assignment.isActive = false;
          assignment.deactivatedAt = new Date();
          assignment.deactivatedBy = transferredBy || 'system';
          assignment.deactivationReason = 'transferred_to_new_role';
          assignment.transferredToAssignmentId = newAssignmentId;

          await assignment.save({ session });

          transferredCount++;
        } catch (error) {
          console.error(`❌ Failed to transfer user ${assignment.userIdString}:`, error.message);
          failedCount++;
        }
      }

      console.log(`✅ Transferred ${transferredCount} users, ${failedCount} failed`);

      return {
        transferredCount,
        failedCount,
        targetRoleId: toRoleId,
        targetRoleName: targetRole.roleName
      };

    } catch (error) {
      console.error(`❌ User transfer failed:`, error.message);
      throw error;
    }
  }

  /**
   * Normalize role data from different event formats
   * @private
   */
  normalizeRoleData(roleData) {
    const normalized = {
      tenantId: roleData.tenantId,
      roleId: roleData.roleId,
      roleName: roleData.roleName || 'Unnamed Role',
      description: roleData.description || '',
      priority: roleData.priority || 0,
      isActive: roleData.isActive !== false, // Default to true unless explicitly false
      createdBy: roleData.createdBy || null,
      updatedBy: roleData.updatedBy || null,
      deletedBy: roleData.deletedBy || null,
      transferredToRoleId: roleData.transferredToRoleId || null,
      metadata: roleData.metadata || {},
      permissionsStructure: roleData.permissionsStructure || {},
      restrictions: {},
      permissions: [],
      transferReason: roleData.transferReason || 'Role deletion'
    };

    // Handle permissions - standardize to nested structure format
    let permissionsStructure = {};

    if (roleData.permissionsStructure && typeof roleData.permissionsStructure === 'object' && Object.keys(roleData.permissionsStructure).length > 0) {
      // New format: already has nested structure
      permissionsStructure = roleData.permissionsStructure;
    } else if (roleData.permissions && Array.isArray(roleData.permissions) && roleData.permissions.length > 0) {
      // Old format: convert flat permissions array to nested structure
      permissionsStructure = this.convertFlatPermissionsToStructure(roleData.permissions);
    } else if (roleData.permissions && typeof roleData.permissions === 'object' && !Array.isArray(roleData.permissions)) {
      // permissions is the nested structure itself
      permissionsStructure = roleData.permissions;
    }

    // Always set both flattened permissions and nested structure
    normalized.permissions = this.flattenPermissions(permissionsStructure);
    normalized.permissionsStructure = permissionsStructure;

    // Handle restrictions - can be JSON string or object
    if (roleData.restrictions) {
      if (typeof roleData.restrictions === 'string') {
        try {
          normalized.restrictions = JSON.parse(roleData.restrictions);
        } catch (error) {
          console.warn('Failed to parse restrictions JSON:', error.message);
          normalized.restrictions = {};
        }
      } else if (typeof roleData.restrictions === 'object') {
        normalized.restrictions = roleData.restrictions;
      }
    }

    // Handle soft delete fields
    if (roleData.deletedAt) {
      normalized.deletedAt = roleData.deletedAt;
      normalized.deletedBy = roleData.deletedBy || null;
    }

    if (roleData.transferredToRoleId) {
      normalized.transferredToRoleId = roleData.transferredToRoleId;
    }

    return normalized;
  }

  /**
   * Convert flat permissions array to nested structure
   * @private
   */
  convertFlatPermissionsToStructure(flatPermissions) {
    const structure = {};

    if (!Array.isArray(flatPermissions)) {
      return structure;
    }

    flatPermissions.forEach(permission => {
      if (typeof permission === 'string') {
        const parts = permission.split('.');
        if (parts.length >= 2) {
          const module = parts[0];
          const resource = parts[1];
          const action = parts.slice(2).join('.') || resource; // Handle cases like "crm.leads.read" vs "system.users.read"

          if (!structure[module]) {
            structure[module] = {};
          }

          if (!structure[module][resource]) {
            structure[module][resource] = [];
          }

          // Avoid duplicates
          if (!structure[module][resource].includes(action)) {
            structure[module][resource].push(action);
          }
        }
      }
    });

    return structure;
  }

  /**
   * Flatten complex permission structure into array of permission strings
   * @private
   */
  flattenPermissions(permissions) {
    const flattened = [];

    if (!permissions) return flattened;

    // Handle both object and array formats
    if (Array.isArray(permissions)) {
      return permissions;
    }

    // Handle complex permission structure - supports multiple formats
    for (const [module, config] of Object.entries(permissions)) {
      if (typeof config === 'object' && config !== null) {
        // Check if this is the new nested format: { module: { resource: [operations] } }
        const hasNestedResources = Object.values(config).some(value =>
          Array.isArray(value) && value.every(item => typeof item === 'string')
        );

        if (hasNestedResources) {
          // New format: { crm: { accounts: ['read', 'create'], contacts: ['read'] } }
          for (const [resource, operations] of Object.entries(config)) {
            if (Array.isArray(operations)) {
              operations.forEach(operation => {
                flattened.push(`${module}.${resource}.${operation}`);
              });
            }
          }
        } else {
          // Old format: { module: { level, operations, scope } }
          const { level, operations, scope } = config;

          // Add module-level permission
          if (level) {
            flattened.push(`${module}.${level}`);
          }

          // Add specific operations
          if (operations && Array.isArray(operations)) {
            operations.forEach(operation => {
              flattened.push(`${module}.${operation}`);
            });
          }

          // Add scope-specific permissions
          if (scope) {
            flattened.push(`${module}.scope.${scope}`);
          }
        }
      } else if (typeof config === 'string') {
        // Simple string permission
        flattened.push(`${module}.${config}`);
      }
    }

    return [...new Set(flattened)]; // Remove duplicates
  }

  /**
   * Log role-related activity
   * @private
   */
  async logRoleActivity(tenantId, action, roleId, performedBy, details, session) {
    try {
      const activityLog = new this.ActivityLog({
        userId: performedBy,
        action,
        entityType: 'role',
        entityId: roleId,
        orgCode: tenantId, // Use tenantId as orgCode for roles
        details,
        tenantId
      });

      await activityLog.save({ session });
    } catch (error) {
      console.warn(`⚠️ Failed to log role activity:`, error.message);
    }
  }

  /**
   * Get all roles for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of roles
   */
  async getRoles(tenantId, options = {}) {
    try {
      const {
        includeInactive = false,
        roleId = null,
        limit = 50,
        skip = 0,
        sortBy = 'roleName',
        sortOrder = 1
      } = options;

      const query = { tenantId };
      if (!includeInactive) {
        query.isActive = true;
      }
      if (roleId) {
        query.roleId = roleId;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;

      const roles = await this.CrmRole.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip(skip)
        .select('-__v') // Exclude version field
        .lean();

      return roles;
    } catch (error) {
      console.error('Failed to get roles:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific role by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} roleId - Role ID
   * @returns {Promise<Object|null>} Role object or null
   */
  async getRoleById(tenantId, roleId) {
    try {
      const role = await this.CrmRole.findOne({
        tenantId,
        roleId
      })
        .select('-__v')
        .lean();

      return role;
    } catch (error) {
      console.error('Failed to get role by ID:', error.message);
      throw error;
    }
  }

  /**
   * Get roles by user ID (roles assigned to a user)
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of roles assigned to the user
   */
  async getUserRoles(tenantId, userId) {
    try {
      // First get the role assignments for this user
      const assignments = await this.CrmRoleAssignment.find({
        tenantId,
        userIdString: userId,
        isActive: true
      }).select('roleIdString').lean();

      if (assignments.length === 0) {
        return [];
      }

      // Get the actual role details
      const roleIds = assignments.map(assignment => assignment.roleIdString);
      const roles = await this.CrmRole.find({
        tenantId,
        roleId: { $in: roleIds },
        isActive: true
      })
        .select('-__v')
        .lean();

      return roles;
    } catch (error) {
      console.error('Failed to get user roles:', error.message);
      throw error;
    }
  }

  /**
   * Get role processing statistics
   */
  async getRoleStats(tenantId) {
    try {
      const [
        totalRoles,
        activeRoles,
        inactiveRoles,
        totalAssignments,
        activeAssignments
      ] = await Promise.all([
        this.CrmRole.countDocuments({ tenantId }),
        this.CrmRole.countDocuments({ tenantId, isActive: true }),
        this.CrmRole.countDocuments({ tenantId, isActive: false }),
        this.CrmRoleAssignment.countDocuments({ tenantId }),
        this.CrmRoleAssignment.countDocuments({ tenantId, isActive: true })
      ]);

      return {
        totalRoles,
        activeRoles,
        inactiveRoles,
        totalAssignments,
        activeAssignments,
        tenantId
      };
    } catch (error) {
      console.error('Failed to get role stats:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const roleProcessingService = new RoleProcessingService();
export default roleProcessingService;
