import { db } from '../db/index.js';
import { entities, responsiblePersons, tenantUsers } from '../db/schema/index.js';
import { eq, and, or, sql, inArray } from 'drizzle-orm';
import { entityCache } from '../utils/redis-cache.js';

/**
 * Get user's accessible entity IDs based on their role
 * - Tenant Admin: ALL entities in tenant
 * - Entity Admin (Responsible Person): Their entity + all children
 * - Regular User: None (or only their assigned entity)
 * 
 * OPTIMIZED VERSION:
 * - Uses caching to avoid repeated queries
 * - Optimized recursive queries using CTE
 * - Batch queries instead of loops
 * 
 * @param {string} userId - Internal user ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Entity scope object
 */
export async function getUserAccessibleEntities(userId, tenantId) {
  console.log('🔍 Getting accessible entities for user:', { userId, tenantId });

  // Check cache first
  const cacheKey = `entity-scope:${userId}:${tenantId}`;
  const cached = await entityCache.get(cacheKey);
  if (cached) {
    console.log('✅ Entity scope cache hit');
    return cached;
  }

  // Check if user is tenant admin
  const [user] = await db
    .select({ 
      isTenantAdmin: tenantUsers.isTenantAdmin,
      email: tenantUsers.email 
    })
    .from(tenantUsers)
    .where(and(
      eq(tenantUsers.userId, userId),
      eq(tenantUsers.tenantId, tenantId)
    ))
    .limit(1);

  if (!user) {
    console.log('❌ User not found');
    return {
      scope: 'none',
      entities: [],
      entityIds: [], // Keep for backward compatibility
      isUnrestricted: false
    };
  }

  // Tenant Admin sees EVERYTHING
  if (user.isTenantAdmin) {
    console.log('👑 User is Tenant Admin - unrestricted access');
    const allEntities = await db
      .select({
        entityId: entities.entityId,
        entityName: entities.entityName,
        entityType: entities.entityType,
        entityCode: entities.entityCode
      })
      .from(entities)
      .where(and(
        eq(entities.tenantId, tenantId),
        eq(entities.isActive, true)
      ));

    const result = {
      scope: 'tenant',
      entities: allEntities,
      entityIds: allEntities.map(e => e.entityId), // Keep for backward compatibility
      isUnrestricted: true,
      userEmail: user.email
    };

    // Cache for 5 minutes
    await entityCache.set(cacheKey, result, 300);
    return result;
  }

  // Get entities where user is responsible person
  const responsibilities = await db
    .select({
      entityId: responsiblePersons.entityId,
      entityType: responsiblePersons.entityType,
      scope: responsiblePersons.scope,
      responsibilityLevel: responsiblePersons.responsibilityLevel
    })
    .from(responsiblePersons)
    .where(and(
      eq(responsiblePersons.userId, userId),
      eq(responsiblePersons.isActive, true)
    ));

  if (responsibilities.length === 0) {
    console.log('⚠️ User has no entity responsibilities');
    const result = {
      scope: 'none',
      entities: [],
      entityIds: [], // Keep for backward compatibility
      isUnrestricted: false,
      userEmail: user.email
    };
    // Cache empty result for 1 minute
    await entityCache.set(cacheKey, result, 60);
    return result;
  }

  console.log('📋 User has', responsibilities.length, 'entity responsibilities');

  // OPTIMIZED: Get all responsible entity IDs at once
  const responsibleEntityIds = responsibilities.map(r => r.entityId);

  // OPTIMIZED: Use recursive CTE to get all descendants in a single query
  const allAccessibleEntityIds = await getAllDescendantEntityIds(responsibleEntityIds, tenantId);

  // OPTIMIZED: Get all entity details in a single batch query
  const accessibleEntities = await db
    .select({
      entityId: entities.entityId,
      entityName: entities.entityName,
      entityType: entities.entityType,
      entityCode: entities.entityCode
    })
    .from(entities)
    .where(and(
      eq(entities.tenantId, tenantId),
      eq(entities.isActive, true),
      inArray(entities.entityId, allAccessibleEntityIds)
    ));

  console.log('✅ Total accessible entities:', accessibleEntities.length);

  const result = {
    scope: 'entity',
    entities: accessibleEntities,
    entityIds: allAccessibleEntityIds, // Keep for backward compatibility
    isUnrestricted: false,
    responsibilities,
    userEmail: user.email
  };

  // Cache for 5 minutes
  await entityCache.set(cacheKey, result, 300);
  return result;
}

