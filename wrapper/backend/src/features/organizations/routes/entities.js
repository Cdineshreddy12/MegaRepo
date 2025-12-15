/**
 * Unified Entities Routes - RESTful API endpoints for unified entity management
 * Handles organizations, locations, departments, and teams in a unified way
 */

import OrganizationService from '../services/organization-service.js';
import LocationService from '../services/location-service.js';
import { EntityAdminService } from '../../../features/admin/index.js';
import { authenticateToken } from '../../../middleware/auth.js';
import {
  validateOrganizationCreation,
  validateOrganizationUpdate,
  sanitizeInputMiddleware
} from '../../../middleware/validation.js';
import {
  enforceOrganizationAccess,
  addUserAccessContext
} from '../../../middleware/data-isolation.js';
import {
  enforceApplicationAccess,
  addApplicationDataFiltering,
  validateApplicationExists
} from '../../../middleware/application-isolation.js';

console.log('🚀 Loading entities.js routes file...');

export default async function entityRoutes(fastify, options) {

  // Simple logging to verify routes are loaded
  console.log('🔄 Entities routes are being registered...');

  // Apply authentication and data isolation to all routes except public ones
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip authentication for public routes that don't require it
    const publicRoutes = [
      'GET /api/entities/hierarchy',  // Allow hierarchy viewing with fallback auth
      'GET /api/entities/parent',     // Allow parent entity viewing with fallback auth
      'POST /api/entities/organization', // Allow entity creation with fallback auth
      'POST /api/entities/location',  // Allow location creation with fallback auth
    ];

    const routeKey = `${request.method} ${request.url}`;

    const isPublic = publicRoutes.some(route => {
      const routeParts = route.split(' ');
      const method = routeParts[0];
      const path = routeParts[1];
      return request.method === method && request.url.includes(path);
    });

    if (!isPublic) {
      // First authenticate the user
      await authenticateToken(request, reply);

      // Add user context for data isolation
      await addUserAccessContext()(request, reply);

      // Validate application access
      await validateApplicationExists()(request, reply);
      await enforceApplicationAccess()(request, reply);
    }
  });

  // Get entity hierarchy - FULL DATABASE VERSION (including locations)
  fastify.get('/hierarchy/:tenantId', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log('🔍 Getting complete entity hierarchy for tenant:', tenantId);

      // Use the location service to get complete hierarchy with locations
      const result = await LocationService.getEntityHierarchyWithLocations(tenantId);

      if (result.success) {
        // Remove duplicates by using entityId as key
        const entityMap = new Map();
        
        const processEntity = (entity) => {
          if (!entityMap.has(entity.entityId)) {
            const processedEntity = {
              entityId: entity.entityId,
              tenantId: entity.tenantId,
              entityName: entity.entityName,
              entityType: entity.entityType,
              entityCode: entity.entityCode,
              entityLevel: entity.entityLevel,
              hierarchyPath: entity.hierarchyPath,
              fullHierarchyPath: entity.fullHierarchyPath,
              description: entity.description,
              isActive: entity.isActive,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
              parentEntityId: entity.parentEntityId,
              responsiblePersonId: entity.responsiblePersonId,
              organizationType: entity.organizationType,
              locationType: entity.locationType,
              address: entity.address,
              // Include credit information (default to 0 if null)
              availableCredits: entity.availableCredits ?? 0,
              reservedCredits: entity.reservedCredits ?? 0,
              totalCredits: (entity.availableCredits ?? 0) + (entity.reservedCredits ?? 0),
              children: []
            };
            
            entityMap.set(entity.entityId, processedEntity);
            
            // Process children recursively
            if (entity.children && Array.isArray(entity.children)) {
              processedEntity.children = entity.children.map(processEntity);
            }
          }
          
          return entityMap.get(entity.entityId);
        };

        // Process all entities and remove duplicates
        const transformedHierarchy = result.hierarchy.map(processEntity).filter(Boolean);

        // Count total entities including children
        const countTotalEntities = (entities) => {
          let count = entities.length;
          entities.forEach(entity => {
            if (entity.children && Array.isArray(entity.children)) {
              count += countTotalEntities(entity.children);
            }
          });
          return count;
        };

        const totalEntities = countTotalEntities(transformedHierarchy);

        return reply.send({
          success: true,
          data: {
            tenantId,
            hierarchy: transformedHierarchy,
            totalEntities: totalEntities
          },
          message: 'Complete entity hierarchy retrieved successfully'
        });
      } else {
        // FALLBACK: Try to get basic entity list if hierarchy fails
        console.log('⚠️ Hierarchy retrieval failed, attempting fallback...');
        const fallbackResult = await LocationService.getTenantLocations(tenantId);

        if (fallbackResult.success && fallbackResult.locations.length > 0) {
          console.log('✅ Fallback successful - returning flat entity list');
          
          // Remove duplicates in fallback mode too
          const entityMap = new Map();
          fallbackResult.locations.forEach(entity => {
            if (!entityMap.has(entity.entityId)) {
              entityMap.set(entity.entityId, {
                entityId: entity.entityId,
                tenantId: entity.tenantId,
                entityName: entity.entityName,
                entityType: entity.entityType,
                entityCode: entity.entityCode,
                entityLevel: entity.entityLevel || 1,
                hierarchyPath: entity.hierarchyPath || entity.entityId,
                fullHierarchyPath: entity.fullHierarchyPath || entity.entityName,
                description: entity.description,
                isActive: entity.isActive,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
                parentEntityId: entity.parentEntityId,
                responsiblePersonId: entity.responsiblePersonId,
                organizationType: entity.organizationType,
                locationType: entity.locationType,
                address: entity.address,
                // Include credit information (fallback to 0 if not available)
                availableCredits: entity.availableCredits || "0.0000",
                children: [] // No hierarchy in fallback
              });
            }
          });

          const transformedEntities = Array.from(entityMap.values());

          return reply.send({
            success: true,
            hierarchy: transformedEntities,
            totalEntities: transformedEntities.length,
            message: 'Entity hierarchy retrieved (fallback mode - no tree structure)',
            fallbackMode: true
          });
        }

        return reply.code(404).send(result);
      }
    } catch (error) {
      console.error('❌ Get entity hierarchy failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get entity hierarchy'
      });
    }
  });

  // Get parent entity hierarchy - includes parent and all children
  fastify.get('/parent/:parentEntityId', async (request, reply) => {
    try {
      const { parentEntityId } = request.params;

      console.log('🏠 Getting hierarchy starting from parent entity:', parentEntityId);

      // Get the parent entity details first
      const { db } = await import('../db/index.js');
      const { entities } = await import('../db/schema/index.js');
      const { eq, and } = await import('drizzle-orm');

      const [parentEntity] = await db
        .select({
          entityId: entities.entityId,
          tenantId: entities.tenantId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          entityCode: entities.entityCode,
          entityLevel: entities.entityLevel,
          hierarchyPath: entities.hierarchyPath,
          fullHierarchyPath: entities.fullHierarchyPath,
          parentEntityId: entities.parentEntityId,
          organizationType: entities.organizationType,
          locationType: entities.locationType,
          address: entities.address,
          description: entities.description,
          responsiblePersonId: entities.responsiblePersonId,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt
        })
        .from(entities)
        .where(and(
          eq(entities.entityId, parentEntityId),
          eq(entities.isActive, true)
        ));

      if (!parentEntity) {
        return reply.code(404).send({
          success: false,
          error: 'Parent entity not found',
          message: 'The specified parent entity does not exist or is inactive'
        });
      }

      // Get all descendant entities (children, grandchildren, etc.)
      const descendantEntities = await db
        .select({
          entityId: entities.entityId,
          tenantId: entities.tenantId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          entityCode: entities.entityCode,
          entityLevel: entities.entityLevel,
          hierarchyPath: entities.hierarchyPath,
          fullHierarchyPath: entities.fullHierarchyPath,
          parentEntityId: entities.parentEntityId,
          organizationType: entities.organizationType,
          locationType: entities.locationType,
          address: entities.address,
          description: entities.description,
          responsiblePersonId: entities.responsiblePersonId,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, parentEntity.tenantId),
          eq(entities.isActive, true)
        ));

      // Build hierarchy starting from parent
      const buildHierarchy = (parentId) => {
        const children = descendantEntities.filter(entity => entity.parentEntityId === parentId);
        return children.map(child => ({
          ...child,
          children: buildHierarchy(child.entityId)
        }));
      };

      // Transform parent entity to match the expected format
      const transformedParent = {
        entityId: parentEntity.entityId,
        entityName: parentEntity.entityName,
        entityType: parentEntity.entityType,
        entityCode: parentEntity.entityCode,
        entityLevel: parentEntity.entityLevel,
        hierarchyPath: parentEntity.hierarchyPath,
        fullHierarchyPath: parentEntity.fullHierarchyPath,
        organizationType: parentEntity.organizationType,
        locationType: parentEntity.locationType,
        address: parentEntity.address,
        description: parentEntity.description,
        isActive: parentEntity.isActive,
        createdAt: parentEntity.createdAt,
        updatedAt: parentEntity.updatedAt,
        parentEntityId: parentEntity.parentEntityId,
        responsiblePersonId: parentEntity.responsiblePersonId,
        children: buildHierarchy(parentEntity.entityId)
      };

      return reply.send({
        success: true,
        parentEntity: transformedParent,
        message: 'Parent entity hierarchy retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Get parent entity hierarchy failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get parent entity hierarchy'
      });
    }
  });

  // Get tenant entities - FULL DATABASE VERSION
  fastify.get('/tenant/:tenantId', async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { entityType } = request.query;

      console.log('🏢 Getting tenant entities:', {
        tenantId,
        entityType,
        queryString: request.query,
        url: request.url,
        tenantIdType: typeof tenantId,
        tenantIdLength: tenantId?.length
      });

      // DEBUG: Validate tenantId format
      if (!tenantId || typeof tenantId !== 'string' || tenantId.length !== 36) {
        console.error('🚨 Invalid tenantId format:', {
          tenantId,
          type: typeof tenantId,
          length: tenantId?.length
        });
        return reply.code(400).send({
          success: false,
          error: 'Invalid tenant ID',
          message: 'Tenant ID must be a valid UUID string'
        });
      }

      // DEBUG: Check if tenant exists in database
      const { db } = await import('../../../db/index.js');
      const { tenants, tenantUsers } = await import('../../../db/schema/index.js');
      const { eq, and } = await import('drizzle-orm');

      const [tenantRecord] = await db
        .select({ tenantId: tenants.tenantId, companyName: tenants.companyName })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenantRecord) {
        console.error('🚨 Tenant does not exist in database:', tenantId);

        // Try to find the correct tenant for this user as fallback
        if (request.userContext?.userId) {
          console.log('🔍 Attempting to find correct tenant for user:', request.userContext.userId);

          const userTenants = await db
            .select({
              tenantId: tenants.tenantId,
              companyName: tenants.companyName,
              subdomain: tenants.subdomain
            })
            .from(tenants)
            .innerJoin(tenantUsers, eq(tenants.tenantId, tenantUsers.tenantId))
            .where(and(
              eq(tenantUsers.kindeUserId, request.userContext.userId),
              eq(tenants.isActive, true)
            ))
            .orderBy(tenants.createdAt)
            .limit(1);

          if (userTenants.length > 0) {
            const correctTenant = userTenants[0];
            console.log('✅ Found correct tenant for user:', correctTenant);

            // Use the correct tenant instead
            const result = await EntityAdminService.getTenantEntities(correctTenant.tenantId, entityType);

            if (result.success) {
              console.log('✅ Returned entities for correct tenant:', correctTenant.tenantId);
              return reply.send({
                ...result,
                correctedTenantId: correctTenant.tenantId,
                originalTenantId: tenantId,
                message: `Tenant corrected from ${tenantId} to ${correctTenant.tenantId}`
              });
            }
          }
        }

        return reply.code(404).send({
          success: false,
          error: 'Tenant not found',
          message: `Tenant with ID ${tenantId} does not exist`,
          suggestion: 'Try refreshing the page to get the correct tenant information'
        });
      }

      console.log('✅ Tenant exists:', {
        tenantId: tenantRecord.tenantId,
        companyName: tenantRecord.companyName
      });

      const result = await EntityAdminService.getTenantEntities(tenantId, entityType);

      if (result.success) {
        console.log('✅ Tenant entities retrieved successfully:', {
          tenantId,
          entityType,
          totalEntities: result.total,
          entityTypesReturned: [...new Set(result.entities.map(e => e.entityType))],
          sampleEntities: result.entities.slice(0, 3).map(e => ({
            id: e.entityId,
            name: e.entityName,
            type: e.entityType,
            tenantId: e.tenantId
          }))
        });

        return reply.send(result);
      } else {
        return reply.code(404).send(result);
      }
    } catch (error) {
      console.error('❌ Get tenant entities failed:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        tenantId,
        entityType,
        errorMessage: error.message,
        errorName: error.name
      });
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: error.message || 'Failed to get tenant entities',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Create organization entity - FULL DATABASE VERSION
  fastify.post('/organization', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      // enforceApplicationAccess,
      sanitizeInputMiddleware()
    ]
  }, async (request, reply) => {
    try {
      const organizationData = request.body;

      console.log('📝 Create organization endpoint called with data:', organizationData);
      console.log('👤 Request user context:', request.user);
      console.log('🔍 Starting organization creation process...');

      // Validate required fields
      if (!organizationData.entityName || organizationData.entityName.trim().length < 2) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          message: 'Organization name is required and must be at least 2 characters long'
        });
      }

      // Check if parentEntityId is provided and valid
      let parentOrgId = organizationData.parentEntityId;

      console.log('🔍 Processing parentEntityId:', parentOrgId);

      // If parentEntityId is a mock value or invalid, set it to null for top-level org
      if (!parentOrgId || parentOrgId === 'parent-123' || !parentOrgId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.log('ℹ️ Invalid or mock parentEntityId, creating top-level organization');
        parentOrgId = null;
      }

      console.log('📋 Final parentOrgId:', parentOrgId);
      console.log('🏗️ Calling OrganizationService.createSubOrganization...');

      const result = await OrganizationService.createSubOrganization({
        name: organizationData.entityName.trim(),
        description: organizationData.description || '',
        parentOrganizationId: parentOrgId,
        tenantId: organizationData.parentTenantId, // Pass tenantId for top-level orgs
        responsiblePersonId: organizationData.responsiblePersonId || null,
        organizationType: organizationData.organizationType || 'department'
      }, request.user?.internalUserId);

      console.log('✅ OrganizationService.createSubOrganization completed:', result);

      if (result.success) {
        // Transform to entity format for frontend compatibility
        const transformedOrg = {
          entityId: result.organization.entityId,
          entityName: result.organization.entityName,
          entityType: 'organization',
          organizationType: result.organization.organizationType,
          entityLevel: result.organization.entityLevel,
          hierarchyPath: result.organization.hierarchyPath,
          fullHierarchyPath: result.organization.fullHierarchyPath,
          description: result.organization.description,
          isActive: result.organization.isActive,
          createdAt: result.organization.createdAt,
          parentEntityId: result.organization.parentEntityId,
          responsiblePersonId: result.organization.responsiblePersonId
        };

        return reply.send({
          success: true,
          organization: transformedOrg,
          message: 'Organization entity created successfully'
        });
      } else {
        return reply.code(400).send(result);
      }
    } catch (error) {
      console.error('❌ Create organization failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: error.message || 'Failed to create organization entity'
      });
    }
  });

  // Create location entity - FULL DATABASE VERSION
  fastify.post('/location', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      // enforceApplicationAccess,
      sanitizeInputMiddleware()
    ]
  }, async (request, reply) => {
    try {
      const locationData = request.body;

      console.log('📍 Create location endpoint called with data:', locationData);

      // Validate required fields
      if (!locationData.entityName || locationData.entityName.trim().length < 2) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          message: 'Location name is required and must be at least 2 characters long'
        });
      }

      if (!locationData.parentEntityId) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          message: 'Parent organization ID is required for location creation'
        });
      }

      const result = await LocationService.createLocation({
        name: locationData.entityName.trim(),
        address: locationData.address?.street || '',
        city: locationData.address?.city || '',
        state: locationData.address?.state || '',
        zipCode: locationData.address?.zipCode || '',
        country: locationData.address?.country || '',
        organizationId: locationData.parentEntityId,
        responsiblePersonId: locationData.responsiblePersonId || null
      }, request.user?.internalUserId);

      if (result.success) {
        // Transform to entity format for frontend compatibility
        const transformedLocation = {
          entityId: result.location.entityId,
          entityName: result.location.entityName,
          entityType: 'location',
          locationType: locationData.locationType || 'office',
          entityLevel: result.location.entityLevel,
          hierarchyPath: result.location.hierarchyPath,
          fullHierarchyPath: result.location.fullHierarchyPath,
          address: result.location.address,
          isActive: result.location.isActive,
          createdAt: result.location.createdAt,
          parentEntityId: locationData.parentEntityId,
          responsiblePersonId: result.location.responsiblePersonId
        };

        return reply.send({
          success: true,
          location: transformedLocation,
          message: 'Location entity created successfully'
        });
      } else {
        return reply.code(400).send(result);
      }
    } catch (error) {
      console.error('❌ Create location failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: error.message || 'Failed to create location entity'
      });
    }
  });

  // Update entity - FULL DATABASE VERSION
  fastify.put('/:entityId', {
    preHandler: [
      authenticateToken,
      validateOrganizationUpdate,
      addUserAccessContext(),
      enforceApplicationAccess(),
      sanitizeInputMiddleware()
    ]
  }, async (request, reply) => {
    try {
      const { entityId } = request.params;
      const updateData = request.body;

      console.log('🔄 Update entity endpoint called for:', entityId, 'with data:', updateData);

      // Transform entity data to organization format for service compatibility
      const orgUpdateData = {
        organizationName: updateData.entityName,
        description: updateData.description,
        isActive: updateData.isActive,
        responsiblePersonId: updateData.responsiblePersonId,
        organizationType: updateData.organizationType
      };

      const result = await OrganizationService.updateOrganization(entityId, orgUpdateData);

      if (result.success) {
        // Transform back to entity format
        const transformedEntity = {
          entityId: result.organization.organizationId,
          entityName: result.organization.organizationName,
          entityType: 'organization',
          organizationType: result.organization.organizationType,
          entityLevel: result.organization.organizationLevel,
          hierarchyPath: result.organization.hierarchyPath,
          description: result.organization.description,
          isActive: result.organization.isActive,
          updatedAt: result.organization.updatedAt,
          parentEntityId: result.organization.parentOrganizationId,
          responsiblePersonId: result.organization.responsiblePersonId
        };

        return reply.send({
          success: true,
          entity: transformedEntity,
          message: 'Entity updated successfully'
        });
      } else {
        return reply.code(404).send(result);
      }
    } catch (error) {
      console.error('❌ Update entity failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Update failed',
        message: 'Failed to update entity'
      });
    }
  });

  // Delete entity - FULL DATABASE VERSION
  fastify.delete('/:entityId', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      enforceApplicationAccess(),
      sanitizeInputMiddleware()
    ]
  }, async (request, reply) => {
    try {
      const { entityId } = request.params;

      console.log('🗑️ Delete entity endpoint called for:', entityId);

      const result = await OrganizationService.deleteOrganization(entityId);

      if (result.success) {
        return reply.send({
          success: true,
          message: 'Entity deleted successfully'
        });
      } else {
        return reply.code(404).send(result);
      }
    } catch (error) {
      console.error('❌ Delete entity failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Deletion failed',
        message: 'Failed to delete entity'
      });
    }
  });


}
