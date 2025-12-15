/**
 * Admin Credit Service - Independent service for credit administration
 * Provides comprehensive credit monitoring without modifying existing services
 */

import { db } from '../../../db/index.js';
import { credits, creditTransactions, tenants, entities } from '../../../db/schema/index.js';
import { eq, and, desc, sql, count, sum, gte, lte, like, or, between } from 'drizzle-orm';

export class CreditAdminService {
  /**
   * Get comprehensive credit overview
   */
  static async getCreditOverview() {
    try {
      // Total credit statistics
      const totalStats = await db
        .select({
          totalCredits: sql<number>`coalesce(sum(${credits.availableCredits}), 0)`,
          totalReserved: sql<number>`coalesce(sum(${credits.reservedCredits}), 0)`,
          totalEntities: sql<number>`count(distinct ${credits.entityId})`,
          totalTenants: sql<number>`count(distinct ${credits.tenantId})`
        })
        .from(credits);

      // Credit distribution by tenant (top 10)
      const tenantDistribution = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          totalCredits: sql<number>`coalesce(sum(${credits.availableCredits}), 0)`,
          reservedCredits: sql<number>`coalesce(sum(${credits.reservedCredits}), 0)`,
          entityCount: sql<number>`count(distinct ${credits.entityId})`
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
          alertLevel: sql<string>`case when ${credits.availableCredits} < 10 then 'critical' else 'warning' end`,
          lastUpdatedAt: credits.lastUpdatedAt
        })
        .from(credits)
        .innerJoin(tenants, eq(credits.tenantId, tenants.tenantId))
        .innerJoin(entities, eq(credits.entityId, entities.entityId))
        .where(and(
          eq(credits.isActive, true),
          sql`${credits.availableCredits} < 100`
        ))
        .orderBy(credits.availableCredits);

      // Recent credit transactions
      const recentTransactions = await db
        .select({
          transactionId: creditTransactions.transactionId,
          tenantId: creditTransactions.tenantId,
          companyName: tenants.companyName,
          transactionType: creditTransactions.transactionType,
          amount: creditTransactions.amount,
          operationCode: creditTransactions.operationCode,
          createdAt: creditTransactions.createdAt
        })
        .from(creditTransactions)
        .innerJoin(tenants, eq(creditTransactions.tenantId, tenants.tenantId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(10);

      return {
        totalStats: totalStats[0],
        tenantDistribution,
        lowBalanceAlerts,
        recentTransactions,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting credit overview:', error);
      throw error;
    }
  }

  /**
   * Get credit usage analytics
   */
  static async getCreditAnalytics(filters = {}) {
    try {
      const { period = '30d', groupBy = 'day' } = filters;

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
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Usage by operation type
      const usageByOperation = await db
        .select({
          operationCode: creditTransactions.operationCode,
          totalUsed: sql<number>`abs(sum(${creditTransactions.amount}))`,
          transactionCount: count(),
          avgPerTransaction: sql<number>`abs(avg(${creditTransactions.amount}))`
        })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.transactionType, 'consumption'),
          gte(creditTransactions.createdAt, startDate),
          lte(creditTransactions.createdAt, endDate)
        ))
        .groupBy(creditTransactions.operationCode)
        .orderBy(desc(sql`abs(sum(${creditTransactions.amount}))`))
        .limit(10);

      // Usage by tenant
      const usageByTenant = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          totalUsed: sql<number>`abs(sum(${creditTransactions.amount}))`,
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
        .orderBy(desc(sql`abs(sum(${creditTransactions.amount}))`))
        .limit(10);

      // Daily usage trend
      const dateFormat = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" :
                        groupBy === 'week' ? "DATE_TRUNC('week', created_at)" :
                        "DATE_TRUNC('day', created_at)";

      const usageTrend = await db
        .select({
          period: sql<string>`to_char(${dateFormat}, 'YYYY-MM-DD')`,
          totalUsed: sql<number>`abs(sum(case when ${creditTransactions.transactionType} = 'consumption' then ${creditTransactions.amount} else 0 end))`,
          totalAdded: sql<number>`sum(case when ${creditTransactions.transactionType} = 'purchase' then ${creditTransactions.amount} else 0 end)`,
          transactionCount: count()
        })
        .from(creditTransactions)
        .where(and(
          gte(creditTransactions.createdAt, startDate),
          lte(creditTransactions.createdAt, endDate)
        ))
        .groupBy(sql`${dateFormat}`)
        .orderBy(sql`${dateFormat}`);

