import { authenticateToken } from '../middleware/auth.js';
import { WrapperSyncService } from '../services/wrapper-sync-service.js';

// Combined authentication middleware that accepts both Kinde tokens and service tokens
async function authenticateServiceOrToken(request, reply) {
  try {
    // Try service token validation first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔑 Token received - Length:', token.length);

      try {
        // Try to decode as service token
        const { verify } = await import('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        const decoded = verify(token, secret);

        if (decoded.type === 'service_token' && decoded.service === 'crm') {
          console.log('✅ Service token validated for CRM');
          request.serviceAuth = decoded;
          return; // Service token is valid
        }
      } catch (serviceTokenError) {
        // Not a valid service token, try regular Kinde authentication
        console.log('🔄 Service token validation failed, trying Kinde auth');
      }
    }

    // Fall back to regular Kinde authentication
    await authenticateToken(request, reply);
  } catch (error) {
    console.log('❌ All authentication methods failed');
    throw error;
  }
}
import { EventTrackingService } from '../services/event-tracking-service.js';
import { InterAppEventService } from '../services/inter-app-event-service.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, entities, credits, creditConfigurations, organizationMemberships } from '../db/schema/index.js';
// REMOVED: creditAllocations - Table removed, applications manage their own credits
import { eq, and, or, sql } from 'drizzle-orm';
import ErrorResponses from '../utils/error-responses.js';
import { getRedis } from '../utils/redis.js';
import { BUSINESS_SUITE_MATRIX } from '../data/permission-matrix.js';

/**
 * Wrapper CRM Data Synchronization Routes
 * Provides endpoints for CRM to sync tenant data from Wrapper
 */
