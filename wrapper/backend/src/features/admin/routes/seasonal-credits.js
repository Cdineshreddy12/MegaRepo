import { SeasonalCreditService } from '../services/SeasonalCreditService.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';

/**
 * Seasonal Credits Routes
 * Handles distribution of free credits to tenants through campaigns
 */
export default async function seasonalCreditsRoutes(fastify, options) {
  
  /**
   * GET /admin/seasonal-credits/campaigns
   * Get all seasonal credit campaigns
   */
  fastify.get('/campaigns', {
    preHandler: [authenticateToken, requirePermission('admin:credits')]
  }, async (request, reply) => {
    try {
      const { isActive, distributionStatus } = request.query;
      
      const campaigns = await SeasonalCreditService.getCampaigns({
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        distributionStatus
      });
      
      reply.send({
        success: true,
        data: campaigns
      });
    } catch (error) {
      request.log.error('Error fetching campaigns:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch campaigns',
        message: error.message
      });
    }
  });
  
  /**
   * POST /admin/seasonal-credits/campaigns
   * Create a new seasonal credit campaign
   */
  fastify.post('/campaigns', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      body: {
        type: 'object',
        required: ['campaignName', 'creditType', 'totalCredits', 'expiresAt'],
        properties: {
          campaignName: { type: 'string', maxLength: 255 },
          creditType: { 
            type: 'string', 
            enum: ['free_distribution', 'promotional', 'holiday', 'bonus', 'event'] 
          },
          description: { type: 'string' },
          totalCredits: { type: 'number', minimum: 1 },
          creditsPerTenant: { type: 'number', minimum: 0.01 },
          distributionMethod: { 
            type: 'string', 
            enum: ['equal', 'proportional', 'custom'], 
            default: 'equal' 
          },
          targetAllTenants: { type: 'boolean', default: false },
          targetTenantIds: { 
            type: 'array', 
            items: { type: 'string', format: 'uuid' } 
          },
          allocationMode: {
            type: 'string',
            enum: ['primary_org', 'application_specific'],
            default: 'primary_org'
          },
          targetApplications: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Required if allocationMode is "application_specific". Valid values: crm, hr, affiliate, system'
          },
          expiresAt: { type: 'string', format: 'date-time' },
          sendNotifications: { type: 'boolean', default: true },
          notificationTemplate: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const campaignData = {
        ...request.body,
        createdBy: request.userContext.userId,
        tenantId: request.userContext.tenantId
      };
      
      const campaign = await SeasonalCreditService.createDistributionCampaign(campaignData);
      
      reply.send({
        success: true,
        data: campaign,
        message: 'Campaign created successfully. Ready for distribution.'
      });
    } catch (error) {
      request.log.error('Error creating campaign:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to create campaign',
        message: error.message
      });
    }
  });
  
  /**
   * GET /admin/seasonal-credits/campaigns/:campaignId
   * Get detailed information about a specific campaign
   */
  fastify.get('/campaigns/:campaignId', {
    preHandler: [authenticateToken, requirePermission('admin:credits')]
  }, async (request, reply) => {
    try {
      const campaign = await SeasonalCreditService.getCampaign(request.params.campaignId);
      
      reply.send({
        success: true,
        data: campaign
      });
    } catch (error) {
      request.log.error('Error fetching campaign:', error);
      reply.code(404).send({
        success: false,
        error: 'Campaign not found',
        message: error.message
      });
    }
  });
  
  /**
   * POST /admin/seasonal-credits/campaigns/:campaignId/distribute
   * Distribute credits to tenants
   */
  fastify.post('/campaigns/:campaignId/distribute', {
    preHandler: [authenticateToken, requirePermission('admin:credits')]
  }, async (request, reply) => {
    try {
      const result = await SeasonalCreditService.distributeCreditsToTenants(
        request.params.campaignId
      );
      
      reply.send({
        success: true,
        data: result,
        message: `Credit distribution ${result.status}. ${result.distributedCount} successful, ${result.failedCount} failed.`
      });
    } catch (error) {
      request.log.error('Error distributing credits:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to distribute credits',
        message: error.message
      });
    }
  });
  
  /**
   * GET /admin/seasonal-credits/campaigns/:campaignId/status
   * Get campaign distribution status
   */
  fastify.get('/campaigns/:campaignId/status', {
    preHandler: [authenticateToken, requirePermission('admin:credits')]
  }, async (request, reply) => {
    try {
      const status = await SeasonalCreditService.getCampaignDistributionStatus(
        request.params.campaignId
      );
      
      reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      request.log.error('Error getting campaign status:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to get campaign status',
        message: error.message
      });
    }
  });
  
  /**
   * PUT /admin/seasonal-credits/campaigns/:campaignId/extend
   * Extend expiry for a campaign
   */
  fastify.put('/campaigns/:campaignId/extend', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      body: {
        type: 'object',
        required: ['additionalDays'],
        properties: {
          additionalDays: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await SeasonalCreditService.extendCampaignExpiry(
        request.params.campaignId,
        request.body.additionalDays
      );
      
      reply.send({
        success: true,
        data: result,
        message: `Extended campaign expiry by ${request.body.additionalDays} days`
      });
    } catch (error) {
      request.log.error('Error extending campaign expiry:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to extend campaign expiry',
        message: error.message
      });
    }
  });
  
  /**
   * POST /admin/seasonal-credits/send-warnings
   * Send expiry warnings
   */
  fastify.post('/send-warnings', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      body: {
        type: 'object',
        properties: {
          daysAhead: { type: 'integer', minimum: 1, default: 7 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await SeasonalCreditService.sendExpiryWarnings(
        request.body.daysAhead || 7
      );
      
      reply.send({
        success: true,
        data: result,
        message: `Sent expiry warnings to ${result.emailsSent} tenants`
      });
    } catch (error) {
      request.log.error('Error sending expiry warnings:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to send expiry warnings',
        message: error.message
      });
    }
  });
  
  /**
   * GET /admin/seasonal-credits/expiring-soon
   * Get credits expiring soon
   */
  fastify.get('/expiring-soon', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          daysAhead: { type: 'integer', minimum: 1, default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const daysAhead = parseInt(request.query.daysAhead) || 30;
      const expiringCredits = await SeasonalCreditService.getExpiringAllocations(daysAhead);
      
      reply.send({
        success: true,
        data: expiringCredits
      });
    } catch (error) {
      request.log.error('Error fetching expiring credits:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch expiring credits',
        message: error.message
      });
    }
  });
  
  /**
   * GET /admin/seasonal-credits/tenant-allocations
   * Get tenant's seasonal credit allocations (for authenticated tenant users)
   */
  fastify.get('/tenant-allocations', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return reply.code(400).send({
          success: false,
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }
      
      const allocations = await SeasonalCreditService.getTenantAllocations(tenantId);
      
      reply.send({
        success: true,
        data: allocations
      });
    } catch (error) {
      request.log.error('Error getting tenant allocations:', error);
      reply.code(400).send({
        success: false,
        error: 'Failed to get tenant allocations',
        message: error.message
      });
    }
  });
  
  /**
   * POST /admin/seasonal-credits/process-expiries
   * Process credit expiries (typically called by a cron job)
   */
  fastify.post('/process-expiries', {
    preHandler: [authenticateToken, requirePermission('admin:credits')]
  }, async (request, reply) => {
    try {
      const result = await SeasonalCreditService.processExpiries();
      
      reply.send({
        success: true,
        data: result,
        message: `Processed ${result.processedCount} expired allocations`
      });
    } catch (error) {
      request.log.error('Error processing expiries:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to process expiries',
        message: error.message
      });
    }
  });
  
  /**
   * GET /admin/seasonal-credits/types
   * Get available credit types
   */
  fastify.get('/types', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    reply.send({
      success: true,
      data: [
        {
          value: 'free_distribution',
          label: 'Free Distribution',
          description: 'Free credits distributed to tenants',
          defaultExpiryDays: 30
        },
        {
          value: 'promotional',
          label: 'Promotional',
          description: 'Marketing campaign credits',
          defaultExpiryDays: 14
        },
        {
          value: 'holiday',
          label: 'Holiday',
          description: 'Holiday and seasonal promotional credits',
          defaultExpiryDays: 30
        },
        {
          value: 'bonus',
          label: 'Bonus',
          description: 'Loyalty and referral bonus credits',
          defaultExpiryDays: 90
        },
        {
          value: 'event',
          label: 'Event',
          description: 'Special event and product launch credits',
          defaultExpiryDays: 7
        }
      ]
    });
  });
}