/**
 * OPTIMIZED: Get all descendant entity IDs using recursive CTE
 * This replaces the old recursive function with a single optimized query
 * @param {string[]} parentIds - Array of parent entity IDs
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string[]>} Array of all descendant entity IDs (including parents)
 */
async function getAllDescendantEntityIds(parentIds, tenantId) {
  if (!parentIds || parentIds.length === 0) {
    return [];
  }

  // Use recursive CTE for efficient hierarchy traversal
  // Convert parentIds array to PostgreSQL array format
  const parentIdsArray = `{${parentIds.map(id => `"${id}"`).join(',')}}`;
  
  const query = sql.raw(`
    WITH RECURSIVE entity_hierarchy AS (
      -- Base case: start with responsible entities
      SELECT entity_id, parent_entity_id, 1 as level
      FROM entities
      WHERE tenant_id = '${tenantId}'
        AND entity_id = ANY(ARRAY[${parentIds.map(id => `'${id}'`).join(',')}]::uuid[])
        AND is_active = true
      
      UNION ALL
      
      -- Recursive case: get all children
      SELECT e.entity_id, e.parent_entity_id, eh.level + 1
      FROM entities e
      INNER JOIN entity_hierarchy eh ON e.parent_entity_id = eh.entity_id
      WHERE e.tenant_id = '${tenantId}'
        AND e.is_active = true
        AND eh.level < 20  -- Prevent infinite loops (max 20 levels)
    )
    SELECT DISTINCT entity_id
    FROM entity_hierarchy
  `);

  try {
    const result = await db.execute(query);
    return result.map(row => row.entity_id);
  } catch (error) {
    console.error('❌ Error in recursive CTE query:', error);
    // Fallback to simpler approach if CTE fails
    const allEntities = await db
      .select({ entityId: entities.entityId })
      .from(entities)
      .where(and(
        eq(entities.tenantId, tenantId),
        eq(entities.isActive, true),
        inArray(entities.parentEntityId, parentIds)
      ));
    
    return allEntities.map(e => e.entityId);
  }
}

/**
 * Middleware: Add entity scope to request context
 * Use this middleware after authenticateToken
 */
export async function entityScopeMiddleware(request, reply) {
  if (!request.userContext) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const { internalUserId, tenantId } = request.userContext;
  
  try {
    const entityScope = await getUserAccessibleEntities(internalUserId, tenantId);
    
    // Add to request context
    request.entityScope = entityScope;
    
    console.log('🔐 Entity Scope Set:', {
      userId: internalUserId,
      scope: entityScope.scope,
      entityCount: entityScope.entityIds.length,
      isUnrestricted: entityScope.isUnrestricted
    });
  } catch (error) {
    console.error('❌ Failed to get entity scope:', error);
    request.entityScope = {
      scope: 'none',
      entityIds: [],
      isUnrestricted: false
    };
  }
}

/**
 * Helper: Check if user can access an entity
 * @param {Object} entityScope - Entity scope from request
 * @param {string} entityId - Entity ID to check
 * @returns {boolean}
 */
export function canAccessEntity(entityScope, entityId) {
  if (!entityScope) return false;
  if (entityScope.isUnrestricted) return true;
  return entityScope.entityIds.includes(entityId);
}

/**
 * Helper: Filter entities array to only accessible ones
 * @param {Array} entities - Array of entities
 * @param {Object} entityScope - Entity scope from request
 * @param {string} idField - Field name for entity ID (default: 'entityId')
 * @returns {Array}
 */
export function filterEntitiesByScope(entities, entityScope, idField = 'entityId') {
  if (!entityScope) return [];
  if (entityScope.isUnrestricted) return entities;
  
  return entities.filter(entity => 
    entityScope.entityIds.includes(entity[idField])
  );
}

/**
 * Helper: Build SQL WHERE clause for entity filtering
 * @param {Object} entityScope - Entity scope from request
 * @param {string} columnName - Column name for entity ID
 * @returns {SQL|null} SQL condition or null if unrestricted
 */
export function buildEntityScopeCondition(entityScope, columnName = 'entity_id') {
  if (!entityScope) {
    return sql`1 = 0`; // No access
  }
  
  if (entityScope.isUnrestricted) {
    return null; // No filter needed
  }
  
  if (entityScope.entityIds.length === 0) {
    return sql`1 = 0`; // No access
  }
  
  // Return SQL IN condition
  return sql`${sql.raw(columnName)} = ANY(${entityScope.entityIds})`;
}

export default {
  getUserAccessibleEntities,
  entityScopeMiddleware,
  canAccessEntity,
  filterEntitiesByScope,
  buildEntityScopeCondition
};

