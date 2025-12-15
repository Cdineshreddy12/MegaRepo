/**
 * Admin Credit Overview Routes - Independent credit administration
 * Provides comprehensive credit monitoring without modifying existing routes
 */

import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { credits, creditTransactions, tenants, entities, creditAllocations, subscriptions } from '../../../db/schema/index.js';
import { eq, and, desc, sql, count, sum, gte, lte, between, isNotNull, inArray } from 'drizzle-orm';
import { CreditAllocationService } from '../../../features/credits/index.js';
import { SeasonalCreditService } from '../../../features/credits/index.js';

export default async function adminCreditOverviewRoutes(fastify, options) {

  // Get comprehensive credit overview across all tenants
  fastify.get('/overview', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      description: 'Get comprehensive credit overview across all tenants'
    }
  }, async (request, reply) => {
    try {
      // Total credit statistics
      const totalStats = await db
        .select({
          totalCredits: sql`coalesce(sum(${credits.availableCredits}), 0)`,
          totalReserved: sql`coalesce(sum(${credits.reservedCredits}), 0)`,
          totalEntities: sql`count(distinct ${credits.entityId})`,
          totalTenants: sql`count(distinct ${credits.tenantId})`
        })
        .from(credits);

      // Credit distribution by tenant (top 10)
      const tenantDistribution = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          totalCredits: sql`coalesce(sum(${credits.availableCredits}), 0)`,
          reservedCredits: sql`coalesce(sum(${credits.reservedCredits}), 0)`,
          entityCount: sql`count(distinct ${credits.entityId})`
        })
        .from(credits)
        .innerJoin(tenants, eq(credits.tenantId, tenants.tenantId))
        .groupBy(tenants.tenantId, tenants.companyName)
        .orderBy(desc(sql`sum(${credits.availableCredits})`))
        .limit(10);

      // Low balance alerts
      const lowBalanceAlerts = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          availableCredits: credits.availableCredits,
          lastUpdatedAt: credits.lastUpdatedAt
        })
        .from(credits)
        .innerJoin(tenants, eq(credits.tenantId, tenants.tenantId))
        .innerJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.isActive, true),
          sql`${credits.availableCredits} < 100`
        ))
        .orderBy(credits.availableCredits)
        .limit(20);

      // Recent credit transactions with enhanced details
      const recentTransactions = await db
        .select({
          transactionId: creditTransactions.transactionId,
          tenantId: creditTransactions.tenantId,
          companyName: tenants.companyName,
          entityId: creditTransactions.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          transactionType: creditTransactions.transactionType,
          amount: creditTransactions.amount,
          previousBalance: creditTransactions.previousBalance,
          newBalance: creditTransactions.newBalance,
          operationCode: creditTransactions.operationCode,
          createdAt: creditTransactions.createdAt,
          initiatedBy: creditTransactions.initiatedBy
        })
        .from(creditTransactions)
        .innerJoin(tenants, eq(creditTransactions.tenantId, tenants.tenantId))
        .leftJoin(entities, eq(creditTransactions.entityId, entities.entityId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(15);

      return {
        success: true,
        data: {
          totalStats: totalStats[0],
          tenantDistribution,
          lowBalanceAlerts,
          recentTransactions,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching credit overview:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit overview' });
    }
  });

  // Get credit usage analytics
  fastify.get('/analytics', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      description: 'Get credit usage analytics',
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['7d', '30d', '90d', '1y'], default: '30d' },
          groupBy: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Usage by operation type
      const usageByOperation = await db
        .select({
          operationCode: creditTransactions.operationCode,
          totalUsed: sql`sum(${creditTransactions.amount})`,
          transactionCount: count(),
          avgPerTransaction: sql`avg(${creditTransactions.amount})`
        })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.transactionType, 'consumption'),
          gte(creditTransactions.createdAt, startDate),
          lte(creditTransactions.createdAt, endDate)
        ))
        .groupBy(creditTransactions.operationCode)
        .orderBy(desc(sql`sum(${creditTransactions.amount})`))
        .limit(10);

      // Usage by tenant
      const usageByTenant = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          totalUsed: sql`sum(${creditTransactions.amount})`,
          transactionCount: count()
        })
        .from(creditTransactions)
        .innerJoin(tenants, eq(creditTransactions.tenantId, tenants.tenantId))
        .where(and(
          eq(creditTransactions.transactionType, 'consumption'),
          gte(creditTransactions.createdAt, startDate),
          lte(creditTransactions.createdAt, endDate)
        ))
        .groupBy(tenants.tenantId, tenants.companyName)
        .orderBy(desc(sql`sum(${creditTransactions.amount})`))
        .limit(10);

      // Daily usage trend
      const dateFormat = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" :
                        groupBy === 'week' ? "DATE_TRUNC('week', created_at)" :
                        "DATE_TRUNC('day', created_at)";

      const usageTrend = await db
        .select({
          period: sql`to_char(${dateFormat}, 'YYYY-MM-DD')`,
          totalUsed: sql`sum(${creditTransactions.amount})`,
          transactionCount: count()
        })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.transactionType, 'consumption'),
          gte(creditTransactions.createdAt, startDate),
          lte(creditTransactions.createdAt, endDate)
        ))
        .groupBy(sql`${dateFormat}`)
        .orderBy(sql`${dateFormat}`);

      return {
        success: true,
        data: {
          usageByOperation,
          usageByTenant,
          usageTrend,
          period,
          groupBy,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
      };
    } catch (error) {
      console.error('Error fetching credit analytics:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit analytics' });
    }
  });

  // Get credit alerts and warnings
  fastify.get('/alerts', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      description: 'Get credit alerts and warnings'
    }
  }, async (request, reply) => {
    try {
      // Critical alerts (very low balance)
      const criticalAlerts = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          availableCredits: credits.availableCredits,
          alertLevel: sql<string>`'critical'`,
          lastUpdatedAt: credits.lastUpdatedAt
        })
        .from(credits)
        .innerJoin(tenants, eq(credits.tenantId, tenants.tenantId))
        .innerJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.isActive, true),
          sql`${credits.availableCredits} < 10`
        ))
        .orderBy(credits.availableCredits);

      // Warning alerts (low balance)
      const warningAlerts = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          availableCredits: credits.availableCredits,
          alertLevel: sql<string>`'warning'`,
          lastUpdatedAt: credits.lastUpdatedAt
        })
        .from(credits)
        .innerJoin(tenants, eq(credits.tenantId, tenants.tenantId))
        .innerJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.isActive, true),
          between(credits.availableCredits, 10, 99)
        ))
        .orderBy(credits.availableCredits);

      // Inactive credits (no recent activity)
      const inactiveCredits = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          availableCredits: credits.availableCredits,
          daysSinceUpdate: sql`extract(day from now() - ${credits.lastUpdatedAt})`,
          alertLevel: sql`'inactive'`,
          lastUpdatedAt: credits.lastUpdatedAt
        })
        .from(credits)
        .innerJoin(tenants, eq(credits.tenantId, tenants.tenantId))
        .innerJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.isActive, true),
          sql`${credits.lastUpdatedAt} < now() - interval '90 days'`,
          sql`${credits.availableCredits} > 0`
        ))
        .orderBy(desc(sql`extract(day from now() - ${credits.lastUpdatedAt})`));

      return {
        success: true,
        data: {
          critical: criticalAlerts,
          warning: warningAlerts,
          inactive: inactiveCredits,
          summary: {
            criticalCount: criticalAlerts.length,
            warningCount: warningAlerts.length,
            inactiveCount: inactiveCredits.length,
            totalAlerts: criticalAlerts.length + warningAlerts.length + inactiveCredits.length
          },
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching credit alerts:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit alerts' });
    }
  });

  // Bulk credit allocation
  fastify.post('/bulk-allocate', {
    preHandler: [authenticateToken, requirePermission('admin.credits.manage')],
    schema: {
      description: 'Bulk allocate credits to multiple entities',
      body: {
        type: 'object',
        properties: {
          allocations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: { type: 'string' },
                amount: { type: 'number', minimum: 0 },
                operationCode: { type: 'string', default: 'admin.bulk_allocation' }
              },
              required: ['entityId', 'amount']
            }
          },
          reason: { type: 'string' }
        },
        required: ['allocations']
      }
    }
  }, async (request, reply) => {
    try {
      const { allocations, reason } = request.body;

      const results = [];
      for (const allocation of allocations) {
        const { entityId, amount, operationCode = 'admin.bulk_allocation' } = allocation;

        // Check if entity exists and has credit record
        const entityCheck = await db
          .select()
          .from(entities)
          .where(eq(entities.entityId, entityId))
          .limit(1);

        if (!entityCheck.length) {
          results.push({
            entityId,
            success: false,
            error: 'Entity not found'
          });
          continue;
        }

        const tenantId = entityCheck[0].tenantId;

        // Check if credit record exists, if not create it, if yes update it
        const existingCredit = await db
          .select()
          .from(credits)
          .where(and(
            eq(credits.tenantId, tenantId),
            eq(credits.entityId, entityId),
            eq(credits.isActive, true)
          ))
          .limit(1);

        if (existingCredit.length === 0) {
          // Create new credit record
          await db
            .insert(credits)
            .values({
              tenantId,
              entityId,
              availableCredits: amount.toString(),
              reservedCredits: '0',
              isActive: true,
              lastUpdatedAt: new Date(),
              createdAt: new Date()
            });
        } else {
          // Update existing credit record
          await db
            .update(credits)
            .set({
              availableCredits: sql`${credits.availableCredits} + ${amount}`,
              lastUpdatedAt: new Date()
            })
            .where(and(
              eq(credits.tenantId, tenantId),
              eq(credits.entityId, entityId),
              eq(credits.isActive, true)
            ));
        }

        // Record transaction
        await db
          .insert(creditTransactions)
          .values({
            tenantId,
            entityId,
            transactionType: 'purchase',
            amount: amount.toString(),
            previousBalance: '0', // Would need to calculate actual previous balance
            newBalance: amount.toString(),
            operationCode,
            initiatedBy: request.userContext.internalUserId || request.userContext.userId,
            createdAt: new Date()
          });

        results.push({
          entityId,
          success: true,
          amount,
          newBalance: amount
        });
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`Admin ${request.userContext.userId} bulk allocated credits to ${successCount} entities${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        data: {
          results,
          summary: {
            total: allocations.length,
            successful: successCount,
            failed: failureCount
          }
        }
      };
    } catch (error) {
      console.error('Error bulk allocating credits:', error);
      return reply.code(500).send({ error: 'Failed to bulk allocate credits' });
    }
  });

  // Get all entities with their current credit balances
  fastify.get('/entity-balances', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      description: 'Get all entities with their current credit balances',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 50 },
          tenantId: { type: 'string' },
          entityType: { type: 'string', enum: ['organization', 'location', 'department', 'team'] },
          minBalance: { type: 'number' },
          maxBalance: { type: 'number' },
          hasCredits: { type: 'boolean', default: true },
          sortBy: { type: 'string', enum: ['availableCredits', 'entityName', 'companyName', 'lastUpdatedAt'], default: 'availableCredits' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 50, tenantId, entityType, minBalance, maxBalance, hasCredits = true, sortBy = 'availableCredits', sortOrder = 'desc' } = request.query;

      let query = db
        .select({
          entityId: entities.entityId,
          tenantId: entities.tenantId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          companyName: tenants.companyName,
          availableCredits: sql`coalesce(${credits.availableCredits}, 0)`,
          totalCredits: sql`coalesce(${credits.availableCredits}, 0)`,
          isActive: entities.isActive,
          lastUpdatedAt: credits.lastUpdatedAt,
          createdAt: entities.createdAt
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .leftJoin(credits, and(
          eq(credits.entityId, entities.entityId),
          eq(credits.isActive, true)
        ));

      // Apply filters
      if (tenantId) {
        query = query.where(eq(entities.tenantId, tenantId));
      }

      if (entityType) {
        query = query.where(eq(entities.entityType, entityType));
      }

      if (hasCredits) {
        query = query.where(sql`${credits.availableCredits} IS NOT NULL`);
      } else {
        query = query.where(sql`${credits.availableCredits} IS NULL`);
      }

      if (minBalance !== undefined) {
        query = query.where(sql`${credits.availableCredits} >= ${minBalance}`);
      }

      if (maxBalance !== undefined) {
        query = query.where(sql`${credits.availableCredits} <= ${maxBalance}`);
      }

      // Apply sorting
      const sortColumn = sortBy === 'availableCredits' ? sql`${credits.availableCredits} ${sortOrder}` :
                         sortBy === 'entityName' ? sql`${entities.entityName} ${sortOrder}` :
                         sortBy === 'companyName' ? sql`${tenants.companyName} ${sortOrder}` :
                         sortBy === 'lastUpdatedAt' ? sql`${credits.lastUpdatedAt} ${sortOrder}` :
                         sql`${credits.availableCredits} desc`;

      query = query.orderBy(sql`${sortColumn}`);

      // Get total count
      const totalCount = await db
        .select({ count: count() })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .leftJoin(credits, and(
          eq(credits.entityId, entities.entityId),
          eq(credits.isActive, true)
        ))
        .then(result => result[0].count);

      // Apply pagination
      const offset = (page - 1) * limit;
      const entityBalances = await query.limit(limit).offset(offset);

      return {
        success: true,
        data: {
          entityBalances,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error fetching entity credit balances:', error);
      return reply.code(500).send({ error: 'Failed to fetch entity credit balances' });
    }
  });

  // Get credit transaction history with filtering
  fastify.get('/transactions', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      description: 'Get credit transaction history',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 50 },
          tenantId: { type: 'string' },
          entityId: { type: 'string' },
          transactionType: { type: 'string', enum: ['purchase', 'consumption', 'expiry', 'adjustment'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          minAmount: { type: 'number' },
          maxAmount: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 50, tenantId, entityId, transactionType, startDate, endDate, minAmount, maxAmount } = request.query;

      let query = db
        .select({
          transactionId: creditTransactions.transactionId,
          tenantId: creditTransactions.tenantId,
          companyName: tenants.companyName,
          entityId: creditTransactions.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          transactionType: creditTransactions.transactionType,
          amount: creditTransactions.amount,
          previousBalance: creditTransactions.previousBalance,
          newBalance: creditTransactions.newBalance,
          operationCode: creditTransactions.operationCode,
          createdAt: creditTransactions.createdAt
        })
        .from(creditTransactions)
        .leftJoin(tenants, eq(creditTransactions.tenantId, tenants.tenantId))
        .leftJoin(entities, eq(creditTransactions.entityId, entities.entityId))
        .orderBy(desc(creditTransactions.createdAt));

      // Apply filters
      if (tenantId) {
        query = query.where(eq(creditTransactions.tenantId, tenantId));
      }

      if (entityId) {
        query = query.where(eq(creditTransactions.entityId, entityId));
      }

      if (transactionType) {
        query = query.where(eq(creditTransactions.transactionType, transactionType));
      }

      if (startDate) {
        query = query.where(gte(creditTransactions.createdAt, new Date(startDate)));
      }

      if (endDate) {
        query = query.where(lte(creditTransactions.createdAt, new Date(endDate)));
      }

      if (minAmount !== undefined) {
        query = query.where(gte(sql`abs(${creditTransactions.amount})`, minAmount));
      }

      if (maxAmount !== undefined) {
        query = query.where(lte(sql`abs(${creditTransactions.amount})`, maxAmount));
      }

      // Get total count
      const totalCount = await db
        .select({ count: count() })
        .from(creditTransactions)
        .then(result => result[0].count);

      // Apply pagination
      const offset = (page - 1) * limit;
      const transactions = await query.limit(limit).offset(offset);

      return {
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error fetching credit transactions:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit transactions' });
    }
  });

  // Get all application allocations across all tenants (admin view)
  fastify.get('/application-allocations', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      description: 'Get all application credit allocations across all tenants'
    }
  }, async (request, reply) => {
    try {
      console.log('🔍 Getting all application allocations (admin view)');

      // Get all active application allocations with tenant and entity information
      const allocations = await db
        .select({
          allocationId: creditAllocations.allocationId,
          tenantId: creditAllocations.tenantId,
          companyName: tenants.companyName,
          sourceEntityId: creditAllocations.sourceEntityId,
          entityName: entities.entityName,
          targetApplication: creditAllocations.targetApplication,
          allocatedCredits: creditAllocations.allocatedCredits,
          usedCredits: creditAllocations.usedCredits,
          availableCredits: creditAllocations.availableCredits,
          allocationType: creditAllocations.allocationType,
          allocationPurpose: creditAllocations.allocationPurpose,
          allocatedAt: creditAllocations.allocatedAt,
          expiresAt: creditAllocations.expiresAt,
          autoReplenish: creditAllocations.autoReplenish
        })
        .from(creditAllocations)
        .innerJoin(tenants, eq(creditAllocations.tenantId, tenants.tenantId))
        .leftJoin(entities, eq(creditAllocations.sourceEntityId, entities.entityId))
        .where(eq(creditAllocations.isActive, true))
        .orderBy(desc(creditAllocations.allocatedAt));

      // Calculate summary statistics
      const summary = {
        totalAllocations: allocations.length,
        totalAllocatedCredits: 0,
        totalUsedCredits: 0,
        totalAvailableCredits: 0,
        allocationsByApplication: {}
      };

      // Process allocations and build summary
      allocations.forEach((allocation) => {
        const allocated = parseFloat(allocation.allocatedCredits || '0');
        const used = parseFloat(allocation.usedCredits || '0');
        const available = parseFloat(allocation.availableCredits || '0');

        summary.totalAllocatedCredits += allocated;
        summary.totalUsedCredits += used;
        summary.totalAvailableCredits += available;

        const app = allocation.targetApplication;
        if (!summary.allocationsByApplication[app]) {
          summary.allocationsByApplication[app] = {
            application: app,
            allocationCount: 0,
            totalAllocated: 0,
            totalUsed: 0,
            totalAvailable: 0
          };
        }

        summary.allocationsByApplication[app].allocationCount++;
        summary.allocationsByApplication[app].totalAllocated += allocated;
        summary.allocationsByApplication[app].totalUsed += used;
        summary.allocationsByApplication[app].totalAvailable += available;
      });

      // Convert allocationsByApplication object to array
      const allocationsByApplicationArray = Object.values(summary.allocationsByApplication);

      return {
        success: true,
        data: {
          allocations: allocations.map(allocation => ({
            ...allocation,
            allocatedCredits: parseFloat(allocation.allocatedCredits || '0'),
            usedCredits: parseFloat(allocation.usedCredits || '0'),
            availableCredits: parseFloat(allocation.availableCredits || '0')
          })),
          summary: {
            ...summary,
            allocationsByApplication: allocationsByApplicationArray
          }
        }
      };
    } catch (error) {
      console.error('❌ Failed to get application allocations:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get application allocations',
        message: error.message
      });
    }
  });

  // Get application allocations for an entity
  fastify.get('/entity/:entityId/application-allocations', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { entityId } = request.params;
      const { tenantId } = request.userContext;

      console.log('🔍 Getting application allocations for entity:', { entityId, tenantId });

      const allocations = await CreditAllocationService.getApplicationAllocations(tenantId, entityId);

      return {
        success: true,
        data: {
          allocations: allocations || []
        }
      };
    } catch (error) {
      console.error('❌ Failed to get application allocations:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get application allocations',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/credits/process-expiries
   * Process all credit expiries (free, seasonal, subscription)
   */
  fastify.post('/process-expiries', {
    preHandler: [authenticateToken, requirePermission('admin.credits.manage')],
    schema: {
      body: {
        type: 'object',
        properties: {
          creditTypes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: Filter by credit types (e.g., ["free", "seasonal"]). If not provided, processes all types.'
          },
          processSubscriptionCredits: {
            type: 'boolean',
            default: true,
            description: 'Whether to process subscription-related credit expiries'
          }
        }
      },
      description: 'Manually trigger credit expiry processing for all expired allocations'
    }
  }, async (request, reply) => {
    try {
      const { creditTypes, processSubscriptionCredits = true } = request.body;
      
      console.log(`🔧 Admin ${request.userContext.userId} triggered credit expiry processing`, {
        creditTypes,
        processSubscriptionCredits
      });

      const results = {
        freeCredits: null,
        seasonalCredits: null,
        subscriptionCredits: null
      };

      // Process free credits expiry
      if (!creditTypes || creditTypes.includes('free')) {
        try {
          results.freeCredits = await CreditAllocationService.processCreditExpiries(['free']);
        } catch (error) {
          console.error('Error processing free credits expiry:', error);
          results.freeCredits = { error: error.message };
        }
      }

      // Process seasonal credits expiry
      if (!creditTypes || creditTypes.some(type => ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'].includes(type))) {
        try {
          const seasonalService = new SeasonalCreditService();
          results.seasonalCredits = await seasonalService.processSeasonalCreditExpiries();
        } catch (error) {
          console.error('Error processing seasonal credits expiry:', error);
          results.seasonalCredits = { error: error.message };
        }
      }

      // Process subscription-related credits expiry
      if (processSubscriptionCredits) {
        try {
          // Find expired subscriptions and expire their credits
          const now = new Date();
          const expiredSubscriptions = await db
            .select()
            .from(subscriptions)
            .where(and(
              eq(subscriptions.status, 'active'),
              sql`${subscriptions.currentPeriodEnd} IS NOT NULL`,
              sql`${subscriptions.currentPeriodEnd} <= ${now}`
            ));

          console.log(`📅 Found ${expiredSubscriptions.length} expired subscriptions`);

          let subscriptionCreditsExpired = 0;
          for (const subscription of expiredSubscriptions) {
            try {
              // Update subscription status
              await db
                .update(subscriptions)
                .set({
                  status: 'expired',
                  updatedAt: new Date()
                })
                .where(eq(subscriptions.subscriptionId, subscription.subscriptionId));

              // Expire credits for this tenant
              await CreditAllocationService.expireAllCreditsForTenant(
                subscription.tenantId,
                'subscription_expired'
              );
              subscriptionCreditsExpired++;
            } catch (subError) {
              console.error(`Failed to expire credits for subscription ${subscription.subscriptionId}:`, subError.message);
            }
          }

          results.subscriptionCredits = {
            expiredSubscriptions: expiredSubscriptions.length,
            creditsExpired: subscriptionCreditsExpired
          };
        } catch (error) {
          console.error('Error processing subscription credits expiry:', error);
          results.subscriptionCredits = { error: error.message };
        }
      }

      return {
        success: true,
        message: 'Credit expiry processing completed',
        data: results
      };
    } catch (error) {
      console.error('Error processing credit expiries:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to process credit expiries',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/credits/expiring-summary
   * Get summary of all expiring credits (free, seasonal, subscription)
   */
  fastify.get('/expiring-summary', {
    preHandler: [authenticateToken, requirePermission('admin.credits.view')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          daysAhead: { type: 'integer', default: 30 },
          creditType: { type: 'string' }
        }
      },
      description: 'Get summary of all expiring credits across all types'
    }
  }, async (request, reply) => {
    try {
      const { daysAhead = 30, creditType } = request.query;
      const now = new Date();
      const futureDate = new Date(now.getTime() + (parseInt(daysAhead) * 24 * 60 * 60 * 1000));

      let whereConditions = [
        eq(creditAllocations.isActive, true),
        isNotNull(creditAllocations.expiresAt),
        sql`${creditAllocations.expiresAt} > ${now}`,
        sql`${creditAllocations.expiresAt} <= ${futureDate}`
      ];

      if (creditType) {
        whereConditions.push(eq(creditAllocations.creditType, creditType));
      }

      // Get expiring allocations grouped by type
      const expiringByType = await db
        .select({
          creditType: creditAllocations.creditType,
          count: sql`COUNT(*)`,
          totalAllocated: sql`SUM(${creditAllocations.allocatedCredits}::numeric)`,
          totalAvailable: sql`SUM(${creditAllocations.availableCredits}::numeric)`,
          earliestExpiry: sql`MIN(${creditAllocations.expiresAt})`,
          latestExpiry: sql`MAX(${creditAllocations.expiresAt})`
        })
        .from(creditAllocations)
        .where(and(...whereConditions))
        .groupBy(creditAllocations.creditType);

      // Get expiring subscriptions
      const expiringSubscriptions = await db
        .select({
          subscriptionId: subscriptions.subscriptionId,
          tenantId: subscriptions.tenantId,
          plan: subscriptions.plan,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          daysUntilExpiry: sql`EXTRACT(EPOCH FROM (${subscriptions.currentPeriodEnd} - ${now})) / 86400`
        })
        .from(subscriptions)
        .where(and(
          eq(subscriptions.status, 'active'),
          isNotNull(subscriptions.currentPeriodEnd),
          sql`${subscriptions.currentPeriodEnd} > ${now}`,
          sql`${subscriptions.currentPeriodEnd} <= ${futureDate}`
        ));

      return {
        success: true,
        data: {
          allocations: expiringByType.map(item => ({
            creditType: item.creditType,
            count: parseInt(item.count),
            totalAllocated: parseFloat(item.totalAllocated || '0'),
            totalAvailable: parseFloat(item.totalAvailable || '0'),
            earliestExpiry: item.earliestExpiry,
            latestExpiry: item.latestExpiry
          })),
          subscriptions: expiringSubscriptions.map(sub => ({
            subscriptionId: sub.subscriptionId,
            tenantId: sub.tenantId,
            plan: sub.plan,
            currentPeriodEnd: sub.currentPeriodEnd,
            daysUntilExpiry: Math.floor(parseFloat(sub.daysUntilExpiry))
          })),
          summary: {
            totalAllocations: expiringByType.reduce((sum, item) => sum + parseInt(item.count), 0),
            totalSubscriptionExpiries: expiringSubscriptions.length,
            daysAhead: parseInt(daysAhead)
          }
        }
      };
    } catch (error) {
      console.error('Error getting expiring summary:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve expiring summary',
        message: error.message
      });
    }
  });
}
