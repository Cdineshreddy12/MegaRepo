/**
 * Admin Tenant Service - Independent service for tenant administration
 * Provides comprehensive tenant management without modifying existing services
 */

import { db } from '../../../db/index.js';
import { tenants, tenantUsers, entities, credits, creditTransactions } from '../../../db/schema/index.js';
import { eq, and, desc, sql, count, sum, gte, lte, like, or } from 'drizzle-orm';

export class TenantAdminService {
  /**
   * Get comprehensive tenant list with filtering and pagination
   */
  static async getTenantList(filters = {}, pagination = {}) {
    try {
      const {
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = { ...filters, ...pagination };

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
          // Aggregated data
          userCount: sql<number>`count(distinct ${tenantUsers.userId})`,
          entityCount: sql<number>`count(distinct ${entities.entityId})`,
          totalCredits: sql<number>`coalesce(sum(${credits.availableCredits}), 0)`,
          reservedCredits: sql<number>`coalesce(sum(${credits.reservedCredits}), 0)`,
          lastActivity: sql`greatest(max(${tenantUsers.lastLoginAt}), max(${creditTransactions.createdAt}))`
        })
        .from(tenants)
        .leftJoin(tenantUsers, eq(tenants.tenantId, tenantUsers.tenantId))
        .leftJoin(entities, eq(tenants.tenantId, entities.tenantId))
        .leftJoin(credits, eq(tenants.tenantId, credits.tenantId))
        .leftJoin(creditTransactions, eq(tenants.tenantId, creditTransactions.tenantId))
        .groupBy(tenants.tenantId);

      // Apply search filter
      if (search) {
        query = query.where(or(
          like(tenants.companyName, `%${search}%`),
          like(tenants.subdomain, `%${search}%`),
          like(tenants.adminEmail, `%${search}%`)
        ));
      }

      // Apply status filter
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
            query = query.where(or(
              sql`${tenants.trialEndsAt} is null`,
              sql`${tenants.trialEndsAt} < now()`
            ));
            break;
          case 'verified':
            query = query.where(eq(tenants.isVerified, true));
            break;
          case 'unverified':
            query = query.where(eq(tenants.isVerified, false));
            break;
        }
      }

      // Apply sorting
      const sortColumn = this.getSortColumn(sortBy);
      query = sortOrder === 'desc' ?
        query.orderBy(desc(sortColumn)) :
        query.orderBy(sortColumn);

      // Get total count for pagination
      const totalCount = await this.getTenantCount(filters);

      // Apply pagination
      const offset = (page - 1) * limit;
      const tenantsList = await query.limit(limit).offset(offset);

      return {
        tenants: tenantsList,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Error getting tenant list:', error);
      throw error;
    }
  }

  /**
   * Get total tenant count with filters
   */
  static async getTenantCount(filters = {}) {
    try {
      const { search, status } = filters;

      let query = db
        .select({ count: count() })
        .from(tenants);

      // Apply search filter
      if (search) {
        query = query.where(or(
          like(tenants.companyName, `%${search}%`),
          like(tenants.subdomain, `%${search}%`),
          like(tenants.adminEmail, `%${search}%`)
        ));
      }

      // Apply status filter
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
            query = query.where(or(
              sql`${tenants.trialEndsAt} is null`,
              sql`${tenants.trialEndsAt} < now()`
            ));
            break;
          case 'verified':
            query = query.where(eq(tenants.isVerified, true));
            break;
          case 'unverified':
            query = query.where(eq(tenants.isVerified, false));
            break;
        }
      }

      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting tenant count:', error);
      throw error;
    }
  }

  /**
   * Get detailed tenant information
   */
  static async getTenantDetails(tenantId) {
    try {
      // Get tenant basic info
      const tenantInfo = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenantInfo.length) {
        throw new Error('Tenant not found');
      }

      const tenant = tenantInfo[0];

      // Get tenant users
      const users = await db
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
        .where(eq(tenantUsers.tenantId, tenantId))
        .orderBy(desc(tenantUsers.lastLoginAt));

      // Get entity summary
      const entitySummary = await db
        .select({
          total: count(),
          organizations: sql<number>`count(case when ${entities.entityType} = 'organization' then 1 end)`,
          locations: sql<number>`count(case when ${entities.entityType} = 'location' then 1 end)`,
          departments: sql<number>`count(case when ${entities.entityType} = 'department' then 1 end)`,
          teams: sql<number>`count(case when ${entities.entityType} = 'team' then 1 end)`,
          active: sql<number>`count(case when ${entities.isActive} = true then 1 end)`
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId));

      // Get credit summary
      const creditSummary = await db
        .select({
          totalCredits: sql<number>`coalesce(sum(${credits.availableCredits}), 0)`,
          reservedCredits: sql<number>`coalesce(sum(${credits.reservedCredits}), 0)`,
          activeEntities: sql<number>`count(case when ${credits.isActive} = true then 1 end)`,
          averageCredits: sql<number>`avg(${credits.availableCredits})`
        })
        .from(credits)
        .where(eq(credits.tenantId, tenantId));

      // Get recent activity
      const recentActivity = await this.getTenantActivity(tenantId, 10);

      return {
        tenant,
        users,
        entitySummary: entitySummary[0],
        creditSummary: creditSummary[0],
        recentActivity
      };
    } catch (error) {
      console.error('Error getting tenant details:', error);
      throw error;
    }
  }

  /**
   * Update tenant status
   */
  static async updateTenantStatus(tenantId, isActive, reason = null, adminUserId = null) {
    try {
      await db
        .update(tenants)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Log the action (in a real implementation, this would go to an audit log)
      console.log(`Tenant ${tenantId} ${isActive ? 'activated' : 'deactivated'} by admin ${adminUserId}${reason ? `: ${reason}` : ''}`);

      return { success: true };
    } catch (error) {
      console.error('Error updating tenant status:', error);
      throw error;
    }
  }

  /**
   * Bulk update tenant status
   */
  static async bulkUpdateTenantStatus(tenantIds, isActive, reason = null, adminUserId = null) {
    try {
      await db
        .update(tenants)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(sql`${tenants.tenantId} = any(${tenantIds})`);

      console.log(`Bulk ${isActive ? 'activated' : 'deactivated'} ${tenantIds.length} tenants by admin ${adminUserId}${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        updatedCount: tenantIds.length
      };
    } catch (error) {
      console.error('Error bulk updating tenant status:', error);
      throw error;
    }
  }

  /**
   * Get tenant activity log
   */
  static async getTenantActivity(tenantId, limit = 50, offset = 0) {
    try {
      const activities = [];

      // User login activities
      const userLogins = await db
        .select({
          type: sql<string>`'user_login'`,
          description: sql<string>`concat(${tenantUsers.firstName}, ' ', ${tenantUsers.lastName}, ' logged in')`,
          timestamp: tenantUsers.lastLoginAt,
          userId: tenantUsers.userId,
          metadata: sql`json_build_object('userId', ${tenantUsers.userId}, 'email', ${tenantUsers.email})`
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          sql`${tenantUsers.lastLoginAt} is not null`
        ))
        .orderBy(desc(tenantUsers.lastLoginAt))
        .limit(limit);

      // Credit transaction activities
      const creditActivities = await db
        .select({
          type: sql<string>`'credit_transaction'`,
          description: sql<string>`concat('Credit ', ${creditTransactions.transactionType}, ' of ', abs(${creditTransactions.amount}), ' (', ${creditTransactions.operationCode}, ')')`,
          timestamp: creditTransactions.createdAt,
          userId: creditTransactions.initiatedBy,
          metadata: sql`json_build_object('transactionId', ${creditTransactions.transactionId}, 'amount', ${creditTransactions.amount}, 'operationCode', ${creditTransactions.operationCode})`
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.tenantId, tenantId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit);

      // Entity creation activities
      const entityActivities = await db
        .select({
          type: sql<string>`'entity_created'`,
          description: sql<string>`concat(${entities.entityType}, ' "', ${entities.entityName}, '" was created')`,
          timestamp: entities.createdAt,
          userId: entities.createdBy,
          metadata: sql`json_build_object('entityId', ${entities.entityId}, 'entityType', ${entities.entityType}, 'entityName', ${entities.entityName})`
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId))
        .orderBy(desc(entities.createdAt))
        .limit(limit);

      // Combine and sort activities
      activities.push(...userLogins, ...creditActivities, ...entityActivities);
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting tenant activity:', error);
      throw error;
    }
  }

  /**
   * Export tenant data
   */
  static async exportTenantData(tenantId) {
    try {
      const tenantData = await this.getTenantDetails(tenantId);

      // Get all credit transactions
      const creditTransactionsList = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.tenantId, tenantId))
        .orderBy(desc(creditTransactions.createdAt));

      // Get all entities with their credits
      const entitiesWithCredits = await db
        .select({
          entity: entities,
          credits: credits
        })
        .from(entities)
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .where(eq(entities.tenantId, tenantId));

      return {
        tenant: tenantData.tenant,
        users: tenantData.users,
        entities: entitiesWithCredits,
        creditTransactions: creditTransactionsList,
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          tenantId,
          recordCounts: {
            users: tenantData.users.length,
            entities: entitiesWithCredits.length,
            creditTransactions: creditTransactionsList.length
          }
        }
      };
    } catch (error) {
      console.error('Error exporting tenant data:', error);
      throw error;
    }
  }

  /**
   * Get tenant statistics
   */
  static async getTenantStats(tenantId) {
    try {
      const [userStats, entityStats, creditStats, activityStats] = await Promise.all([
        this.getUserStats(tenantId),
        this.getEntityStats(tenantId),
        this.getCreditStats(tenantId),
        this.getActivityStats(tenantId)
      ]);

      return {
        userStats,
        entityStats,
        creditStats,
        activityStats,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting tenant stats:', error);
      throw error;
    }
  }

  /**
   * Helper method to get sort column
   */
  static getSortColumn(sortBy) {
    switch (sortBy) {
      case 'companyName':
        return tenants.companyName;
      case 'createdAt':
        return tenants.createdAt;
      case 'userCount':
        return sql`count(distinct ${tenantUsers.userId})`;
      case 'totalCredits':
        return sql`coalesce(sum(${credits.availableCredits}), 0)`;
      case 'lastActivity':
        return sql`greatest(max(${tenantUsers.lastLoginAt}), max(${creditTransactions.createdAt}))`;
      default:
        return tenants.createdAt;
    }
  }

  /**
   * Get user statistics for a tenant
   */
  static async getUserStats(tenantId) {
    return await db
      .select({
        total: count(),
        active: sql<number>`count(case when ${tenantUsers.isActive} = true then 1 end)`,
        recentlyActive: sql<number>`count(case when ${tenantUsers.lastLoginAt} > now() - interval '30 days' then 1 end)`
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));
  }

  /**
   * Get entity statistics for a tenant
   */
  static async getEntityStats(tenantId) {
    return await db
      .select({
        total: count(),
        byType: sql`json_object_agg(${entities.entityType}, count(*))`,
        active: sql<number>`count(case when ${entities.isActive} = true then 1 end)`
      })
      .from(entities)
      .where(eq(entities.tenantId, tenantId));
  }

  /**
   * Get credit statistics for a tenant
   */
  static async getCreditStats(tenantId) {
    return await db
      .select({
        totalAvailable: sql<number>`coalesce(sum(${credits.availableCredits}), 0)`,
        totalReserved: sql<number>`coalesce(sum(${credits.reservedCredits}), 0)`,
        averagePerEntity: sql<number>`avg(${credits.availableCredits})`,
        entitiesWithCredits: sql<number>`count(case when ${credits.availableCredits} > 0 then 1 end)`
      })
      .from(credits)
      .where(eq(credits.tenantId, tenantId));
  }

  /**
   * Get activity statistics for a tenant
   */
  static async getActivityStats(tenantId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await db
      .select({
        userLogins: sql<number>`count(distinct case when ${tenantUsers.lastLoginAt} > ${thirtyDaysAgo} then ${tenantUsers.userId} end)`,
        creditTransactions: sql<number>`count(case when ${creditTransactions.createdAt} > ${thirtyDaysAgo} then 1 end)`,
        newEntities: sql<number>`count(case when ${entities.createdAt} > ${thirtyDaysAgo} then 1 end)`
      })
      .from(tenants)
      .leftJoin(tenantUsers, eq(tenants.tenantId, tenantUsers.tenantId))
      .leftJoin(creditTransactions, eq(tenants.tenantId, creditTransactions.tenantId))
      .leftJoin(entities, eq(tenants.tenantId, entities.tenantId))
      .where(eq(tenants.tenantId, tenantId));
  }
}
