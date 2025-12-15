/**
 * Admin Dashboard Routes - Comprehensive company admin interface
 * Independent implementation that doesn't modify existing routes
 */

import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { tenants, entities, credits, creditTransactions } from '../../../db/schema/index.js';
import { eq, desc, sql, count, sum } from 'drizzle-orm';

export default async function adminDashboardRoutes(fastify, options) {

  // Overview dashboard data - aggregates key metrics across all tenants
  fastify.get('/overview', {
    preHandler: [authenticateToken, requirePermission('admin.dashboard.view')],
    schema: {
      description: 'Get comprehensive admin dashboard overview',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tenantStats: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    trial: { type: 'number' },
                    paid: { type: 'number' }
                  }
                },
                entityStats: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    organizations: { type: 'number' },
                    locations: { type: 'number' },
                    departments: { type: 'number' }
                  }
                },
                creditStats: {
                  type: 'object',
                  properties: {
                    totalCredits: { type: 'number' },
                    totalReserved: { type: 'number' },
                    lowBalanceAlerts: { type: 'number' }
                  }
                },
                recentActivity: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      tenantName: { type: 'string' },
                      description: { type: 'string' },
                      timestamp: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Get tenant statistics
      const tenantStats = await db
        .select({
          total: count(),
          active: sql`count(case when ${tenants.isActive} = true then 1 end)`,
          trial: sql`count(case when ${tenants.trialEndsAt} > now() then 1 end)`,
          paid: sql`count(case when ${tenants.trialEndsAt} is null or ${tenants.trialEndsAt} < now() then 1 end)`
        })
        .from(tenants);

      // Get entity statistics
      const entityStats = await db
        .select({
          total: count(),
          organizations: sql`count(case when ${entities.entityType} = 'organization' then 1 end)`,
          locations: sql`count(case when ${entities.entityType} = 'location' then 1 end)`,
          departments: sql`count(case when ${entities.entityType} = 'department' then 1 end)`
        })
        .from(entities);

      // Get credit statistics - will be fixed after cleaning duplicates
      const creditStats = await db
        .select({
          totalCredits: sum(credits.availableCredits),

          lowBalanceAlerts: sql`count(case when ${credits.availableCredits} < 100 then 1 end)`
        })
        .from(credits);

      // Get recent activity (last 10 tenant/entity creations)
      const recentTenants = await db
        .select({
          tenantName: tenants.companyName,
          createdAt: tenants.createdAt,
          type: sql`'tenant_created'`
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt))
        .limit(5);

      const recentEntities = await db
        .select({
          tenantName: tenants.companyName,
          entityName: entities.entityName,
          createdAt: entities.createdAt,
          type: sql`'entity_created'`
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .orderBy(desc(entities.createdAt))
        .limit(5);

      const recentActivity = [
        ...recentTenants.map(t => ({
          type: 'tenant_created',
          tenantName: t.tenantName,
          description: `New tenant "${t.tenantName}" was created`,
          timestamp: t.createdAt
        })),
        ...recentEntities.map(e => ({
          type: 'entity_created',
          tenantName: e.tenantName,
          description: `New ${e.entityName} was created`,
          timestamp: e.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      return {
        success: true,
        data: {
          tenantStats: tenantStats[0] || { total: 0, active: 0, trial: 0, paid: 0 },
          entityStats: entityStats[0] || { total: 0, organizations: 0, locations: 0, departments: 0 },
          creditStats: {
            totalCredits: parseFloat(creditStats[0]?.totalCredits || 0),
            totalReserved: parseFloat(creditStats[0]?.totalReserved || 0),
            lowBalanceAlerts: creditStats[0]?.lowBalanceAlerts || 0
          },
          recentActivity
        }
      };
    } catch (error) {
      console.error('Error fetching admin dashboard overview:', error);
      return reply.code(500).send({ error: 'Failed to fetch dashboard overview' });
    }
  });

  // Get recent activity across the platform
  fastify.get('/recent-activity', {
    preHandler: [authenticateToken, requirePermission('admin.dashboard.view')],
    schema: {
      description: 'Get recent activity across all tenants',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { limit = 20 } = request.query;

      // Get recent tenant creations
      const recentTenants = await db
        .select({
          id: tenants.tenantId,
          type: sql`'tenant_created'`,
          title: sql`'New Tenant Created'`,
          description: sql`concat('Tenant "', ${tenants.companyName}, '" was created')`,
          tenantName: tenants.companyName,
          timestamp: tenants.createdAt
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt))
        .limit(5);

      // Get recent entity creations
      const recentEntities = await db
        .select({
          id: entities.entityId,
          type: sql`'entity_created'`,
          title: sql`'New Entity Created'`,
          description: sql`concat(${entities.entityType}, ' "', ${entities.entityName}, '" was created')`,
          tenantName: tenants.companyName,
          timestamp: entities.createdAt
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .orderBy(desc(entities.createdAt))
        .limit(5);

      // Get recent credit transactions
      const recentTransactions = await db
        .select({
          id: creditTransactions.transactionId,
          type: sql`'credit_transaction'`,
          title: sql`concat(upper(${creditTransactions.transactionType}), ' Transaction')`,
          description: sql`concat('Credit ', ${creditTransactions.transactionType}, ' of ', ${creditTransactions.amount}, ' for operation ', ${creditTransactions.operationCode})`,
          amount: creditTransactions.amount,
          tenantName: tenants.companyName,
          timestamp: creditTransactions.createdAt
        })
        .from(creditTransactions)
        .innerJoin(tenants, eq(creditTransactions.tenantId, tenants.tenantId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(10);

      // Combine and sort all activities
      const activities = [
        ...recentTenants,
        ...recentEntities,
        ...recentTransactions
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        success: true,
        data: {
          activities: activities.slice(0, limit)
        }
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return reply.code(500).send({ error: 'Failed to fetch recent activity' });
    }
  });
}