export default async function wrapperCrmSyncRoutes(fastify, options) {

  // ===============================
  // SYNC MANAGEMENT ENDPOINTS
  // ===============================

  // Trigger full tenant data synchronization
  fastify.post('/tenants/:tenantId/sync', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Trigger full tenant data synchronization for CRM',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          skipReferenceData: { type: 'boolean', default: false },
          forceSync: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { skipReferenceData = false, forceSync = false } = request.query;

      console.log(`🔄 Triggering tenant sync for ${tenantId}`, {
        skipReferenceData,
        forceSync,
        requestedBy: request.userContext.email
      });

      const result = await WrapperSyncService.triggerTenantSync(tenantId, {
        skipReferenceData,
        forceSync,
        requestedBy: request.userContext.internalUserId
      });

      return {
        success: true,
        message: 'Tenant data sync completed successfully',
        results: result
      };
    } catch (error) {
      console.error('❌ Error triggering tenant sync:', error);
      return reply.code(500).send({
        success: false,
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // Get sync status for tenant
  fastify.get('/tenants/:tenantId/sync/status', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get tenant sync status',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const status = await WrapperSyncService.getSyncStatus(tenantId);

      return {
        success: true,
        tenantId: tenantId,
        status: status
      };
    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  // Get sync health metrics for a tenant
  fastify.get('/tenants/:tenantId/sync/health', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get sync health metrics and event acknowledgment status',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const healthMetrics = await EventTrackingService.getSyncHealthMetrics(tenantId);

      return {
        success: true,
        tenantId,
        health: healthMetrics
      };
    } catch (error) {
      console.error('❌ Error getting sync health metrics:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get sync health metrics',
        message: error.message
      });
    }
  });

  // Get inter-application sync health metrics
  fastify.get('/tenants/:tenantId/sync/inter-app-health', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get inter-application sync health metrics showing communication between all business suite apps',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const interAppHealth = await EventTrackingService.getInterAppSyncHealth(tenantId);

      return {
        success: true,
        tenantId,
        interAppHealth
      };
    } catch (error) {
      console.error('❌ Error getting inter-app sync health metrics:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get inter-app sync health metrics',
        message: error.message
      });
    }
  });

  // Get inter-application communication matrix
  fastify.get('/tenants/:tenantId/communication-matrix', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get detailed communication matrix showing all inter-application event flows',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const communicationMatrix = await InterAppEventService.getCommunicationMatrix(tenantId);

      return {
        success: true,
        tenantId,
        communicationMatrix
      };
    } catch (error) {
      console.error('❌ Error getting communication matrix:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get communication matrix',
        message: error.message
      });
    }
  });

  // Publish inter-application event (for testing/debugging)
  fastify.post('/tenants/:tenantId/inter-app-events', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Publish an event from any app to any other app (for testing)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['sourceApplication', 'targetApplication', 'eventType'],
        properties: {
          sourceApplication: { type: 'string', enum: ['wrapper', 'crm', 'hr', 'affiliate', 'system'] },
          targetApplication: { type: 'string', enum: ['wrapper', 'crm', 'hr', 'affiliate', 'system'] },
          eventType: { type: 'string' },
          entityId: { type: 'string' },
          eventData: { type: 'object' },
          publishedBy: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const {
        sourceApplication,
        targetApplication,
        eventType,
        entityId,
        eventData = {},
        publishedBy = request.userContext?.internalUserId || 'system'
      } = request.body;

      const result = await InterAppEventService.publishEvent({
        eventType,
        sourceApplication,
        targetApplication,
        tenantId,
        entityId,
        eventData,
        publishedBy
      });

      return {
        success: true,
        message: `Event published: ${sourceApplication} → ${targetApplication} (${eventType})`,
        eventId: result.eventId,
        tenantId
      };
    } catch (error) {
      console.error('❌ Error publishing inter-app event:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to publish inter-app event',
        message: error.message
      });
    }
  });

  // Get unacknowledged events for reconciliation
  fastify.get('/tenants/:tenantId/events/unacknowledged', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get events that have not been acknowledged by target applications',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          hoursOld: { type: 'number', default: 24, description: 'Events older than this many hours' },
          limit: { type: 'number', default: 50, description: 'Maximum events to return' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { hoursOld = 24, limit = 50 } = request.query;

      const unacknowledgedEvents = await EventTrackingService.getUnacknowledgedEvents(tenantId, hoursOld);

      return {
        success: true,
        tenantId,
        unacknowledgedEvents: unacknowledgedEvents.slice(0, limit),
        totalCount: unacknowledgedEvents.length,
        hoursThreshold: hoursOld
      };
    } catch (error) {
      console.error('❌ Error getting unacknowledged events:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get unacknowledged events',
        message: error.message
      });
    }
  });

  // Trigger reconciliation for unacknowledged events
  fastify.post('/tenants/:tenantId/events/reconcile', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Trigger reconciliation for unacknowledged events',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          hoursOld: { type: 'number', default: 24, description: 'Events older than this many hours to reconcile' },
          forceResend: { type: 'boolean', default: false, description: 'Force resend of events instead of just marking as reconciled' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { hoursOld = 24, forceResend = false } = request.query;

      const unacknowledgedEvents = await EventTrackingService.getUnacknowledgedEvents(tenantId, hoursOld);

      const reconciliationResults = {
        tenantId,
        totalUnacknowledged: unacknowledgedEvents.length,
        reconciled: 0,
        resent: 0,
        errors: []
      };

      // In a real implementation, you would:
      // 1. Check current state in CRM
      // 2. Compare with wrapper state
      // 3. Resend events or mark as reconciled

      console.log(`🔄 Reconciliation triggered for ${tenantId}: ${unacknowledgedEvents.length} unacknowledged events`);

      return {
        success: true,
        reconciliation: reconciliationResults
      };
    } catch (error) {
      console.error('❌ Error during reconciliation:', error);
      return reply.code(500).send({
        success: false,
        error: 'Reconciliation failed',
        message: error.message
      });
    }
  });

  // Get data requirements specification
  fastify.get('/data-requirements', {
    schema: {
      description: 'Get complete data requirements specification for CRM integration'
    }
  }, async (request, reply) => {
    try {
      const requirements = WrapperSyncService.getDataRequirements();

      return {
        success: true,
        data: requirements
      };
    } catch (error) {
      console.error('❌ Error getting data requirements:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get data requirements',
        message: error.message
      });
    }
  });

  // ===============================
  // TENANT DATA ENDPOINTS
  // ===============================

  // Get basic tenant information
  fastify.get('/tenants/:tenantId', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get basic tenant information for CRM',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Verify tenant exists and user has access
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          isActive: tenants.isActive
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // Return simplified data to avoid transformation issues
      return {
        success: true,
        data: {
          tenantId: tenant.tenantId,
          tenantName: tenant.companyName,
          status: tenant.isActive ? 'active' : 'inactive',
          settings: {},
          subscription: {},
          organization: {
            orgCode: tenant.tenantId,
            orgName: tenant.companyName
          }
        }
      };
    } catch (error) {
      console.error('❌ Error fetching tenant:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch tenant',
        message: error.message
      });
    }
  });

  // Get user profiles for tenant
  fastify.get('/tenants/:tenantId/users', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get user profiles for tenant (CRM format)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          entityId: { type: 'string' },
          includeInactive: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { entityId, includeInactive = false, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [eq(tenantUsers.tenantId, tenantId)];
      if (entityId) {
        conditions.push(eq(tenantUsers.entityId, entityId));
      }
      if (!includeInactive) {
        conditions.push(eq(tenantUsers.isActive, true));
      }

      // Get user profiles - only select fields that exist in database
      const users = await db
        .select({
          userId: tenantUsers.userId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          isActive: tenantUsers.isActive,
          tenantId: tenantUsers.tenantId,
          createdAt: tenantUsers.createdAt,
          updatedAt: tenantUsers.updatedAt
        })
        .from(tenantUsers)
        .where(and(...conditions))
        .orderBy(tenantUsers.createdAt)
        .limit(limit)
        .offset(offset);

      // Transform to CRM format
      const transformedUsers = users.map(user => {
        // Parse name if available
        const nameParts = user.name ? user.name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
          userId: user.userId,
          employeeCode: user.userId, // Use userId as employee code for now
          personalInfo: {
            firstName: firstName,
            lastName: lastName,
            email: user.email || ''
          },
          organization: {
            orgCode: tenantId, // Default to tenant ID
            department: '', // Not available in current schema
            designation: ''  // Not available in current schema
          },
          status: {
            isActive: user.isActive !== null ? user.isActive : true,
            lastActivityAt: null // Not available in current schema
          },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      });

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(tenantUsers)
        .where(and(...conditions));

      return {
        success: true,
        data: transformedUsers,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching tenant users:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch users',
        message: error.message
      });
    }
  });

  // Get organizations for tenant
  fastify.get('/tenants/:tenantId/organizations', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get organizations for tenant (CRM format)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { includeInactive = false, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [eq(entities.tenantId, tenantId)];
      if (!includeInactive) {
        conditions.push(eq(entities.isActive, true));
      }

      const organizations = await db
        .select({
          orgCode: entities.entityId,
          orgName: entities.entityName,
          parentId: entities.parentEntityId,
          status: sql`CASE WHEN ${entities.isActive} THEN 'active' ELSE 'inactive' END`,
          hierarchy: sql`json_build_object(
            'level', ${entities.entityLevel},
            'path', ${entities.hierarchyPath},
            'children', '[]'::jsonb
          )`,
          metadata: sql`json_build_object(
            'description', ${entities.description},
            'type', ${entities.entityType},
            'createdAt', ${entities.createdAt},
            'updatedAt', ${entities.updatedAt}
          )`,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt
        })
        .from(entities)
        .where(and(...conditions))
        .orderBy(entities.entityLevel, entities.entityName)
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(entities)
        .where(and(...conditions));

      return {
        success: true,
        data: organizations,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching tenant organizations:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch organizations',
        message: error.message
      });
    }
  });

  // Get detailed tenant users information
  fastify.get('/tenants/:tenantId/tenant-users', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get detailed tenant users information for CRM',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { includeInactive = false, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [eq(tenantUsers.tenantId, tenantId)];
      if (!includeInactive) {
        conditions.push(eq(tenantUsers.isActive, true));
      }

      const tenantUsersData = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenantUsers.tenantId,
          kindeId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          isResponsiblePerson: tenantUsers.isTenantAdmin,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          lastLoginAt: tenantUsers.lastLoginAt,
          isActive: tenantUsers.isActive,
          avatar: tenantUsers.avatar,
          createdAt: tenantUsers.createdAt,
          updatedAt: tenantUsers.updatedAt
        })
        .from(tenantUsers)
        .where(and(...conditions))
        .orderBy(tenantUsers.createdAt)
        .limit(limit)
        .offset(offset);

      // Transform to CRM format
      const transformedTenantUsers = tenantUsersData.map(user => {
        // Parse name if available
        const nameParts = user.name ? user.name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
          userId: user.userId,
          tenantId: user.tenantId,
          kindeId: user.kindeId,
          email: user.email || '',
          firstName: firstName,
          lastName: lastName,
          primaryOrganizationId: tenantId, // Default to tenant ID
          isResponsiblePerson: user.isResponsiblePerson || false,
          isTenantAdmin: user.isTenantAdmin || false,
          isVerified: false, // Not tracked in current schema
          onboardingCompleted: user.onboardingCompleted || false,
          lastLoginAt: user.lastLoginAt,
          loginCount: 0, // Not tracked in current schema
          preferences: {}, // Not tracked in current schema
          profile: {
            title: '', // Not available in current schema
            department: '', // Not available in current schema
            employeeCode: user.userId // Use userId as employee code
          },
          security: {
            isActive: user.isActive !== null ? user.isActive : true
          },
          metadata: {
            avatar: user.avatar || '',
            name: user.name || ''
          },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      });

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(tenantUsers)
        .where(and(...conditions));

      return {
        success: true,
        data: transformedTenantUsers,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching detailed tenant users:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch tenant users',
        message: error.message
      });
    }
  });

  // Get role definitions for tenant
  fastify.get('/tenants/:tenantId/roles', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get role definitions for tenant (CRM format)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { includeInactive = false, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [eq(customRoles.tenantId, tenantId)];
      if (!includeInactive) {
        // For now, we'll assume all roles are active since isActive field doesn't exist
        // In a real implementation, you'd filter by isActive field if it exists
      }

      const roles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          priority: customRoles.priority,
          isActive: sql`true`, // Assume all roles are active for now
          description: customRoles.description,
          tenantId: customRoles.tenantId,
          createdAt: customRoles.createdAt,
          updatedAt: customRoles.updatedAt
        })
        .from(customRoles)
        .where(and(...conditions))
        .orderBy(customRoles.priority, customRoles.roleName)
        .limit(limit)
        .offset(offset);

      // Transform to CRM format - flatten permissions structure
      const transformedRoles = roles.map(role => {
        let flatPermissions = [];

        // Handle permissions transformation
        if (role.permissions) {
          let permissionsObj = role.permissions;

          // If permissions is a string (JSON), parse it
          if (typeof role.permissions === 'string') {
            try {
              permissionsObj = JSON.parse(role.permissions);
            } catch (e) {
              console.log('Failed to parse permissions JSON for role:', role.roleName, role.permissions);
              permissionsObj = {};
            }
          }

          // Flatten the nested permissions structure
          if (permissionsObj && typeof permissionsObj === 'object') {
            Object.entries(permissionsObj).forEach(([module, modulePermissions]) => {
              if (modulePermissions && typeof modulePermissions === 'object') {
                Object.entries(modulePermissions).forEach(([resource, actions]) => {
                  if (Array.isArray(actions)) {
                    actions.forEach(action => {
                      flatPermissions.push(`${module}.${resource}.${action}`);
                    });
                  }
                });
              }
            });
          }
        }

        return {
          roleId: role.roleId,
          roleName: role.roleName || '',
          permissions: flatPermissions,
          priority: role.priority || 0,
          isActive: role.isActive,
          description: role.description || '',
          tenantId: role.tenantId,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt
        };
      });

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(customRoles)
        .where(and(...conditions));

      return {
        success: true,
        data: transformedRoles,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching tenant roles:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch roles',
        message: error.message
      });
    }
  });

  // Get complete CRM credit configurations for tenant (priority-based: tenant > global)
  fastify.get('/tenants/:tenantId/credit-configs', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get complete CRM credit configurations for tenant (tenant-specific takes precedence over global)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Get all existing configurations for this tenant (both tenant-specific and global)
      const existingConfigs = await db
        .select({
          configId: creditConfigurations.configId,
          tenantId: creditConfigurations.tenantId,
          operationCode: creditConfigurations.operationCode,
          operationName: creditConfigurations.operationName,
          creditCost: creditConfigurations.creditCost,
          unit: creditConfigurations.unit,
          isGlobal: creditConfigurations.isGlobal,
          isActive: creditConfigurations.isActive
        })
        .from(creditConfigurations)
        .where(and(
          or(
            eq(creditConfigurations.tenantId, tenantId), // Tenant-specific configs
            eq(creditConfigurations.isGlobal, true)     // Global configs
          ),
          eq(creditConfigurations.isActive, true)
        ));

      // Create a map of operation codes to configurations (tenant-specific takes precedence)
      const configMap = new Map();

      // First pass: collect global configs
      existingConfigs.forEach(config => {
        if (config.isGlobal) {
          configMap.set(config.operationCode, { ...config, source: 'global' });
        }
      });

      // Second pass: collect tenant-specific configs (these take precedence)
      existingConfigs.forEach(config => {
        if (!config.isGlobal) {
          configMap.set(config.operationCode, { ...config, source: 'tenant' });
        }
      });

      // Get all CRM operations from the business suite matrix
      const crmMatrix = BUSINESS_SUITE_MATRIX.crm;
      const crmConfigs = [];

      if (crmMatrix && crmMatrix.modules) {
        // Process each CRM module
        Object.entries(crmMatrix.modules).forEach(([moduleKey, moduleData]) => {
          if (moduleData.permissions && Array.isArray(moduleData.permissions)) {
            // Process each permission in the module
            moduleData.permissions.forEach(permission => {
              const operationCode = `crm.${moduleKey}.${permission.code}`;

              // Check if we have a configuration for this operation
              const existingConfig = configMap.get(operationCode);

              if (existingConfig) {
                // Use existing configuration
                crmConfigs.push({
                  configId: existingConfig.configId,
                  tenantId: existingConfig.tenantId,
                  entityId: existingConfig.isGlobal ? null : tenantId,
                  configName: existingConfig.operationName || `${moduleData.moduleName} - ${permission.name}`,
                  operationCode: operationCode,
                  description: existingConfig.operationName || permission.description,
                  creditCost: parseFloat(existingConfig.creditCost || 0),
                  unit: existingConfig.unit || 'operation',
                  isGlobal: existingConfig.isGlobal,
                  source: existingConfig.source,
                  moduleName: moduleData.moduleName,
                  permissionName: permission.name
                });
              } else {
                // No configuration exists, create a default entry
                crmConfigs.push({
                  configId: null, // No existing config
                  tenantId: tenantId,
                  entityId: null,
                  configName: `${moduleData.moduleName} - ${permission.name}`,
                  operationCode: operationCode,
                  description: permission.description,
                  creditCost: 0, // Default cost
                  unit: 'operation',
                  isGlobal: true, // Would be global by default
                  source: 'default',
                  moduleName: moduleData.moduleName,
                  permissionName: permission.name
                });
              }
            });
          }
        });
      }

      // Sort by operation code for consistent ordering
      crmConfigs.sort((a, b) => a.operationCode.localeCompare(b.operationCode));

      return {
        success: true,
        data: crmConfigs,
        summary: {
          totalOperations: crmConfigs.length,
          tenantSpecific: crmConfigs.filter(c => c.source === 'tenant').length,
          global: crmConfigs.filter(c => c.source === 'global').length,
          default: crmConfigs.filter(c => c.source === 'default').length,
          modules: Object.keys(crmMatrix?.modules || {}).length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching credit configurations:', error);
      // Return default configuration if database query fails
      const { tenantId } = request.params;
      return {
        success: true,
        data: [{
          configId: `default_${tenantId}`,
          tenantId: tenantId,
          entityId: tenantId,
          configName: 'Default Credit Configuration',
          creditLimit: 1000,
          resetPeriod: 'monthly',
          resetDay: 1,
          lastResetAt: null,
          isActive: true,
          metadata: {
            description: 'Default credit configuration for tenant',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1
        }
      };
    }
  });

  // Get CRM credit allocations for tenant entities
  fastify.get('/tenants/:tenantId/entity-credits', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get CRM credit allocations for tenant entities (CRM format)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          entityId: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { entityId, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // REMOVED: creditAllocations table queries
      // Applications now manage their own credit consumption
      // Use credits table for organization-level credits instead
      const conditions = [
        eq(credits.tenantId, tenantId)
      ];
      if (entityId) {
        conditions.push(eq(credits.entityId, entityId));
      }

      const entityCreditsData = await db
        .select({
          tenantId: credits.tenantId,
          entityId: credits.entityId,
          availableCredits: credits.availableCredits,
          isActive: credits.isActive
        })
        .from(credits)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset);

      // Transform to CRM format
      const entityCredits = entityCreditsData.map(credit => ({
        tenantId: credit.tenantId,
        entityId: credit.entityId,
        allocatedCredits: parseFloat(credit.availableCredits || 0),
        targetApplication: 'crm',
        usedCredits: 0,
        availableCredits: parseFloat(credit.availableCredits || 0),
        allocationType: 'organization',
        allocationPurpose: 'Organization credit balance',
        expiresAt: null,
        isActive: credit.isActive,
        allocationSource: 'system',
        allocatedBy: 'system',
        allocatedAt: new Date(),
        metadata: {}
      }));

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(credits)
        .where(and(...conditions));

      return {
        success: true,
        data: entityCredits,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching entity credits:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch entity credits',
        message: error.message
      });
    }
  });

  // Get employee organization assignments for tenant
  fastify.get('/tenants/:tenantId/employee-assignments', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get employee organization assignments for tenant (CRM format)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          entityId: { type: 'string' },
          includeInactive: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Log the authorization token
      console.log('🔐 Received token:', request.headers.authorization);

      const { tenantId } = request.params;
      const { userId, entityId, includeInactive = false, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // Build conditions for organization memberships
      let conditions = [
        eq(organizationMemberships.tenantId, tenantId),
        eq(organizationMemberships.membershipStatus, 'active')
      ];

      if (userId) {
        conditions.push(eq(organizationMemberships.userId, userId));
      }
      if (entityId) {
        conditions.push(eq(organizationMemberships.entityId, entityId));
      }

      // Get organization memberships with user and entity details
      const memberships = await db
        .select({
          membershipId: organizationMemberships.membershipId,
          userId: organizationMemberships.userId,
          tenantId: organizationMemberships.tenantId,
          entityId: organizationMemberships.entityId,
          membershipType: organizationMemberships.membershipType,
          membershipStatus: organizationMemberships.membershipStatus,
          accessLevel: organizationMemberships.accessLevel,
          isPrimary: organizationMemberships.isPrimary,
          assignedAt: organizationMemberships.createdAt,
          createdBy: organizationMemberships.createdBy,
          // User details
          userEmail: tenantUsers.email,
          userName: tenantUsers.name,
          userIsActive: tenantUsers.isActive,
          // Entity details
          entityName: entities.entityName,
          entityCode: entities.entityCode
        })
        .from(organizationMemberships)
        .innerJoin(tenantUsers, eq(organizationMemberships.userId, tenantUsers.userId))
        .innerJoin(entities, eq(organizationMemberships.entityId, entities.entityId))
        .where(and(...conditions))
        .orderBy(organizationMemberships.createdAt)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(organizationMemberships)
        .where(and(...conditions));

      const total = parseInt(totalResult[0].count);
      const totalPages = Math.ceil(total / limit);

      // Transform to CRM format
      const transformedAssignments = memberships.map(membership => ({
        assignmentId: membership.membershipId, // Use actual membership UUID
        tenantId: membership.tenantId,
        userId: membership.userId,
        entityId: membership.entityId,
        assignmentType: membership.membershipType || 'primary',
        isActive: membership.membershipStatus === 'active' && membership.userIsActive,
        assignedAt: membership.assignedAt?.toISOString(),
        expiresAt: null,
        assignedBy: membership.createdBy,
        deactivatedAt: null,
        deactivatedBy: null,
        priority: membership.isPrimary ? 1 : 2,
        metadata: {
          department: '',
          designation: '',
          employeeCode: membership.userId,
          organizationName: membership.entityName,
          organizationCode: membership.entityCode,
          accessLevel: membership.accessLevel
        }
      }));

      return {
        success: true,
        data: transformedAssignments,
        pagination: {
          page,
          limit,
          total: total.toString(),
          totalPages
        }
      };
    } catch (error) {
      console.error('❌ Error fetching employee assignments:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch employee assignments',
        message: error.message
      });
    }
  });

  // Get role assignments for tenant
  fastify.get('/tenants/:tenantId/role-assignments', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Get role assignments for tenant (CRM format)',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          roleId: { type: 'string' },
          includeInactive: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { userId, roleId, includeInactive = false, page = 1, limit = 50 } = request.query;
      const offset = (page - 1) * limit;

      // Import userRoleAssignments
      const { userRoleAssignments } = await import('../db/schema/index.js');

      // Build query conditions
      const conditions = [
        eq(tenantUsers.tenantId, tenantId), // Join condition and tenant filter
        eq(customRoles.tenantId, tenantId)  // Ensure roles belong to tenant
      ];

      if (!includeInactive) {
        conditions.push(eq(userRoleAssignments.isActive, true));
      }

      if (userId) {
        conditions.push(eq(userRoleAssignments.userId, userId));
      }

      if (roleId) {
        conditions.push(eq(userRoleAssignments.roleId, roleId));
      }

      // Get role assignments first, then enrich with organization data separately
      const roleAssignmentsData = await db
        .select({
          assignmentId: userRoleAssignments.id,
          tenantId: sql`${tenantId}`, // Use the tenantId from params
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          roleOrgId: userRoleAssignments.organizationId, // Internal organization ID
          assignedBy: userRoleAssignments.assignedBy,
          assignedAt: userRoleAssignments.assignedAt,
          expiresAt: userRoleAssignments.expiresAt,
          isActive: userRoleAssignments.isActive,
          isResponsiblePerson: userRoleAssignments.isResponsiblePerson,
          scope: userRoleAssignments.scope,
          isTemporary: userRoleAssignments.isTemporary,
          // User details
          userEmail: tenantUsers.email,
          userName: tenantUsers.name,
          userIsActive: tenantUsers.isActive,
          // Role details
          roleName: customRoles.roleName,
          isSystemRole: customRoles.isSystemRole,
          isDefault: customRoles.isDefault
        })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(...conditions))
        .orderBy(userRoleAssignments.assignedAt)
        .limit(limit)
        .offset(offset);

      // Enrich with organization data
      const assignments = await Promise.all(roleAssignmentsData.map(async (assignment) => {
        let orgCode = null;

        if (assignment.roleOrgId) {
          const org = await db
            .select({
              orgCode: entities.entityId
            })
            .from(entities)
            .where(and(
              eq(entities.tenantId, tenantId),
              eq(entities.entityId, assignment.roleOrgId)
            ))
            .limit(1);

          if (org.length > 0) {
            orgCode = org[0].orgCode;
          }
        }

        return {
          ...assignment,
          orgCode
        };
      }));

      // Transform to CRM format
      const roleAssignments = assignments.map(assignment => ({
        assignmentId: assignment.assignmentId,
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        entityId: assignment.orgCode || assignment.roleOrgId || tenantId, // Use actual orgCode from entities table, fallback to internal org ID, then tenantId
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        expiresAt: assignment.expiresAt,
        isActive: assignment.isActive
      }));

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(...conditions));

      return {
        success: true,
        data: roleAssignments,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching role assignments:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch role assignments',
        message: error.message
      });
    }
  });

  // Redis Stream Monitoring Endpoint
  fastify.get('/monitoring/streams', {
    preHandler: [authenticateServiceOrToken],
    schema: {
      description: 'Monitor Redis streams for CRM sync',
      querystring: {
        type: 'object',
        properties: {
          stream: { type: 'string', description: 'Specific stream key (optional)' },
          count: { type: 'integer', minimum: 1, maximum: 100, default: 10, description: 'Number of messages to show' }
        }
      }
    }
  }, async (request, reply) => {
  try {
    const { stream, count = 10 } = request.query;
    const redisManager = getRedis();
    const client = redisManager.client;

      // Get streams to monitor
      const streamKeys = stream ?
        [stream] :
        await client.keys('crm:sync:*');

      const results = {};

      for (const streamKey of streamKeys) {
        try {
          // Get stream info
          const info = await client.xInfoStream(streamKey);

          // Get recent messages
          const messages = await client.xRevRange(streamKey, '+', '-', 'COUNT', count);

          // Get consumer groups
          let groups = [];
          try {
            groups = await client.xInfoGroups(streamKey);
          } catch (e) {
            // No consumer groups
          }

          results[streamKey] = {
            info: {
              length: info.length,
              radixTreeKeys: info['radix-tree-keys'],
              radixTreeNodes: info['radix-tree-nodes']
            },
            consumerGroups: groups.map(g => ({
              name: g.name,
              consumers: g.consumers,
              pending: g.pending,
              lastDeliveredId: g['last-delivered-id']
            })),
            recentMessages: messages.map(msg => ({
              id: msg.id,
              timestamp: msg.message.timestamp,
              eventType: msg.message.eventType,
              entityId: msg.message.entityId,
              tenantId: msg.message.tenantId,
              data: (() => {
                try {
                  return JSON.parse(msg.message.data);
                } catch (e) {
                  return msg.message.data;
                }
              })(),
              metadata: (() => {
                try {
                  return JSON.parse(msg.message.metadata || '{}');
                } catch (e) {
                  return msg.message.metadata;
                }
              })()
            }))
          };

        } catch (error) {
          results[streamKey] = {
            error: error.message,
            available: false
          };
        }
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        redis: {
          connected: true,
          url: process.env.REDIS_URL ? '[configured]' : 'redis://localhost:6379'
        },
        streams: results
      };

    } catch (error) {
      console.error('❌ Stream monitoring error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Monitoring failed',
        message: error.message
      });
    }
  });

}