      return {
        usageByOperation,
        usageByTenant,
        usageTrend,
        period,
        groupBy,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting credit analytics:', error);
      throw error;
    }
  }

  /**
   * Get credit alerts and warnings
   */
  static async getCreditAlerts() {
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
          daysSinceUpdate: sql<number>`extract(day from now() - ${credits.lastUpdatedAt})`,
          alertLevel: sql<string>`'inactive'`,
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
      };
    } catch (error) {
      console.error('Error getting credit alerts:', error);
      throw error;
    }
  }

  /**
   * Bulk allocate credits to multiple entities
   */
  static async bulkAllocateCredits(allocations, reason = null, adminUserId = null) {
    try {
      const results = [];

      for (const allocation of allocations) {
        const { entityId, amount, operationCode = 'admin.bulk_allocation' } = allocation;

        try {
          // Check if entity exists
          const entityCheck = await db
            .select({
              entityId: entities.entityId,
              tenantId: entities.tenantId,
              entityName: entities.entityName
            })
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

          // Ensure credit record exists
          await db
            .insert(credits)
            .values({
              tenantId,
              entityId,
              availableCredits: '0',
              reservedCredits: '0',
              isActive: true,
              lastUpdatedAt: new Date(),
              createdAt: new Date()
            })
            .onConflictDoNothing();

          // Update credit balance
          await db
            .update(credits)
            .set({
              availableCredits: sql`${credits.availableCredits} + ${amount}`,
              lastUpdatedAt: new Date()
            })
            .where(eq(credits.entityId, entityId));

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
              initiatedBy: adminUserId,
              createdAt: new Date()
            });

          results.push({
            entityId,
            entityName: entityCheck[0].entityName,
            success: true,
            amount,
            newBalance: amount
          });
        } catch (error) {
          console.error(`Error allocating credits to entity ${entityId}:`, error);
          results.push({
            entityId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`Admin ${adminUserId} bulk allocated credits to ${successCount} entities${reason ? `: ${reason}` : ''}`);

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
      throw error;
    }
  }

  /**
   * Get credit transaction history with filtering
   */
  static async getCreditTransactions(filters = {}, pagination = {}) {
    try {
      const {
        tenantId,
        entityId,
        transactionType,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page = 1,
        limit = 50
      } = { ...filters, ...pagination };

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
          initiatedBy: creditTransactions.initiatedBy,
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
      const totalCount = await this.getCreditTransactionCount({ ...filters });

      // Apply pagination
      const offset = (page - 1) * limit;
      const transactions = await query.limit(limit).offset(offset);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Error getting credit transactions:', error);
      throw error;
    }
  }

  /**
   * Get credit transaction count with filters
   */
  static async getCreditTransactionCount(filters = {}) {
    try {
      const { tenantId, entityId, transactionType, startDate, endDate, minAmount, maxAmount } = filters;

      let query = db
        .select({ count: count() })
        .from(creditTransactions);

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

      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting credit transaction count:', error);
      throw error;
    }
  }

  /**
   * Get credit summary for a specific tenant
   */
  static async getTenantCreditSummary(tenantId) {
    try {
      const summary = await db
        .select({
          totalCredits: sql<number>`coalesce(sum(${credits.availableCredits}), 0)`,
          totalReserved: sql<number>`coalesce(sum(${credits.reservedCredits}), 0)`,
          entityCount: sql<number>`count(distinct ${credits.entityId})`,
          lowBalanceCount: sql<number>`count(case when ${credits.availableCredits} < 100 then 1 end)`
        })
        .from(credits)
        .where(eq(credits.tenantId, tenantId));

      const recentTransactions = await db
        .select({
          transactionId: creditTransactions.transactionId,
          transactionType: creditTransactions.transactionType,
          amount: creditTransactions.amount,
          operationCode: creditTransactions.operationCode,
          createdAt: creditTransactions.createdAt
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.tenantId, tenantId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(5);

      return {
        summary: summary[0],
        recentTransactions,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting tenant credit summary:', error);
      throw error;
    }
  }
}
