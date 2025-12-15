/**
 * CRM Integration Routes - API endpoints for CRM tenant synchronization
 * Provides comprehensive tenant data for initial CRM sync and ongoing updates
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tenants,
  tenantUsers,
  entities,
  customRoles,
  userRoleAssignments,
  organizationMemberships,
  creditConfigurations,
  creditAllocations
} from '../db/schema/index.js';

export default async function crmIntegrationRoutes(fastify, options) {

  // Apply authentication and tenant isolation to all routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Verify authentication
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({
        success: false,
        message: 'Authentication failed'
      });
    }

    // Check if request comes from CRM backend (case-insensitive)
    const requestSource = request.headers['x-request-source'] || request.headers['X-Request-Source'];
    console.log('🔍 CRM Header check:', {
      'x-request-source': requestSource,
      'X-Request-Source': request.headers['X-Request-Source'],
      allHeaders: Object.keys(request.headers).filter(h => h.toLowerCase().includes('request-source'))
    });

    if (!requestSource || requestSource.toLowerCase() !== 'crm-backend') {
      return reply.code(403).send({
        success: false,
        message: 'Access restricted to CRM backend',
        receivedHeader: requestSource,
        expectedHeader: 'crm-backend'
      });
    }

    // Verify tenant access
    const { tenantId } = request.params;
    if (!tenantId) {
      return reply.code(400).send({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // For CRM backend, allow access to any tenant (service-level access)
    // Regular users are restricted to their own tenant
    if (!requestSource.includes('crm-backend')) {
      if (request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied to this tenant'
        });
      }
    }
  });

  // Organizations endpoint
  fastify.get('/tenants/:tenantId/organizations', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('🏢 Fetching organizations for tenant:', tenantId);

      const organizationsData = await db
        .select({
          orgCode: entities.entityCode,
          orgName: entities.entityName,
          hierarchy: entities.hierarchyPath,
          status: entities.isActive,
          createdAt: entities.createdAt
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization'),
          eq(entities.isActive, true)
        ))
        .orderBy(desc(entities.createdAt));

      const formattedData = organizationsData.map(org => ({
        orgCode: org.orgCode,
        orgName: org.orgName,
        hierarchy: org.hierarchy || {
          level: 0,
          parent: null,
          children: []
        },
        status: org.status ? 'active' : 'inactive'
      }));

      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch organizations:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch organizations'
      });
    }
  });

  // Roles endpoint
  fastify.get('/tenants/:tenantId/roles', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('👥 Fetching roles for tenant:', tenantId);

      // Try a simple query first to test database connection
      const testQuery = await db.select().from(customRoles).limit(1);
      console.log('🧪 Test query successful, found', testQuery.length, 'records');

      // Get all roles for this tenant (simplified query)
      const rolesData = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          isSystemRole: customRoles.isSystemRole,
          createdAt: customRoles.createdAt
        })
        .from(customRoles)
        .where(eq(customRoles.tenantId, tenantId));

      console.log('📊 Found', rolesData.length, 'total roles for tenant');

      const formattedData = rolesData.map(role => ({
        roleId: role.roleId,
        roleName: role.roleName,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        isActive: !role.isSystemRole // Consider non-system roles as active for CRM
      }));

      console.log('✅ Successfully fetched', formattedData.length, 'active roles');
      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch roles:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch roles',
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Users endpoint
  fastify.get('/tenants/:tenantId/users', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('👤 Fetching users for tenant:', tenantId);

      const usersData = await db
        .select({
          userId: tenantUsers.userId,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName,
          name: tenantUsers.name,
          isActive: tenantUsers.isActive,
          createdAt: tenantUsers.createdAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .orderBy(desc(tenantUsers.createdAt));

      const formattedData = usersData.map(user => ({
        userId: user.userId,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        employeeCode: user.name || user.email, // Use name or email as employee code fallback
        isActive: user.isActive
      }));

      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      console.error('❌ Stack trace:', error.stack);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch users',
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Employee Assignments endpoint
  fastify.get('/tenants/:tenantId/employee-assignments', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('🔗 Fetching employee assignments for tenant:', tenantId);

      const assignmentsData = await db
        .select({
          userId: organizationMemberships.userId,
          entityId: organizationMemberships.entityId,
          assignmentType: organizationMemberships.membershipType,
          hierarchy: organizationMemberships.hierarchy,
          isActive: organizationMemberships.isActive,
          priority: organizationMemberships.priority,
          createdAt: organizationMemberships.createdAt
        })
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.tenantId, tenantId),
          eq(organizationMemberships.isActive, true)
        ))
        .orderBy(desc(organizationMemberships.createdAt));

      const formattedData = assignmentsData.map(assignment => ({
        userIdString: assignment.userId,
        entityIdString: assignment.entityId,
        assignmentType: assignment.assignmentType || 'primary',
        hierarchy: assignment.hierarchy || { level: 1 },
        isActive: assignment.isActive,
        priority: assignment.priority || 1
      }));

      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch employee assignments:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch employee assignments'
      });
    }
  });

  // Role Assignments endpoint
  fastify.get('/tenants/:tenantId/role-assignments', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('🎭 Fetching role assignments for tenant:', tenantId);

      const assignmentsData = await db
        .select({
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          isActive: userRoleAssignments.isActive,
          createdAt: userRoleAssignments.createdAt
        })
        .from(userRoleAssignments)
        .where(and(
          eq(userRoleAssignments.tenantId, tenantId),
          eq(userRoleAssignments.isActive, true)
        ))
        .orderBy(desc(userRoleAssignments.createdAt));

      const formattedData = assignmentsData.map(assignment => ({
        userIdString: assignment.userId,
        roleId: assignment.roleId,
        isActive: assignment.isActive
      }));

      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch role assignments:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch role assignments'
      });
    }
  });

  // Credit Configs endpoint
  fastify.get('/tenants/:tenantId/credit-configs', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('💰 Fetching credit configs for tenant:', tenantId);

      const configsData = await db
        .select({
          operation: creditConfigurations.operation,
          credits: creditConfigurations.credits,
          isActive: creditConfigurations.isActive,
          createdAt: creditConfigurations.createdAt
        })
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isActive, true)
        ))
        .orderBy(desc(creditConfigurations.createdAt));

      const formattedData = configsData.map(config => ({
        operation: config.operation,
        credits: config.credits,
        isActive: config.isActive
      }));

      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch credit configs:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch credit configs'
      });
    }
  });

  // Entity Credits endpoint
  fastify.get('/tenants/:tenantId/entity-credits', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('📊 Fetching entity credits for tenant:', tenantId);

      const creditsData = await db
        .select({
          entityId: creditAllocations.entityId,
          allocatedCredits: creditAllocations.allocatedCredits,
          usedCredits: creditAllocations.usedCredits,
          isActive: creditAllocations.isActive,
          createdAt: creditAllocations.allocatedAt
        })
        .from(creditAllocations)
        .where(eq(creditAllocations.tenantId, tenantId))
        .orderBy(desc(creditAllocations.allocatedAt));

      const formattedData = creditsData.map(credit => ({
        entityId: credit.entityId,
        allocatedCredits: credit.allocatedCredits,
        usedCredits: credit.usedCredits || 0,
        isActive: credit.isActive
      }));

      return reply.send({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Failed to fetch entity credits:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch entity credits'
      });
    }
  });

  // Tenant sync endpoint
  fastify.post('/tenants/:tenantId/sync', async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { skipReferenceData = false, forceSync = false } = request.body || {};

      console.log('🔄 Triggering tenant sync:', { tenantId, skipReferenceData, forceSync });

      const { WrapperSyncService } = await import('../services/wrapper-sync-service.js');

      const syncResults = await WrapperSyncService.triggerTenantSync(tenantId, {
        skipReferenceData,
        forceSync,
        requestedBy: request.userContext?.userId || 'system'
      });

      return reply.send({
        success: true,
        data: syncResults
      });

    } catch (error) {
      console.error('❌ Tenant sync failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Tenant sync failed',
        error: error.message
      });
    }
  });

  // Get sync status endpoint
  fastify.get('/tenants/:tenantId/sync-status', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('📊 Getting sync status for tenant:', tenantId);

      const { WrapperSyncService } = await import('../services/wrapper-sync-service.js');

      const syncStatus = await WrapperSyncService.getSyncStatus(tenantId);

      return reply.send({
        success: true,
        data: syncStatus
      });

    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get sync status',
        error: error.message
      });
    }
  });

  // Get data requirements endpoint
  fastify.get('/data-requirements', async (request, reply) => {
    try {
      console.log('📋 Getting data requirements specification');

      const { WrapperSyncService } = await import('../services/wrapper-sync-service.js');

      const requirements = WrapperSyncService.getDataRequirements();

      return reply.send({
        success: true,
        data: requirements
      });

    } catch (error) {
      console.error('❌ Failed to get data requirements:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get data requirements',
        error: error.message
      });
    }
  });
}
