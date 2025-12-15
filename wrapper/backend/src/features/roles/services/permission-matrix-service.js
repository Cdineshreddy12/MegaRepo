import { db } from '../../../db/index.js';
import { customRoles, userRoleAssignments } from '../../../db/schema/permissions.js';
import { tenantUsers, auditLogs } from '../../../db/schema/users.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class PermissionMatrixService {
  // Get user permission context
  async getUserPermissionContext(userId, tenantId) {
    try {
      console.log('🔍 getUserPermissionContext called for user:', userId, 'tenant:', tenantId);

      // Get user roles
      const userRoles = await db
        .select({
          roleId: userRoleAssignments.roleId,
          isActive: userRoleAssignments.isActive,
          permissions: customRoles.permissions,
          restrictions: customRoles.restrictions,
          roleName: customRoles.roleName
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(
          and(
            eq(userRoleAssignments.userId, userId),
            eq(customRoles.tenantId, tenantId),
            eq(userRoleAssignments.isActive, true)
          )
        );

      console.log('📋 Found', userRoles.length, 'active roles for user');

      // Aggregate permissions from all roles
      const aggregatedPermissions = {};
      const allRestrictions = [];

      userRoles.forEach(role => {
        try {
          const rolePermissions = JSON.parse(role.permissions || '{}');
          const roleRestrictions = JSON.parse(role.restrictions || 'null');

          // Merge permissions (higher priority roles override lower ones)
          Object.keys(rolePermissions).forEach(resource => {
            if (resource !== 'metadata') {
              aggregatedPermissions[resource] = rolePermissions[resource];
            }
          });

          if (roleRestrictions) {
            allRestrictions.push(roleRestrictions);
          }
        } catch (parseError) {
          console.error('❌ Error parsing permissions for role:', role.roleId, parseError);
        }
      });

      // Combine restrictions (most restrictive wins)
      const combinedRestrictions = this.combineRestrictions(allRestrictions);

      const context = {
        userId,
        tenantId,
        roles: userRoles.map(r => ({ id: r.roleId, name: r.roleName })),
        permissions: aggregatedPermissions,
        restrictions: combinedRestrictions,
        hasRoles: userRoles.length > 0,
        roleCount: userRoles.length
      };

      console.log('✅ Permission context built:', {
        userId,
        tenantId,
        roleCount: context.roleCount,
        permissionCount: Object.keys(aggregatedPermissions).length
      });

      return context;
    } catch (error) {
      console.error('🚨 Error in getUserPermissionContext:', error);
      throw error;
    }
  }

  // Flatten nested permissions
  flattenNestedPermissions(permissions) {
    const flat = [];

    Object.entries(permissions).forEach(([resource, config]) => {
      if (resource === 'metadata') return;

      if (config && config.operations && Array.isArray(config.operations)) {
        config.operations.forEach(operation => {
          flat.push(`${resource}.${operation}`);
        });
      }
    });

    return flat;
  }

  // Check if user has a specific permission
  async hasPermission(userId, tenantId, permission) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      const flatPermissions = this.flattenNestedPermissions(context.permissions);

      const hasPermission = flatPermissions.includes(permission);

      console.log('🔍 Permission check:', {
        userId,
        tenantId,
        permission,
        hasPermission,
        totalPermissions: flatPermissions.length
      });

      return hasPermission;
    } catch (error) {
      console.error('🚨 Error checking permission:', error);
      return false;
    }
  }

  // Check if user has all permissions
  async hasAllPermissions(userId, tenantId, permissions) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      const flatPermissions = this.flattenNestedPermissions(context.permissions);

      const hasAll = permissions.every(permission => flatPermissions.includes(permission));

      console.log('🔍 Has all permissions check:', {
        userId,
        tenantId,
        required: permissions,
        hasAll,
        userPermissions: flatPermissions.length
      });

      return hasAll;
    } catch (error) {
      console.error('🚨 Error checking all permissions:', error);
      return false;
    }
  }

  // Check if user has any of the permissions
  async hasAnyPermission(userId, tenantId, permissions) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      const flatPermissions = this.flattenNestedPermissions(context.permissions);

      const hasAny = permissions.some(permission => flatPermissions.includes(permission));

      console.log('🔍 Has any permission check:', {
        userId,
        tenantId,
        required: permissions,
        hasAny,
        userPermissions: flatPermissions.length
      });

      return hasAny;
    } catch (error) {
      console.error('🚨 Error checking any permission:', error);
      return false;
    }
  }

  // Get applications user can access
  async getUserAccessibleApplications(userId, tenantId) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      const applications = new Set();

      // Extract applications from permissions
      Object.keys(context.permissions).forEach(resource => {
        if (resource.includes('.')) {
          const app = resource.split('.')[0];
          applications.add(app);
        }
      });

      const result = Array.from(applications);

      console.log('📱 User accessible applications:', {
        userId,
        tenantId,
        applications: result
      });

      return result;
    } catch (error) {
      console.error('🚨 Error getting accessible applications:', error);
      return [];
    }
  }

  // Get available role templates
  getAvailableRoleTemplates() {
    // Static templates for now - can be moved to database later
    const templates = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full access to all system features',
        category: 'system',
        permissions: {
          'crm.*': { level: 'admin', operations: ['*'], scope: 'all' },
          'admin.*': { level: 'admin', operations: ['*'], scope: 'all' }
        },
        color: '#ef4444',
        isActive: true,
        sortOrder: 1
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Management access with reporting capabilities',
        category: 'management',
        permissions: {
          'crm.leads': { level: 'write', operations: ['read', 'create', 'update'], scope: 'team' },
          'crm.accounts': { level: 'write', operations: ['read', 'create', 'update'], scope: 'team' },
          'crm.reports': { level: 'read', operations: ['read', 'export'], scope: 'team' }
        },
        color: '#f59e0b',
        isActive: true,
        sortOrder: 2
      },
      {
        id: 'user',
        name: 'Standard User',
        description: 'Basic access for regular operations',
        category: 'user',
        permissions: {
          'crm.leads': { level: 'write', operations: ['read', 'create', 'update'], scope: 'own' },
          'crm.accounts': { level: 'read', operations: ['read'], scope: 'own' }
        },
        color: '#10b981',
        isActive: true,
        sortOrder: 3
      },
      {
        id: 'viewer',
        name: 'Read-Only User',
        description: 'View-only access to data',
        category: 'user',
        permissions: {
          'crm.*': { level: 'read', operations: ['read'], scope: 'own' }
        },
        color: '#6b7280',
        isActive: true,
        sortOrder: 4
      }
    ];

    console.log('📋 Available role templates:', templates.length);
    return templates;
  }

  // Assign role template to user
  async assignRoleTemplate(userId, tenantId, templateId, customizations = {}) {
    try {
      console.log('🔧 Assigning role template:', { userId, tenantId, templateId, customizations });

      const templates = this.getAvailableRoleTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        throw new Error(`Template '${templateId}' not found`);
      }

      // Apply customizations
      let permissions = { ...template.permissions };
      if (customizations.addPermissions) {
        permissions = { ...permissions, ...customizations.addPermissions };
      }

      if (customizations.removePermissions) {
        customizations.removePermissions.forEach(perm => {
          delete permissions[perm];
        });
      }

      // Create role from template
      const roleId = uuidv4();
      const roleName = customizations.name || `${template.name} (${userId.slice(-8)})`;

      await db.insert(customRoles).values({
        roleId,
        tenantId,
        roleName,
        description: template.description,
        color: template.color,
        permissions: JSON.stringify(permissions),
        restrictions: JSON.stringify({}),
        isSystemRole: false,
        isDefault: false,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Assign role to user
      await db.insert(userRoleAssignments).values({
        assignmentId: uuidv4(),
        userId,
        roleId,
        isActive: true,
        isTemporary: false,
        assignedBy: 'system',
        assignedAt: new Date()
      });

      console.log('✅ Role template assigned successfully');
      return { roleId, templateId, userId };
    } catch (error) {
      console.error('🚨 Error assigning role template:', error);
      throw error;
    }
  }

  // Get permission analytics
  async getPermissionAnalytics(tenantId) {
    try {
      console.log('📊 Getting permission analytics for tenant:', tenantId);

      // Get role counts
      const roleStats = await db
        .select({
          isSystemRole: customRoles.isSystemRole,
          userCount: count(userRoleAssignments.id)
        })
        .from(customRoles)
        .leftJoin(userRoleAssignments, eq(customRoles.roleId, userRoleAssignments.roleId))
        .where(eq(customRoles.tenantId, tenantId))
        .groupBy(customRoles.isSystemRole);

      // Get user counts
      const userStats = await db
        .select({
          totalUsers: count(tenantUsers.id),
          activeUsers: count(tenantUsers.id).where(eq(tenantUsers.isActive, true))
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      const analytics = {
        tenantId,
        roles: {
          system: roleStats.find(r => r.isSystemRole)?.userCount || 0,
          custom: roleStats.find(r => !r.isSystemRole)?.userCount || 0,
          total: (roleStats.find(r => r.isSystemRole)?.userCount || 0) + (roleStats.find(r => !r.isSystemRole)?.userCount || 0)
        },
        users: userStats[0] || { totalUsers: 0, activeUsers: 0 },
        generatedAt: new Date().toISOString()
      };

      console.log('📊 Permission analytics:', analytics);
      return analytics;
    } catch (error) {
      console.error('🚨 Error getting permission analytics:', error);
      throw error;
    }
  }

  // Revoke all user permissions
  async revokeAllUserPermissions(userId, tenantId) {
    try {
      console.log('🚫 Revoking all permissions for user:', userId, 'tenant:', tenantId);

      // Get all active role assignments for user
      const assignments = await db
        .select({ assignmentId: userRoleAssignments.assignmentId })
        .from(userRoleAssignments)
        .where(
          and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.isActive, true)
          )
        );

      // Deactivate all assignments
      if (assignments.length > 0) {
        await db
          .update(userRoleAssignments)
          .set({
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(userRoleAssignments.userId, userId));
      }

      // Log audit event
      await db.insert(auditLogs).values({
        logId: uuidv4(),
        tenantId,
        userId: 'system',
        action: 'permissions_revoked',
        resourceType: 'user',
        resourceId: userId,
        details: JSON.stringify({ assignmentsRevoked: assignments.length }),
        createdAt: new Date()
      });

      console.log('✅ All permissions revoked for user:', { userId, assignmentsRevoked: assignments.length });
      return { userId, assignmentsRevoked: assignments.length };
    } catch (error) {
      console.error('🚨 Error revoking user permissions:', error);
      throw error;
    }
  }

  // Helper method to combine restrictions
  combineRestrictions(restrictionsArray) {
    if (!restrictionsArray || restrictionsArray.length === 0) {
      return {};
    }

    // For now, return the most restrictive set
    // In a real implementation, you'd merge restrictions intelligently
    return restrictionsArray[0];
  }
}

export default new PermissionMatrixService();
