/**
 * Location Routes - RESTful API endpoints for location management
 * Follows SOLID principles with clear separation of concerns
 */

import { EntityAdminService } from '../../../features/admin/index.js';
import { authenticateToken } from '../../../middleware/auth.js';
import {
  validateLocationCreation,
  sanitizeInput
} from '../../../middleware/validation.js';

export default async function locationRoutes(fastify, options) {

  // Apply authentication to all routes except public ones
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip authentication for public routes that don't require it
    const publicRoutes = [
      'GET /api/locations/tenant/:tenantId', // Public tenant locations viewing
      'POST /api/locations/',                // Allow location creation with fallback auth
    ];

    const routeKey = `${request.method} ${request.url}`;
    const isPublic = publicRoutes.some(route => {
      const routeParts = route.split(' ');
      const method = routeParts[0];
      const path = routeParts[1];
      return request.method === method && request.url.includes(path);
    });

    if (!isPublic) {
      return authenticateToken(request, reply);
    }
  });

  // Create location for organization
  fastify.post('/', {
    preHandler: [validateLocationCreation],
    schema: {
      description: 'Create a new location and assign to organization',
      body: {
        type: 'object',
        required: ['name', 'address', 'city', 'country', 'organizationId'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255, description: 'Location name' },
          address: { type: 'string', minLength: 5, description: 'Street address' },
          city: { type: 'string', minLength: 2, description: 'City' },
          state: { type: 'string', description: 'State/Province' },
          zipCode: { type: 'string', description: 'ZIP/Postal code' },
          country: { type: 'string', minLength: 2, description: 'Country' },
          organizationId: { type: 'string', description: 'Organization to assign location to' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            location: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' },
                address: { type: 'object' },
                city: { type: 'string' },
                country: { type: 'string' }
              }
            },
            organization: {
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
      // Handle both authenticated and unauthenticated requests
      let createdBy = request.userContext?.internalUserId;
      let responsiblePersonId = request.userContext?.internalUserId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!createdBy) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        // For unauthenticated requests, we need a valid user ID for createdBy (required)
        // but responsiblePersonId can be null
        createdBy = request.userContext?.userId || '3a9b3f2c-e335-4c3e-956f-be5341ef38eb'; // Use a known valid user ID
        responsiblePersonId = null; // Allow null for unauthenticated requests
      }

      // Sanitize input data
      const sanitizedData = sanitizeInput(request.body);

      // Add responsiblePersonId to the data if we have it
      if (responsiblePersonId) {
        sanitizedData.responsiblePersonId = responsiblePersonId;
      }

      const result = await LocationService.createLocation(sanitizedData, createdBy);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Create location failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      if (error.message.includes('Location name')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid data',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: 'Failed to create location'
      });
    }
  });

  // REMOVED: Get organization locations - MOVED TO ORGANIZATIONS ROUTES

  // Get location details
  fastify.get('/:locationId', {
    schema: {
      description: 'Get detailed information about a location',
      params: {
        type: 'object',
        required: ['locationId'],
        properties: {
          locationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            location: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' },
                address: { type: 'object' },
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            },
            organizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizationId: { type: 'string' },
                  organizationName: { type: 'string' },
                  organizationType: { type: 'string' },
                  assignedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            organizationCount: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId } = request.params;
      const result = await LocationService.getLocationDetails(locationId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get location details failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Location not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get location details'
      });
    }
  });

  // Update location
  fastify.put('/:locationId', {
    schema: {
      description: 'Update location information',
      params: {
        type: 'object',
        required: ['locationId'],
        properties: {
          locationId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          locationName: { type: 'string', minLength: 2, maxLength: 255 },
          address: { type: 'string', minLength: 5 },
          city: { type: 'string', minLength: 2 },
          state: { type: 'string' },
          zipCode: { type: 'string' },
          country: { type: 'string', minLength: 2 },
          responsiblePersonId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            location: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId } = request.params;
      const { userId } = request.userContext;
      const result = await LocationService.updateLocation(locationId, request.body, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Update location failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Location not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Update failed',
        message: 'Failed to update location'
      });
    }
  });

  // Assign location to organization
  fastify.post('/:locationId/assign/:organizationId', {
    schema: {
      description: 'Assign an existing location to an organization',
      params: {
        type: 'object',
        required: ['locationId', 'organizationId'],
        properties: {
          locationId: { type: 'string' },
          organizationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            assignment: {
              type: 'object',
              properties: {
                assignmentId: { type: 'string' },
                locationId: { type: 'string' },
                entityId: { type: 'string' },
                entityType: { type: 'string' },
                assignedAt: { type: 'string', format: 'date-time' }
              }
            },
            location: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' }
              }
            },
            organization: {
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
      const { locationId, organizationId } = request.params;
      const { userId } = request.userContext;
      const result = await LocationService.assignLocationToOrganization(locationId, organizationId, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Assign location to organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Entity not found',
          message: error.message
        });
      }

      if (error.message.includes('already assigned')) {
        return reply.code(409).send({
          success: false,
          error: 'Already assigned',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Assignment failed',
        message: 'Failed to assign location to organization'
      });
    }
  });

  // Remove location from organization
  fastify.delete('/:locationId/organizations/:organizationId', {
    schema: {
      description: 'Remove location assignment from organization',
      params: {
        type: 'object',
        required: ['locationId', 'organizationId'],
        properties: {
          locationId: { type: 'string' },
          organizationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            assignment: {
              type: 'object',
              properties: {
                assignmentId: { type: 'string' },
                locationId: { type: 'string' },
                entityId: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId, organizationId } = request.params;
      const { userId } = request.userContext;
      const result = await LocationService.removeLocationFromOrganization(locationId, organizationId, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Remove location from organization failed:', error);

      if (error.message.includes('last location')) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot remove last location',
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Assignment not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Removal failed',
        message: 'Failed to remove location from organization'
      });
    }
  });

  // Update location capacity
  fastify.put('/:locationId/capacity', {
    schema: {
      description: 'Update location capacity and usage',
      params: {
        type: 'object',
        required: ['locationId'],
        properties: {
          locationId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          maxOccupancy: { type: 'number', minimum: 0 },
          currentOccupancy: { type: 'number', minimum: 0 },
          resources: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            location: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' },
                capacity: { type: 'object' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId } = request.params;
      const capacityData = request.body;

      // Handle both authenticated and unauthenticated requests
      let userId = request.userContext?.userId;

      // For testing/development, use a fallback user ID if not authenticated
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // Test user ID
      }

      const result = await LocationService.updateLocationCapacity(locationId, capacityData, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Update location capacity failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      if (error.message.includes('cannot be negative') || error.message.includes('exceed')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid capacity data',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Capacity update failed',
        message: 'Failed to update location capacity'
      });
    }
  });

  // Get location analytics
  fastify.get('/:locationId/analytics', {
    schema: {
      description: 'Get location utilization analytics',
      params: {
        type: 'object',
        required: ['locationId'],
        properties: {
          locationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            analytics: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' },
                capacity: { type: 'object' },
                usage: { type: 'object' },
                resources: { type: 'array' },
                lastUpdated: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { locationId } = request.params;

      const result = await LocationService.getLocationAnalytics(locationId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get location analytics failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Location not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Analytics retrieval failed',
        message: 'Failed to get location analytics'
      });
    }
  });

  // Get locations by utilization level
  fastify.get('/utilization/:tenantId/:utilizationLevel?', {
    schema: {
      description: 'Get locations filtered by utilization level',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' },
          utilizationLevel: {
            type: 'string',
            enum: ['all', 'critical', 'high', 'medium', 'low']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            locations: { type: 'array' },
            total: { type: 'number' },
            breakdown: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, utilizationLevel = 'all' } = request.params;

      const result = await LocationService.getLocationsByUtilization(tenantId, utilizationLevel);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get locations by utilization failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get locations by utilization'
      });
    }
  });

  // Bulk update location capacities
  fastify.put('/bulk/capacity', {
    schema: {
      description: 'Bulk update location capacities',
      body: {
        type: 'object',
        required: ['updates'],
        properties: {
          updates: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: {
              type: 'object',
              required: ['locationId'],
              properties: {
                locationId: { type: 'string' },
                maxOccupancy: { type: 'number', minimum: 0 },
                currentOccupancy: { type: 'number', minimum: 0 },
                resources: { type: 'object' }
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

      const result = await LocationService.bulkUpdateLocationCapacities(updates, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Bulk update location capacities failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk update failed',
        message: 'Failed to process bulk location capacity updates'
      });
    }
  });

  // Delete location
  fastify.delete('/:locationId', {
    schema: {
      description: 'Delete location (soft delete)',
      params: {
        type: 'object',
        required: ['locationId'],
        properties: {
          locationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            location: {
              type: 'object',
              properties: {
                locationId: { type: 'string' },
                locationName: { type: 'string' },
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
      const { locationId } = request.params;
      const { userId } = request.userContext;
      const result = await LocationService.deleteLocation(locationId, userId);

      return reply.send(result);
    } catch (error) {
      console.error('❌ Delete location failed:', error);

      if (error.message.includes('assigned to organizations')) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot delete assigned location',
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Location not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Deletion failed',
        message: 'Failed to delete location'
      });
    }
  });

  // Get all tenant locations
  fastify.get('/tenant/:tenantId', {
    schema: {
      description: 'Get all locations for a tenant',
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
            locations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  locationId: { type: 'string' },
                  locationName: { type: 'string' },
                  address: {
                    type: 'object',
                    properties: {
                      street: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      zipCode: { type: 'string' },
                      country: { type: 'string' },
                      additionalDetails: { type: 'string' }
                    }
                  },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  organizationId: { type: 'string' },
                  organizationType: { type: 'string' }
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
      const { tenantId } = request.params;
      const result = await EntityAdminService.getTenantEntities(tenantId, 'location');

      return reply.send(result);
    } catch (error) {
      console.error('❌ Get tenant locations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get tenant locations'
      });
    }
  });
}
