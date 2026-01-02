import { externalAppService } from '../../../services/external-app-service.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';

/**
 * External Application Management Routes
 * Admin routes for managing external applications
 */
export default async function externalAppRoutes(fastify, options) {
  /**
   * GET /api/admin/external-apps
   * List all external applications
   */
  fastify.get('/', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')]
  }, async (request, reply) => {
    try {
      const apps = await externalAppService.listApplications({
        isActive: request.query.isActive === 'true' ? true : request.query.isActive === 'false' ? false : null,
        createdBy: request.query.createdBy
      });

      return reply.send({
        success: true,
        data: apps
      });
    } catch (error) {
      request.log.error('Error listing external apps:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to list applications',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/external-apps
   * Create external application
   */
  fastify.post('/', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')],
    schema: {
      body: {
        type: 'object',
        required: ['appName'],
        properties: {
          appName: { type: 'string' },
          appDescription: { type: 'string' },
          webhookUrl: { type: 'string' },
          rateLimit: { type: 'integer', default: 100, minimum: 1, maximum: 10000 },
          allowedTenants: { type: 'array', items: { type: 'string', format: 'uuid' } },
          permissions: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const app = await externalAppService.createApplication({
        ...request.body,
        createdBy: request.userContext.internalUserId
      });

      return reply.send({
        success: true,
        data: app,
        message: 'Application created successfully'
      });
    } catch (error) {
      request.log.error('Error creating external app:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create application',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/external-apps/:appId
   * Get external application by ID
   */
  fastify.get('/:appId', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')]
  }, async (request, reply) => {
    try {
      const app = await externalAppService.getApplication(request.params.appId);

      if (!app) {
        return reply.code(404).send({
          success: false,
          error: 'Application not found'
        });
      }

      return reply.send({
        success: true,
        data: app
      });
    } catch (error) {
      request.log.error('Error getting external app:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get application',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/external-apps/:appId
   * Update external application
   */
  fastify.put('/:appId', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')],
    schema: {
      body: {
        type: 'object',
        properties: {
          appName: { type: 'string' },
          appDescription: { type: 'string' },
          webhookUrl: { type: 'string' },
          rateLimit: { type: 'integer', minimum: 1, maximum: 10000 },
          allowedTenants: { type: 'array', items: { type: 'string', format: 'uuid' } },
          permissions: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const app = await externalAppService.updateApplication(request.params.appId, request.body);

      if (!app) {
        return reply.code(404).send({
          success: false,
          error: 'Application not found'
        });
      }

      return reply.send({
        success: true,
        data: app,
        message: 'Application updated successfully'
      });
    } catch (error) {
      request.log.error('Error updating external app:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update application',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/admin/external-apps/:appId
   * Revoke external application
   */
  fastify.delete('/:appId', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')]
  }, async (request, reply) => {
    try {
      const app = await externalAppService.revokeApplication(request.params.appId);

      if (!app) {
        return reply.code(404).send({
          success: false,
          error: 'Application not found'
        });
      }

      return reply.send({
        success: true,
        data: app,
        message: 'Application revoked successfully'
      });
    } catch (error) {
      request.log.error('Error revoking external app:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to revoke application',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/external-apps/:appId/rotate-key
   * Rotate API key
   */
  fastify.post('/:appId/rotate-key', {
    preHandler: [authenticateToken, requirePermission('admin.notifications.manage')]
  }, async (request, reply) => {
    try {
      const result = await externalAppService.rotateApiKey(request.params.appId);

      return reply.send({
        success: true,
        data: result,
        message: 'API key rotated successfully'
      });
    } catch (error) {
      request.log.error('Error rotating API key:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to rotate API key',
        message: error.message
      });
    }
  });
}

