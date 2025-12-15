import { db } from '../../../db/index.js';
import { eq, and, sql, gte, desc, sum, inArray, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CreditAllocationService } from './credit-allocation-service.js';
import { creditAllocations, creditAllocationTransactions } from '../../../db/schema/index.js';

class SeasonalCreditService extends CreditAllocationService {

  // Seasonal credit types with their default configurations
  static SEASONAL_CREDIT_TYPES = {
    seasonal: {
      name: 'Seasonal Credits',
      defaultExpiryDays: 30,
      expiryRule: 'fixed_date',
      warningDays: 7,
      description: 'Holiday and seasonal promotional credits'
    },
    bonus: {
      name: 'Bonus Credits',
      defaultExpiryDays: 90,
      expiryRule: 'fixed_date',
      warningDays: 14,
      description: 'Loyalty and referral bonus credits'
    },
    promotional: {
      name: 'Promotional Credits',
      defaultExpiryDays: 14,
      expiryRule: 'fixed_date',
      warningDays: 3,
      description: 'Marketing campaign credits'
    },
    event: {
      name: 'Event Credits',
      defaultExpiryDays: 7,
      expiryRule: 'fixed_date',
      warningDays: 2,
      description: 'Special event and product launch credits'
    },
    partnership: {
      name: 'Partnership Credits',
      defaultExpiryDays: 60,
      expiryRule: 'fixed_date',
      warningDays: 10,
      description: 'Partner program and affiliate credits'
    },
    trial_extension: {
      name: 'Trial Extension Credits',
      defaultExpiryDays: 30,
      expiryRule: 'fixed_date',
      warningDays: 7,
      description: 'Extended trial period credits'
    }
  };

  /**
   * Allocate seasonal credits to tenants
   * @param {Object} params - Allocation parameters
   * @param {string} params.tenantId - Tenant ID
   * @param {string} params.sourceEntityId - Source entity (organization)
   * @param {number} params.creditAmount - Amount of credits to allocate
   * @param {string} params.creditType - Type of seasonal credits (seasonal, bonus, promotional, etc.)
   * @param {string} params.campaignId - Campaign identifier
   * @param {string} params.campaignName - Campaign display name
   * @param {Date} params.expiresAt - Explicit expiry date (optional)
   * @param {Object} params.metadata - Additional campaign metadata
   * @param {string} params.allocatedBy - User who allocated the credits
   * @param {Array} params.targetApplications - Applications to allocate credits to (optional)
   */
  async allocateSeasonalCredits({
    tenantId,
    sourceEntityId,
    creditAmount,
    creditType = 'seasonal',
    campaignId,
    campaignName,
    expiresAt = null,
    metadata = {},
    allocatedBy,
    targetApplications = null // If null, allocate to all supported applications
  }) {
    try {
      console.log('🎄 Allocating seasonal credits:', {
        tenantId,
        creditAmount,
        creditType,
        campaignId,
        campaignName
      });

      // If credit type is not seasonal, fall back to regular credit allocation
      if (!this.constructor.SEASONAL_CREDIT_TYPES[creditType]) {
        console.warn(`Credit type ${creditType} not supported, falling back to free credits`);
        creditType = 'free';
      }

      const creditConfig = this.constructor.SEASONAL_CREDIT_TYPES[creditType] || {
        name: 'Credits',
        defaultExpiryDays: 30,
        expiryRule: 'fixed_date',
        warningDays: 7
      };

      // Determine expiry date
      let finalExpiresAt;
      if (expiresAt) {
        // If expiresAt is provided, ensure it's a Date object
        finalExpiresAt = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
      } else {
        // Use default expiry
        finalExpiresAt = new Date(Date.now() + (creditConfig.defaultExpiryDays * 24 * 60 * 60 * 1000));
      }

      // Prepare metadata
      const fullMetadata = {
        ...metadata,
        allocatedAt: new Date().toISOString(),
        creditConfig: creditConfig,
        campaignType: creditType
      };

      // Determine target applications
      const applications = targetApplications || this.constructor.SUPPORTED_APPLICATIONS;

      // Calculate credits per application (distribute evenly)
      const creditsPerApp = creditAmount / applications.length;

      const allocations = [];

      // Allocate to each target application
      for (const app of applications) {
        try {
          const allocation = await this.allocateCreditsToApplication({
            tenantId,
            sourceEntityId,
            targetApplication: app,
            creditAmount: creditsPerApp,
            allocationPurpose: campaignName ? `${creditConfig.name}: ${campaignName}` : creditConfig.name,
            expiresAt: finalExpiresAt,
            allocatedBy,
            allocationType: 'campaign',
            creditType: creditType,
            additionalData: campaignId ? {
              campaignId,
              campaignName,
              creditMetadata: fullMetadata,
              expiryRule: creditConfig.expiryRule,
              expiryWarningDays: creditConfig.warningDays
            } : undefined
          });

          allocations.push(allocation);
        } catch (appError) {
          console.warn(`Failed to allocate to ${app}, continuing with other apps:`, appError.message);
          // Continue with other applications even if one fails
        }
      }

      console.log(`✅ Allocated ${creditAmount} ${creditType} credits across ${applications.length} applications`);

      // Create notification for the tenant
      try {
        const { NotificationService } = await import('./notification-service.js');
        const notificationService = new NotificationService();

        await notificationService.createSeasonalCreditNotification(tenantId, {
          campaignId,
          campaignName: campaignName || creditConfig.name,
          allocatedCredits: creditAmount,
          creditType,
          expiresAt: finalExpiresAt.toISOString(),
          applications
        });

        console.log('📧 Created seasonal credit notification for tenant:', tenantId);
      } catch (notificationError) {
        console.warn('Failed to create seasonal credit notification:', notificationError.message);
        // Don't fail the allocation if notification creation fails
      }

      return allocations;

    } catch (error) {
      console.error('Error allocating seasonal credits:', error);
      // Fallback to regular credit allocation service
      console.log('🔄 Falling back to regular credit allocation');
      const { CreditAllocationService } = await import('./credit-allocation-service.js');
      const creditAllocationService = new CreditAllocationService();

      const fallbackExpiresAt = expiresAt || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days fallback

      return await creditAllocationService.allocateOperationalCredits({
        tenantId,
        sourceEntityId,
        creditAmount,
        creditType: 'free', // Fallback to free credits
        allocationType: 'subscription',
        planId: 'fallback',
        expiresAt: fallbackExpiresAt,
        allocatedBy
      });
    }
  }

