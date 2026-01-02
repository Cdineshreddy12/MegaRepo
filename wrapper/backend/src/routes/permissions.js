import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import permissionService from '../services/permissionService.js';
import { db } from '../db/index.js';
import {
  applications,
  applicationModules,
  organizationApplications,
  userApplicationPermissions
} from '../db/schema/suite-schema.js';
import { tenantUsers } from '../db/schema/users.js';
import { customRoles, userRoleAssignments } from '../db/schema/index.js';
import { organizationMemberships } from '../db/schema/organization_memberships.js';
import { eq, and, inArray } from 'drizzle-orm';
import CacheInvalidationService from '../middleware/cache-invalidation.js';
import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../services/activityLogger.js';

export default async function permissionRoutes(fastify, options) {
  
  // Helper function to get tenant ID from request
  const getTenantId = (request) => {
    const tenantId = request.userContext?.tenantId || request.user?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context required - User must be associated with a tenant');
    }
    return tenantId;
  };

  // Get available permissions with categories and operations
  fastify.get('/available', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async ( request , reply ) => {
    try {
      console.log('📡 GET /api/permissions/available - Fetching permission structure');
      
      const permissionData = await permissionService.getAvailablePermissions();
      
      console.log('📊 Permission data summary:', {
        applications: permissionData.summary.applicationCount,
        modules: permissionData.summary.moduleCount,
        operations: permissionData.summary.operationCount
      });

      return {
        success: true,
        data: permissionData,
        message: 'Permission structure retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error fetching permissions:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch permission structure',
        error: error.message
      });
    }
  });

  // Get applications with modules and permissions
  fastify.get('/applications', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      
      // Get organization's enabled applications
      const orgApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          isEnabled: organizationApplications.isEnabled,
          enabledModules: organizationApplications.enabledModules,
          subscriptionTier: organizationApplications.subscriptionTier
        })
        .from(applications)
        .innerJoin(
          organizationApplications,
          and(
            eq(organizationApplications.appId, applications.appId),
            eq(organizationApplications.tenantId, tenantId)
          )
        )
        .where(eq(applications.status, 'active'));

      // Get modules for each application
      const appsWithModules = await Promise.all(
        orgApps.map(async (app) => {
          const modules = await db
            .select()
            .from(applicationModules)
            .where(eq(applicationModules.appId, app.appId));

          return {
            ...app,
            modules: modules.map(module => ({
              moduleId: module.moduleId,
              moduleCode: module.moduleCode,
              moduleName: module.moduleName,
              description: module.description,
              isCore: module.isCore,
              permissions: module.permissions || []
            }))
          };
        })
      );

      return {
        success: true,
        data: appsWithModules
      };
    } catch (error) {
      fastify.log.error('Error fetching applications:', error);
      return reply.code(500).send({ error: 'Failed to fetch applications' });
    }
  });

  // Get tenant users for permission management
  fastify.get('/users', {
    preHandler: [authenticateToken, requirePermission('users:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      
      const users = await db
        .select({
          userId: tenantUsers.userId,
          name: tenantUsers.name,
          email: tenantUsers.email,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          createdAt: tenantUsers.createdAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      return {
        success: true,
        data: users
      };
    } catch (error) {
      fastify.log.error('Error fetching users:', error);
      return reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Get user permissions
  fastify.get('/users/:userId/permissions', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const tenantId = getTenantId(request);
      
      const userPermissions = await db
        .select({
          id: userApplicationPermissions.id,
          appId: userApplicationPermissions.appId,
          moduleId: userApplicationPermissions.moduleId,
          permissions: userApplicationPermissions.permissions,
          appCode: applications.appCode,
          appName: applications.appName,
          moduleCode: applicationModules.moduleCode,
          moduleName: applicationModules.moduleName
        })
        .from(userApplicationPermissions)
        .innerJoin(applications, eq(userApplicationPermissions.appId, applications.appId))
        .innerJoin(applicationModules, eq(userApplicationPermissions.moduleId, applicationModules.moduleId))
        .where(and(
          eq(userApplicationPermissions.userId, userId),
          eq(userApplicationPermissions.isActive, true)
        ));

      return {
        success: true,
        data: userPermissions
      };
    } catch (error) {
      fastify.log.error('Error fetching user permissions:', error);
      return reply.code(500).send({ error: 'Failed to fetch user permissions' });
    }
  });

  // Bulk assign permissions
  fastify.post('/bulk-assign', {
    preHandler: [authenticateToken, requirePermission('permissions:assign'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['assignments'],
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['userId', 'appId', 'moduleId', 'permissions'],
              properties: {
                userId: { type: 'string' },
                appId: { type: 'string' },
                moduleId: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { assignments } = request.body;
      const tenantId = getTenantId(request);
      const grantedBy = request.userContext.internalUserId;

      // Process each assignment
      const results = [];
      for (const assignment of assignments) {
        const { userId, appId, moduleId, permissions } = assignment;

        // Check if permission already exists
        const [existing] = await db
          .select()
          .from(userApplicationPermissions)
          .where(and(
            eq(userApplicationPermissions.userId, userId),
            eq(userApplicationPermissions.appId, appId),
            eq(userApplicationPermissions.moduleId, moduleId)
          ))
          .limit(1);

        let result;
        if (existing) {
          // Update existing permission
          [result] = await db
            .update(userApplicationPermissions)
            .set({
              permissions: permissions,
              isActive: permissions.length > 0,
              grantedBy: grantedBy,
              grantedAt: new Date()
            })
            .where(eq(userApplicationPermissions.id, existing.id))
            .returning();
        } else if (permissions.length > 0) {
          // Create new permission only if permissions are granted
          [result] = await db
            .insert(userApplicationPermissions)
            .values({
              userId,
              appId,
              moduleId,
              permissions,
              isActive: true,
              grantedBy,
              grantedAt: new Date()
            })
            .returning();
        }

        if (result) {
          results.push(result);
        }
      }

      // Invalidate cache for affected users
      const affectedUsers = [...new Set(assignments.map(a => a.userId))];
      await Promise.all(affectedUsers.map(userId => 
        CacheInvalidationService.invalidateUserPermissionsCache(userId, tenantId)
      ));

      return {
        success: true,
        data: results,
        message: `Successfully processed ${results.length} permission assignments`
      };
    } catch (error) {
      fastify.log.error('Error in bulk permission assignment:', error);
      return reply.code(500).send({ error: 'Failed to assign permissions' });
    }
  });

  // Apply template to user
  fastify.post('/users/:userId/apply-template', {
    preHandler: [authenticateToken, requirePermission('permissions:assign'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['templateId'],
        properties: {
          templateId: { type: 'string' },
          clearExisting: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const { templateId, clearExisting } = request.body;
      const tenantId = getTenantId(request);
      const grantedBy = request.userContext.internalUserId;

      // Get template permissions (this would need to be implemented based on your template system)
      const templatePermissions = await getTemplatePermissions(templateId);

      if (!templatePermissions) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      // Clear existing permissions if requested
      if (clearExisting) {
        await db
          .update(userApplicationPermissions)
          .set({ isActive: false })
          .where(eq(userApplicationPermissions.userId, userId));
      }

      // Apply template permissions
      const results = [];
      for (const permission of templatePermissions) {
        const { appId, moduleId, permissions } = permission;

        // Check if permission already exists
        const [existing] = await db
          .select()
          .from(userApplicationPermissions)
          .where(and(
            eq(userApplicationPermissions.userId, userId),
            eq(userApplicationPermissions.appId, appId),
            eq(userApplicationPermissions.moduleId, moduleId)
          ))
          .limit(1);

        let result;
        if (existing) {
          // Update existing permission
          [result] = await db
            .update(userApplicationPermissions)
            .set({
              permissions: permissions,
              isActive: true,
              grantedBy: grantedBy,
              grantedAt: new Date()
            })
            .where(eq(userApplicationPermissions.id, existing.id))
            .returning();
        } else {
          // Create new permission
          [result] = await db
            .insert(userApplicationPermissions)
            .values({
              userId,
              appId,
              moduleId,
              permissions,
              isActive: true,
              grantedBy,
              grantedAt: new Date()
            })
            .returning();
        }

        results.push(result);
      }

      return {
        success: true,
        data: results,
        message: `Template ${templateId} applied successfully`
      };
    } catch (error) {
      fastify.log.error('Error applying template:', error);
      return reply.code(500).send({ error: 'Failed to apply template' });
    }
  });

  // Remove user permissions
  fastify.delete('/users/:userId/permissions', {
    preHandler: [authenticateToken, requirePermission('permissions:assign'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          moduleId: { type: 'string' },
          permissionIds: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const { appId, moduleId, permissionIds } = request.body;

      let whereCondition = eq(userApplicationPermissions.userId, userId);

      if (appId && moduleId) {
        // Remove specific module permissions
        whereCondition = and(
          whereCondition,
          eq(userApplicationPermissions.appId, appId),
          eq(userApplicationPermissions.moduleId, moduleId)
        );
      } else if (appId) {
        // Remove all app permissions
        whereCondition = and(
          whereCondition,
          eq(userApplicationPermissions.appId, appId)
        );
      }

      await db
        .update(userApplicationPermissions)
        .set({ isActive: false })
        .where(whereCondition);

      return {
        success: true,
        message: 'Permissions removed successfully'
      };
    } catch (error) {
      fastify.log.error('Error removing permissions:', error);
      return reply.code(500).send({ error: 'Failed to remove permissions' });
    }
  });

  // Get permission templates
  fastify.get('/templates', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const templates = await getPermissionTemplates();
      
      return {
        success: true,
        data: templates
      };
    } catch (error) {
      fastify.log.error('Error fetching templates:', error);
      return reply.code(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // Get tenant roles
  fastify.get('/roles', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          type: { type: 'string', enum: ['system', 'custom'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page, limit, search, type } = request.query;
      
      // Get tenant ID from user context
      const tenantId = getTenantId(request);
      
      console.log('🔍 GET /api/permissions/roles - Debug info:', {
        tenantId,
        userContext: request.userContext,
        user: request.user,
        query: { page, limit, search, type }
      });
      
      const roles = await permissionService.getTenantRoles(tenantId, {
        page,
        limit,
        search,
        type
      });
      
      console.log('📊 Roles fetched from service:', {
        rolesCount: roles.data?.length || 0,
        total: roles.total,
        page: roles.page,
        limit: roles.limit
      });
      
      return {
        success: true,
        data: roles
      };
    } catch (error) {
      fastify.log.error('Error fetching tenant roles:', error);
      return reply.code(500).send({ error: 'Failed to fetch roles' });
    }
  });

  // Create custom role - REMOVED (use /custom-roles/create-from-builder instead)

  // Update role
  fastify.put('/roles/:roleId', {
    preHandler: [authenticateToken, requirePermission('roles:update'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          permissions: { type: 'array', items: { type: 'string' } },
          restrictions: {
            type: 'object',
            properties: {
              ipWhitelist: { type: 'array', items: { type: 'string' } },
              timeRestrictions: {
                type: 'object',
                properties: {
                  allowedHours: { type: 'array', items: { type: 'integer' } },
                  allowedDays: { type: 'array', items: { type: 'integer' } },
                  timezone: { type: 'string' }
                }
              },
              dataAccess: {
                type: 'object',
                properties: {
                  ownDataOnly: { type: 'boolean' },
                  departmentOnly: { type: 'boolean' },
                  allowedApps: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleId } = request.params;
      const updateData = {
        ...request.body,
        updatedBy: request.userContext?.kindeUserId || request.user?.id
      };
      
      const role = await permissionService.updateRole(
        getTenantId(request),
        roleId,
        updateData
      );
      
      return {
        success: true,
        data: role,
        message: 'Role updated successfully'
      };
    } catch (error) {
      fastify.log.error('Error updating role:', error);
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to update role' });
    }
  });

  // Delete role
  fastify.delete('/roles/:roleId', {
    preHandler: [authenticateToken, requirePermission('roles:delete'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          force: { type: 'boolean', default: false },
          transferUsersTo: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleId } = request.params;
      const { force, transferUsersTo } = request.query;
      const tenantId = getTenantId(request);

      console.log('🗑️ Attempting to delete role:', roleId, 'tenantId:', tenantId);

      // Get role data before deletion for event publishing
      const [roleToDelete] = await db
        .select()
        .from(customRoles)
        .where(
          and(
            eq(customRoles.tenantId, tenantId),
            eq(customRoles.roleId, roleId)
          )
        )
        .limit(1);

      console.log('Role to delete found:', !!roleToDelete, roleToDelete ? roleToDelete.roleId : 'N/A');

      if (!roleToDelete) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      // Check how many users are affected
      const userAssignments = await db
        .select({
          userId: userRoleAssignments.userId,
          userEmail: tenantUsers.email
        })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .where(eq(userRoleAssignments.roleId, roleId));

      const organizationAssignments = await db
        .select({
          membershipId: organizationMemberships.membershipId,
          userId: organizationMemberships.userId,
          userEmail: tenantUsers.email,
          entityId: organizationMemberships.entityId,
          entityType: organizationMemberships.entityType
        })
        .from(organizationMemberships)
        .innerJoin(tenantUsers, eq(organizationMemberships.userId, tenantUsers.userId))
        .where(eq(organizationMemberships.roleId, roleId));

      const affectedUsers = [
        ...userAssignments.map(ua => ({ userId: ua.userId, email: ua.userEmail, type: 'direct' })),
        ...organizationAssignments.map(oa => ({ userId: oa.userId, email: oa.userEmail, type: 'organization' }))
      ];

      // Remove duplicates
      const uniqueAffectedUsers = affectedUsers.filter((user, index, self) =>
        index === self.findIndex(u => u.userId === user.userId)
      );

      console.log('Affected users:', uniqueAffectedUsers.length);

      // If force is not specified and there are affected users, return confirmation needed
      if (!force && uniqueAffectedUsers.length > 0) {
        return reply.code(200).send({
          success: false,
          requiresConfirmation: true,
          message: `Role "${roleToDelete.roleName}" is assigned to ${uniqueAffectedUsers.length} user(s)`,
          affectedUsers: uniqueAffectedUsers,
          role: {
            roleId: roleToDelete.roleId,
            roleName: roleToDelete.roleName,
            description: roleToDelete.description
          },
          instructions: 'To delete this role, set force=true in the query parameters. This will remove all user assignments.'
        });
      }

      console.log('Calling permissionService.deleteRole...');
      const result = await permissionService.deleteRole(
        tenantId,
        roleId,
        {
          force: force || false,
          transferUsersTo,
          deletedBy: request.userContext.internalUserId
        }
      );
      console.log('permissionService.deleteRole result:', result);

      console.log('🔍 DEBUG: About to publish role deletion event, roleToDelete exists:', !!roleToDelete);

      // Log role deletion activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.ROLE_DELETED,
        {
          roleId: roleId,
          force: force,
          transferUsersTo: transferUsersTo,
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      // Publish role deletion event to relevant applications (only apps with permissions)
      if (roleToDelete) {
        console.log('📡 Publishing role deletion event for role:', roleId);
        console.log('📋 Role data for event:', {
          roleId: roleToDelete.roleId,
          roleName: roleToDelete.roleName,
          permissionsType: typeof roleToDelete.permissions,
          permissionsValue: roleToDelete.permissions ? (typeof roleToDelete.permissions === 'string' ? 'JSON string' : 'object') : 'null/undefined',
          hasPermissions: !!roleToDelete.permissions
        });
        try {
          // Import the event publishing function
          console.log('Importing roles.js...');
          const { publishRoleEventToApplications } = await import('../features/roles/routes/roles.js');
          console.log('Successfully imported publishRoleEventToApplications');

          await publishRoleEventToApplications(
            'role.deleted',
            tenantId,
            roleId,
            {
              roleName: roleToDelete.roleName || roleToDelete.name,
              description: roleToDelete.description,
              permissions: roleToDelete.permissions,
              restrictions: roleToDelete.restrictions,
              metadata: roleToDelete.metadata,
              deletedBy: request.userContext.internalUserId,
              deletedAt: new Date().toISOString(),
              transferredToRoleId: transferUsersTo,
              affectedUsersCount: result.usersAffected || 0
            }
          );
          console.log('✅ Role deletion event published successfully');
        } catch (publishError) {
          console.warn('⚠️ Failed to publish role deletion event:', publishError.message);
          console.error('Full error:', publishError);
          // Don't fail the deletion if event publishing fails
        }
      } else {
        console.log('⚠️ No role data found for event publishing');
      }

      return {
        success: true,
        data: result,
        message: 'Role deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting role:', error.message);
      console.error('Full error:', error);
      fastify.log.error('Error deleting role:', error);
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      if (error.message.includes('in use') || error.message.includes('assigned to')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to delete role' });
    }
  });

  // Role templates - REMOVED (use /custom-roles/create-from-builder instead)

  // Get user role assignments
  fastify.get('/assignments', {
    preHandler: [authenticateToken, requirePermission('roles:read'), trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          roleId: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, roleId, page, limit } = request.query;
      
      // Get tenant ID from user context
      const tenantId = getTenantId(request);
      
      const assignments = await permissionService.getRoleAssignments(
        tenantId,
        { userId, roleId, page, limit }
      );
      
      return {
        success: true,
        data: assignments
      };
    } catch (error) {
      fastify.log.error('Error fetching role assignments:', error);
      return reply.code(500).send({ error: 'Failed to fetch role assignments' });
    }
  });

  // Assign role to user
  fastify.post('/assignments', {
    preHandler: [authenticateToken, requirePermission('roles:assign'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'roleId'],
        properties: {
          userId: { type: 'string' },
          roleId: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          conditions: {
            type: 'object',
            properties: {
              ipRestrictions: { type: 'array', items: { type: 'string' } },
              timeRestrictions: { type: 'object' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, roleId, expiresAt, conditions } = request.body;
      
      // Get tenant ID from user context
      const tenantId = getTenantId(request);
      
      const assignment = await permissionService.assignRole(
        tenantId,
        userId,
        roleId,
        {
          expiresAt,
          conditions,
          assignedBy: request.userContext?.kindeUserId || request.user?.id
        }
      );

      // Log role assignment activity
      await ActivityLogger.logActivity(
        request.userContext?.internalUserId || request.user?.id,
        tenantId,
        null,
        ACTIVITY_TYPES.PERMISSION_GRANTED,
        {
          targetUserId: userId,
          roleId: roleId,
          expiresAt: expiresAt,
          hasConditions: !!conditions,
          tenantId: tenantId,
          userEmail: request.userContext?.email || request.user?.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: assignment,
        message: 'Role assigned successfully'
      };
    } catch (error) {
      fastify.log.error('Error assigning role:', error);
      if (error.message.includes('already assigned')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to assign role' });
    }
  });

  // Remove role assignment by assignmentId
  fastify.delete('/assignments/:assignmentId', {
    preHandler: [authenticateToken, requirePermission('roles:assign'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['assignmentId'],
        properties: {
          assignmentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { assignmentId } = request.params;
      const tenantId = getTenantId(request);
      
      await permissionService.removeRoleAssignmentById(
        tenantId,
        assignmentId,
        request.userContext?.kindeUserId || request.user?.id
      );

      // Log role removal activity
      await ActivityLogger.logActivity(
        request.userContext?.internalUserId || request.user?.id,
        tenantId,
        null,
        ACTIVITY_TYPES.PERMISSION_REVOKED,
        {
          assignmentId: assignmentId,
          tenantId: tenantId,
          userEmail: request.userContext?.email || request.user?.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: 'Role assignment removed successfully'
      };
    } catch (error) {
      fastify.log.error('Error removing role assignment:', error);
      if (error.message === 'Role assignment not found') {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to remove role assignment' });
    }
  });

  // Remove role assignment by userId and roleId (deassign)
  fastify.delete('/assignments/user/:userId/role/:roleId', {
    preHandler: [authenticateToken, requirePermission('roles:assign'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['userId', 'roleId'],
        properties: {
          userId: { type: 'string' },
          roleId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, roleId } = request.params;
      const tenantId = getTenantId(request);
      
      await permissionService.removeRoleAssignment(
        tenantId,
        userId,
        roleId,
        request.userContext?.kindeUserId || request.user?.id
      );

      // Log role removal activity
      await ActivityLogger.logActivity(
        request.userContext?.internalUserId || request.user?.id,
        tenantId,
        null,
        ACTIVITY_TYPES.PERMISSION_REVOKED,
        {
          userId: userId,
          roleId: roleId,
          tenantId: tenantId,
          userEmail: request.userContext?.email || request.user?.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: 'Role assignment removed successfully'
      };
    } catch (error) {
      fastify.log.error('Error removing role assignment:', error);
      if (error.message === 'Role assignment not found') {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to remove role assignment' });
    }
  });

  // Get permission audit log
  fastify.get('/audit', {
    preHandler: [authenticateToken, requirePermission('audit:read'), trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' },
          resource: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const filters = request.query;
      const auditLog = await permissionService.getAuditLog(
        getTenantId(request),
        filters
      );
      
      return {
        success: true,
        data: auditLog
      };
    } catch (error) {
      fastify.log.error('Error fetching audit log:', error);
      return reply.code(500).send({ error: 'Failed to fetch audit log' });
    }
  });

  // Check user permissions
  fastify.post('/check', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['permissions'],
        properties: {
          permissions: { type: 'array', items: { type: 'string' } },
          userId: { type: 'string' },
          resource: { type: 'string' },
          context: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { permissions, userId, resource, context } = request.body;
      const targetUserId = userId || request.userContext?.kindeUserId || request.user?.id;
      
      const results = await permissionService.checkPermissions(
        getTenantId(request),
        targetUserId,
        permissions,
        { resource, context }
      );
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      fastify.log.error('Error checking permissions:', error);
      return reply.code(500).send({ error: 'Failed to check permissions' });
    }
  });

  // Get user effective permissions
  fastify.get('/user/:userId/effective', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      
      const permissions = await permissionService.getUserEffectivePermissions(
        getTenantId(request),
        userId
      );
      
      return {
        success: true,
        data: permissions
      };
    } catch (error) {
      fastify.log.error('Error fetching user permissions:', error);
      return reply.code(500).send({ error: 'Failed to fetch user permissions' });
    }
  });

  // Bulk role assignment
  fastify.post('/assignments/bulk', {
    preHandler: [authenticateToken, requirePermission('roles:assign'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['assignments'],
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['userId', 'roleId'],
              properties: {
                userId: { type: 'string' },
                roleId: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { assignments } = request.body;
      
      const results = await permissionService.bulkAssignRoles(
        getTenantId(request),
        assignments,
        request.userContext?.kindeUserId || request.user?.id
      );
      
      return {
        success: true,
        data: results,
        message: 'Bulk role assignment completed'
      };
    } catch (error) {
      fastify.log.error('Error in bulk role assignment:', error);
      return reply.code(500).send({ error: 'Failed to complete bulk assignment' });
    }
  });

  // Migrate role permissions to hierarchical format
  fastify.post('/migrate-role-permissions', {
    preHandler: [authenticateToken, requirePermission('roles:update'), trackUsage]
  }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request);

      console.log(`🚀 Starting role permissions migration for tenant: ${tenantId}`);

      // Get all custom roles for this tenant
      const roles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          isSystemRole: customRoles.isSystemRole
        })
        .from(customRoles)
        .where(and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.isSystemRole, false),
          not(eq(customRoles.permissions, null))
        ));

      console.log(`📊 Found ${roles.length} custom roles to check`);

      let updatedCount = 0;
      let skippedCount = 0;
      const results = [];

      for (const role of roles) {
        try {
          let permissionsData;

          // Parse permissions if it's a string
          if (typeof role.permissions === 'string') {
            try {
              permissionsData = JSON.parse(role.permissions);
            } catch (parseError) {
              console.warn(`⚠️ Failed to parse permissions for role ${role.roleName}:`, parseError.message);
              skippedCount++;
              continue;
            }
          } else {
            permissionsData = role.permissions;
          }

          // Check if already in hierarchical format
          if (permissionsData && typeof permissionsData === 'object' && !Array.isArray(permissionsData)) {
            console.log(`⏭️ Skipping role "${role.roleName}" - already in hierarchical format`);
            skippedCount++;
            results.push({
              roleId: role.roleId,
              roleName: role.roleName,
              status: 'skipped',
              reason: 'Already in hierarchical format'
            });
            continue;
          }

          // Check if it's in flat array format
          if (Array.isArray(permissionsData) && permissionsData.length > 0 && typeof permissionsData[0] === 'string') {
            console.log(`🔄 Converting role "${role.roleName}" from flat array to hierarchical format`);

            // Convert to hierarchical format
            const hierarchicalPermissions = {};
            permissionsData.forEach(permission => {
              const parts = permission.split('.');
              if (parts.length >= 3) {
                const [app, module, operation] = parts;

                if (!hierarchicalPermissions[app]) {
                  hierarchicalPermissions[app] = {};
                }
                if (!hierarchicalPermissions[app][module]) {
                  hierarchicalPermissions[app][module] = [];
                }
                if (!hierarchicalPermissions[app][module].includes(operation)) {
                  hierarchicalPermissions[app][module].push(operation);
                }
              }
            });

            // Update the role
            await db
              .update(customRoles)
              .set({
                permissions: JSON.stringify(hierarchicalPermissions),
                updatedAt: new Date()
              })
              .where(eq(customRoles.roleId, role.roleId));

            console.log(`✅ Updated role "${role.roleName}" with hierarchical permissions`);
            updatedCount++;
            results.push({
              roleId: role.roleId,
              roleName: role.roleName,
              status: 'updated',
              oldFormat: 'flat_array',
              newFormat: 'hierarchical'
            });
          } else {
            console.warn(`⚠️ Unknown permissions format for role "${role.roleName}":`, typeof permissionsData);
            skippedCount++;
            results.push({
              roleId: role.roleId,
              roleName: role.roleName,
              status: 'skipped',
              reason: 'Unknown permissions format'
            });
          }

        } catch (error) {
          console.error(`❌ Error processing role "${role.roleName}":`, error.message);
          skippedCount++;
          results.push({
            roleId: role.roleId,
            roleName: role.roleName,
            status: 'error',
            error: error.message
          });
        }
      }

      console.log(`\n🎉 Migration completed!`);
      console.log(`✅ Updated: ${updatedCount} roles`);
      console.log(`⏭️ Skipped: ${skippedCount} roles`);
      console.log(`📊 Total processed: ${roles.length} roles`);

      return {
        success: true,
        message: `Migration completed. Updated ${updatedCount} roles, skipped ${skippedCount} roles.`,
        data: {
          totalProcessed: roles.length,
          updated: updatedCount,
          skipped: skippedCount,
          results: results
        }
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to migrate role permissions',
        error: error.message
      });
    }
  });

  // Get permission summary
  fastify.get('/summary', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const permissionData = await permissionService.getAvailablePermissions();

      return {
        success: true,
        data: {
          totalApplications: permissionData.summary.applicationCount,
          totalModules: permissionData.summary.moduleCount,
          totalOperations: permissionData.summary.operationCount,
          byApplication: permissionData.applications.map(app => ({
            name: app.name,
            key: app.key,
            moduleCount: app.moduleCount,
            operationCount: app.operationCount
          }))
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching permission summary:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch permission summary',
        error: error.message
      });
    }
  });
}

// Helper functions
async function getPermissionTemplates() {
  return [
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full access to all CRM applications and modules',
      color: 'bg-red-100 text-red-800 border-red-200',
      isBuiltIn: true,
      permissions: [
        { appCode: 'crm', moduleCode: 'leads', permissions: ['create', 'read', 'read_all', 'update', 'delete', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'accounts', permissions: ['create', 'read', 'read_all', 'update', 'delete', 'view_contacts', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'contacts', permissions: ['create', 'read', 'read_all', 'update', 'delete', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'opportunities', permissions: ['create', 'read', 'read_all', 'update', 'delete', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'quotations', permissions: ['create', 'read', 'read_all', 'update', 'delete', 'generate_pdf', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'tickets', permissions: ['create', 'read', 'read_all', 'update', 'delete'] },
        { appCode: 'crm', moduleCode: 'communications', permissions: ['create', 'read', 'read_all', 'update', 'delete'] },
        { appCode: 'crm', moduleCode: 'invoices', permissions: ['create', 'read', 'read_all', 'update', 'delete'] },
        { appCode: 'crm', moduleCode: 'sales_orders', permissions: ['create', 'read', 'read_all', 'update', 'delete'] },
        { appCode: 'crm', moduleCode: 'documents', permissions: ['upload', 'read', 'read_all', 'download', 'delete'] },
        { appCode: 'crm', moduleCode: 'bulk_operations', permissions: ['import', 'export', 'template'] },
        { appCode: 'crm', moduleCode: 'pdf', permissions: ['generate', 'download'] },
        { appCode: 'crm', moduleCode: 'dashboard', permissions: ['view', 'stats'] },
        { appCode: 'crm', moduleCode: 'users', permissions: ['create', 'read', 'read_all', 'update', 'delete', 'change_status', 'change_role', 'change_password', 'bulk_upload'] },
        { appCode: 'crm', moduleCode: 'roles', permissions: ['create', 'read', 'update', 'delete'] },
        { appCode: 'crm', moduleCode: 'audit', permissions: ['view_own', 'view_all', 'export', 'stats', 'search'] },
        { appCode: 'crm', moduleCode: 'special', permissions: ['admin_access', 'super_admin', 'view_all_data', 'export_all', 'import_all'] }
      ]
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Management access with approval and export/import permissions',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      isBuiltIn: true,
      permissions: [
        { appCode: 'crm', moduleCode: 'leads', permissions: ['create', 'read', 'read_all', 'update', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'accounts', permissions: ['create', 'read', 'read_all', 'update', 'view_contacts', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'contacts', permissions: ['create', 'read', 'read_all', 'update', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'opportunities', permissions: ['create', 'read', 'read_all', 'update', 'export', 'import'] },
        { appCode: 'crm', moduleCode: 'quotations', permissions: ['create', 'read', 'read_all', 'update', 'generate_pdf', 'export'] },
        { appCode: 'crm', moduleCode: 'tickets', permissions: ['create', 'read', 'read_all', 'update'] },
        { appCode: 'crm', moduleCode: 'communications', permissions: ['create', 'read', 'read_all', 'update'] },
        { appCode: 'crm', moduleCode: 'invoices', permissions: ['read', 'read_all'] },
        { appCode: 'crm', moduleCode: 'sales_orders', permissions: ['read', 'read_all'] },
        { appCode: 'crm', moduleCode: 'documents', permissions: ['upload', 'read', 'read_all', 'download'] },
        { appCode: 'crm', moduleCode: 'bulk_operations', permissions: ['export', 'template'] },
        { appCode: 'crm', moduleCode: 'pdf', permissions: ['generate', 'download'] },
        { appCode: 'crm', moduleCode: 'dashboard', permissions: ['view', 'stats'] },
        { appCode: 'crm', moduleCode: 'audit', permissions: ['view_own', 'view_all', 'export'] }
      ]
    },
    {
      id: 'sales_rep',
      name: 'Sales Representative',
      description: 'CRM access for sales activities with export capabilities',
      color: 'bg-green-100 text-green-800 border-green-200',
      isBuiltIn: true,
      permissions: [
        { appCode: 'crm', moduleCode: 'leads', permissions: ['create', 'read', 'update', 'export'] },
        { appCode: 'crm', moduleCode: 'accounts', permissions: ['read', 'view_contacts'] },
        { appCode: 'crm', moduleCode: 'contacts', permissions: ['create', 'read', 'update', 'export'] },
        { appCode: 'crm', moduleCode: 'opportunities', permissions: ['create', 'read', 'update', 'export'] },
        { appCode: 'crm', moduleCode: 'quotations', permissions: ['create', 'read', 'update'] },
        { appCode: 'crm', moduleCode: 'communications', permissions: ['create', 'read', 'update'] },
        { appCode: 'crm', moduleCode: 'documents', permissions: ['upload', 'read', 'download'] },
        { appCode: 'crm', moduleCode: 'dashboard', permissions: ['view'] }
      ]
    },
    {
      id: 'hr_specialist',
      name: 'HR Specialist',
      description: 'HR module access with employee management',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      isBuiltIn: true,
      permissions: [
        { appCode: 'hr', moduleCode: 'employees', permissions: ['view', 'create', 'edit'] },
        { appCode: 'hr', moduleCode: 'payroll', permissions: ['view', 'export'] },
        { appCode: 'hr', moduleCode: 'leave', permissions: ['view', 'approve', 'reject'] }
      ]
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to CRM information',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      isBuiltIn: true,
      permissions: [
        { appCode: 'crm', moduleCode: 'leads', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'accounts', permissions: ['read', 'view_contacts'] },
        { appCode: 'crm', moduleCode: 'contacts', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'opportunities', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'quotations', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'tickets', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'communications', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'invoices', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'sales_orders', permissions: ['read'] },
        { appCode: 'crm', moduleCode: 'documents', permissions: ['read', 'download'] },
        { appCode: 'crm', moduleCode: 'dashboard', permissions: ['view'] }
      ]
    }
  ];
}

async function getTemplatePermissions(templateId) {
  const templates = await getPermissionTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return null;
  }

  // Convert template permissions to the format expected by the database
  const convertedPermissions = [];
  
  for (const permission of template.permissions) {
    // Get app and module IDs from the database
    const [app] = await db
      .select({ appId: applications.appId })
      .from(applications)
      .where(eq(applications.appCode, permission.appCode))
      .limit(1);
      
    if (!app) continue;
    
    const [module] = await db
      .select({ moduleId: applicationModules.moduleId })
      .from(applicationModules)
      .where(and(
        eq(applicationModules.appId, app.appId),
        eq(applicationModules.moduleCode, permission.moduleCode)
      ))
      .limit(1);
      
    if (!module) continue;
    
    convertedPermissions.push({
      appId: app.appId,
      moduleId: module.moduleId,
      permissions: permission.permissions
    });
  }
  
  return convertedPermissions;
} 