import { TenantService } from '../../../services/tenant-service.js';
import { getUserPermissions } from '../../../middleware/permission-middleware.js';
import { eq, and, gte, desc, count } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { tenantUsers, userRoleAssignments, customRoles, tenants, entities } from '../../../db/schema/index.js';
import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../../../services/activityLogger.js';

export default async function userRoutes(fastify, options) {
  // Get current user profile
  fastify.get('/me', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      console.log('🔍 /me endpoint - userContext:', {
        tenantId: request.userContext.tenantId,
        internalUserId: request.userContext.internalUserId,
        kindeUserId: request.userContext.userId,
        email: request.userContext.email,
        name: request.userContext.name
      });

      // Get user details from database using internal user ID and tenant ID
      const [user] = await db
        .select({
          user: tenantUsers,
          role: customRoles,
        })
        .from(tenantUsers)
        .leftJoin(userRoleAssignments, eq(tenantUsers.userId, userRoleAssignments.userId))
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(
          eq(tenantUsers.tenantId, request.userContext.tenantId),
          eq(tenantUsers.userId, request.userContext.internalUserId)
        ))
        .limit(1);

      if (!user) {
        console.log('❌ User not found in database');
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get user permissions
      const permissions = await getUserPermissions(
        request.userContext.internalUserId,
        request.userContext.tenantId
      );

      const response = {
        success: true,
        data: {
          user: {
            ...user.user,
            // Add computed fields
            isAdmin: user.user.isTenantAdmin || false,
            permissions: permissions.modules,
            roles: permissions.roles
          },
          role: user.role,
          kindeUser: {
            id: request.userContext.userId,
            email: request.userContext.email,
            name: request.userContext.name,
            avatar: request.userContext.avatar,
          },
          permissions: permissions.modules,
          roles: permissions.roles,
          isAdmin: user.user.isTenantAdmin || false
        },
      };

      console.log('✅ /me endpoint successful');
      return response;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      request.log.error('Error fetching user profile:', error);
      return reply.code(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // Update user profile
  fastify.put('/me', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          title: { type: 'string', maxLength: 100 },
          department: { type: 'string', maxLength: 100 },
          preferences: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tenantUsers.tenantId, request.userContext.tenantId),
          eq(tenantUsers.userId, request.userContext.internalUserId)
        ))
        .returning();

      // Log profile update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        request.userContext.tenantId,
        null,
        ACTIVITY_TYPES.USER_PROFILE_UPDATED,
        {
          updatedFields: Object.keys(request.body),
          userId: request.userContext.internalUserId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      request.log.error('Error updating user profile:', error);
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // Get user activity log
  fastify.get('/me/activity', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { page, limit, days } = request.query;
      const offset = (page - 1) * limit;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get usage logs for this user
      const { usageLogs } = await import('../db/schema/index.js');
      
      const logs = await db
        .select()
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, request.userContext.tenantId),
          eq(usageLogs.userId, request.userContext.internalUserId),
          gte(usageLogs.createdAt, startDate)
        ))
        .orderBy(desc(usageLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, request.userContext.tenantId),
          eq(usageLogs.userId, request.userContext.internalUserId),
          gte(usageLogs.createdAt, startDate)
        ));

      return {
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error) {
      request.log.error('Error fetching user activity:', error);
      return reply.code(500).send({ error: 'Failed to fetch activity' });
    }
  });

  // Complete onboarding
  fastify.post('/me/complete-onboarding', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          onboardingCompleted: true,
          onboardingStep: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tenantUsers.tenantId, request.userContext.tenantId),
          eq(tenantUsers.userId, request.userContext.internalUserId)
        ))
        .returning();

      // Log onboarding completion activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        request.userContext.tenantId,
        null,
        ACTIVITY_TYPES.USER_ACTIVATED,
        {
          action: 'onboarding_completed',
          userId: request.userContext.internalUserId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedUser,
        message: 'Onboarding completed successfully',
      };
    } catch (error) {
      request.log.error('Error completing onboarding:', error);
      return reply.code(500).send({ error: 'Failed to complete onboarding' });
    }
  });

  // Get user permissions (separate endpoint for permission checking)
  fastify.get('/me/permissions', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const permissions = await getUserPermissions(
        request.userContext.internalUserId,
        request.userContext.tenantId
      );

      return {
        success: true,
        data: {
          permissions: permissions.modules,
          roles: permissions.roles,
          isAdmin: request.userContext.isTenantAdmin || false
        }
      };
    } catch (error) {
      request.log.error('Error fetching user permissions:', error);
      return reply.code(500).send({ error: 'Failed to fetch permissions' });
    }
  });

  // CRM Integration: User Tenant Verification
  fastify.get('/tenant/:email', async (request, reply) => {
    try {
      const { email } = request.params;

      console.log('🔍 CRM Tenant Verification for email:', email);

      // Verify authentication
      if (!request.userContext?.isAuthenticated) {
        console.log('❌ Authentication failed');
        return reply.code(401).send({
          success: false,
          message: 'Authentication failed'
        });
      }

      // Check if request comes from CRM backend
      const requestSource = request.headers['x-request-source'];
      if (requestSource !== 'crm-backend') {
        console.log('❌ Invalid request source:', requestSource);
        return reply.code(403).send({
          success: false,
          message: 'Access restricted to CRM backend'
        });
      }

      console.log('✅ Authentication passed, proceeding with query');

      try {
        console.log('🔍 Executing database query for email:', email);
        // Find user by email across all tenants
        const [user] = await db
          .select({
            userId: tenantUsers.userId,
            tenantId: tenantUsers.tenantId,
            email: tenantUsers.email,
            name: tenantUsers.name,
            firstName: tenantUsers.firstName,
            lastName: tenantUsers.lastName,
            isActive: tenantUsers.isActive,
            // Get tenant details
            tenantName: tenants.companyName,
            tenantIsActive: tenants.isActive
          })
          .from(tenantUsers)
          .innerJoin(
            tenants,
            eq(tenantUsers.tenantId, tenants.tenantId)
          )
          .where(and(
            eq(tenantUsers.email, email),
            eq(tenantUsers.isActive, true),
            eq(tenants.isActive, true)
          ))
          .limit(1);

        console.log('✅ Database query completed, user found:', !!user);

        if (!user) {
          console.log('ℹ️ User not found or inactive:', email);
          // CRM expects 200 OK with null data for "no tenant assigned"
          return reply.send({
            success: true,
            data: null
          });
        }

        console.log('🔍 Getting organization details for tenant:', user.tenantId);
        // Get organization details (assuming first organization for the tenant)
        const [org] = await db
          .select({
            orgCode: entities.entityCode,
            orgName: entities.entityName
          })
          .from(entities)
          .where(and(
            eq(entities.tenantId, user.tenantId),
            eq(entities.entityType, 'organization'),
            eq(entities.isActive, true)
          ))
          .limit(1);

        console.log('✅ Organization query completed, org found:', !!org);

        const response = {
          success: true,
          data: {
            tenantId: user.tenantId,
            userId: user.userId,
            entityId: org?.orgCode || `tenant_${user.tenantId}`, // Maps to orgCode in CRM
            tenantName: user.tenantName,
            organization: {
              orgName: org?.orgName || user.tenantName
            },
            tenantIsActive: user.tenantIsActive,
            userIsActive: user.isActive
          }
        };

        console.log('✅ CRM Tenant Verification success:', response.data);
        return reply.send(response);

      } catch (dbError) {
        console.error('❌ Database error in CRM Tenant Verification:', dbError);
        return reply.code(500).send({
          success: false,
          message: 'Database error'
        });
      }

    } catch (error) {
      console.error('❌ CRM Tenant Verification failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // CRM Sync endpoints using WrapperSyncService
  fastify.post('/tenant/:tenantId/sync', async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { skipReferenceData = false, forceSync = false } = request.body || {};

      console.log('🔄 Triggering tenant sync via WrapperSyncService:', { tenantId, skipReferenceData, forceSync });

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

  fastify.get('/tenant/:tenantId/sync-status', async (request, reply) => {
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

  fastify.get('/sync/data-requirements', async (request, reply) => {
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