  /**
   * Get seasonal credit summary for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} campaignId - Optional campaign filter
   */
  async getSeasonalCreditSummary(tenantId, campaignId = null) {
    try {
      let query = db
        .select({
          creditType: creditAllocations.creditType,
          campaignId: creditAllocations.campaignId,
          campaignName: creditAllocations.campaignName,
          targetApplication: creditAllocations.targetApplication,
          totalAllocated: sum(creditAllocations.allocatedCredits),
          totalUsed: sum(creditAllocations.usedCredits),
          totalAvailable: sum(creditAllocations.availableCredits),
          earliestExpiry: sql`MIN(${creditAllocations.expiresAt})`,
          latestExpiry: sql`MAX(${creditAllocations.expiresAt})`,
          allocationCount: sql`COUNT(*)`
        })
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.isActive, true),
          inArray(creditAllocations.creditType, Object.keys(this.constructor.SEASONAL_CREDIT_TYPES))
        ))
        .groupBy(
          creditAllocations.creditType,
          creditAllocations.campaignId,
          creditAllocations.campaignName,
          creditAllocations.targetApplication
        );

      if (campaignId) {
        query = query.where(eq(creditAllocations.campaignId, campaignId));
      }

      const summary = await query;

      return summary;
    } catch (error) {
      console.error('Error getting seasonal credit summary:', error);
      throw error;
    }
  }

  /**
   * Process seasonal credit expiries with enhanced logic
   */
  async processSeasonalCreditExpiries() {
    try {
      console.log('🎄 Processing seasonal credit expiries...');

      const now = new Date();

      // Find expired seasonal credits
      const expiredSeasonalCredits = await db
        .select()
        .from(creditAllocations)
        .where(and(
          inArray(creditAllocations.creditType, Object.keys(this.constructor.SEASONAL_CREDIT_TYPES)),
          eq(creditAllocations.isActive, true),
          sql`${creditAllocations.expiresAt} <= ${now}`
        ));

      console.log(`📅 Found ${expiredSeasonalCredits.length} expired seasonal credit allocations`);

      // Group by campaign for reporting
      const expiredByCampaign = {};
      const expiredByType = {};

      // Expire each allocation
      for (const allocation of expiredSeasonalCredits) {
        try {
          console.log(`⏰ Expiring ${allocation.creditType} credits allocation ${allocation.allocationId} (${allocation.allocatedCredits} credits)`);

          // Track for reporting
          const campaignKey = allocation.campaignId || 'uncategorized';
          expiredByCampaign[campaignKey] = (expiredByCampaign[campaignKey] || 0) + parseFloat(allocation.allocatedCredits);
          expiredByType[allocation.creditType] = (expiredByType[allocation.creditType] || 0) + parseFloat(allocation.allocatedCredits);

          // Mark allocation as inactive
          await db
            .update(creditAllocations)
            .set({
              isActive: false,
              lastUpdatedAt: new Date()
            })
            .where(eq(creditAllocations.allocationId, allocation.allocationId));

          // Record expiry transaction
          await db.insert(creditAllocationTransactions).values({
            allocationId: allocation.allocationId,
            tenantId: allocation.tenantId,
            transactionType: 'expiry',
            amount: parseFloat(allocation.usedCredits),
            previousAllocated: parseFloat(allocation.allocatedCredits),
            newAllocated: 0,
            previousUsed: parseFloat(allocation.usedCredits),
            newUsed: parseFloat(allocation.usedCredits),
            description: `Seasonal credits expired: ${allocation.allocationPurpose} (${allocation.campaignName || 'No campaign'})`,
            createdAt: new Date()
          });

          console.log(`✅ Expired ${allocation.creditType} credits allocation ${allocation.allocationId}`);
        } catch (allocationError) {
          console.error(`❌ Failed to expire seasonal allocation ${allocation.allocationId}:`, allocationError.message);
        }
      }

      // Log summary
      console.log('📊 Seasonal credit expiry summary:');
      Object.entries(expiredByType).forEach(([type, amount]) => {
        console.log(`  - ${type}: ${amount} credits expired`);
      });

      console.log('✅ Seasonal credit expiry processing completed');

      return {
        totalExpired: expiredSeasonalCredits.length,
        expiredByType,
        expiredByCampaign
      };

    } catch (error) {
      console.error('Error processing seasonal credit expiries:', error);
      throw error;
    }
  }

  /**
   * Get credits expiring soon (for warning notifications)
   * @param {string} tenantId - Tenant ID
   * @param {number} daysAhead - Days to look ahead (default: 7)
   */
  async getExpiringSeasonalCredits(tenantId, daysAhead = 7) {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

      const expiringCredits = await db
        .select({
          allocationId: creditAllocations.allocationId,
          creditType: creditAllocations.creditType,
          campaignId: creditAllocations.campaignId,
          campaignName: creditAllocations.campaignName,
          targetApplication: creditAllocations.targetApplication,
          availableCredits: creditAllocations.availableCredits,
          expiresAt: creditAllocations.expiresAt,
          expiryWarningDays: creditAllocations.expiryWarningDays,
          daysUntilExpiry: sql`EXTRACT(EPOCH FROM (${creditAllocations.expiresAt} - ${now})) / 86400`
        })
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.isActive, true),
          inArray(creditAllocations.creditType, Object.keys(this.constructor.SEASONAL_CREDIT_TYPES)),
          gte(creditAllocations.expiresAt, now),
          lt(creditAllocations.expiresAt, futureDate)
        ))
        .orderBy(creditAllocations.expiresAt);

      return expiringCredits;
    } catch (error) {
      console.error('Error getting expiring seasonal credits:', error);
      throw error;
    }
  }

  /**
   * Extend expiry for seasonal credits (for special cases)
   * @param {string} campaignId - Campaign ID to extend
   * @param {string} tenantId - Tenant ID (optional, for specific tenant)
   * @param {number} additionalDays - Days to add to expiry
   */
  async extendSeasonalCreditExpiry(campaignId, tenantId = null, additionalDays = 30) {
    try {
      console.log(`🔄 Extending expiry for campaign ${campaignId} by ${additionalDays} days`);

      const extensionDate = new Date(Date.now() + (additionalDays * 24 * 60 * 60 * 1000));

      let query = db
        .update(creditAllocations)
        .set({
          expiresAt: extensionDate,
          lastUpdatedAt: new Date()
        })
        .where(and(
          eq(creditAllocations.campaignId, campaignId),
          eq(creditAllocations.isActive, true),
          inArray(creditAllocations.creditType, Object.keys(this.constructor.SEASONAL_CREDIT_TYPES))
        ));

      if (tenantId) {
        query = query.where(eq(creditAllocations.tenantId, tenantId));
      }

      const result = await query;

      console.log(`✅ Extended expiry for ${result.rowCount} seasonal credit allocations`);
      return result;
    } catch (error) {
      console.error('Error extending seasonal credit expiry:', error);
      throw error;
    }
  }

  /**
   * Get active seasonal campaigns for a tenant
   * @param {string} tenantId - Tenant ID
   */
  async getActiveSeasonalCampaigns(tenantId) {
    try {
      const campaigns = await db
        .select({
          campaignId: creditAllocations.campaignId,
          campaignName: creditAllocations.campaignName,
          creditType: creditAllocations.creditType,
          totalCredits: sum(creditAllocations.allocatedCredits),
          usedCredits: sum(creditAllocations.usedCredits),
          availableCredits: sum(creditAllocations.availableCredits),
          expiresAt: sql`MIN(${creditAllocations.expiresAt})`,
          applications: sql`ARRAY_AGG(DISTINCT ${creditAllocations.targetApplication})`
        })
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.isActive, true),
          inArray(creditAllocations.creditType, Object.keys(this.constructor.SEASONAL_CREDIT_TYPES)),
          sql`${creditAllocations.campaignId} IS NOT NULL`
        ))
        .groupBy(
          creditAllocations.campaignId,
          creditAllocations.campaignName,
          creditAllocations.creditType
        )
        .orderBy(desc(sql`MIN(${creditAllocations.expiresAt})`));

      return campaigns;
    } catch (error) {
      console.error('Error getting active seasonal campaigns:', error);
      throw error;
    }
  }
}

export { SeasonalCreditService };
export default SeasonalCreditService;

