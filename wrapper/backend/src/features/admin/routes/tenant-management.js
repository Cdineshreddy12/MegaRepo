/**
 * Admin Tenant Management Routes - Independent tenant administration
 * Provides comprehensive tenant operations without modifying existing routes
 */

import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers, entities, credits } from '../../../db/schema/index.js';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export default async function adminTenantManagementRoutes(fastify, options) {

  // Debug endpoint to check credit consistency
  fastify.get('/:tenantId/credit-debug', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.view')],
    schema: {
      description: 'Debug credit calculation for a tenant'
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Get all credits for this tenant
      const allCredits = await db
        .select({
          creditId: credits.creditId,
          entityId: credits.entityId,
          availableCredits: credits.availableCredits,

          isActive: credits.isActive
        })
        .from(credits)
        .where(eq(credits.tenantId, tenantId));

      // Get credits that have valid entities (summed by entity)
      const validEntityCredits = await db
        .select({
          entityId: entities.entityId,
          entityName: entities.entityName,
          totalAvailableCredits: sql`sum(${credits.availableCredits}::numeric)`,
          creditRecordCount: sql`count(${credits.creditId})`
        })
        .from(entities)
        .innerJoin(credits, and(
          eq(credits.entityId, entities.entityId),
          eq(credits.tenantId, tenantId),
          eq(credits.isActive, true)
        ))
        .groupBy(entities.entityId, entities.entityName);

      // Get credits without valid entities
      const orphanedCredits = await db
        .select({
          creditId: credits.creditId,
          entityId: credits.entityId,
          availableCredits: credits.availableCredits,
        })
        .from(credits)
        .leftJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.tenantId, tenantId),
          sql`${entities.entityId} is null`
        ));

      const totalAllCredits = allCredits.reduce((sum, c) => sum + parseFloat(c.availableCredits || '0'), 0);
      const totalValidCredits = validEntityCredits.reduce((sum, c) => sum + parseFloat(c.totalAvailableCredits || '0'), 0);
      const totalOrphanedCredits = orphanedCredits.reduce((sum, c) => sum + parseFloat(c.availableCredits || '0'), 0);

      return {
        success: true,
        data: {
          tenantId,
          summary: {
            totalCreditsFromAll: totalAllCredits.toFixed(2),
            totalCreditsFromValidEntities: totalValidCredits.toFixed(2),
            totalCreditsFromOrphaned: totalOrphanedCredits.toFixed(2),
            discrepancy: (totalAllCredits - totalValidCredits).toFixed(2)
          },
          allCredits: allCredits.slice(0, 10), // Limit for debugging
          validEntityCredits: validEntityCredits.slice(0, 10),
          orphanedCredits: orphanedCredits.slice(0, 10),
          counts: {
            totalCreditRecords: allCredits.length,
            validEntityCredits: validEntityCredits.length,
            orphanedCredits: orphanedCredits.length
          }
        }
      };
    } catch (error) {
      console.error('Error debugging tenant credits:', error);
      return reply.code(500).send({ error: 'Failed to debug tenant credits' });
    }
  });

  // Clean up orphaned credit records for a tenant
  fastify.post('/:tenantId/clean-orphaned-credits', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.manage')],
    schema: {
      description: 'Clean up credit records that don\'t have corresponding entities',
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Find orphaned credits
      const orphanedCredits = await db
        .select({
          creditId: credits.creditId,
          entityId: credits.entityId,
          availableCredits: credits.availableCredits,
        })
        .from(credits)
        .leftJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.tenantId, tenantId),
          sql`${entities.entityId} is null`
        ));

      if (orphanedCredits.length === 0) {
        return {
          success: true,
          message: 'No orphaned credit records found',
          data: { orphanedCredits: 0 }
        };
      }

      // Delete orphaned credits
      const deletedCount = await db
        .delete(credits)
        .where(and(
          eq(credits.tenantId, tenantId),
          sql`${credits.entityId} not in (
            select ${entities.entityId} from ${entities}
            where ${entities.tenantId} = ${tenantId}
          )`
        ));

      console.log(`Admin ${request.userContext.userId} cleaned up ${deletedCount} orphaned credit records for tenant ${tenantId}`);

      return {
        success: true,
        message: `Cleaned up ${deletedCount} orphaned credit records`,
        data: {
          orphanedCredits: orphanedCredits.length,
          deletedRecords: deletedCount,
          totalCreditsCleaned: orphanedCredits.reduce((sum, c) => sum + parseFloat(c.availableCredits || '0'), 0).toFixed(2)
        }
      };
    } catch (error) {
      console.error('Error cleaning orphaned credits:', error);
      return reply.code(500).send({ error: 'Failed to clean orphaned credits' });
    }
  });

  // Get detailed tenant information including relationships
  fastify.get('/:tenantId/details', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.view')],
    schema: {
      description: 'Get comprehensive tenant details',
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Get tenant basic info
      const tenantInfo = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenantInfo.length) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Get tenant users
      const tenantUsersList = await db
        .select({
          userId: tenantUsers.userId,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName,
          isActive: tenantUsers.isActive,
          lastLoginAt: tenantUsers.lastLoginAt,
          createdAt: tenantUsers.createdAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Get entity hierarchy summary
      const entitySummary = await db
        .select({
          total: count(),
          organizations: sql`count(case when ${entities.entityType} = 'organization' then 1 end)`,
          locations: sql`count(case when ${entities.entityType} = 'location' then 1 end)`,
          departments: sql`count(case when ${entities.entityType} = 'department' then 1 end)`,
          teams: sql`count(case when ${entities.entityType} = 'team' then 1 end)`
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId));

      // Get credit summary
      const creditSummary = await db
        .select({
          totalCredits: sql`coalesce(sum(${credits.availableCredits}::numeric), 0)`,
          activeEntities: sql`count(case when ${credits.isActive} = true then 1 end)`
        })
        .from(credits)
        .where(eq(credits.tenantId, tenantId));

      return {
        success: true,
        data: {
          tenant: tenantInfo[0],
          users: tenantUsersList,
          entitySummary: entitySummary[0] || { total: 0, organizations: 0, locations: 0, departments: 0, teams: 0 },
          creditSummary: creditSummary[0] || { totalCredits: 0, activeEntities: 0 }
        }
      };
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      return reply.code(500).send({ error: 'Failed to fetch tenant details' });
    }
  });

  // Update tenant status (activate/deactivate)
  fastify.patch('/:tenantId/status', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.manage')],
    schema: {
      description: 'Update tenant status',
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      },
      body: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['isActive']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { isActive, reason } = request.body;

      await db
        .update(tenants)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Log the admin action
      console.log(`Admin ${request.userContext.userId} ${isActive ? 'activated' : 'deactivated'} tenant ${tenantId}${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Error updating tenant status:', error);
      return reply.code(500).send({ error: 'Failed to update tenant status' });
    }
  });

  // Bulk tenant operations
  fastify.post('/bulk/status', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.manage')],
    schema: {
      description: 'Bulk update tenant status',
      body: {
        type: 'object',
        properties: {
          tenantIds: {
            type: 'array',
            items: { type: 'string' }
          },
          isActive: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['tenantIds', 'isActive']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantIds, isActive, reason } = request.body;

      await db
        .update(tenants)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(sql`${tenants.tenantId} = any(${tenantIds})`);

      // Log the bulk operation
      console.log(`Admin ${request.userContext.userId} bulk ${isActive ? 'activated' : 'deactivated'} ${tenantIds.length} tenants${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        message: `${tenantIds.length} tenants ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Error bulk updating tenant status:', error);
      return reply.code(500).send({ error: 'Failed to bulk update tenant status' });
    }
  });

  // Get tenant activity log
  fastify.get('/:tenantId/activity', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.view')],
    schema: {
      description: 'Get tenant activity log',
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 50 },
          offset: { type: 'integer', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { limit = 50, offset = 0 } = request.query;

      // This would typically come from an activity/audit log table
      // For now, we'll aggregate activity from various sources

      const userActivity = await db
        .select({
          type: sql<string>`'user_activity'`,
          description: sql<string>`concat(${tenantUsers.firstName}, ' ', ${tenantUsers.lastName}, ' logged in')`,
          timestamp: tenantUsers.lastLoginAt,
          userId: tenantUsers.userId
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          sql`${tenantUsers.lastLoginAt} is not null`
        ))
        .orderBy(desc(tenantUsers.lastLoginAt))
        .limit(limit);

      return {
        success: true,
        data: {
          activities: userActivity,
          pagination: {
            limit,
            offset,
            hasMore: userActivity.length === limit
          }
        }
      };
    } catch (error) {
      console.error('Error fetching tenant activity:', error);
      return reply.code(500).send({ error: 'Failed to fetch tenant activity' });
    }
  });

  // Export tenant data
  fastify.get('/:tenantId/export', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.view')],
    schema: {
      description: 'Export comprehensive tenant data',
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Get comprehensive tenant data
      const tenantData = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenantData.length) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      const tenant = tenantData[0];

      // Get all related data
      const [users, entityList, creditList] = await Promise.all([
        db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId)),
        db.select().from(entities).where(eq(entities.tenantId, tenantId)),
        db.select().from(credits).where(eq(credits.tenantId, tenantId))
      ]);

      const exportData = {
        tenant,
        users,
        entities: entityList,
        credits: creditList,
        exportedAt: new Date().toISOString(),
        exportedBy: request.userContext.userId
      };

      // Set headers for file download
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="tenant-${tenantId}-export.json"`);

      return exportData;
    } catch (error) {
      console.error('Error exporting tenant data:', error);
      return reply.code(500).send({ error: 'Failed to export tenant data' });
    }
  });

  // Get tenant statistics for monitoring
  fastify.get('/:tenantId/stats', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.view')],
    schema: {
      description: 'Get tenant statistics',
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // User statistics
      const userStats = await db
        .select({
          total: count(),
          active: sql`count(case when ${tenantUsers.isActive} = true then 1 end)`,
          recentlyActive: sql`count(case when ${tenantUsers.lastLoginAt} > now() - interval '30 days' then 1 end)`
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Entity statistics
      const entityStats = await db
        .select({
          total: count(),
          byType: sql`json_object_agg(${entities.entityType}, count(*))`
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId));

      // Credit statistics
      const creditStats = await db
        .select({
          totalAvailable: sql`coalesce(sum(${credits.availableCredits}::numeric), 0)`,
          averagePerEntity: sql`avg(${credits.availableCredits}::numeric)`
        })
        .from(credits)
        .where(eq(credits.tenantId, tenantId));

      return {
        success: true,
        data: {
          userStats: userStats[0],
          entityStats: entityStats[0],
          creditStats: creditStats[0],
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      return reply.code(500).send({ error: 'Failed to fetch tenant statistics' });
    }
  });

  // Comprehensive tenant list with relationships and credit summaries
  fastify.get('/comprehensive', {
    preHandler: [authenticateToken, requirePermission('admin.tenants.view')],
    schema: {
      description: 'Get comprehensive tenant list with relationships and credit data',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'trial', 'paid'] },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;

      let query = db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          isVerified: tenants.isVerified,
          trialEndsAt: tenants.trialEndsAt,
          createdAt: tenants.createdAt,
          updatedAt: tenants.updatedAt,
          entityCount: sql`count(distinct ${entities.entityId})`,
          totalCredits: sql`coalesce(sum(${credits.availableCredits}::numeric), 0)`
        })
        .from(tenants)
        .leftJoin(entities, eq(tenants.tenantId, entities.tenantId))
        .leftJoin(credits, and(
          eq(credits.tenantId, tenants.tenantId),
          eq(credits.entityId, entities.entityId),
          eq(credits.isActive, true)
        ))
        .groupBy(tenants.tenantId);

      // Apply filters
      if (search) {
        query = query.where(sql`${tenants.companyName} ilike ${`%${search}%`} or ${tenants.subdomain} ilike ${`%${search}%`}`);
      }

      if (status) {
        switch (status) {
          case 'active':
            query = query.where(eq(tenants.isActive, true));
            break;
          case 'inactive':
            query = query.where(eq(tenants.isActive, false));
            break;
          case 'trial':
            query = query.where(sql`${tenants.trialEndsAt} > now()`);
            break;
          case 'paid':
            query = query.where(sql`${tenants.trialEndsAt} is null or ${tenants.trialEndsAt} < now()`);
            break;
        }
      }

      // Apply sorting
      const sortColumn = sortBy === 'companyName' ? tenants.companyName :
                        sortBy === 'createdAt' ? tenants.createdAt :
                        sortBy === 'totalCredits' ? sql`sum(${credits.availableCredits}::numeric)` :
                        tenants.createdAt;

      query = sortOrder === 'desc' ? query.orderBy(desc(sortColumn)) : query.orderBy(sortColumn);

      // Get total count for pagination
      const totalCount = await db
        .select({ count: count() })
        .from(tenants)
        .then(result => result[0].count);

      // Apply pagination
      const offset = (page - 1) * limit;
      const tenantsList = await query.limit(limit).offset(offset);

      return {
        success: true,
        data: {
          tenants: tenantsList,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error fetching comprehensive tenant list:', error);
      return reply.code(500).send({ error: 'Failed to fetch tenant list' });
    }
  });
}
