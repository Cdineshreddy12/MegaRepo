/**
 * Organization Routes - RESTful API endpoints for organization management
 * Follows SOLID principles with clear separation of concerns
 */

import OrganizationService from '../services/organization-service.js';
import { LocationService } from '../services/location-service.js';
import { authenticateToken } from '../../../middleware/auth.js';
import {
  validateOrganizationCreation,
  validateOrganizationUpdate,
  sanitizeInput
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
import { setupDatabaseConnection } from '../../../middleware/auth.js';

export default async function organizationRoutes(fastify, options) {

  // Apply authentication and data isolation to all routes except public ones
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip authentication for public routes that don't require it
    const publicRoutes = [
      'GET /api/organizations/hierarchy',   // Allow hierarchy viewing with fallback auth
      'GET /api/organizations/parent',      // Allow parent organization viewing with fallback auth
      'POST /api/organizations/parent',     // Allow parent organization creation with fallback auth
      'POST /api/organizations/sub',        // Allow sub-organization creation with fallback auth
      'POST /api/organizations/bulk',       // Allow bulk organization creation with fallback auth
    ];

    const routeKey = `${request.method} ${request.url}`;

    const isPublic = publicRoutes.some(route => {
      const routeParts = route.split(' ');
      const method = routeParts[0];
      const path = routeParts[1];
      // Skip public route check for /current routes - they handle their own auth
      if (request.url.endsWith('/current')) {
        return false;
      }
      return request.method === method && request.url.includes(path);
    });

    if (!isPublic) {
      // First authenticate the user
      await authenticateToken(request, reply);

      // Then apply data isolation context
      if (request.userContext) {
        await addUserAccessContext()(request, reply);
      }

      // Apply application-level isolation
      await validateApplicationExists()(request, reply);
      await enforceApplicationAccess()(request, reply);
      await addApplicationDataFiltering()(request, reply);
    } else {
      // For public routes, just set up database connection
      await setupDatabaseConnection(request);
    }
  });

  // Create parent organization
  fastify.post('/parent', {
    schema: {
      description: 'Create a new parent organization',
      body: {
        type: 'object',
        required: ['name', 'parentTenantId'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
          description: { type: 'string' },
          gstin: { type: 'string', description: 'GSTIN (optional)' },
          parentTenantId: { type: 'string', description: 'Tenant ID this organization belongs to' }
        },
        additionalProperties: true // Allow additional properties to prevent validation errors
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                organizationType: { type: 'string' },
                organizationLevel: { type: 'number' },
                hierarchyPath: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // Test user ID
      }

      // Sanitize input data
      const sanitizedData = sanitizeInput(request.body);

      const result = await OrganizationService.createParentOrganization(sanitizedData, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Create parent organization failed:', error);

      if (error.message.includes('GSTIN')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid GSTIN',
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Tenant not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: 'Failed to create parent organization'
      });
    }
  });

  // Create sub-organization
  fastify.post('/sub', {
    schema: {
      description: 'Create a sub-organization under a parent organization',
      body: {
        type: 'object',
        required: ['name', 'parentOrganizationId'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
          description: { type: 'string' },
          gstin: { type: 'string', description: 'GSTIN (optional)', nullable: true },
          parentOrganizationId: { type: 'string', description: 'Parent organization ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                organizationType: { type: 'string' },
                organizationLevel: { type: 'number' },
                hierarchyPath: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        // Use the actual internal user ID from the logs
        userId = '3a9b3f2c-e335-4c3e-956f-be5341ef38eb'; // Test user ID
      }

      // Sanitize input data
      const sanitizedData = sanitizeInput(request.body);

      const result = await OrganizationService.createSubOrganization(sanitizedData, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Create sub-organization failed:', error);

      if (error.message.includes('GSTIN')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid GSTIN',
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: 'Failed to create sub-organization'
      });
    }
  });

  // Get organization details
  fastify.get('/:organizationId', {
    preHandler: [enforceOrganizationAccess()],
    schema: {
      description: 'Get organization details with hierarchy information',
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                organizationType: { type: 'string' },
                organizationLevel: { type: 'number' },
                hierarchyPath: { type: 'string' }
              }
            },
            parentOrganization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationId } = request.params;
      const result = await OrganizationService.getOrganizationDetails(organizationId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get organization details failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get organization details'
      });
    }
  });

  // Get sub-organizations
  fastify.get('/:organizationId/sub-organizations', {
    schema: {
      description: 'Get all sub-organizations for a parent organization',
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            subOrganizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizationId: { type: 'string' },
                  organizationName: { type: 'string' },
                  organizationType: { type: 'string' },
                  organizationLevel: { type: 'number' },
                  isActive: { type: 'boolean' }
                }
              }
            },
            count: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationId } = request.params;
      const result = await OrganizationService.getSubOrganizations(organizationId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get sub-organizations failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get sub-organizations'
      });
    }
  });

  // Get parent organization for tenant
  fastify.get('/parent/:tenantId', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      validateApplicationExists(),
      enforceApplicationAccess(),
      addApplicationDataFiltering()
    ],
    schema: {
      description: 'Get parent organization for a tenant',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              nullable: true,
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                description: { type: 'string' },
                gstin: { type: 'string' },
                organizationType: { type: 'string' },
                organizationLevel: { type: 'number' },
                isActive: { type: 'boolean' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const organization = await OrganizationService.getParentOrganization(tenantId);

      if (organization) {
        return {
          success: true,
          organization: organization,
          message: 'Parent organization retrieved successfully'
        };
      } else {
        return {
          success: false,
          organization: null,
          message: 'No parent organization found for this tenant'
        };
      }
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to retrieve parent organization'
      });
    }
  });

  // Get organization hierarchy for current tenant
  fastify.get('/hierarchy/current', {
    preHandler: [authenticateToken, addUserAccessContext(), validateApplicationExists(), enforceApplicationAccess(), addApplicationDataFiltering()],
    schema: {
      description: 'Get complete organization hierarchy for the current tenant',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            hierarchy: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizationId: { type: 'string' },
                  organizationName: { type: 'string' },
                  organizationType: { type: 'string' },
                  organizationLevel: { type: 'number' },
                  hierarchyPath: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  parentOrganizationId: { type: ['string', 'null'] },
                  children: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        organizationId: { type: 'string' },
                        organizationName: { type: 'string' },
                        organizationType: { type: 'string' },
                        organizationLevel: { type: 'number' },
                        hierarchyPath: { type: 'string' },
                        description: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        parentOrganizationId: { type: ['string', 'null'] },
                        children: { type: 'array', items: { type: 'object' } }
                      }
                    }
                  }
                }
              }
            },
            totalOrganizations: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;
      const result = await OrganizationService.getOrganizationHierarchy(
        tenantId,
        request.userContext,
        request.applicationContext
      );

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get organization hierarchy failed:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ User context:', request.userContext);
      console.error('❌ Tenant ID:', request.userContext?.tenantId);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get organization hierarchy'
      });
    }
  });

  // Get organization hierarchy
  fastify.get('/hierarchy/:tenantId', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      validateApplicationExists(),
      enforceApplicationAccess(),
      addApplicationDataFiltering()
    ],
    schema: {
      description: 'Get complete organization hierarchy for a tenant',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: {
            type: 'string',
            description: 'Tenant ID or "current" for authenticated user\'s tenant'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            hierarchy: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizationId: { type: 'string' },
                  organizationName: { type: 'string' },
                  organizationType: { type: 'string' },
                  organizationLevel: { type: 'number' },
                  hierarchyPath: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  parentOrganizationId: { type: ['string', 'null'] },
                  children: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        organizationId: { type: 'string' },
                        organizationName: { type: 'string' },
                        organizationType: { type: 'string' },
                        organizationLevel: { type: 'number' },
                        hierarchyPath: { type: 'string' },
                        description: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        parentOrganizationId: { type: ['string', 'null'] },
                        children: { type: 'array', items: { type: 'object' } }
                      }
                    }
                  }
                }
              }
            },
            totalOrganizations: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      let { tenantId } = request.params;

      // Handle special case where tenantId is "current" - use the authenticated user's tenant
      if (tenantId === 'current') {
        // Try userContext.tenantId first
        if (request.userContext?.tenantId) {
          tenantId = request.userContext.tenantId;
        } else if (request.userContext?.internalUserId) {
          // Fallback: look up tenantId from user record
          try {
            const { tenantUsers } = await import('../db/schema/index.js');
            const { eq } = await import('drizzle-orm');
            const { db } = await import('../db/index.js');

            const [userRecord] = await db
              .select({ tenantId: tenantUsers.tenantId })
              .from(tenantUsers)
              .where(eq(tenantUsers.userId, request.userContext.internalUserId))
              .limit(1);

            if (userRecord?.tenantId) {
              tenantId = userRecord.tenantId;
              console.log('✅ Found tenantId from user record:', tenantId);
            } else {
              return reply.code(400).send({
                success: false,
                error: 'Invalid tenant',
                message: 'Cannot determine current tenant - user not associated with any tenant'
              });
            }
          } catch (dbError) {
            console.error('❌ Error looking up tenantId from user record:', dbError);
            return reply.code(500).send({
              success: false,
              error: 'Database error',
              message: 'Failed to determine user tenant'
            });
          }
        } else {
          console.log('❌ Cannot determine tenantId for current user:', {
            hasUserContext: !!request.userContext,
            userContextKeys: request.userContext ? Object.keys(request.userContext) : [],
            internalUserId: request.userContext?.internalUserId,
            tenantId: request.userContext?.tenantId,
            isAuthenticated: request.userContext?.isAuthenticated
          });

          return reply.code(400).send({
            success: false,
            error: 'Invalid tenant',
            message: 'Cannot determine current tenant - user authentication context incomplete',
            debug: {
              hasUserContext: !!request.userContext,
              isAuthenticated: request.userContext?.isAuthenticated,
              hasInternalUserId: !!request.userContext?.internalUserId,
              hasTenantId: !!request.userContext?.tenantId
            }
          });
        }
      }

      const result = await OrganizationService.getOrganizationHierarchy(
        tenantId,
        request.userContext,
        request.applicationContext
      );

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get organization hierarchy failed:', error);

      // Provide fallback for simple hierarchy query if the main query fails
      try {
        console.log('Falling back to simple organization query...');
        const { db } = await import('../db/index.js');
        const { entities } = await import('../db/schema/index.js');
        const { eq } = await import('drizzle-orm');

        const finalTenantId = request.userContext?.tenantId || tenantId;

        const organizations = await db
          .select({
            organizationId: entities.entityId,
            organizationName: entities.entityName,
            organizationType: entities.organizationType,
            organizationLevel: entities.entityLevel,
            hierarchyPath: entities.hierarchyPath,
            description: entities.description,
            isActive: entities.isActive,
            createdAt: entities.createdAt,
            updatedAt: entities.updatedAt,
            parentOrganizationId: entities.parentEntityId
          })
          .from(entities)
          .where(eq(entities.tenantId, finalTenantId))
          .orderBy(entities.entityLevel, entities.entityName);

        return reply.send({
          success: true,
          hierarchy: organizations,
          totalOrganizations: organizations.length,
          message: 'Organization hierarchy retrieved (fallback method)'
        });
      } catch (fallbackError) {
        console.error('❌ Fallback hierarchy query also failed:', fallbackError);
        return reply.code(500).send({
          success: false,
          error: 'Retrieval failed',
          message: 'Failed to get organization hierarchy'
        });
      }
    }
  });

  // Update organization
  fastify.put('/:organizationId', {
    preHandler: [enforceOrganizationAccess(), validateOrganizationUpdate],
    schema: {
      description: 'Update organization details',
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          organizationName: { type: 'string', minLength: 2, maxLength: 255, description: 'Organization name (optional)' },
          description: { type: 'string', description: 'Organization description (optional)' },
          gstin: { type: 'string', description: 'GSTIN (optional)', nullable: true },
          responsiblePersonId: { type: 'string', description: 'New responsible person (optional)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                description: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationId } = request.params;
      const { internalUserId, userId } = request.userContext;
      // Use internal user ID for database operations, fallback to kinde user ID
      const dbUserId = internalUserId || userId;
      const result = await OrganizationService.updateOrganization(organizationId, request.body, dbUserId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Update organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Update failed',
        message: 'Failed to update organization'
      });
    }
  });

  // Get organization locations
  fastify.get('/:organizationId/locations', {
    schema: {
      description: 'Get all locations for an organization',
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' }
              }
            },
            locations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  locationId: { type: 'string' },
                  locationName: { type: 'string' },
                  address: { type: 'object' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  country: { type: 'string' },
                  isActive: { type: 'boolean' },
                  assignedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            count: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationId } = request.params;
      const result = await LocationService.getOrganizationLocations(organizationId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get organization locations failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get organization locations'
      });
    }
  });

  // Move organization to new parent
  fastify.patch('/:organizationId/move', {
    schema: {
      description: 'Move organization to a new parent (reorganize hierarchy)',
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          newParentId: { type: 'string', description: 'New parent organization ID (null for root level)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                parentOrganizationId: { type: 'string' },
                hierarchyPath: { type: 'string' },
                organizationLevel: { type: 'number' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationId } = request.params;
      const { newParentId } = request.body;

      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // Test user ID
      }

      const result = await OrganizationService.moveOrganization(organizationId, newParentId, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Move organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      if (error.message.includes('circular reference')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid operation',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Move failed',
        message: 'Failed to move organization'
      });
    }
  });

  // Bulk create organizations
  fastify.post('/bulk', {
    schema: {
      description: 'Bulk create organizations',
      body: {
        type: 'object',
        required: ['organizations'],
        properties: {
          organizations: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              required: ['name', 'parentTenantId'],
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 255 },
                description: { type: 'string' },
                gstin: { type: 'string', description: 'GSTIN (optional)', nullable: true },
                parentTenantId: { type: 'string' }
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: { type: 'array' },
            errors: { type: 'array' },
            totalProcessed: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizations } = request.body;

      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // Test user ID
      }

      // Sanitize input data for each organization
      const sanitizedData = organizations.map(org => sanitizeInput(org));

      const result = await OrganizationService.bulkCreateOrganizations(sanitizedData, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Bulk create organizations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk creation failed',
        message: 'Failed to process bulk organization creation'
      });
    }
  });

  // Bulk update organizations
  fastify.put('/bulk', {
    schema: {
      description: 'Bulk update organizations',
      body: {
        type: 'object',
        required: ['updates'],
        properties: {
          updates: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              required: ['organizationId'],
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string', minLength: 2, maxLength: 255 },
                description: { type: 'string' },
                gstin: { type: 'string', description: 'GSTIN (optional)', nullable: true },
                responsiblePersonId: { type: 'string' }
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: { type: 'array' },
            errors: { type: 'array' },
            totalProcessed: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { updates } = request.body;

      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // Test user ID
      }

      // Sanitize input data for each update
      const sanitizedData = updates.map(update => sanitizeInput(update));

      const result = await OrganizationService.bulkUpdateOrganizations(sanitizedData, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Bulk update organizations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk update failed',
        message: 'Failed to process bulk organization updates'
      });
    }
  });

  // Bulk delete organizations
  fastify.delete('/bulk', {
    schema: {
      description: 'Bulk delete organizations',
      body: {
        type: 'object',
        required: ['organizationIds'],
        properties: {
          organizationIds: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: { type: 'string' }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: { type: 'array' },
            errors: { type: 'array' },
            totalProcessed: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationIds } = request.body;

      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // Test user ID
      }

      const result = await OrganizationService.bulkDeleteOrganizations(organizationIds, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Bulk delete organizations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk deletion failed',
        message: 'Failed to process bulk organization deletions'
      });
    }
  });

  // Delete organization (soft delete)
  fastify.delete('/:organizationId', {
    schema: {
      description: 'Delete organization (soft delete)',
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            organization: {
              type: 'object',
              properties: {
                organizationId: { type: 'string' },
                organizationName: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { organizationId } = request.params;
      const { userId } = request.userContext;
      const result = await OrganizationService.deleteOrganization(organizationId, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Delete organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      if (error.message.includes('sub-organizations')) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot delete',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Deletion failed',
        message: 'Failed to delete organization'
      });
    }
  });
}
