import permissionService from '../../../services/permissionService.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { trackUsage } from '../../../middleware/usage.js';
import { checkRoleLimit } from '../../../middleware/planRestrictions.js';
import { db } from '../../../db/index.js';
import { userRoleAssignments, tenantUsers, customRoles } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import Logger from '../../../utils/logger.js';
import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../../../services/activityLogger.js';
import { crmSyncStreams } from '../../../utils/redis.js';
import { PermissionMatrixUtils } from '../../../data/permission-matrix.js';

/**
 * Publish role events to relevant applications based on permissions
 * Publishes to application-specific streams: crm:sync:role:{eventType}
 * Only publishes to applications that have permissions in the role
 */
export async function publishRoleEventToApplications(eventType, tenantId, roleId, roleData) {
  try {
    // Ensure Redis is connected before publishing
    if (!crmSyncStreams.redis.isConnected) {
      console.log('🔗 Connecting to Redis for event publishing...');
      await crmSyncStreams.redis.connect();
    }

    // Parse permissions if they're stored as JSON string
    let permissions = roleData.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        console.warn('⚠️ Failed to parse permissions JSON:', e.message);
        permissions = {};
      }
    }

    // Extract which applications are present in this role's permissions
    const applications = PermissionMatrixUtils.extractApplicationsFromPermissions(permissions);

    if (applications.length === 0) {
      console.log(`⚠️ No applications found in role ${roleId} permissions, skipping event publishing`);
      return;
    }

    console.log(`📡 Publishing ${eventType} event for role ${roleId} to applications:`, applications);

    // Publish event to each relevant application using their specific stream
    const publishPromises = applications.map(async (appCode) => {
      // Filter permissions for this specific application
      const appPermissions = PermissionMatrixUtils.filterPermissionsByApplication(permissions, appCode);

      // Prepare event data with only relevant permissions
      const eventData = {
        roleId: roleId,
        roleName: roleData.roleName || roleData.name,
        description: roleData.description,
        permissions: appPermissions, // Only permissions for this app
        restrictions: roleData.restrictions,
        metadata: roleData.metadata,
        ...(eventType === 'role.created' && {
          createdBy: roleData.createdBy,
          createdAt: roleData.createdAt
        }),
        ...(eventType === 'role.updated' && {
          updatedBy: roleData.updatedBy,
          updatedAt: roleData.updatedAt
        }),
        ...(eventType === 'role.deleted' && {
          deletedBy: roleData.deletedBy,
          deletedAt: roleData.deletedAt,
          transferredToRoleId: roleData.transferredToRoleId,
          affectedUsersCount: roleData.affectedUsersCount
        })
      };

      // Convert eventType to stream format (role.created → role_created)
      const streamEventType = eventType.replace('.', '_');
      const streamKey = `${appCode}:sync:role:${streamEventType}`;

      try {
        // Use the existing publishToStream method with the specific stream key
        const streamMessage = {
          eventId: `${appCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          eventType: eventType,
          tenantId: tenantId,
          entityType: 'role',
          entityId: roleId,
          data: eventData,
          publishedBy: roleData.createdBy || roleData.updatedBy || roleData.deletedBy || 'system'
        };

        await crmSyncStreams.publishToStream(streamKey, streamMessage);

        console.log(`✅ Published ${eventType} event to ${streamKey} for role ${roleId}`);
      } catch (error) {
        console.error(`❌ Failed to publish ${eventType} event to ${streamKey}:`, error.message);
        // Don't throw - continue with other applications
      }
    });

    await Promise.allSettled(publishPromises);
    console.log(`✅ Completed publishing ${eventType} events for role ${roleId}`);
  } catch (error) {
    console.error(`❌ Error publishing role events:`, error);
    // Don't throw - event publishing failure shouldn't break the API response
  }
}

export default async function roleRoutes(fastify, options) {
  
  // Get all role templates with categories
  fastify.get('/templates', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          includeInactive: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { category, includeInactive } = request.query;
      const templates = await permissionService.getRoleTemplates({
        category,
        includeInactive
      });
      
      return {
        success: true,
        data: templates
      };
    } catch (error) {
      request.log.error('Error fetching role templates:', error);
      return reply.code(500).send({ error: 'Failed to fetch role templates' });
    }
  });

  // Get available permissions with categories and operations
  fastify.get('/permissions/available', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const permissions = await permissionService.getAvailablePermissions();
      
      // Group permissions by tool, resource, and operation
      const grouped = permissions.reduce((acc, perm) => {
        const { tool, resource, action, category } = perm;
        
        if (!acc[tool]) acc[tool] = { name: tool, resources: {}, category };
        if (!acc[tool].resources[resource]) {
          acc[tool].resources[resource] = { 
            name: resource, 
            operations: [], 
            category: category 
          };
        }
        
        acc[tool].resources[resource].operations.push({
          action,
          id: perm.id,
          name: perm.name,
          description: perm.description,
          level: perm.level || 'standard' // basic, standard, advanced
        });
        
        return acc;
      }, {});

      return {
        success: true,
        data: {
          grouped,
          flat: permissions,
          metadata: {
            totalPermissions: permissions.length,
            tools: Object.keys(grouped).length,
            categories: [...new Set(permissions.map(p => p.category))]
          }
        }
      };
    } catch (error) {
      request.log.error('Error fetching available permissions:', error);
      return reply.code(500).send({ error: 'Failed to fetch permissions' });
    }
  });

  // Create role from template with customizations
  fastify.post('/from-template', {
    preHandler: [authenticateToken, requirePermission('roles:create'), checkRoleLimit, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['templateId', 'name'],
        properties: {
          templateId: { type: 'string' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          customizations: {
            type: 'object',
            properties: {
              addPermissions: { type: 'array', items: { type: 'string' } },
              removePermissions: { type: 'array', items: { type: 'string' } },
              restrictions: { type: 'object' },
              inheritance: {
                type: 'object',
                properties: {
                  parentRoles: { type: 'array', items: { type: 'string' } },
                  inheritanceType: { type: 'string', enum: ['merge', 'override', 'restrict'] }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const roleData = {
        ...request.body,
        tenantId: request.userContext.tenantId,
        createdBy: request.userContext.internalUserId
      };
      
      const role = await permissionService.createRoleFromTemplate(roleData);
      
      return {
        success: true,
        data: role,
        message: 'Role created from template successfully'
      };
    } catch (error) {
      request.log.error('Error creating role from template:', error);
      return reply.code(500).send({ error: 'Failed to create role from template' });
    }
  });

  // Get tenant roles with advanced filtering
  fastify.get('/', {
    preHandler: [authenticateToken, requirePermission('roles:read'), trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          type: { type: 'string', enum: ['all', 'system', 'custom', 'template'] },
          sortBy: { type: 'string', enum: ['name', 'created', 'modified', 'users'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          includeUsage: { type: 'boolean', default: false },
          includeInherited: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('📋 GET roles request:', {
        tenantId: request.userContext.tenantId,
        query: request.query
      });

      const roles = await permissionService.getTenantRoles(
        request.userContext.tenantId, 
        request.query
      );
      
      // Parse JSON fields for frontend consumption with error handling
      const parsedRoles = roles.data?.map(role => {
        let permissions = {};
        let restrictions = {};
        let metadata = {};
        
        try {
          // Handle both object and string data types
          if (typeof role.permissions === 'object' && role.permissions !== null) {
            permissions = role.permissions;
          } else if (typeof role.permissions === 'string' && role.permissions) {
            permissions = JSON.parse(role.permissions);
          } else {
            permissions = {};
          }
        } catch (error) {
          console.error(`Failed to parse permissions for role ${role.roleId}:`, error.message);
          permissions = {};
        }
        
        try {
          // Handle both object and string data types
          if (typeof role.restrictions === 'object' && role.restrictions !== null) {
            restrictions = role.restrictions;
          } else if (typeof role.restrictions === 'string' && role.restrictions) {
            restrictions = JSON.parse(role.restrictions);
          } else {
            restrictions = {};
          }
        } catch (error) {
          console.error(`Failed to parse restrictions for role ${role.roleId}:`, error.message);
          restrictions = {};
        }

        try {
          metadata = role.metadata ? JSON.parse(role.metadata) : {};
        } catch (error) {
          console.error(`Failed to parse metadata for role ${role.roleId}:`, error.message);
          metadata = {};
        }
        
        // Calculate permission counts for better frontend display
        let permissionCount = 0;
        let moduleCount = 0;
        let applicationCount = 0;
        
        if (Array.isArray(permissions)) {
          // Handle flat array permissions (from CustomRoleService)
          permissionCount = permissions.length;
          
          // Count unique applications and modules
          const apps = new Set();
          const modules = new Set();
          
          permissions.forEach(permission => {
            if (typeof permission === 'string') {
              const parts = permission.split('.');
              if (parts.length >= 3) {
                const [app, module] = parts;
                apps.add(app);
                modules.add(`${app}.${module}`);
              }
            }
          });
          
          applicationCount = apps.size;
          moduleCount = modules.size;
          
        } else if (typeof permissions === 'object' && permissions !== null) {
          // Handle hierarchical permissions (from PermissionService)
          const keys = Object.keys(permissions);
          
          // Skip metadata and other non-permission keys
          const permissionKeys = keys.filter(key => 
            key !== 'metadata' && key !== 'inheritance' && key !== 'restrictions'
          );
          
          applicationCount = permissionKeys.length;
          permissionKeys.forEach(appKey => {
            const appPerms = permissions[appKey];
            if (typeof appPerms === 'object' && appPerms !== null) {
              const modules = Object.keys(appPerms);
              moduleCount += modules.length;
              modules.forEach(moduleKey => {
                const modulePerms = appPerms[moduleKey];
                if (Array.isArray(modulePerms)) {
                  permissionCount += modulePerms.length;
                }
              });
            }
          });
        }
        
        // Convert flat array permissions to structured format for consistent frontend display
        let displayPermissions = permissions;
        
        if (Array.isArray(permissions)) {
          // Convert flat array to hierarchical structure for frontend
          displayPermissions = {};
          const groupedPermissions = {};
          
          permissions.forEach(permission => {
            if (typeof permission === 'string') {
              const parts = permission.split('.');
              if (parts.length >= 3) {
                const [app, module, ...actionParts] = parts;
                const action = actionParts.join('.');
                const appKey = app;
                const moduleKey = module;
                
                if (!groupedPermissions[appKey]) {
                  groupedPermissions[appKey] = {};
                }
                if (!groupedPermissions[appKey][moduleKey]) {
                  groupedPermissions[appKey][moduleKey] = [];
                }
                groupedPermissions[appKey][moduleKey].push(action);
              }
            }
          });
          
          displayPermissions = groupedPermissions;
        }

        return {
          ...role,
          permissions: displayPermissions,
          restrictions,
          metadata,
          // Add computed fields for frontend display
          permissionCount,
          moduleCount,
          applicationCount
        };
      }) || [];
      
      console.log('📊 Roles fetched successfully:', {
        count: parsedRoles.length,
        total: roles.total || 0
      });
      
      return {
        success: true,
        data: {
          roles: parsedRoles,
          total: roles.total || 0,
          pagination: {
            currentPage: roles.page || 1,
            totalPages: roles.totalPages || 1,
            limit: roles.limit || 20
          }
        }
      };
    } catch (error) {
      console.error('🚨 Error fetching tenant roles:', {
        error: error.message,
        stack: error.stack,
        tenantId: request.userContext.tenantId,
        query: request.query
      });
      
      // Provide more specific error response
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to fetch roles',
        message: 'An error occurred while fetching roles. Please try again.',
        code: 'FETCH_ROLES_ERROR',
        data: {
          roles: [],
          total: 0,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            limit: 20
          }
        }
      });
    }
  });

  // Create custom role with advanced features
  fastify.post('/', {
    preHandler: [authenticateToken, requirePermission('roles:create'), checkRoleLimit, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'permissions'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', default: '#6b7280' },
          icon: { type: 'string', maxLength: 10 },
          permissions: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                level: { type: 'string', enum: ['none', 'read', 'write', 'admin'] },
                operations: { type: 'array', items: { type: 'string' } },
                restrictions: {
                  type: 'object',
                  properties: {
                    timeRestrictions: { type: 'object' },
                    ipRestrictions: { type: 'object' },
                    dataRestrictions: { type: 'object' },
                    featureRestrictions: { type: 'object' }
                  }
                }
              }
            }
          },
          restrictions: {
            type: 'object',
            properties: {
              timeRestrictions: {
                type: 'object',
                properties: {
                  allowedHours: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 23 } },
                  allowedDays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
                  timezone: { type: 'string' },
                  blockWeekends: { type: 'boolean' },
                  blockHolidays: { type: 'boolean' }
                }
              },
              ipRestrictions: {
                type: 'object',
                properties: {
                  allowedIPs: { type: 'array', items: { type: 'string' } },
                  blockedIPs: { type: 'array', items: { type: 'string' } },
                  allowVPN: { type: 'boolean', default: true }
                }
              },
              dataRestrictions: {
                type: 'object',
                properties: {
                  maxRecordsPerDay: { type: 'integer', minimum: 0 },
                  maxExportsPerMonth: { type: 'integer', minimum: 0 },
                  allowedFileTypes: { type: 'array', items: { type: 'string' } },
                  maxFileSize: { type: 'integer', minimum: 0 },
                  dataRetentionDays: { type: 'integer', minimum: 0 }
                }
              },
              featureRestrictions: {
                type: 'object',
                properties: {
                  allowBulkOperations: { type: 'boolean', default: true },
                  allowAPIAccess: { type: 'boolean', default: false },
                  allowIntegrations: { type: 'boolean', default: false },
                  maxApiCalls: { type: 'integer', minimum: 0 }
                }
              }
            }
          },
          inheritance: {
            type: 'object',
            properties: {
              parentRoles: { type: 'array', items: { type: 'string' } },
              inheritanceMode: { type: 'string', enum: ['additive', 'restrictive', 'override'] },
              priority: { type: 'integer', minimum: 0, maximum: 100 }
            }
          },
          metadata: {
            type: 'object',
            properties: {
              tags: { type: 'array', items: { type: 'string' } },
              isTemplate: { type: 'boolean', default: false }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('role-create');
    
    try {
      Logger.role.create.start(requestId, {
        tenantId: request.userContext.tenantId,
        userId: request.userContext.internalUserId,
        roleName: request.body.name,
        hasDescription: !!request.body.description,
        permissionsCount: Object.keys(request.body.permissions || {}).length,
        hasRestrictions: !!request.body.restrictions,
        hasInheritance: !!request.body.inheritance,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      // Check if user has completed onboarding and has internal user record
      Logger.role.create.step(requestId, 'Validation', 'Checking user authorization', {
        hasInternalUserId: !!request.userContext.internalUserId,
        tenantId: request.userContext.tenantId
      });
      
      if (!request.userContext.internalUserId) {
        Logger.role.create.step(requestId, 'Error', 'User attempting to create role without internal user record');
        return reply.code(401).send({
          success: false,
          error: 'Access denied',
          message: 'You must complete onboarding before creating roles. Please complete your organization setup.',
          code: 'ONBOARDING_REQUIRED'
        });
      }

      const roleData = {
        ...request.body,
        tenantId: request.userContext.tenantId,
        createdBy: request.userContext.internalUserId
      };
      
      Logger.role.create.step(requestId, 'Processing', 'Creating role with permission service', {
        roleData: {
          name: roleData.name,
          tenantId: roleData.tenantId,
          createdBy: roleData.createdBy,
          permissionsCount: Object.keys(roleData.permissions || {}).length
        }
      });
      
      const role = await permissionService.createAdvancedRole(roleData);

      Logger.role.create.step(requestId, 'Success', 'Role created successfully', {
        roleId: role.roleId,
        roleName: role.roleName,
        tenantId: role.tenantId
      });

      // Log role creation activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        request.userContext.tenantId,
        null,
        ACTIVITY_TYPES.ROLE_CREATED,
        {
          roleId: role.roleId,
          roleName: role.roleName,
          permissionsCount: Object.keys(request.body.permissions || {}).length,
          tenantId: request.userContext.tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      // Publish role creation event to relevant applications (only apps with permissions)
      await publishRoleEventToApplications(
        'role.created',
        request.userContext.tenantId,
        role.roleId,
        {
          roleName: role.roleName,
          description: role.description,
          permissions: role.permissions,
          restrictions: role.restrictions,
          metadata: role.metadata,
          createdBy: role.createdBy,
          createdAt: role.createdAt
        }
      );
      
      // Parse JSON fields for frontend consumption with error handling
      let permissions = {};
      let restrictions = {};
      
      try {
        permissions = role.permissions ? JSON.parse(role.permissions) : {};
      } catch (error) {
        console.error(`Failed to parse permissions for created role ${role.roleId}:`, error.message);
        permissions = {};
      }
      
      try {
        restrictions = role.restrictions ? JSON.parse(role.restrictions) : {};
      } catch (error) {
        console.error(`Failed to parse restrictions for created role ${role.roleId}:`, error.message);
        restrictions = {};
      }
      
      const parsedRole = {
        ...role,
        permissions,
        restrictions
      };
      
      Logger.role.create.success(requestId, startTime, {
        roleId: parsedRole.roleId,
        roleName: parsedRole.roleName,
        tenantId: parsedRole.tenantId,
        permissionsCount: Object.keys(permissions).length,
        hasRestrictions: Object.keys(restrictions).length > 0
      });
      
      return {
        success: true,
        data: parsedRole,
        message: 'Role created successfully'
      };
    } catch (error) {
      console.error('🚨 Error creating role:', {
        error: error.message,
        stack: error.stack,
        tenantId: request.userContext.tenantId,
        requestBody: request.body
      });
      
      // Provide more specific error responses
      if (error.message.includes('already exists')) {
        return reply.code(409).send({ 
          success: false,
          error: 'Duplicate role name',
          message: error.message,
          code: 'DUPLICATE_ROLE_NAME'
        });
      }
      
      if (error.message.includes('Permission validation failed') || 
          error.message.includes('Restriction validation failed')) {
        return reply.code(400).send({ 
          success: false,
          error: 'Validation failed',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
      }
      
      if (error.message.includes('One or more parent roles not found')) {
        return reply.code(400).send({ 
          success: false,
          error: 'Invalid parent roles',
          message: 'One or more specified parent roles do not exist.',
          code: 'INVALID_PARENT_ROLES'
        });
      }
      
      // Generic server error
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to create role',
        message: 'An internal server error occurred while creating the role. Please try again.',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update role with advanced permissions
  fastify.put('/:roleId', {
    preHandler: [authenticateToken, requirePermission('roles:edit'), trackUsage],
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
          roleId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          icon: { type: 'string' },
          permissions: { 
            oneOf: [
              { type: 'array', items: { type: 'string' } },
              { type: 'object' }
            ]
          },
          restrictions: { 
            type: 'object',
            additionalProperties: true  // Allow any object structure
          },
          inheritance: { type: 'object' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleId } = request.params;
      const updateData = request.body;
      const tenantId = request.userContext.tenantId;

      console.log('🔄 Updating role:', {
        roleId,
        tenantId,
        requestBody: updateData,
        restrictionsType: typeof updateData.restrictions,
        restrictionsValue: updateData.restrictions
      });

      const updatedRole = await permissionService.updateAdvancedRole(tenantId, roleId, updateData);

      console.log('✅ Role updated successfully:', updatedRole);

      // Log role update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        request.userContext.tenantId,
        null,
        ACTIVITY_TYPES.ROLE_UPDATED,
        {
          roleId: roleId,
          updatedFields: Object.keys(updateData),
          tenantId: request.userContext.tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      // Publish role update event to relevant applications (only apps with permissions)
      await publishRoleEventToApplications(
        'role.updated',
        tenantId,
        roleId,
        {
          roleName: updatedRole.roleName || updatedRole.name,
          description: updatedRole.description,
          permissions: updatedRole.permissions,
          restrictions: updatedRole.restrictions,
          metadata: updatedRole.metadata,
          updatedBy: request.userContext.internalUserId,
          updatedAt: updatedRole.updatedAt || new Date()
        }
      );

      // Get users affected by this role change
      const affectedUsers = await db
        .select({
          userId: userRoleAssignments.userId,
          email: tenantUsers.email
        })
        .from(userRoleAssignments)
        .leftJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .where(eq(userRoleAssignments.roleId, roleId));

      console.log(`🔔 Role change affects ${affectedUsers.length} users`);

      // Trigger permission refresh notification for affected users
      if (affectedUsers.length > 0) {
        console.log('📢 Triggering permission refresh notifications...');
        console.log('👥 Users who should refresh permissions:', affectedUsers.map(u => u.email));
        
        // In a real implementation, you would implement WebSocket broadcasting here
        // For now, we'll include this information in the response so the frontend can handle it
      }

      return {
        success: true,
        data: updatedRole,
        affectedUsers: {
          count: affectedUsers.length,
          emails: affectedUsers.map(u => u.email),
          userIds: affectedUsers.map(u => u.userId)
        },
        message: `Role updated successfully. ${affectedUsers.length} users affected.`,
        // Include a flag that frontend can use to trigger refresh notifications
        shouldNotifyUsers: affectedUsers.length > 0
      };
    } catch (error) {
      console.error('🚨 Error updating role:', {
        error: error.message,
        stack: error.stack,
        roleId: request.params.roleId,
        tenantId: request.userContext?.tenantId,
        requestBody: request.body
      });

      return reply.code(500).send({
        error: 'Failed to update role',
        message: error.message
      });
    }
  });

  // Clone role with modifications
  fastify.post('/:roleId/clone', {
    preHandler: [authenticateToken, requirePermission('roles:create'), trackUsage],
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
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          modifications: {
            type: 'object',
            properties: {
              addPermissions: { 
                oneOf: [
                  { type: 'array', items: { type: 'string' } },
                  { type: 'object' }
                ]
              },
              removePermissions: { type: 'array', items: { type: 'string' } },
              updateRestrictions: { type: 'object' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleId } = request.params;
      const cloneData = {
        ...request.body,
        tenantId: request.userContext.tenantId,
        createdBy: request.userContext.internalUserId
      };
      
      const clonedRole = await permissionService.cloneRole(roleId, cloneData);
      
      return {
        success: true,
        data: clonedRole,
        message: 'Role cloned successfully'
      };
    } catch (error) {
      request.log.error('Error cloning role:', error);
      return reply.code(500).send({ error: 'Failed to clone role' });
    }
  });

  // Validate role permissions
  fastify.post('/:roleId/validate', {
    preHandler: [authenticateToken, requirePermission('roles:read'), trackUsage],
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
          context: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              ipAddress: { type: 'string' },
              timeOfAccess: { type: 'string', format: 'date-time' },
              requestedResource: { type: 'string' },
              requestedAction: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleId } = request.params;
      const { context } = request.body;
      
      const validation = await permissionService.validateRoleAccess(
        request.userContext.tenantId,
        roleId,
        context
      );
      
      return {
        success: true,
        data: validation
      };
    } catch (error) {
      request.log.error('Error validating role:', error);
      return reply.code(500).send({ error: 'Failed to validate role' });
    }
  });

  // Bulk operations on roles
  fastify.post('/bulk', {
    preHandler: [authenticateToken, requirePermission('roles:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['operation', 'roleIds'],
        properties: {
          operation: { type: 'string', enum: ['delete', 'activate', 'deactivate', 'export'] },
          roleIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
          options: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { operation, roleIds, options } = request.body;
      
      const result = await permissionService.bulkRoleOperation(
        request.userContext.tenantId,
        operation,
        roleIds,
        options,
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        data: result,
        message: `Bulk ${operation} completed successfully`
      };
    } catch (error) {
      request.log.error('Error in bulk role operation:', error);
      return reply.code(500).send({ error: 'Failed to complete bulk operation' });
    }
  });

  // Delete role with safety checks
  fastify.delete('/:roleId', {
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
      const tenantId = request.userContext.tenantId;
      
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
      
      const result = await permissionService.deleteRole(
        tenantId,
        roleId,
        {
          force,
          transferUsersTo,
          deletedBy: request.userContext.internalUserId
        }
      );

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
        try {
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
        } catch (publishError) {
          console.warn('⚠️ Failed to publish role deletion event:', publishError.message);
          // Don't fail the deletion if event publishing fails
        }
      }

      return {
        success: true,
        data: result,
        message: 'Role deleted successfully'
      };
    } catch (error) {
      request.log.error('Error deleting role:', error);
      return reply.code(500).send({ error: 'Failed to delete role' });
    }
  });

  // Specific bulk delete endpoint (for frontend compatibility)
  fastify.post('/bulk/delete', {
    preHandler: [authenticateToken, requirePermission('roles:delete'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['roleIds'],
        properties: {
          roleIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
          force: { type: 'boolean', default: false },
          transferUsersTo: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleIds, force, transferUsersTo } = request.body;
      
      const result = await permissionService.bulkRoleOperation(
        request.userContext.tenantId,
        'delete',
        roleIds,
        { force, transferUsersTo },
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        data: result,
        message: `Bulk delete completed successfully. ${result.summary.success} roles deleted, ${result.summary.failure} failed.`
      };
    } catch (error) {
      request.log.error('Error in bulk delete operation:', error);
      return reply.code(500).send({ error: 'Failed to complete bulk delete' });
    }
  });

  // Specific bulk deactivate endpoint (for frontend compatibility)
  fastify.post('/bulk/deactivate', {
    preHandler: [authenticateToken, requirePermission('roles:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['roleIds'],
        properties: {
          roleIds: { type: 'array', items: { type: 'string' }, minItems: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleIds } = request.body;
      
      const result = await permissionService.bulkRoleOperation(
        request.userContext.tenantId,
        'deactivate',
        roleIds,
        {},
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        data: result,
        message: `Bulk deactivate completed successfully. ${result.summary.success} roles deactivated, ${result.summary.failure} failed.`
      };
    } catch (error) {
      request.log.error('Error in bulk deactivate operation:', error);
      return reply.code(500).send({ error: 'Failed to complete bulk deactivate' });
    }
  });

  // Specific bulk export endpoint (for frontend compatibility)
  fastify.post('/bulk/export', {
    preHandler: [authenticateToken, requirePermission('roles:read'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['roleIds'],
        properties: {
          roleIds: { type: 'array', items: { type: 'string' }, minItems: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roleIds } = request.body;
      
      const result = await permissionService.bulkRoleOperation(
        request.userContext.tenantId,
        'export',
        roleIds,
        {},
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        data: result,
        message: `Bulk export completed successfully. ${result.summary.success} roles exported, ${result.summary.failure} failed.`
      };
    } catch (error) {
      request.log.error('Error in bulk export operation:', error);
      return reply.code(500).send({ error: 'Failed to complete bulk export' });
    }
  });
} 