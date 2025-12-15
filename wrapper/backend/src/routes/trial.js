import { authMiddleware } from '../middleware/auth.js';
import { checkTrialStatus } from '../middleware/trial-restriction.js';

export default async function trialRoutes(fastify, options) {
  
  // Get trial status for current tenant
  fastify.get('/status', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.user;
      
      // Check trial restrictions
      const trialStatus = await checkTrialStatus(tenantId);
      
      // Get trial statistics
      const stats = await TrialEventService.getTrialStats(tenantId);
      
      // Get current subscription info
      const { sql } = await import('../db/index.js');
      const subscription = await sql`
        SELECT 
          s.plan, s.status, s.trial_start, s.trial_end, 
          s.reminder_count, s.last_reminder_sent_at, s.restrictions_applied_at,
          t.company_name
        FROM subscriptions s
        JOIN tenants t ON s.tenant_id = t.tenant_id
        WHERE s.tenant_id = ${tenantId}
        ORDER BY s.created_at DESC
        LIMIT 1;
      `;

      const subscriptionData = subscription[0] || null;
      
      return reply.send({
        success: true,
        data: {
          tenantId,
          isExpired: trialStatus.isExpired,
          hasRestrictions: trialStatus.hasRestrictions,
          message: trialStatus.message,
          subscription: subscriptionData,
          stats: stats,
          upgradeUrl: `${process.env.FRONTEND_URL}/billing?upgrade=true&source=trial_status`
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting trial status:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trial status',
        error: error.message
      });
    }
  });

  // Get active restrictions for current tenant
  fastify.get('/restrictions', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.user;
      
      const { sql } = await import('../db/index.js');
      const restrictions = await sql`
        SELECT restriction_type, restriction_data, applied_at, is_active
        FROM trial_restrictions
        WHERE tenant_id = ${tenantId}
        AND is_active = TRUE
        ORDER BY applied_at DESC;
      `;

      return reply.send({
        success: true,
        data: {
          restrictions: restrictions,
          hasActiveRestrictions: restrictions.length > 0
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting trial restrictions:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trial restrictions',
        error: error.message
      });
    }
  });

  // Check if specific feature is restricted
  fastify.get('/check/:feature', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.user;
      const { feature } = request.params;
      
      const restriction = await TrialEventService.isFeatureRestricted(tenantId, feature);
      
      return reply.send({
        success: true,
        data: {
          feature,
          restricted: restriction.restricted,
          message: restriction.message,
          data: restriction.data
        }
      });
      
    } catch (error) {
      console.error('❌ Error checking feature restriction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to check feature restriction',
        error: error.message
      });
    }
  });

  // Get trial events for current tenant (for debugging/admin)
  fastify.get('/events', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.user;
      const { limit = 50, offset = 0 } = request.query;
      
      const { sql } = await import('../db/index.js');
      const events = await sql`
        SELECT event_type, event_data, created_at, user_id, ip_address
        FROM trial_events
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      return reply.send({
        success: true,
        data: {
          events,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting trial events:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trial events',
        error: error.message
      });
    }
  });

  // Force trigger trial expiry check (for testing/admin)
  fastify.post('/force-expiry-check', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return reply.status(403).send({
          success: false,
          message: 'This endpoint is only available in development'
        });
      }

      const { tenantId } = request.user;
      
      // Get subscription
      const { sql } = await import('../db/index.js');
      const subscription = await sql`
        SELECT * FROM subscriptions WHERE tenant_id = ${tenantId} LIMIT 1;
      `;

      if (subscription.length === 0) {
        return reply.status(404).send({
          success: false,
          message: 'No subscription found'
        });
      }

      // Force trial expiry handling
      await TrialEventService.handleTrialExpiry(subscription[0]);

      return reply.send({
        success: true,
        message: 'Trial expiry check completed',
        data: {
          tenantId,
          subscriptionId: subscription[0].subscription_id
        }
      });
      
    } catch (error) {
      console.error('❌ Error forcing trial expiry check:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to force trial expiry check',
        error: error.message
      });
    }
  });
} 