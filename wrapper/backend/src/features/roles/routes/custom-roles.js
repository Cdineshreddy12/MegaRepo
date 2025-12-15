import CustomRoleService from '../services/custom-role-service.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { trackUsage } from '../../../middleware/usage.js';

/**
 * 🎯 **CUSTOM ROLES API ROUTES**
 * Demonstrates complete workflow for creating roles from applications/modules
 */
export default async function customRolesRoutes(fastify, options) {
  
  /**
   * 1️⃣ **GET ROLE BUILDER OPTIONS**
   * Shows what apps/modules are available for role creation
   * Uses organization_applications to filter by tenant access
   */
  fastify.get('/builder-options', {
    preHandler: [authenticateToken, requirePermission('roles:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      
      const options = await CustomRoleService.getRoleCreationOptions(tenantId);
      
      return {
        success: true,
        message: 'Retrieved role builder options',
        data: {
          applications: options,
          totalApps: options.length,
          totalModules: options.reduce((sum, app) => sum + app.modules.length, 0),
          totalPermissions: options.reduce((sum, app) => 
            sum + app.modules.reduce((moduleSum, module) => 
              moduleSum + (module.permissions?.length || 0), 0
            ), 0
          )
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting builder options:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get role builder options'
      });
    }
  });
  
  /**
   * 2️⃣ **CREATE ROLE FROM BUILDER**
   * Creates custom role using selected apps, modules, and permissions
   */
  fastify.post('/create-from-builder', {
    preHandler: [authenticateToken, requirePermission('roles:create'), trackUsage]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { 
        roleName, 
        description, 
        selectedApps,      // ['crm', 'hr']
        selectedModules,   // { crm: ['leads', 'contacts'], hr: ['employees'] }
        selectedPermissions, // { 'crm.leads': ['read', 'create'], 'hr.employees': ['read'] }
        restrictions = {},
        metadata = {}
      } = request.body;
      
      // Validation
      if (!roleName || !selectedApps || !selectedModules || !selectedPermissions) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: roleName, selectedApps, selectedModules, selectedPermissions'
        });
      }
      
      const role = await CustomRoleService.createRoleFromAppsAndModules({
        tenantId,
        roleName,
        description,
        selectedApps,
        selectedModules,
        selectedPermissions,
        restrictions,
        metadata
      });
      
      return {
        success: true,
        message: `Created custom role "${roleName}"`,
        data: role
      };
      
    } catch (error) {
      console.error('❌ Error creating role:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create custom role'
      });
    }
  });
  
  /**
   * 2.5️⃣ **UPDATE ROLE FROM BUILDER**
   * Updates existing custom role using builder format data
   */
  fastify.put('/update-from-builder/:roleId', {
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
        required: ['roleName', 'selectedApps', 'selectedModules', 'selectedPermissions'],
        properties: {
          roleName: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          selectedApps: { type: 'array', items: { type: 'string' } },
          selectedModules: { type: 'object' },
          selectedPermissions: { type: 'object' },
          restrictions: { type: 'object' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { roleId } = request.params;
      const { 
        roleName, 
        description, 
        selectedApps,      // ['crm', 'hr']
        selectedModules,   // { crm: ['leads', 'contacts'], hr: ['employees'] }
        selectedPermissions, // { 'crm.leads': ['read', 'create'], 'hr.employees': ['read'] }
        restrictions = {},
        metadata = {}
      } = request.body;
      
      // Validation
      if (!roleName || !selectedApps || !selectedModules || !selectedPermissions) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: roleName, selectedApps, selectedModules, selectedPermissions'
        });
      }
      
      console.log('🔄 Updating role from builder:', { 
        roleId, 
        roleName,
        restrictionsType: typeof restrictions,
        restrictionsValue: restrictions
      });
      
      const updatedRole = await CustomRoleService.updateRoleFromAppsAndModules({
        tenantId,
        roleId,
        roleName,
        description,
        selectedApps,
        selectedModules,
        selectedPermissions,
        restrictions,
        metadata,
        updatedBy: request.userContext.internalUserId
      });
      
      // Publish role update event to Redis streams
      try {
        const { crmSyncStreams } = await import('../utils/redis.js');
        await crmSyncStreams.publishRoleEvent(tenantId, 'role_updated', {
          roleId: updatedRole.roleId,
          roleName: updatedRole.roleName,
          description: updatedRole.description,
          permissions: typeof updatedRole.permissions === 'string' 
            ? JSON.parse(updatedRole.permissions) 
            : updatedRole.permissions,
          restrictions: typeof updatedRole.restrictions === 'string'
            ? JSON.parse(updatedRole.restrictions)
            : updatedRole.restrictions,
          updatedBy: request.userContext.internalUserId,
          updatedAt: updatedRole.updatedAt || new Date().toISOString()
        });
        console.log('📡 Published role_updated event to Redis streams');
      } catch (publishError) {
        console.warn('⚠️ Failed to publish role_updated event:', publishError.message);
        // Don't fail the request if event publishing fails
      }
      
      return {
        success: true,
        message: `Updated custom role "${roleName}"`,
        data: updatedRole
      };
      
    } catch (error) {
      console.error('❌ Error updating role:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to update custom role'
      });
    }
  });
  
  /**
   * 3️⃣ **ASSIGN USER-SPECIFIC PERMISSIONS**
   * Shows why user_application_permissions table is needed
   */
  fastify.post('/assign-user-permissions', async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const {
        userId,
        appCode,
        moduleCode,
        permissions,
        reason = 'Custom access granted',
        expiresAt = null
      } = request.body;
      
      const userPerm = await CustomRoleService.assignUserSpecificPermissions({
        userId,
        tenantId,
        appCode,
        moduleCode,
        permissions,
        reason,
        expiresAt
      });
      
      return {
        success: true,
        message: `Assigned ${permissions.length} specific permissions to user`,
        data: userPerm
      };
      
    } catch (error) {
      console.error('❌ Error assigning user permissions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to assign user permissions'
      });
    }
  });
  
  /**
   * 4️⃣ **GET USER'S COMPLETE PERMISSIONS**
   * Shows how all tables work together for permission resolution
   */
  fastify.get('/user-permissions/:userId', async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { userId } = request.params;
      
      const result = await CustomRoleService.resolveUserPermissions({
        userId,
        tenantId
      });
      
      return {
        success: true,
        message: 'Retrieved user permissions',
        data: result
      };
      
    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get user permissions'
      });
    }
  });
  
  /**
   * 5️⃣ **DEMONSTRATE TABLE USAGE**
   * Educational endpoint showing why each table is needed
   */
  fastify.get('/demonstrate-usage', async (request, reply) => {
    try {
      await CustomRoleService.demonstrateTableUsage();
      
      return {
        success: true,
        message: 'Check console for demonstration of table usage',
        data: {
          explanation: {
            applications_table: 'Defines what apps exist in the system',
            application_modules_table: 'Defines modules and permissions within each app',
            organization_applications_table: 'Controls which apps/modules each tenant can access',
            user_application_permissions_table: 'Individual user-level permission overrides',
            custom_roles_table: 'Role definitions created from apps/modules'
          },
          workflow: [
            '1. Applications & Modules define what exists',
            '2. Organization Apps control tenant access',
            '3. Custom Roles grant access to selected features',
            '4. User Permissions provide individual overrides',
            '5. All layers combine for final permission resolution'
          ]
        }
      };
      
    } catch (error) {
      console.error('❌ Error demonstrating usage:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to demonstrate usage'
      });
    }
  });
  
  /**
   * 6️⃣ **EXAMPLE ROLE CREATION PAYLOAD**
   * Shows the exact structure needed to create roles
   */
  fastify.get('/example-payload', async (request, reply) => {
    return {
      success: true,
      data: {
        example_role_creation: {
          roleName: 'Senior Sales Manager',
          description: 'Sales manager with advanced permissions',
          selectedApps: ['crm', 'hr'],
          selectedModules: {
            crm: ['leads', 'contacts', 'accounts', 'opportunities'],
            hr: ['employees']
          },
          selectedPermissions: {
            'crm.leads': ['read', 'create', 'update', 'delete'],
            'crm.contacts': ['read', 'create', 'update'],
            'crm.accounts': ['read', 'create'],
            'crm.opportunities': ['read', 'create', 'update'],
            'hr.employees': ['read']
          },
          restrictions: {
            'crm.leads.bulk_delete': false // Explicitly deny bulk delete
          },
          metadata: {
            department: 'Sales',
            level: 'Senior',
            notes: 'Created for Q4 2024 sales push'
          }
        },
        example_user_override: {
          userId: 'user-123',
          appCode: 'crm',
          moduleCode: 'leads',
          permissions: ['bulk_import', 'advanced_search'],
          reason: 'Temporary access for data migration project',
          expiresAt: '2024-12-31T23:59:59Z'
        }
      }
    };
  });
} 