import { TenantService } from '../../../services/tenant-service.js';

/**
 * Subdomain Management Routes
 * Handles subdomain availability checking and validation
 */

export default async function subdomainManagementRoutes(fastify, options) {

  // Check subdomain availability (POST version)
  fastify.post('/check-subdomain', {
    schema: {
      body: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string', minLength: 2, maxLength: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subdomain } = request.body;

      // Check if subdomain is available
      const available = await TenantService.checkSubdomainAvailability(subdomain);

      return {
        success: true,
        available,
        subdomain
      };
    } catch (error) {
      request.log.error('Error checking subdomain availability:', error);
      return reply.code(500).send({ error: 'Failed to check subdomain availability' });
    }
  });

  // Check subdomain availability (GET version for frontend)
  fastify.get('/check-subdomain', {
    schema: {
      querystring: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string', minLength: 2, maxLength: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subdomain } = request.query;

      console.log('🔍 Checking subdomain availability:', subdomain);

      // Check if subdomain is available
      const available = await TenantService.checkSubdomainAvailability(subdomain);

      console.log('✅ Subdomain availability result:', { subdomain, available });

      return {
        success: true,
        available,
        subdomain
      };
    } catch (error) {
      console.error('❌ Error checking subdomain availability:', error);
      request.log.error('Error checking subdomain availability:', error);
      return reply.code(500).send({ error: 'Failed to check subdomain availability' });
    }
  });
}
