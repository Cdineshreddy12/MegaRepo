import mongoose from 'mongoose';
import roleProcessingService from '../services/roleProcessingService.js';

/**
 * Role Controller
 * Handles role management operations including CRUD and queries
 */

/**
 * Get all roles for a tenant
 * GET /api/roles
 */
export const getRoles = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const {
      includeInactive = false,
      roleId,
      limit = 50,
      skip = 0,
      sortBy = 'roleName',
      sortOrder = 1
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    await roleProcessingService.initialize({
      CrmRole: (await import('../models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('../models/UserProfile.js')).default,
      ActivityLog: (await import('../models/ActivityLog.js')).default
    });

    const options = {
      includeInactive: includeInactive === 'true',
      roleId,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
      sortOrder: parseInt(sortOrder)
    };

    const roles = await roleProcessingService.getRoles(tenantId, options);

    res.json({
      success: true,
      data: roles,
      count: roles.length,
      pagination: {
        limit: options.limit,
        skip: options.skip,
        hasMore: roles.length === options.limit
      }
    });

  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
};

/**
 * Get a specific role by ID
 * GET /api/roles/:roleId
 */
export const getRoleById = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const { roleId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
    }

    await roleProcessingService.initialize({
      CrmRole: (await import('../models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('../models/UserProfile.js')).default,
      ActivityLog: (await import('../models/ActivityLog.js')).default
    });

    const role = await roleProcessingService.getRoleById(tenantId, roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.json({
      success: true,
      data: role
    });

  } catch (error) {
    console.error('Error getting role by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role',
      error: error.message
    });
  }
};

/**
 * Get roles assigned to a specific user
 * GET /api/roles/user/:userId
 */
export const getUserRoles = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const { userId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await roleProcessingService.initialize({
      CrmRole: (await import('../models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('../models/UserProfile.js')).default,
      ActivityLog: (await import('../models/ActivityLog.js')).default
    });

    const roles = await roleProcessingService.getUserRoles(tenantId, userId);

    res.json({
      success: true,
      data: roles,
      count: roles.length
    });

  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user roles',
      error: error.message
    });
  }
};

/**
 * Get current user's roles
 * GET /api/roles/my-roles
 */
export const getMyRoles = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.userId || req.user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and User ID are required'
      });
    }

    await roleProcessingService.initialize({
      CrmRole: (await import('../models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('../models/UserProfile.js')).default,
      ActivityLog: (await import('../models/ActivityLog.js')).default
    });

    const roles = await roleProcessingService.getUserRoles(tenantId, userId);

    res.json({
      success: true,
      data: roles,
      count: roles.length
    });

  } catch (error) {
    console.error('Error getting my roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your roles',
      error: error.message
    });
  }
};

/**
 * Get role statistics for a tenant
 * GET /api/roles/stats
 */
export const getRoleStats = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    await roleProcessingService.initialize({
      CrmRole: (await import('../models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('../models/UserProfile.js')).default,
      ActivityLog: (await import('../models/ActivityLog.js')).default
    });

    const stats = await roleProcessingService.getRoleStats(tenantId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting role stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role statistics',
      error: error.message
    });
  }
};

/**
 * Migrate role permissions to standardized structure
 * POST /api/roles/migrate-permissions
 */
export const migrateRolePermissions = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    await roleProcessingService.initialize({
      CrmRole: (await import('../models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('../models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('../models/UserProfile.js')).default,
      ActivityLog: (await import('../models/ActivityLog.js')).default
    });

    const CrmRole = (await import('../models/CrmRole.js')).default;

    // Find all roles for this tenant that need migration
    const rolesToMigrate = await CrmRole.find({
      tenantId,
      $or: [
        { permissionsStructure: { $exists: false } },
        { permissionsStructure: {} },
        { permissionsStructure: null },
        { permissionsStructure: { $size: 0 } }
      ],
      permissions: { $exists: true, $ne: [] }
    });

    console.log(`📊 Found ${rolesToMigrate.length} roles that need migration for tenant ${tenantId}`);

    let migratedCount = 0;
    let errorCount = 0;
    const migratedRoles = [];

    for (const role of rolesToMigrate) {
      try {
        console.log(`🔄 Migrating role: ${role.roleName} (${role.roleId})`);

        // Create normalized data from existing role
        const normalizedData = roleProcessingService.normalizeRoleData({
          ...role.toObject(),
          permissions: role.permissions,
          permissionsStructure: role.permissionsStructure || {}
        });

        // Update the role with standardized structure
        await CrmRole.findByIdAndUpdate(role._id, {
          permissions: normalizedData.permissions,
          permissionsStructure: normalizedData.permissionsStructure,
          restrictions: normalizedData.restrictions,
          metadata: normalizedData.metadata,
          updatedAt: new Date()
        });

        migratedRoles.push({
          roleId: role.roleId,
          roleName: role.roleName,
          permissionsCount: normalizedData.permissions.length,
          modulesCount: Object.keys(normalizedData.permissionsStructure).length
        });

        console.log(`✅ Migrated: ${normalizedData.permissions.length} permissions → nested structure`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Failed to migrate role ${role.roleId}:`, error.message);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Migration completed for tenant ${tenantId}`,
      data: {
        totalRolesFound: rolesToMigrate.length,
        successfullyMigrated: migratedCount,
        failedMigrations: errorCount,
        migratedRoles
      }
    });

  } catch (error) {
    console.error('Error migrating role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate role permissions',
      error: error.message
    });
  }
};
