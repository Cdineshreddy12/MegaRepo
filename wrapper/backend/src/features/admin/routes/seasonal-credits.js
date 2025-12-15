import { SeasonalCreditService, CreditAllocationService } from '../../../features/credits/index.js';
import { SeasonalCreditNotificationService } from '../../../services/seasonal-credit-notification-service.js';
import { db } from '../../../db/index.js';
import { eq, and, inArray, sql, desc, gte, lte } from 'drizzle-orm';
import { creditAllocations, tenants } from '../../../db/schema/index.js';

export default async function seasonalCreditsRoutes(fastify, options) {

  /**
   * GET /admin/seasonal-credits/campaigns
   * Get all active seasonal credit campaigns
   */
  fastify.get('/campaigns', async (request, reply) => {
    try {
      const { tenantId, campaignType } = request.query;

      // For now, return campaigns across all tenants (super admin view)
      // In production, you'd filter based on user's admin scope

      let campaigns = [];

      try {
        if (tenantId) {
          // Get campaigns for specific tenant
          const seasonalService = new SeasonalCreditService();
          campaigns = await seasonalService.getActiveSeasonalCampaigns(tenantId);
        } else {
          // Get campaigns across all tenants (aggregated view)
          const allCampaigns = await db
            .select({
              campaignId: sql`${creditAllocations.campaignId}`,
              campaignName: sql`${creditAllocations.campaignName}`,
              creditType: creditAllocations.creditType,
              totalCredits: sql`SUM(${creditAllocations.allocatedCredits})`,
              usedCredits: sql`SUM(${creditAllocations.usedCredits})`,
              availableCredits: sql`SUM(${creditAllocations.availableCredits})`,
              tenantCount: sql`COUNT(DISTINCT ${creditAllocations.tenantId})`,
              expiresAt: sql`MIN(${creditAllocations.expiresAt})`,
              createdAt: sql`MIN(${creditAllocations.allocatedAt})`
            })
            .from(creditAllocations)
            .where(and(
              eq(creditAllocations.isActive, true),
              inArray(creditAllocations.creditType, ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension']),
              sql`${creditAllocations.campaignId} IS NOT NULL`
            ))
            .groupBy(
              sql`${creditAllocations.campaignId}`,
              sql`${creditAllocations.campaignName}`,
              creditAllocations.creditType
            )
            .orderBy(desc(sql`MIN(${creditAllocations.allocatedAt})`));

          campaigns = allCampaigns;
        }
      } catch (dbError) {
        console.warn('Database query failed, likely due to missing seasonal credit columns:', dbError.message);
        // Return empty array if database doesn't support seasonal credits yet
        campaigns = [];
      }

      if (campaignType) {
        campaigns = campaigns.filter(c => c.creditType === campaignType);
      }

      reply.send({
        success: true,
        data: campaigns
      });

    } catch (error) {
      console.error('Error getting seasonal credit campaigns:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve seasonal credit campaigns'
      });
    }
  });

  /**
   * POST /admin/seasonal-credits/campaigns
   * Create a new seasonal credit campaign
   */
  fastify.post('/campaigns', async (request, reply) => {
  try {
    const {
      campaignId,
      campaignName,
      creditType,
      totalCredits,
      tenantIds, // Array of tenant IDs to allocate to, or null for all tenants
      targetApplications, // Array of applications, or null for all
      expiresAt, // Optional explicit expiry date
      metadata = {},
      sendNotifications = true
    } = request.body;

    const adminUserId = request.user?.userId;

    console.log('🎄 Campaign launch request:', {
      campaignId,
      campaignName,
      creditType,
      totalCredits,
      tenantIds: tenantIds?.length || 'all',
      targetApplications: targetApplications?.length || 'all',
      sendNotifications
    });

    if (!campaignId || !campaignName || !creditType || !totalCredits) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: campaignId, campaignName, creditType, totalCredits'
      });
    }

    const seasonalService = new SeasonalCreditService();

    // Validate credit type
    if (!seasonalService.constructor.SEASONAL_CREDIT_TYPES[creditType]) {
      return reply.code(400).send({
        success: false,
        error: `Invalid credit type: ${creditType}`
      });
    }

    // Get target tenants
    let targetTenants = [];
    if (tenantIds && tenantIds.length > 0) {
      // Specific tenants
      console.log('🎄 Getting specific tenants:', tenantIds);
      targetTenants = await db
        .select({ tenantId: tenants.tenantId, name: tenants.companyName })
        .from(tenants)
        .where(and(
          inArray(tenants.tenantId, tenantIds),
          eq(tenants.isActive, true)
        ));
    } else {
      // All active tenants
      console.log('🎄 Getting all active tenants');
      targetTenants = await db
        .select({ tenantId: tenants.tenantId, name: tenants.companyName })
        .from(tenants)
        .where(eq(tenants.isActive, true));
    }

    console.log(`🎄 Found ${targetTenants.length} target tenants:`, targetTenants.map(t => t.name));

    if (targetTenants.length === 0) {
      return reply.code(400).send({
        success: false,
        error: 'No valid tenants found for credit allocation'
      });
    }

    // Calculate credits per tenant
    const creditsPerTenant = totalCredits / targetTenants.length;

    console.log(`🎄 Launching campaign ${campaignName} for ${targetTenants.length} tenants with ${creditsPerTenant} credits each`);
    console.log(`🎄 Target applications:`, targetApplications || 'all applications');

    // Ensure targetApplications is properly set for allocation
    const allocationTargetApps = targetApplications && targetApplications.length > 0 ? targetApplications : null;

      // Allocate credits to each tenant
      const allocationPromises = targetTenants.map(async (tenant) => {
        try {
          // For each tenant, we need their organization entity ID
          // This is a simplified version - in production you'd have proper entity resolution
          const tenantEntityId = tenant.tenantId; // Assuming tenant ID is also entity ID for simplicity

          // Try to allocate seasonal credits, but handle case where database doesn't support them yet
          try {
            console.log(`🎄 Allocating ${creditsPerTenant} credits to ${tenant.name} (${tenant.tenantId})`);

            const allocation = await seasonalService.allocateSeasonalCredits({
              tenantId: tenant.tenantId,
              sourceEntityId: tenantEntityId,
              creditAmount: creditsPerTenant,
              creditType,
              campaignId,
              campaignName,
              expiresAt,
              metadata: {
                ...metadata,
                launchedBy: adminUserId,
                launchDate: new Date().toISOString()
              },
              allocatedBy: adminUserId,
              targetApplications: allocationTargetApps
            });

            console.log(`✅ Successfully allocated credits to ${tenant.name}:`, allocation?.length || 0, 'allocations');
            return { tenant: tenant.name, allocation, success: true };
          } catch (allocError) {
            console.warn(`Seasonal credit allocation failed for ${tenant.name}, falling back to regular credits:`, allocError.message);

            // Fallback: Try to allocate regular credits with campaign data
            console.log(`🔄 Falling back to regular credit allocation for ${tenant.name}`);
            const allocation = await seasonalService.allocateOperationalCredits({
              tenantId: tenant.tenantId,
              sourceEntityId: tenantEntityId,
              creditAmount: creditsPerTenant,
              creditType: creditType, // Keep original credit type
              allocationType: 'campaign',
              planId: campaignId,
              expiresAt,
              allocatedBy: adminUserId,
              // Try to store campaign data even in fallback
              additionalData: {
                campaignId,
                campaignName,
                creditMetadata: {
                  ...metadata,
                  launchedBy: adminUserId,
                  launchDate: new Date().toISOString(),
                  fallbackAllocation: true
                }
              }
            });

            console.log(`✅ Successfully allocated fallback credits to ${tenant.name}:`, allocation?.length || 0, 'allocations');

            // Create notification for fallback allocation too
            try {
              const { NotificationService } = await import('../../../services/notification-service.js');
              const notificationService = new NotificationService();

              await notificationService.createSeasonalCreditNotification(tenant.tenantId, {
                campaignId,
                campaignName,
                allocatedCredits: creditsPerTenant,
                creditType,
                expiresAt: expiresAt?.toISOString(),
                applications: allocationTargetApps
              });

              console.log('📧 Created fallback notification for tenant:', tenant.tenantId);
            } catch (notificationError) {
              console.warn('Failed to create fallback notification:', notificationError.message);
            }

            return { tenant: tenant.name, allocation, success: true, fallback: true };
          }

        } catch (error) {
          console.error(`Failed to allocate credits to tenant ${tenant.name}:`, error);
          return { tenant: tenant.name, error: error.message, success: false };
        }
      });

    const allocationResults = await Promise.allSettled(allocationPromises);

    const successful = allocationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = allocationResults.length - successful;

    // Send launch notifications if requested
    if (sendNotifications && successful > 0) {
      try {
        const notificationService = new SeasonalCreditNotificationService();
        await notificationService.sendCampaignLaunchNotifications(
          campaignId,
          campaignName,
          creditType,
          totalCredits,
          tenantIds
        );
      } catch (notificationError) {
        console.error('Failed to send campaign launch notifications:', notificationError);
        // Don't fail the whole operation for notification errors
      }
    }

    reply.send({
      success: true,
      data: {
        campaignId,
        campaignName,
        creditType,
        totalCredits,
        tenantsTargeted: targetTenants.length,
        creditsPerTenant,
        allocationsSuccessful: successful,
        allocationsFailed: failed,
        notificationsSent: sendNotifications
      }
    });

  } catch (error) {
    console.error('Error creating seasonal credit campaign:', error);
    reply.code(500).send({
      success: false,
      error: 'Failed to create seasonal credit campaign'
    });
  }
});

  /**
   * GET /admin/seasonal-credits/campaigns/:campaignId
   * Get detailed information about a specific campaign
   */
  fastify.get('/campaigns/:campaignId', async (request, reply) => {
  try {
    const { campaignId } = request.params;

    const seasonalService = new SeasonalCreditService();

    // Get campaign summary across all tenants (defensive against missing columns)
    let campaignSummary;
    try {
      campaignSummary = await db
        .select({
          campaignId: sql`${creditAllocations.campaignId}`,
          campaignName: sql`${creditAllocations.campaignName}`,
          creditType: creditAllocations.creditType,
          totalCredits: sql`SUM(${creditAllocations.allocatedCredits})`,
          usedCredits: sql`SUM(${creditAllocations.usedCredits})`,
          availableCredits: sql`SUM(${creditAllocations.availableCredits})`,
          tenantCount: sql`COUNT(DISTINCT ${creditAllocations.tenantId})`,
          expiresAt: sql`MIN(${creditAllocations.expiresAt})`,
          createdAt: sql`MIN(${creditAllocations.allocatedAt})`
        })
        .from(creditAllocations)
        .where(and(
          sql`${creditAllocations.campaignId} = ${campaignId}`,
          eq(creditAllocations.isActive, true)
        ))
        .groupBy(
          sql`${creditAllocations.campaignId}`,
          sql`${creditAllocations.campaignName}`,
          creditAllocations.creditType
        );
    } catch (dbError) {
      console.warn('Seasonal credit columns not available, returning empty campaign summary:', dbError.message);
      campaignSummary = [];
    }

    if (campaignSummary.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get per-tenant breakdown (defensive against missing columns)
    let tenantBreakdown = [];
    try {
      tenantBreakdown = await db
        .select({
          tenantId: creditAllocations.tenantId,
          tenantName: tenants.companyName,
          totalCredits: sql`SUM(${creditAllocations.allocatedCredits})`,
          usedCredits: sql`SUM(${creditAllocations.usedCredits})`,
          availableCredits: sql`SUM(${creditAllocations.availableCredits})`,
          applicationBreakdown: sql`ARRAY_AGG(DISTINCT ${creditAllocations.targetApplication})`,
          expiresAt: sql`MIN(${creditAllocations.expiresAt})`
        })
        .from(creditAllocations)
        .innerJoin(tenants, eq(creditAllocations.tenantId, tenants.tenantId))
        .where(sql`${creditAllocations.campaignId} = ${campaignId}`)
        .groupBy(
          creditAllocations.tenantId,
          tenants.companyName
        )
        .orderBy(tenants.companyName);
    } catch (dbError) {
      console.warn('Seasonal credit columns not available for tenant breakdown:', dbError.message);
    }

    reply.send({
      success: true,
      data: {
        campaign: campaignSummary[0],
        tenantBreakdown
      }
    });

  } catch (error) {
    console.error('Error getting campaign details:', error);
    reply.code(500).send({
      success: false,
      error: 'Failed to retrieve campaign details'
    });
  }
});

  /**
   * PUT /admin/seasonal-credits/campaigns/:campaignId/extend
   * Extend expiry date for a campaign
   */
  fastify.put('/campaigns/:campaignId/extend', async (request, reply) => {
  try {
    const { campaignId } = request.params;
    const { additionalDays = 30, tenantId } = request.body;

    if (!additionalDays || additionalDays <= 0) {
      return reply.code(400).send({
        success: false,
        error: 'additionalDays must be a positive number'
      });
    }

    const seasonalService = new SeasonalCreditService();
    const result = await seasonalService.extendSeasonalCreditExpiry(campaignId, tenantId, additionalDays);

    reply.send({
      success: true,
      data: {
        campaignId,
        additionalDays,
        allocationsExtended: result.rowCount
      }
    });

  } catch (error) {
    console.error('Error extending campaign expiry:', error);
    reply.code(500).send({
      success: false,
      error: 'Failed to extend campaign expiry'
    });
  }
});

  /**
   * POST /admin/seasonal-credits/send-warnings
   * Manually trigger expiry warning emails
   */
  fastify.post('/send-warnings', async (request, reply) => {
    try {
      const { daysAhead = 7 } = request.body;

      const notificationService = new SeasonalCreditNotificationService();
      const result = await notificationService.sendExpiryWarnings(daysAhead);

      reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error sending expiry warnings:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to send expiry warnings'
      });
    }
  });

  /**
   * GET /admin/seasonal-credits/expiring-soon
   * Get credits expiring soon across all tenants
   */
  fastify.get('/expiring-soon', async (request, reply) => {
    try {
      const daysAhead = parseInt(request.query.daysAhead) || 7;
      const now = new Date();
      const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

      // Try to get expiring credits, but handle case where seasonal columns don't exist
      let expiringCredits = [];
      try {
        const seasonalService = new SeasonalCreditService();

        // Filter individual rows before grouping, then aggregate
        const credits = await db
          .select({
            campaignId: sql`${creditAllocations.campaignId}`,
            campaignName: sql`${creditAllocations.campaignName}`,
            creditType: creditAllocations.creditType,
            tenantId: creditAllocations.tenantId,
            tenantName: tenants.companyName,
            totalCredits: sql`SUM(${creditAllocations.availableCredits})`,
            expiresAt: sql`MIN(${creditAllocations.expiresAt})`,
            daysUntilExpiry: sql`EXTRACT(EPOCH FROM (MIN(${creditAllocations.expiresAt}) - NOW())) / 86400`
          })
          .from(creditAllocations)
          .innerJoin(tenants, eq(creditAllocations.tenantId, tenants.tenantId))
          .where(and(
            eq(creditAllocations.isActive, true),
            inArray(creditAllocations.creditType, ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension']),
            gte(creditAllocations.expiresAt, now),
            lte(creditAllocations.expiresAt, futureDate)
          ))
          .groupBy(
            sql`${creditAllocations.campaignId}`,
            sql`${creditAllocations.campaignName}`,
            creditAllocations.creditType,
            creditAllocations.tenantId,
            tenants.companyName
          )
          .orderBy(sql`MIN(${creditAllocations.expiresAt})`)
          .limit(100); // Limit for performance

        expiringCredits = credits;
      } catch (dbError) {
        console.warn('Database query for expiring credits failed:', dbError.message);
        expiringCredits = [];
      }

      reply.send({
        success: true,
        data: expiringCredits
      });

    } catch (error) {
      console.error('Error getting expiring credits:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve expiring credits'
      });
    }
  });

  /**
   * GET /admin/seasonal-credits/types
   * Get available seasonal credit types and their configurations
   */
  fastify.get('/types', async (request, reply) => {
    try {
      const seasonalService = new SeasonalCreditService();

      reply.send({
        success: true,
        data: seasonalService.constructor.SEASONAL_CREDIT_TYPES
      });

    } catch (error) {
      console.error('Error getting credit types:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve credit types'
      });
    }
  });

  /**
   * POST /admin/seasonal-credits/process-expiries
   * Manually trigger expiry processing for seasonal credits
   */
  fastify.post('/process-expiries', async (request, reply) => {
    try {
      console.log('🔧 Admin triggered seasonal credit expiry processing');

      const seasonalService = new SeasonalCreditService();
      const result = await seasonalService.processSeasonalCreditExpiries();

      reply.send({
        success: true,
        message: 'Seasonal credit expiry processing completed',
        data: result
      });

    } catch (error) {
      console.error('Error processing seasonal credit expiries:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to process seasonal credit expiries',
        message: error.message
      });
    }
  });

  /**
   * GET /admin/seasonal-credits/all-expiring
   * Get all expiring credits (seasonal, free, subscription) across all tenants
   */
  fastify.get('/all-expiring', async (request, reply) => {
    try {
      const { daysAhead = 30, creditType } = request.query;
      const now = new Date();
      const futureDate = new Date(now.getTime() + (parseInt(daysAhead) * 24 * 60 * 60 * 1000));

      let whereConditions = [
        eq(creditAllocations.isActive, true),
        sql`${creditAllocations.expiresAt} IS NOT NULL`,
        sql`${creditAllocations.expiresAt} > ${now}`,
        sql`${creditAllocations.expiresAt} <= ${futureDate}`
      ];

      if (creditType) {
        whereConditions.push(eq(creditAllocations.creditType, creditType));
      }

      const expiringCredits = await db
        .select({
          allocationId: creditAllocations.allocationId,
          tenantId: creditAllocations.tenantId,
          tenantName: tenants.companyName,
          sourceEntityId: creditAllocations.sourceEntityId,
          targetApplication: creditAllocations.targetApplication,
          creditType: creditAllocations.creditType,
          campaignId: creditAllocations.campaignId,
          campaignName: creditAllocations.campaignName,
          allocatedCredits: creditAllocations.allocatedCredits,
          usedCredits: creditAllocations.usedCredits,
          availableCredits: creditAllocations.availableCredits,
          allocationPurpose: creditAllocations.allocationPurpose,
          expiresAt: creditAllocations.expiresAt,
          daysUntilExpiry: sql`EXTRACT(EPOCH FROM (${creditAllocations.expiresAt} - ${now})) / 86400`
        })
        .from(creditAllocations)
        .innerJoin(tenants, eq(creditAllocations.tenantId, tenants.tenantId))
        .where(and(...whereConditions))
        .orderBy(creditAllocations.expiresAt)
        .limit(500);

      // Group by credit type for summary
      const summary = {};
      expiringCredits.forEach(credit => {
        const type = credit.creditType || 'unknown';
        if (!summary[type]) {
          summary[type] = {
            count: 0,
            totalCredits: 0,
            totalAvailable: 0
          };
        }
        summary[type].count++;
        summary[type].totalCredits += parseFloat(credit.allocatedCredits || '0');
        summary[type].totalAvailable += parseFloat(credit.availableCredits || '0');
      });

      reply.send({
        success: true,
        data: {
          expiringCredits: expiringCredits.map(credit => ({
            ...credit,
            allocatedCredits: parseFloat(credit.allocatedCredits),
            usedCredits: parseFloat(credit.usedCredits),
            availableCredits: parseFloat(credit.availableCredits),
            daysUntilExpiry: Math.floor(parseFloat(credit.daysUntilExpiry))
          })),
          summary,
          totalCount: expiringCredits.length,
          daysAhead: parseInt(daysAhead)
        }
      });

    } catch (error) {
      console.error('Error getting all expiring credits:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve expiring credits',
        message: error.message
      });
    }
  });

}
