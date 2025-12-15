/**
 * Admin Entity Service - Independent service for entity administration
 * Provides comprehensive entity management without modifying existing services
 */

import { db } from '../../../db/index.js';
import { entities, tenants, credits, tenantUsers } from '../../../db/schema/index.js';
import { eq, and, desc, sql, count, sum, like, or, gte, lte, isNull } from 'drizzle-orm';

export class EntityAdminService {
  /**
   * Get all entities across tenants with filtering and pagination
   */
  static async getEntityList(filters = {}, pagination = {}) {
    try {
      const {
        tenantId,
        entityType,
        search,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = { ...filters, ...pagination };

      let query = db
        .select({
          entityId: entities.entityId,
          tenantId: entities.tenantId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          parentEntityId: entities.parentEntityId,
          entityLevel: entities.entityLevel,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt,
          companyName: tenants.companyName,
          availableCredits: sql`coalesce(${credits.availableCredits}, 0)`,
          responsiblePerson: tenantUsers.firstName
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .leftJoin(tenantUsers, eq(entities.responsiblePersonId, tenantUsers.userId));

      // Apply filters
      if (tenantId) {
        query = query.where(eq(entities.tenantId, tenantId));
      }

      if (entityType) {
        query = query.where(eq(entities.entityType, entityType));
      }

      if (search) {
        query = query.where(or(
          like(entities.entityName, `%${search}%`),
          like(entities.entityCode, `%${search}%`),
          like(tenants.companyName, `%${search}%`)
        ));
      }

      if (isActive !== undefined) {
        query = query.where(eq(entities.isActive, isActive));
      }

      // Apply sorting
      const sortColumn = this.getSortColumn(sortBy);
      query = sortOrder === 'desc' ?
        query.orderBy(desc(sortColumn)) :
        query.orderBy(sortColumn);

      // Get total count
      const totalCount = await this.getEntityCount(filters);

      // Apply pagination
      const offset = (page - 1) * limit;
      const entitiesList = await query.limit(limit).offset(offset);

      return {
        entities: entitiesList,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Error getting entity list:', error);
      throw error;
    }
  }

  /**
   * Get entity count with filters
   */
  static async getEntityCount(filters = {}) {
    try {
      const { tenantId, entityType, search, isActive } = filters;

      let query = db
        .select({ count: count() })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId));

      // Apply filters
      if (tenantId) {
        query = query.where(eq(entities.tenantId, tenantId));
      }

      if (entityType) {
        query = query.where(eq(entities.entityType, entityType));
      }

      if (search) {
        query = query.where(or(
          like(entities.entityName, `%${search}%`),
          like(entities.entityCode, `%${search}%`),
          like(tenants.companyName, `%${search}%`)
        ));
      }

      if (isActive !== undefined) {
        query = query.where(eq(entities.isActive, isActive));
      }

      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting entity count:', error);
      throw error;
    }
  }

  /**
   * Get entities by tenant and type (e.g., get all locations for a tenant)
   */
  static async getTenantEntities(tenantId, entityType = null) {
    try {
      // Build where conditions
      const whereConditions = [eq(entities.tenantId, tenantId)];
      if (entityType) {
        whereConditions.push(eq(entities.entityType, entityType));
      }

      const query = db
        .select({
          entityId: entities.entityId,
          tenantId: entities.tenantId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          parentEntityId: entities.parentEntityId,
          entityLevel: entities.entityLevel,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt,
          address: entities.address,
          locationType: entities.locationType,
          organizationType: entities.organizationType,
          availableCredits: sql`coalesce(${credits.availableCredits}, 0)`
        })
        .from(entities)
        .leftJoin(credits, and(
          eq(entities.entityId, credits.entityId),
          eq(credits.isActive, true)
        ))
        .where(and(...whereConditions));

      const entitiesList = await query.orderBy(entities.entityType, entities.entityName);

      return {
        success: true,
        entities: entitiesList,
        total: entitiesList.length
      };
    } catch (error) {
      console.error('Error getting tenant entities:', error);
      throw error;
    }
  }

  /**
   * Get detailed entity information with hierarchy
   */
  static async getEntityDetails(entityId) {
    try {
      // Get entity with tenant and credit info
      const entityData = await db
        .select({
          entity: entities,
          tenant: tenants,
          credit: credits,
          responsiblePerson: tenantUsers
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .leftJoin(tenantUsers, eq(entities.responsiblePersonId, tenantUsers.userId))
        .where(eq(entities.entityId, entityId))
        .limit(1);

      if (!entityData.length) {
        throw new Error('Entity not found');
      }

      const { entity, tenant, credit, responsiblePerson } = entityData[0];

      // Get hierarchy path
      const hierarchy = await this.buildEntityHierarchy(entityId);

      // Get child entities
      const children = await this.getChildEntities(entityId);

      // Get entity statistics
      const stats = await this.getEntityStats(entityId);

      return {
        entity,
        tenant: {
          tenantId: tenant.tenantId,
          companyName: tenant.companyName,
          subdomain: tenant.subdomain
        },
        credit: credit || { availableCredits: 0 },
        responsiblePerson: responsiblePerson ? {
          userId: responsiblePerson.userId,
          name: `${responsiblePerson.firstName} ${responsiblePerson.lastName}`,
          email: responsiblePerson.email
        } : null,
        hierarchy,
        children,
        stats
      };
    } catch (error) {
      console.error('Error getting entity details:', error);
      throw error;
    }
  }

  /**
   * Get entity hierarchy for a specific tenant
   */
  static async getEntityHierarchy(tenantId) {
    try {
      const entitiesList = await db
        .select({
          entityId: entities.entityId,
          tenantId: entities.tenantId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          parentEntityId: entities.parentEntityId,
          entityLevel: entities.entityLevel,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          availableCredits: sql`coalesce(${credits.availableCredits}, 0)`
        })
        .from(entities)
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .where(eq(entities.tenantId, tenantId))
        .orderBy(entities.entityLevel, entities.entityName);

      // Build hierarchy tree
      const entityMap = new Map();
      const rootEntities = [];

      // First pass: create entity objects
      entitiesList.forEach(entity => {
        entityMap.set(entity.entityId, {
          ...entity,
          children: []
        });
      });

      // Second pass: build hierarchy
      entitiesList.forEach(entity => {
        const entityObj = entityMap.get(entity.entityId);
        if (entity.parentEntityId) {
          const parent = entityMap.get(entity.parentEntityId);
          if (parent) {
            parent.children.push(entityObj);
          }
        } else {
          rootEntities.push(entityObj);
        }
      });

      return {
        tenantId,
        hierarchy: rootEntities,
        totalEntities: entitiesList.length
      };
    } catch (error) {
      console.error('Error getting entity hierarchy:', error);
      throw error;
    }
  }

  /**
   * Update entity status
   */
  static async updateEntityStatus(entityId, isActive, reason = null, adminUserId = null) {
    try {
      await db
        .update(entities)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(eq(entities.entityId, entityId));

      console.log(`Entity ${entityId} ${isActive ? 'activated' : 'deactivated'} by admin ${adminUserId}${reason ? `: ${reason}` : ''}`);

      return { success: true };
    } catch (error) {
      console.error('Error updating entity status:', error);
      throw error;
    }
  }

  /**
   * Bulk update entity status
   */
  static async bulkUpdateEntityStatus(entityIds, isActive, reason = null, adminUserId = null) {
    try {
      await db
        .update(entities)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(sql`${entities.entityId} = any(${entityIds})`);

      console.log(`Bulk ${isActive ? 'activated' : 'deactivated'} ${entityIds.length} entities by admin ${adminUserId}${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        updatedCount: entityIds.length
      };
    } catch (error) {
      console.error('Error bulk updating entity status:', error);
      throw error;
    }
  }

  /**
   * Get entity statistics overview
   */
  static async getEntityStatsOverview() {
    try {
      // Entity distribution by type
      const typeDistribution = await db
        .select({
          entityType: entities.entityType,
          count: count(),
          activeCount: sql`count(case when ${entities.isActive} = true then 1 end)`,
          totalCredits: sql`coalesce(sum(${credits.availableCredits}), 0)`
        })
        .from(entities)
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .groupBy(entities.entityType);

      // Entity distribution by tenant
      const tenantDistribution = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          entityCount: count(),
          activeEntityCount: sql`count(case when ${entities.isActive} = true then 1 end)`
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .groupBy(tenants.tenantId, tenants.companyName)
        .orderBy(desc(count()))
        .limit(10);

      // Hierarchy depth statistics
      const hierarchyStats = await db
        .select({
          maxDepth: sql`max(${entities.entityLevel})`,
          avgDepth: sql`avg(${entities.entityLevel})`,
          totalRootEntities: sql`count(case when ${entities.parentEntityId} is null then 1 end)`
        })
        .from(entities);

      return {
        typeDistribution,
        tenantDistribution,
        hierarchyStats: hierarchyStats[0],
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting entity stats overview:', error);
      throw error;
    }
  }

  /**
   * Search entities across all tenants
   */
  static async searchEntities(query, filters = {}) {
    try {
      const { entityType, tenantId, limit = 20 } = filters;

      let dbQuery = db
        .select({
          entityId: entities.entityId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          tenantId: entities.tenantId,
          companyName: tenants.companyName,
          isActive: entities.isActive,
          availableCredits: sql`coalesce(${credits.availableCredits}, 0)`
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .where(or(
          like(entities.entityName, `%${query}%`),
          like(entities.entityCode, `%${query}%`),
          like(tenants.companyName, `%${query}%`)
        ))
        .orderBy(desc(sql`case when ${entities.entityName} ilike ${`${query}%`} then 1 else 0 end`))
        .limit(limit);

      if (entityType) {
        dbQuery = dbQuery.where(eq(entities.entityType, entityType));
      }

      if (tenantId) {
        dbQuery = dbQuery.where(eq(entities.tenantId, tenantId));
      }

      const results = await dbQuery;

      return {
        query,
        results,
        total: results.length
      };
    } catch (error) {
      console.error('Error searching entities:', error);
      throw error;
    }
  }

  /**
   * Build entity hierarchy path
   */
  static async buildEntityHierarchy(entityId) {
    try {
      const hierarchy = [];
      let currentId = entityId;
      let depth = 0;
      const maxDepth = 10; // Prevent infinite loops

      while (currentId && depth < maxDepth) {
        const entity = await db
          .select({
            entityId: entities.entityId,
            entityName: entities.entityName,
            entityType: entities.entityType,
            parentEntityId: entities.parentEntityId
          })
          .from(entities)
          .where(eq(entities.entityId, currentId))
          .limit(1);

        if (!entity.length) break;

        hierarchy.unshift({
          entityId: entity[0].entityId,
          entityName: entity[0].entityName,
          entityType: entity[0].entityType
        });

        currentId = entity[0].parentEntityId;
        depth++;
      }

      return hierarchy;
    } catch (error) {
      console.error('Error building entity hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get child entities
   */
  static async getChildEntities(parentEntityId) {
    try {
      return await db
        .select({
          entityId: entities.entityId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          isActive: entities.isActive,
          availableCredits: sql`coalesce(${credits.availableCredits}, 0)`
        })
        .from(entities)
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .where(eq(entities.parentEntityId, parentEntityId))
        .orderBy(entities.entityType, entities.entityName);
    } catch (error) {
      console.error('Error getting child entities:', error);
      throw error;
    }
  }

  /**
   * Get entity statistics
   */
  static async getEntityStats(entityId) {
    try {
      // Get credit transaction count for this entity
      const transactionCount = await db
        .select({ count: count() })
        .from(credits)
        .innerJoin(entities, eq(credits.entityId, entities.entityId))
        .where(eq(entities.entityId, entityId));

      // Get child entity count
      const childCount = await db
        .select({ count: count() })
        .from(entities)
        .where(eq(entities.parentEntityId, entityId));

      // Get credit usage in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsage = await db
        .select({
          totalUsed: sql`coalesce(sum(abs(${credits.availableCredits})), 0)`
        })
        .from(entities)
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .where(and(
          eq(entities.entityId, entityId),
          gte(entities.createdAt, thirtyDaysAgo)
        ));

      return {
        transactionCount: transactionCount[0]?.count || 0,
        childEntityCount: childCount[0]?.count || 0,
        recentUsage: recentUsage[0]?.totalUsed || 0
      };
    } catch (error) {
      console.error('Error getting entity stats:', error);
      throw error;
    }
  }

  /**
   * Helper method to get sort column
   */
  static getSortColumn(sortBy) {
    switch (sortBy) {
      case 'entityName':
        return entities.entityName;
      case 'entityType':
        return entities.entityType;
      case 'companyName':
        return tenants.companyName;
      case 'availableCredits':
        return sql`coalesce(${credits.availableCredits}, 0)`;
      case 'createdAt':
        return entities.createdAt;
      default:
        return entities.createdAt;
    }
  }
}
