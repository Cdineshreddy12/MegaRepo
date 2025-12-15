/**
 * Admin Entity Management Routes - Independent entity administration
 * Provides comprehensive entity operations without modifying existing routes
 */

import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { entities, tenants, credits } from '../../../db/schema/index.js';
import { eq, and, desc, sql, count, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export default async function adminEntityManagementRoutes(fastify, options) {

  // Get all entities across all tenants with filtering
  fastify.get('/all', {
    preHandler: [authenticateToken, requirePermission('admin.entities.view')],
    schema: {
      description: 'Get all entities across tenants with filtering',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          tenantId: { type: 'string' },
          entityType: { type: 'string', enum: ['organization', 'location', 'department', 'team'] },
          search: { type: 'string' },
          isActive: { type: 'boolean' },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 20, tenantId, entityType, search, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;

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
          companyName: tenants.companyName,
          availableCredits: sql`
            coalesce((
              select sum(${credits.availableCredits})
              from ${credits}
              where ${credits.entityId} = ${entities.entityId}
              and ${credits.isActive} = true
            ), 0)
          `,
        })
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
        query = query.where(sql`${entities.entityName} ilike ${`%${search}%`} or ${entities.entityCode} ilike ${`%${search}%`}`);
      }

      if (isActive !== undefined) {
        query = query.where(eq(entities.isActive, isActive));
      }

      // Apply sorting
      const sortColumn = sortBy === 'entityName' ? entities.entityName :
                        sortBy === 'entityType' ? entities.entityType :
                        sortBy === 'createdAt' ? entities.createdAt :
                        sortBy === 'companyName' ? tenants.companyName :
                        sortBy === 'availableCredits' ? sql`
                          coalesce((
                            select sum(${credits.availableCredits})
                            from ${credits}
                            where ${credits.entityId} = ${entities.entityId}
                            and ${credits.isActive} = true
                          ), 0)
                        ` :
                        entities.createdAt;

      query = sortOrder === 'desc' ? query.orderBy(desc(sortColumn)) : query.orderBy(sortColumn);

      // Get total count
      const totalCount = await db
        .select({ count: count() })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .then(result => result[0].count);

      // Apply pagination
      const offset = (page - 1) * limit;
      const entitiesList = await query.limit(limit).offset(offset);

      return {
        success: true,
        data: {
          entities: entitiesList,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error fetching entities:', error);
      return reply.code(500).send({ error: 'Failed to fetch entities' });
    }
  });

  // Get entity details with full hierarchy path
  fastify.get('/:entityId/details', {
    preHandler: [authenticateToken, requirePermission('admin.entities.view')],
    schema: {
      description: 'Get detailed entity information with hierarchy',
      params: {
        type: 'object',
        properties: {
          entityId: { type: 'string' }
        },
        required: ['entityId']
      }
    }
  }, async (request, reply) => {
    try {
      const { entityId } = request.params;

      // Get entity with tenant info
      const entityData = await db
        .select({
          entity: entities,
          tenant: tenants,
          credit: credits
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .leftJoin(credits, eq(entities.entityId, credits.entityId))
        .where(eq(entities.entityId, entityId))
        .limit(1);

      if (!entityData.length) {
        return reply.code(404).send({ error: 'Entity not found' });
      }

      const { entity, tenant, credit } = entityData[0];

      // Get parent hierarchy
      const hierarchy = await buildEntityHierarchy(entityId);

      // Get child entities with credit information using subquery
      const childEntities = await db
        .select({
          entityId: entities.entityId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          isActive: entities.isActive,
          availableCredits: sql`
            coalesce((
              select sum(${credits.availableCredits})
              from ${credits}
              where ${credits.entityId} = ${entities.entityId}
              and ${credits.isActive} = true
            ), 0)
          `,
        })
        .from(entities)
        .where(eq(entities.parentEntityId, entityId))
        .orderBy(entities.entityType, entities.entityName);

      return {
        success: true,
        data: {
          entity,
          tenant: {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            subdomain: tenant.subdomain
          },
          credit: credit || { availableCredits: 0, reservedCredits: 0 },
          hierarchy,
          children: childEntities
        }
      };
    } catch (error) {
      console.error('Error fetching entity details:', error);
      return reply.code(500).send({ error: 'Failed to fetch entity details' });
    }
  });

  // Update entity status
  fastify.patch('/:entityId/status', {
    preHandler: [authenticateToken, requirePermission('admin.entities.manage')],
    schema: {
      description: 'Update entity status',
      params: {
        type: 'object',
        properties: {
          entityId: { type: 'string' }
        },
        required: ['entityId']
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
      const { entityId } = request.params;
      const { isActive, reason } = request.body;

      await db
        .update(entities)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(eq(entities.entityId, entityId));

      console.log(`Admin ${request.userContext.userId} ${isActive ? 'activated' : 'deactivated'} entity ${entityId}${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        message: `Entity ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Error updating entity status:', error);
      return reply.code(500).send({ error: 'Failed to update entity status' });
    }
  });

  // Bulk entity operations
  fastify.post('/bulk/status', {
    preHandler: [authenticateToken, requirePermission('admin.entities.manage')],
    schema: {
      description: 'Bulk update entity status',
      body: {
        type: 'object',
        properties: {
          entityIds: {
            type: 'array',
            items: { type: 'string' }
          },
          isActive: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['entityIds', 'isActive']
      }
    }
  }, async (request, reply) => {
    try {
      const { entityIds, isActive, reason } = request.body;

      await db
        .update(entities)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(sql`${entities.entityId} = any(${entityIds})`);

      console.log(`Admin ${request.userContext.userId} bulk ${isActive ? 'activated' : 'deactivated'} ${entityIds.length} entities${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        message: `${entityIds.length} entities ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Error bulk updating entity status:', error);
      return reply.code(500).send({ error: 'Failed to bulk update entity status' });
    }
  });

  // Get entity statistics across all tenants
  fastify.get('/stats/overview', {
    preHandler: [authenticateToken, requirePermission('admin.entities.view')],
    schema: {
      description: 'Get entity statistics overview'
    }
  }, async (request, reply) => {
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
        .orderBy(desc(count()));

      // Hierarchy depth statistics
      const hierarchyStats = await db
        .select({
          maxDepth: sql`max(${entities.entityLevel})`,
          avgDepth: sql`avg(${entities.entityLevel})`,
          totalRootEntities: sql`count(case when ${entities.parentEntityId} is null then 1 end)`
        })
        .from(entities);

      return {
        success: true,
        data: {
          typeDistribution,
          tenantDistribution: tenantDistribution.slice(0, 10), // Top 10 tenants
          hierarchyStats: hierarchyStats[0],
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching entity stats:', error);
      return reply.code(500).send({ error: 'Failed to fetch entity statistics' });
    }
  });

  // Search entities across all tenants
  fastify.get('/search', {
    preHandler: [authenticateToken, requirePermission('admin.entities.view')],
    schema: {
      description: 'Search entities across all tenants',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          entityType: { type: 'string' },
          tenantId: { type: 'string' },
          limit: { type: 'integer', default: 20 }
        },
        required: ['q']
      }
    }
  }, async (request, reply) => {
    try {
      const { q, entityType, tenantId, limit = 20 } = request.query;

      let query = db
        .select({
          entityId: entities.entityId,
          entityType: entities.entityType,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
          tenantId: entities.tenantId,
          companyName: tenants.companyName,
          isActive: entities.isActive,
          availableCredits: sql`
            coalesce((
              select sum(${credits.availableCredits})
              from ${credits}
              where ${credits.entityId} = ${entities.entityId}
              and ${credits.isActive} = true
            ), 0)
          `,
        })
        .from(entities)
        .innerJoin(tenants, eq(entities.tenantId, tenants.tenantId))
        .where(sql`${entities.entityName} ilike ${`%${q}%`} or ${entities.entityCode} ilike ${`%${q}%`}`)
        .orderBy(desc(sql`case when ${entities.entityName} ilike ${`${q}%`} then 1 else 0 end`))
        .limit(limit);

      if (entityType) {
        query = query.where(eq(entities.entityType, entityType));
      }

      if (tenantId) {
        query = query.where(eq(entities.tenantId, tenantId));
      }

      const results = await query;

      return {
        success: true,
        data: {
          query: q,
          results,
          total: results.length
        }
      };
    } catch (error) {
      console.error('Error searching entities:', error);
      return reply.code(500).send({ error: 'Failed to search entities' });
    }
  });

  // Get entity hierarchy for a specific tenant
  fastify.get('/hierarchy/:tenantId', {
    preHandler: [authenticateToken, requirePermission('admin.entities.view')],
    schema: {
      description: 'Get entity hierarchy for a specific tenant',
      params: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'string',
            description: 'Tenant ID or "current" for authenticated user\'s tenant'
          }
        },
        required: ['tenantId']
      }
    }
  }, async (request, reply) => {
    try {
      let { tenantId } = request.params;

      // Handle special case where tenantId is "current" - use the authenticated user's tenant
      if (tenantId === 'current') {
        if (!request.userContext?.tenantId) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid tenant',
            message: 'Cannot determine current tenant from user context'
          });
        }
        tenantId = request.userContext.tenantId;
      }

      // Get entities with their credit information using LEFT JOIN approach
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
        .leftJoin(credits, and(
          eq(credits.entityId, entities.entityId),
          eq(credits.isActive, true)
        ))
        .where(eq(entities.tenantId, tenantId))
        .orderBy(entities.entityLevel, entities.entityName);

      // Debug: Log credit values for each entity
      console.log('🔍 Hierarchy entities with credits:');
      entitiesList.forEach(entity => {
        console.log(`  ${entity.entityId} (${entity.entityName}): ${entity.availableCredits} credits`);
      });

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
        success: true,
        data: {
          tenantId,
          hierarchy: rootEntities,
          totalEntities: entitiesList.length
        }
      };
    } catch (error) {
      console.error('Error fetching entity hierarchy:', error);
      return reply.code(500).send({ error: 'Failed to fetch entity hierarchy' });
    }
  });

  // Get entity hierarchy for current tenant
  fastify.get('/hierarchy/current', {
    preHandler: [authenticateToken],
    schema: {
      description: 'Get entity hierarchy for current tenant',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                hierarchy: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      entityId: { type: 'string' },
                      entityName: { type: 'string' },
                      entityType: { type: 'string' },
                      parentEntityId: { type: 'string' },
                      entityLevel: { type: 'number' },
                      children: { type: 'array' }
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
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({ error: 'No tenant ID found in user context' });
      }

      console.log('🔍 Getting entity hierarchy for current tenant:', tenantId);

      // Get all active entities for this tenant
      const allEntities = await db
        .select({
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          entityCode: entities.entityCode,
          parentEntityId: entities.parentEntityId,
          entityLevel: entities.entityLevel,
          hierarchyPath: entities.hierarchyPath,
          fullHierarchyPath: entities.fullHierarchyPath,
          isActive: entities.isActive
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.isActive, true)
        ))
        .orderBy(entities.entityLevel, entities.entityName);

      console.log(`📊 Found ${allEntities.length} entities for tenant ${tenantId}`);

      // Build hierarchy tree
      const entityMap = new Map();
      const rootEntities = [];

      // First pass: create map of all entities
      allEntities.forEach(entity => {
        entityMap.set(entity.entityId, { ...entity, children: [] });
      });

      // Second pass: build hierarchy
      allEntities.forEach(entity => {
        const entityWithChildren = entityMap.get(entity.entityId);

        if (entity.parentEntityId && entityMap.has(entity.parentEntityId)) {
          // Has parent, add to parent's children
          const parent = entityMap.get(entity.parentEntityId);
          if (!parent.children) parent.children = [];
          parent.children.push(entityWithChildren);
        } else {
          // No parent, it's a root entity
          rootEntities.push(entityWithChildren);
        }
      });

      return {
        success: true,
        data: {
          hierarchy: rootEntities
        }
      };
    } catch (error) {
      console.error('Error fetching current tenant entity hierarchy:', error);
      return reply.code(500).send({ error: 'Failed to fetch entity hierarchy' });
    }
  });
}

// Helper function to build entity hierarchy path
async function buildEntityHierarchy(entityId) {
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
}
