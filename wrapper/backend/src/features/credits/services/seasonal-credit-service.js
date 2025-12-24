import { db } from '../../../db/index.js';
import { eq, and, sql, gte, desc, sum, inArray, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// REMOVED: CreditAllocationService - Application-specific allocations removed
// REMOVED: creditAllocations, creditAllocationTransactions - Tables removed

/**
 * ⚠️ DEPRECATED: SeasonalCreditService
 * 
 * This service was built on top of the credit allocation system which has been removed.
 * Applications now manage their own credit consumption.
 * 
 * This service needs to be refactored to use CreditService instead.
 * For now, methods will throw errors indicating they need refactoring.
 */
class SeasonalCreditService {

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
      // REMOVED: SUPPORTED_APPLICATIONS from CreditAllocationService
      // Applications should be specified explicitly now
      const applications = targetApplications || [];
      
      if (applications.length === 0) {
        throw new Error('targetApplications must be provided. Applications now manage their own credits.');
      }

      // Calculate credits per application (distribute evenly)
      const creditsPerApp = creditAmount / applications.length;

      const allocations = [];

      // Allocate to each target application
      for (const app of applications) {
        try {
          // REMOVED: allocateCreditsToApplication - Use CreditService instead
          // TODO: Refactor to use CreditService.addCreditsToEntity()
          throw new Error('allocateCreditsToApplication method removed. Use CreditService.addCreditsToEntity() instead.');
          
          // Example refactored code:
          // const { CreditService } = await import('./credit-service.js');
          // await CreditService.addCreditsToEntity({
          //   tenantId,
          //   entityType: 'organization',
          //   entityId: sourceEntityId,
          //   creditAmount: creditsPerApp,
          //   source: 'seasonal_campaign',
          //   sourceId: campaignId,
          //   description: campaignName ? `${creditConfig.name}: ${campaignName}` : creditConfig.name,
          //   initiatedBy: allocatedBy
          // });

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
      // REMOVED: Fallback to CreditAllocationService
      // Use CreditService instead
      throw new Error(`Seasonal credit allocation failed: ${error.message}. This service needs refactoring to use CreditService.`);
    }
  }

  /**
   * Get seasonal credit summary for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} campaignId - Optional campaign filter
   */
  async getSeasonalCreditSummary(tenantId, campaignId = null) {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with metadata filtering
    throw new Error('getSeasonalCreditSummary method needs refactoring. creditAllocations table has been removed.');
  }

  /**
   * Process seasonal credit expiries with enhanced logic
   */
  async processSeasonalCreditExpiries() {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with expiry metadata
    throw new Error('processSeasonalCreditExpiries method needs refactoring. creditAllocations table has been removed.');
  }

  /**
   * Get credits expiring soon (for warning notifications)
   * @param {string} tenantId - Tenant ID
   * @param {number} daysAhead - Days to look ahead (default: 7)
   */
  async getExpiringSeasonalCredits(tenantId, daysAhead = 7) {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with expiry metadata
    throw new Error('getExpiringSeasonalCredits method needs refactoring. creditAllocations table has been removed.');
  }

  /**
   * Extend expiry for seasonal credits (for special cases)
   * @param {string} campaignId - Campaign ID to extend
   * @param {string} tenantId - Tenant ID (optional, for specific tenant)
   * @param {number} additionalDays - Days to add to expiry
   */
  async extendSeasonalCreditExpiry(campaignId, tenantId = null, additionalDays = 30) {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with expiry metadata
    throw new Error('extendSeasonalCreditExpiry method needs refactoring. creditAllocations table has been removed.');
  }

  /**
   * Get active seasonal campaigns for a tenant
   * @param {string} tenantId - Tenant ID
   */
  async getActiveSeasonalCampaigns(tenantId) {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with campaign metadata
    throw new Error('getActiveSeasonalCampaigns method needs refactoring. creditAllocations table has been removed.');
  }
}

export { SeasonalCreditService };
export default SeasonalCreditService;

