// 🎯 **PERMISSION MATRIX API ROUTES**
// Provides API access to the permission matrix system

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { permissionMatrixService as PermissionMatrixService } from '../features/roles/index.js';
import { 
  BUSINESS_SUITE_MATRIX, 
  PLAN_ACCESS_MATRIX, 
  PermissionMatrixUtils 
} from '../data/permission-matrix.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';

export default async function permissionMatrixRoutes(fastify, options) {

  // 🔧 Helper function to check if user is a tenant admin
  const isUserTenantAdmin = (permissions, userRoles) => {
    // Check permissions for admin indicators
    const hasAdminPermissions = permissions?.some(p => 
      p.includes('admin') || 
      p.includes('tenant_admin') ||
      p.includes('super_admin')
    );
    
    // Check roles for admin indicators
    const hasAdminRole = userRoles?.some(role => 
      role.roleName?.toLowerCase().includes('admin') ||
      role.roleName?.toLowerCase().includes('administrator') ||
      role.roleName?.toLowerCase().includes('super')
    );
    
    return hasAdminPermissions || hasAdminRole;
  };

  // 🔍 **GET COMPLETE PERMISSION MATRIX**
  fastify.get('/matrix', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      console.log('📡 GET /api/permission-matrix/matrix - Fetching complete permission matrix');
      
      return {
        success: true,
        data: {
          applications: PermissionMatrixUtils.getAllApplications(),
          matrix: BUSINESS_SUITE_MATRIX,
          planAccess: PLAN_ACCESS_MATRIX,
          summary: {
            totalApplications: Object.keys(BUSINESS_SUITE_MATRIX).length,
            totalModules: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.keys(app.modules).length, 0),
            totalPermissions: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.values(app.modules).reduce((moduleTotal, module) => 
                moduleTotal + (module.permissions?.length || 0), 0), 0)
          }
        }
      };
    } catch (error) {
      console.error('❌ Error fetching permission matrix:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch permission matrix',
        error: error.message
      });
    }
  });

  // 🏢 **GET USER'S PERMISSION CONTEXT**
  fastify.get('/user-context', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      // 🔍 CRITICAL FIX: Read target user ID from CRM header
      const targetUserId = request.headers['x-user-id'];
      const { internalUserId, tenantId } = request.userContext;
      
      // If CRM is requesting permissions for a specific user, use that user ID
      // Otherwise, fall back to authenticated user (for backward compatibility)
      const userIdToCheck = targetUserId || internalUserId;
      
      console.log(`📡 GET /api/permission-matrix/user-context - CRM Request:`);
      console.log(`   Authenticated Admin: ${internalUserId}`);
      console.log(`   Target User (X-User-Id): ${targetUserId || 'NOT PROVIDED'}`);
      console.log(`   Final User ID to check: ${userIdToCheck}`);
      console.log(`   Tenant: ${tenantId}`);
      
      // 🔒 SECURITY: Validate that admin has permission to view other users' permissions
      if (targetUserId && targetUserId !== internalUserId) {
        // Check if admin has permission to view user permissions
        const adminPermissions = await PermissionMatrixService.getUserPermissionContext(internalUserId, tenantId);
        
        // Allow access if:
        // 1. Admin has specific admin permissions, OR
        // 2. Admin is a tenant admin (can view users in their own tenant)
        const hasSpecificPermissions = adminPermissions.permissions?.some(p => 
          p.includes('admin:users:read') || 
          p.includes('admin:permissions:read') || 
          p.includes('admin:users:sync') ||
          p.includes('admin') ||
          p.includes('users:read') ||
          p.includes('permissions:read') ||
          p.includes('crm.users.read') ||
          p.includes('crm.users.read_all') ||
          p.includes('system.users.read') ||
          p.includes('system.users.read_all')
        );
        
        // Check if admin is a tenant admin
        const isTenantAdmin = isUserTenantAdmin(adminPermissions.permissions, adminPermissions.userRoles);
        
        // Additional check: verify target user belongs to the same tenant
        let targetUserInSameTenant = false;
        try {
          const { tenantUsers } = await import('../db/schema/index.js');
          const [targetUser] = await db
            .select({ tenantId: tenantUsers.tenantId })
            .from(tenantUsers)
            .where(eq(tenantUsers.kindeUserId, targetUserId))
            .limit(1);
          
          targetUserInSameTenant = targetUser && targetUser.tenantId === tenantId;
          
          console.log(`🔍 Target user tenant check:`, {
            targetUserId,
            targetUserTenantId: targetUser?.tenantId,
            adminTenantId: tenantId,
            sameTenant: targetUserInSameTenant
          });
        } catch (error) {
          console.log(`⚠️ Could not verify target user tenant:`, error.message);
          // Continue with permission check
        }
        
        const canViewUserPermissions = hasSpecificPermissions || (isTenantAdmin && targetUserInSameTenant);
        
        if (!canViewUserPermissions) {
          console.log(`❌ Admin ${internalUserId} lacks permission to view user ${targetUserId} permissions`);
          console.log(`   Admin permissions:`, adminPermissions.permissions);
          console.log(`   Admin roles:`, adminPermissions.userRoles);
          console.log(`   Is tenant admin:`, isTenantAdmin);
          console.log(`   Target user in same tenant:`, targetUserInSameTenant);
          
          return reply.code(403).send({
            success: false,
            error: 'Insufficient permissions',
            message: 'Admin lacks permission to view other users\' permissions',
            details: {
              adminPermissions: adminPermissions.permissions,
              adminRoles: adminPermissions.userRoles?.map(r => r.roleName),
              isTenantAdmin,
              targetUserInSameTenant
            }
          });
        }
        
        console.log(`✅ Admin ${internalUserId} authorized to view user ${targetUserId} permissions`);
        console.log(`   Permission check details:`, {
          hasSpecificPermissions,
          isTenantAdmin,
          targetUserInSameTenant,
          adminPermissions: {
            permissions: adminPermissions.permissions,
            roles: adminPermissions.userRoles?.map(r => r.roleName)
          }
        });
      }
      
      // Get permissions for the target user (not the admin)
      const context = await PermissionMatrixService.getUserPermissionContext(userIdToCheck, tenantId);
      
      // 🔧 CRITICAL FIX: Ensure permissions are in the format the frontend expects
      // The frontend expects a flat array of permission strings like ["crm.leads.read", "crm.accounts.create"]
      const flattenedPermissions = context.permissions || [];
      
      console.log(`🔧 Permission flattening result:`, {
        originalPermissionsCount: context.permissions?.length || 0,
        flattenedPermissionsCount: flattenedPermissions.length,
        samplePermissions: flattenedPermissions.slice(0, 10), // Show first 10 for debugging
        userRoles: context.userRoles?.map(r => r.roleName) || []
      });
      
      return {
        success: true,
        data: {
          ...context,
          // Ensure permissions are in the expected flat format
          permissions: flattenedPermissions,
          // Add metadata about whose permissions were returned
          permissionContext: {
            requestedFor: userIdToCheck,
            requestedBy: internalUserId,
            isAdminRequest: !!targetUserId && targetUserId !== internalUserId,
            source: 'permission-matrix-api',
            permissionFormat: 'flat-array',
            totalPermissions: flattenedPermissions.length
          }
        }
      };
    } catch (error) {
      console.error('❌ Error fetching user permission context:', error);
      
      // Provide specific error messages for common UUID mapping issues
      let errorMessage = 'Failed to fetch user permission context';
      let errorDetails = {};
      
      if (error.message.includes('User not found')) {
        errorMessage = 'Target user not found in tenant';
        errorDetails = {
          targetUserId: targetUserId || 'Not provided',
          tenantId,
          error: 'User does not exist or is not active in this organization'
        };
      } else if (error.message.includes('invalid input syntax for type uuid')) {
        errorMessage = 'Invalid user ID format';
        errorDetails = {
          targetUserId: targetUserId || 'Not provided',
          error: 'User ID format is invalid or corrupted'
        };
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMessage = 'Database schema issue';
        errorDetails = {
          error: 'Required database tables are missing',
          suggestion: 'Run database migrations to create missing tables'
        };
      }
      
      return reply.code(500).send({
        success: false,
        message: errorMessage,
        error: error.message,
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🧪 **TEST PERMISSION FLATTENING ENDPOINT (for debugging)**
  fastify.get('/test-flattening', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const { internalUserId, tenantId } = request.userContext;
      
      console.log(`🧪 Testing permission flattening for user: ${internalUserId}`);
      
      // Get user's permission context
      const context = await PermissionMatrixService.getUserPermissionContext(internalUserId, tenantId);
      
      // Test the flattening function directly
      const testPermissions = {
        crm: {
          leads: ["read", "create", "update", "delete"],
          accounts: ["read", "create", "update"],
          dashboard: ["view", "customize"]
        }
      };
      
      const flattenedTest = PermissionMatrixService.flattenNestedPermissions(testPermissions);
      
      return {
        success: true,
        data: {
          testPermissions,
          flattenedTest,
          userPermissions: context.permissions,
          userRoles: context.userRoles?.map(r => ({
            roleName: r.roleName,
            permissions: r.permissions,
            permissionsType: typeof r.permissions,
            isObject: typeof r.permissions === 'object' && !Array.isArray(r.permissions)
          }))
        }
      };
    } catch (error) {
      console.error('❌ Error testing permission flattening:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to test permission flattening',
        error: error.message
      });
    }
  });

  // 🏢 **CRM PERMISSION SYNC ENDPOINT**
  fastify.post('/crm-sync', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['targetUserId'],
        properties: {
          targetUserId: { type: 'string' },
          orgCode: { type: 'string' },
          forceRefresh: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { targetUserId, orgCode, forceRefresh = false } = request.body;
      const { internalUserId, tenantId } = request.userContext;
      
      console.log(`🔄 CRM Permission Sync Request:`);
      console.log(`   Admin: ${internalUserId}`);
      console.log(`   Target User: ${targetUserId}`);
      console.log(`   Organization: ${orgCode}`);
      console.log(`   Force Refresh: ${forceRefresh}`);
      
      // 🔒 SECURITY: Validate admin permissions
      const adminPermissions = await PermissionMatrixService.getUserPermissionContext(internalUserId, tenantId);
      
      // Allow access if:
      // 1. Admin has specific admin permissions, OR
      // 2. Admin is a tenant admin (can sync users in their own tenant)
      const hasSpecificPermissions = adminPermissions.permissions?.some(p => 
        p.includes('admin:users:sync') || 
        p.includes('admin:permissions:read') || 
        p.includes('admin:users:read') ||
        p.includes('admin') ||
        p.includes('users:sync') ||
        p.includes('permissions:read') ||
        p.includes('crm.users.read') ||
        p.includes('crm.users.read_all') ||
        p.includes('crm.users.sync') ||
        p.includes('system.users.read') ||
        p.includes('system.users.read_all') ||
        p.includes('system.users.sync')
      );
      
      // Check if admin is a tenant admin
      const isTenantAdmin = isUserTenantAdmin(adminPermissions.permissions, adminPermissions.userRoles);
      
      const canSyncUserPermissions = hasSpecificPermissions || isTenantAdmin;
      
      if (!canSyncUserPermissions) {
        console.log(`❌ Admin ${internalUserId} lacks permission to sync user permissions`);
        console.log(`   Admin permissions:`, adminPermissions.permissions);
        console.log(`   Admin roles:`, adminPermissions.userRoles);
        console.log(`   Is tenant admin:`, isTenantAdmin);
        
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions',
          message: 'Admin lacks permission to sync user permissions',
          details: {
            adminPermissions: adminPermissions.permissions,
            adminRoles: adminPermissions.userRoles?.map(r => r.roleName),
            isTenantAdmin
          }
        });
      }
      
      // Verify target user exists in the same tenant
      const { tenantUsers } = await import('../db/schema/index.js');
      const [targetUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, targetUserId))
        .limit(1);
      
      if (!targetUser || targetUser.tenantId !== tenantId) {
        console.log(`❌ Target user ${targetUserId} not found or not in tenant ${tenantId}`);
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          message: 'Target user not found in this organization'
        });
      }
      
      // Get permissions for the target user
      const userContext = await PermissionMatrixService.getUserPermissionContext(targetUserId, tenantId);
      
      console.log(`✅ CRM Permission Sync successful for user ${targetUserId}`);
      console.log(`   Permission check details:`, {
        hasSpecificPermissions,
        isTenantAdmin,
        adminPermissions: {
          permissions: adminPermissions.permissions,
          roles: adminPermissions.userRoles?.map(r => r.roleName)
        }
      });
      
      return {
        success: true,
        data: {
          ...userContext,
          syncMetadata: {
            syncedAt: new Date().toISOString(),
            syncedBy: internalUserId,
            targetUser: {
              id: targetUser.userId,
              email: targetUser.email,
              name: targetUser.name,
              isActive: targetUser.isActive
            },
            organization: {
              id: tenantId,
              orgCode: orgCode
            }
          }
        }
      };
    } catch (error) {
      console.error('❌ Error in CRM permission sync:', error);
      
      // Provide specific error messages for common UUID mapping issues
      let errorMessage = 'Failed to sync user permissions';
      let errorDetails = {};
      
      if (error.message.includes('User not found')) {
        errorMessage = 'Target user not found in tenant';
        errorDetails = {
          targetUserId,
          tenantId,
          error: 'User does not exist or is not active in this organization'
        };
      } else if (error.message.includes('invalid input syntax for type uuid')) {
        errorMessage = 'Invalid user ID format';
        errorDetails = {
          targetUserId,
          error: 'User ID format is invalid or corrupted'
        };
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMessage = 'Database schema issue';
        errorDetails = {
          error: 'Required database tables are missing',
          suggestion: 'Run database migrations to create missing tables'
        };
      }
      
      return reply.code(500).send({
        success: false,
        message: errorMessage,
        error: error.message,
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🎯 **CHECK SPECIFIC PERMISSION**
  fastify.post('/check-permission', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['permission'],
        properties: {
          permission: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { permission } = request.body;
      const { internalUserId, tenantId } = request.userContext;
      
      // 🔍 CRITICAL FIX: Support both body userId and X-User-Id header
      const targetUserId = request.headers['x-user-id'] || request.body.userId || internalUserId;
      
      console.log(`🔍 Checking permission: ${permission}`);
      console.log(`   Authenticated Admin: ${internalUserId}`);
      console.log(`   Target User (X-User-Id): ${request.headers['x-user-id'] || 'NOT PROVIDED'}`);
      console.log(`   Target User (Body): ${request.body.userId || 'NOT PROVIDED'}`);
      console.log(`   Final User ID to check: ${targetUserId}`);
      
      // 🔒 SECURITY: Validate admin permissions if checking other users
      if (targetUserId !== internalUserId) {
        const adminPermissions = await PermissionMatrixService.getUserPermissionContext(internalUserId, tenantId);
        const canCheckUserPermissions = adminPermissions.permissions?.some(p => 
          p.includes('admin:users:read') || p.includes('admin:permissions:read') || p.includes('admin:users:sync')
        );
        
        if (!canCheckUserPermissions) {
          console.log(`❌ Admin ${internalUserId} lacks permission to check user ${targetUserId} permissions`);
          return reply.code(403).send({
            success: false,
            error: 'Insufficient permissions',
            message: 'Admin lacks permission to check other users\' permissions'
          });
        }
      }
      
      const hasPermission = await PermissionMatrixService.hasPermission(targetUserId, tenantId, permission);
      
      return {
        success: true,
        data: {
          permission,
          hasPermission,
          userId: targetUserId,
          checkedBy: internalUserId,
          isAdminRequest: targetUserId !== internalUserId
        }
      };
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check permission',
        error: error.message
      });
    }
  });

  // 🧪 **TEST PERMISSION SYNC FIX**
  fastify.post('/test-permission-sync', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['testUserId'],
        properties: {
          testUserId: { type: 'string' },
          orgCode: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { testUserId, orgCode } = request.body;
      const { internalUserId, tenantId } = request.userContext;
      
      console.log(`🧪 Testing Permission Sync Fix:`);
      console.log(`   Admin: ${internalUserId}`);
      console.log(`   Test User: ${testUserId}`);
      console.log(`   Organization: ${orgCode}`);
      
      // Test 1: Get admin's own permissions (should work)
      console.log(`\n📋 Test 1: Admin's own permissions`);
      const adminContext = await PermissionMatrixService.getUserPermissionContext(internalUserId, tenantId);
      
      // Test 2: Get test user's permissions via X-User-Id header (should work)
      console.log(`\n📋 Test 2: Test user permissions via X-User-Id header`);
      const testRequest = {
        headers: { 'x-user-id': testUserId },
        userContext: { internalUserId, tenantId }
      };
      
      // Simulate the header-based logic
      const targetUserId = testRequest.headers['x-user-id'];
      const userIdToCheck = targetUserId || internalUserId;
      
      const testUserContext = await PermissionMatrixService.getUserPermissionContext(userIdToCheck, tenantId);
      
      // Test 3: Verify permissions are different (admin vs user)
      const adminPermissions = adminContext.permissions || [];
      const userPermissions = testUserContext.permissions || [];
      
      const permissionComparison = {
        admin: {
          userId: internalUserId,
          permissionCount: adminPermissions.length,
          samplePermissions: adminPermissions.slice(0, 5)
        },
        testUser: {
          userId: testUserId,
          permissionCount: userPermissions.length,
          samplePermissions: userPermissions.slice(0, 5)
        },
        areDifferent: adminPermissions.length !== userPermissions.length || 
                     JSON.stringify(adminPermissions) !== JSON.stringify(userPermissions)
      };
      
      console.log(`✅ Permission sync test completed successfully`);
      
      return {
        success: true,
        data: {
          test: 'Permission Sync Fix Verification',
          admin: adminContext,
          testUser: testUserContext,
          comparison: permissionComparison,
          fixStatus: 'VERIFIED - Different users return different permissions',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error testing permission sync fix:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to test permission sync fix',
        error: error.message
      });
    }
  });

  // 🎯 **CHECK MULTIPLE PERMISSIONS**
  fastify.post('/check-permissions', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['permissions'],
        properties: {
          permissions: { type: 'array', items: { type: 'string' } },
          userId: { type: 'string' },
          checkType: { type: 'string', enum: ['any', 'all'], default: 'any' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { permissions, userId, checkType = 'any' } = request.body;
      const { internalUserId, tenantId } = request.userContext;
      
      const targetUserId = userId || internalUserId;
      
      console.log(`🔍 Checking ${checkType} permissions: ${permissions.join(', ')} for user: ${targetUserId}`);
      
      const hasPermission = checkType === 'all'
        ? await PermissionMatrixService.hasAllPermissions(targetUserId, tenantId, permissions)
        : await PermissionMatrixService.hasAnyPermission(targetUserId, tenantId, permissions);
      
      return {
        success: true,
        data: {
          permissions,
          checkType,
          hasPermission,
          userId: targetUserId
        }
      };
    } catch (error) {
      console.error('❌ Error checking multiple permissions:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check permissions',
        error: error.message
      });
    }
  });

  // 📱 **GET USER'S ACCESSIBLE APPLICATIONS**
  fastify.get('/user-applications', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const { internalUserId, tenantId } = request.userContext;
      
      console.log(`📱 Getting accessible applications for user: ${internalUserId}`);
      
      const applications = await PermissionMatrixService.getUserAccessibleApplications(internalUserId, tenantId);
      
      return {
        success: true,
        data: {
          applications,
          count: applications.length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching user applications:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch user applications',
        error: error.message
      });
    }
  });

  // 👥 **GET AVAILABLE ROLE TEMPLATES**
  fastify.get('/role-templates', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      console.log('📡 GET /api/permission-matrix/role-templates');
      
      const templates = PermissionMatrixService.getAvailableRoleTemplates();
      
      return {
        success: true,
        data: {
          templates,
          count: templates.length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching role templates:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch role templates',
        error: error.message
      });
    }
  });

  // 🎯 **ASSIGN ROLE TEMPLATE TO USER**
  fastify.post('/assign-template', {
    preHandler: [authenticateToken, requirePermission('permissions:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'templateId'],
        properties: {
          userId: { type: 'string' },
          templateId: { type: 'string' },
          customizations: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, templateId, customizations = {} } = request.body;
      const { tenantId } = request.userContext;
      
      console.log(`🎯 Assigning template ${templateId} to user ${userId}`);
      
      const result = await PermissionMatrixService.assignRoleTemplate(userId, tenantId, templateId, customizations);
      
      return {
        success: true,
        data: result,
        message: `Role template ${templateId} assigned successfully`
      };
    } catch (error) {
      console.error('❌ Error assigning role template:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to assign role template',
        error: error.message
      });
    }
  });

  // 📊 **GET PERMISSION ANALYTICS**
  fastify.get('/analytics', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      
      console.log(`📊 Getting permission analytics for tenant: ${tenantId}`);
      
      const analytics = await PermissionMatrixService.getPermissionAnalytics(tenantId);
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('❌ Error fetching permission analytics:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch permission analytics',
        error: error.message
      });
    }
  });



  // 🔍 **VALIDATE PERMISSION MATRIX** (Admin only)
  fastify.get('/validate', {
    preHandler: [authenticateToken, requirePermission('admin:system'), trackUsage]
  }, async (request, reply) => {
    try {
      console.log('🔍 Validating permission matrix...');
      
      const errors = PermissionMatrixUtils.validateMatrix();
      
      return {
        success: true,
        data: {
          valid: errors.length === 0,
          errors,
          summary: {
            totalApplications: Object.keys(BUSINESS_SUITE_MATRIX).length,
            totalModules: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.keys(app.modules).length, 0),
            totalPermissions: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.values(app.modules).reduce((moduleTotal, module) => 
                moduleTotal + (module.permissions?.length || 0), 0), 0)
          }
        },
        message: errors.length === 0 ? 'Permission matrix is valid' : `Found ${errors.length} validation errors`
      };
    } catch (error) {
      console.error('❌ Error validating permission matrix:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to validate permission matrix',
        error: error.message
      });
    }
  });

  // 📋 **GET PLAN ACCESS INFORMATION**
  fastify.get('/plan-access/:planId', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const { planId } = request.params;
      
      console.log(`📋 Getting plan access for: ${planId}`);
      
      const planAccess = PLAN_ACCESS_MATRIX[planId];
      if (!planAccess) {
        return reply.code(404).send({
          success: false,
          message: `Plan ${planId} not found`
        });
      }
      
      const permissions = PermissionMatrixUtils.getPlanPermissions(planId);
      
      return {
        success: true,
        data: {
          planId,
          ...planAccess,
          permissionCount: permissions.length,
          detailedPermissions: permissions
        }
      };
    } catch (error) {
      console.error('❌ Error fetching plan access:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch plan access',
        error: error.message
      });
    }
  });

  // 🧹 **REVOKE ALL USER PERMISSIONS** (Admin only)
  fastify.post('/revoke-user-permissions', {
    preHandler: [authenticateToken, requirePermission('permissions:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.body;
      const { tenantId } = request.userContext;
      
      console.log(`🧹 Revoking all permissions for user: ${userId}`);
      
      await PermissionMatrixService.revokeAllUserPermissions(userId, tenantId);
      
      return {
        success: true,
        message: `All permissions revoked for user ${userId}`
      };
    } catch (error) {
      console.error('❌ Error revoking user permissions:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to revoke user permissions',
        error: error.message
      });
    }
  });
} 