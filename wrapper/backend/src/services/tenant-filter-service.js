import { db } from '../db/index.js';
import { tenants, credits, entities } from '../db/schema/index.js';
import { eq, and, or, sql, gte, lte, like, inArray } from 'drizzle-orm';
import { notificationCacheService } from './notification-cache-service.js';

class TenantFilterService {
  /**
   * Filter tenants based on criteria
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of tenant IDs
   */
  async filterTenants(filters = {}) {
    try {
      // Check cache first
      const cached = await notificationCacheService.getFilteredTenants(filters);
      if (cached) {
        return cached;
      }

      const {
        status,
        industry,
        subscriptionTier,
        minCredits,
        maxCredits,
        createdAfter,
        createdBefore,
        lastActivityAfter,
        lastActivityBefore,
        companySize,
        isActive,
        isVerified,
        tenantIds
      } = filters;

      const whereConditions = [];

      // Status filter
      if (status && status !== 'all') {
        if (status === 'active') {
          whereConditions.push(eq(tenants.isActive, true));
        } else if (status === 'inactive') {
          whereConditions.push(eq(tenants.isActive, false));
        } else if (status === 'trial') {
          whereConditions.push(sql`${tenants.trialEndsAt} > now()`);
        } else if (status === 'paid') {
          whereConditions.push(sql`${tenants.trialEndsAt} is null or ${tenants.trialEndsAt} < now()`);
        }
      }

      // Industry filter
      if (industry) {
        whereConditions.push(like(tenants.industry, `%${industry}%`));
      }

      // Company size filter
      if (companySize) {
        whereConditions.push(eq(tenants.organizationSize, companySize));
      }

      // Active status filter
      if (isActive !== undefined) {
        whereConditions.push(eq(tenants.isActive, isActive));
      }

      // Verified status filter
      if (isVerified !== undefined) {
        whereConditions.push(eq(tenants.isVerified, isVerified));
      }

      // Created date filters
      if (createdAfter) {
        whereConditions.push(gte(tenants.createdAt, new Date(createdAfter)));
      }

      if (createdBefore) {
        whereConditions.push(lte(tenants.createdAt, new Date(createdBefore)));
      }

      // Last activity filters
      if (lastActivityAfter) {
        whereConditions.push(gte(tenants.lastActivityAt, new Date(lastActivityAfter)));
      }

      if (lastActivityBefore) {
        whereConditions.push(lte(tenants.lastActivityAt, new Date(lastActivityBefore)));
      }

      // Tenant IDs filter (if specific tenants are requested)
      if (tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0) {
        whereConditions.push(inArray(tenants.tenantId, tenantIds));
      }

      // Get tenants matching basic filters
      let tenantQuery = db
        .select({ tenantId: tenants.tenantId })
        .from(tenants);

      if (whereConditions.length > 0) {
        tenantQuery = tenantQuery.where(and(...whereConditions));
      }

      let filteredTenants = await tenantQuery;

      // Apply credit filters if specified
      if (minCredits !== undefined || maxCredits !== undefined) {
        const creditQuery = db
          .select({
            tenantId: credits.tenantId,
            totalCredits: sql`sum(${credits.availableCredits}::numeric)`
          })
          .from(credits)
          .where(and(
            eq(credits.isActive, true),
            inArray(credits.tenantId, filteredTenants.map(t => t.tenantId))
          ))
          .groupBy(credits.tenantId);

        if (minCredits !== undefined) {
          creditQuery.having(sql`sum(${credits.availableCredits}::numeric) >= ${minCredits}`);
        }

        if (maxCredits !== undefined) {
          creditQuery.having(sql`sum(${credits.availableCredits}::numeric) <= ${maxCredits}`);
        }

        const tenantsWithCredits = await creditQuery;
        const creditTenantIds = new Set(tenantsWithCredits.map(t => t.tenantId));
        filteredTenants = filteredTenants.filter(t => creditTenantIds.has(t.tenantId));
      }

      const result = filteredTenants.map(t => t.tenantId);
      
      // Cache results
      await notificationCacheService.cacheFilteredTenants(filters, result);
      
      return result;
    } catch (error) {
      console.error('Error filtering tenants:', error);
      throw error;
    }
  }

  /**
   * Get tenant count matching filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count of matching tenants
   */
  async getTenantCount(filters = {}) {
    try {
      const tenantIds = await this.filterTenants(filters);
      return tenantIds.length;
    } catch (error) {
      console.error('Error getting tenant count:', error);
      throw error;
    }
  }

  /**
   * Get tenant details matching filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Tenant details
   */
  async getFilteredTenantDetails(filters = {}, options = {}) {
    try {
      const { limit = 1000, offset = 0 } = options;
      const tenantIds = await this.filterTenants(filters);

      if (tenantIds.length === 0) {
        return [];
      }

      const tenantDetails = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          adminEmail: tenants.adminEmail,
          industry: tenants.industry,
          organizationSize: tenants.organizationSize,
          isActive: tenants.isActive,
          isVerified: tenants.isVerified,
          createdAt: tenants.createdAt,
          lastActivityAt: tenants.lastActivityAt
        })
        .from(tenants)
        .where(inArray(tenants.tenantId, tenantIds))
        .limit(limit)
        .offset(offset);

      return tenantDetails;
    } catch (error) {
      console.error('Error getting filtered tenant details:', error);
      throw error;
    }
  }
}

export { TenantFilterService };
export default TenantFilterService;
