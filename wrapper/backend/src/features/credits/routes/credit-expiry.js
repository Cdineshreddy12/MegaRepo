import { CreditExpiryService } from '../services/credit-expiry-service.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';

/**
 * Credit Expiry Routes
 * Handles credit expiry processing and queries
 */
export default async function creditExpiryRoutes(fastify, options) {
  console.log('🔧 REGISTERING CREDIT EXPIRY ROUTES...');

  // Process expired credits (admin only, can be called via cron)
  fastify.post('/process-expired', {
    preHandler: [authenticateToken, requirePermission('credits.manage')]
  }, async (request, reply) => {
    try {
      const result = await CreditExpiryService.processExpiredCredits();
      return {
        success: true,
        message: 'Expired credits processed successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error processing expired credits:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to process expired credits',
        error: error.message
      });
    }
  });

  // Get expiring credits
  fastify.get('/expiring', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const { daysAhead = 7 } = request.query;
      const tenantId = request.userContext?.tenantId;
      const entityId = request.query?.entityId || null;

      const expiringCredits = await CreditExpiryService.getExpiringCredits(
        parseInt(daysAhead),
        tenantId,
        entityId
      );

      return {
        success: true,
        data: expiringCredits
      };
    } catch (error) {
      console.error('❌ Error fetching expiring credits:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch expiring credits',
        error: error.message
      });
    }
  });

  // Get expiry statistics
  fastify.get('/expiry-stats', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext?.tenantId;
      const entityId = request.query?.entityId;

      if (!tenantId || !entityId) {
        return reply.code(400).send({
          success: false,
          message: 'Tenant ID and Entity ID are required'
        });
      }

      const stats = await CreditExpiryService.getExpiryStats(tenantId, entityId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ Error fetching expiry stats:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch expiry statistics',
        error: error.message
      });
    }
  });

  // Send expiry warnings
  fastify.post('/send-warnings', {
    preHandler: [authenticateToken, requirePermission('credits.manage')]
  }, async (request, reply) => {
    try {
      const { daysAhead = 7 } = request.body || {};
      const result = await CreditExpiryService.sendExpiryWarnings(parseInt(daysAhead));

      return {
        success: true,
        message: 'Expiry warnings sent successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error sending expiry warnings:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to send expiry warnings',
        error: error.message
      });
    }
  });
}






