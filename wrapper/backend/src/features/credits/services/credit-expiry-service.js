import { db, systemDbConnection } from '../../../db/index.js';
import { credits, creditTransactions } from '../../../db/schema/index.js';
import { eq, and, lte, isNotNull, gte, isNull } from 'drizzle-orm';
import { seasonalCreditAllocations } from '../../../db/schema/seasonal-credits.js';
import { randomUUID } from 'crypto';

/**
 * Credit Expiry Service
 * Handles credit expiry processing, notifications, and cleanup
 */
export class CreditExpiryService {
  /**
   * Process expired credits for all tenants
   * This method should be called periodically (e.g., via cron job)
   * Handles both primary org and application-specific allocations
   */
  static async processExpiredCredits() {
    const now = new Date();
    console.log(`🕐 [CreditExpiryService] Processing expired credits at ${now.toISOString()}`);

    try {
      // Find all expired seasonal credit allocations that are still active
      const expiredAllocations = await db
        .select()
        .from(seasonalCreditAllocations)
        .where(and(
          eq(seasonalCreditAllocations.isActive, true),
          eq(seasonalCreditAllocations.isExpired, false),
          isNotNull(seasonalCreditAllocations.expiresAt),
          lte(seasonalCreditAllocations.expiresAt, now)
        ));

      console.log(`📋 [CreditExpiryService] Found ${expiredAllocations.length} expired allocations`);

      let processedCount = 0;
      let errorCount = 0;
      const applicationExpiryMap = {}; // Track expiry by application

      for (const allocation of expiredAllocations) {
        try {
          const result = await this.processExpiredAllocation(allocation);
          processedCount++;
          
          // Track application-specific expiry
          if (allocation.targetApplication) {
            if (!applicationExpiryMap[allocation.targetApplication]) {
              applicationExpiryMap[allocation.targetApplication] = {
                count: 0,
                totalUnusedCredits: 0
              };
            }
            applicationExpiryMap[allocation.targetApplication].count++;
            applicationExpiryMap[allocation.targetApplication].totalUnusedCredits += result.unusedCredits || 0;
          }
        } catch (error) {
          console.error(`❌ [CreditExpiryService] Error processing allocation ${allocation.allocationId}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ [CreditExpiryService] Processed ${processedCount} expired allocations, ${errorCount} errors`);
      if (Object.keys(applicationExpiryMap).length > 0) {
        console.log(`📊 [CreditExpiryService] Application-specific expiry summary:`, applicationExpiryMap);
      }

      return {
        success: true,
        processedCount,
        errorCount,
        totalExpired: expiredAllocations.length,
        applicationExpiryMap,
        timestamp: now.toISOString()
      };
    } catch (error) {
      console.error('❌ [CreditExpiryService] Error processing expired credits:', error);
      throw error;
    }
  }

  /**
   * Process a single expired allocation
   * @param {Object} allocation - The expired credit allocation
   */
  static async processExpiredAllocation(allocation) {
    const { allocationId, tenantId, entityId, allocatedCredits, usedCredits, expiresAt, targetApplication } = allocation;

    const allocationType = targetApplication ? `application-specific (${targetApplication})` : 'primary org';
    console.log(`🔄 [CreditExpiryService] Processing expired ${allocationType} allocation ${allocationId}`);

    // Calculate unused credits
    const allocated = parseFloat(allocatedCredits || 0);
    const used = parseFloat(usedCredits || 0);
    const unusedCredits = allocated - used;

    // Mark allocation as expired
    await db
      .update(seasonalCreditAllocations)
      .set({
        isExpired: true,
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(seasonalCreditAllocations.allocationId, allocationId));

    console.log(`✅ [CreditExpiryService] Marked ${allocationType} allocation ${allocationId} as expired`);

    // If there are unused credits, deduct them from the organization's credit balance
    // Note: For application-specific allocations, we still deduct from org balance
    // but track which application the credits were allocated to
    if (unusedCredits > 0) {
      await this.deductExpiredCredits(tenantId, entityId, unusedCredits, allocationId, targetApplication);
    }

    // TODO: Send notification to organization admins about expired credits
    // Include targetApplication in notification if applicable
    // await this.sendExpiryNotification(tenantId, entityId, unusedCredits, expiresAt, targetApplication);

    return {
      allocationId,
      unusedCredits,
      deducted: unusedCredits > 0,
      targetApplication: targetApplication || 'primary_org'
    };
  }

  /**
   * Deduct expired unused credits from organization balance
   * @param {string} tenantId - Tenant ID
   * @param {string} entityId - Entity ID (organization)
   * @param {number} expiredCredits - Amount of expired credits to deduct
   * @param {string} allocationId - Allocation ID for tracking
   * @param {string} targetApplication - Target application (null for primary org allocation)
   */
  static async deductExpiredCredits(tenantId, entityId, expiredCredits, allocationId, targetApplication = null) {
    try {
      // Find the credit record for this entity
      const [creditRecord] = await systemDbConnection
        .select()
        .from(credits)
        .where(and(
          eq(credits.tenantId, tenantId),
          eq(credits.entityId, entityId)
        ))
        .limit(1);

      if (!creditRecord) {
        console.warn(`⚠️ [CreditExpiryService] No credit record found for tenant ${tenantId}, entity ${entityId}`);
        return;
      }

      const currentBalance = parseFloat(creditRecord.availableCredits || 0);
      const newBalance = Math.max(0, currentBalance - expiredCredits);

      // Update credit balance
      await systemDbConnection
        .update(credits)
        .set({
          availableCredits: newBalance.toString(),
          lastUpdatedAt: new Date()
        })
        .where(eq(credits.creditId, creditRecord.creditId));

      // Create transaction record for audit trail
      // Include targetApplication in operation code for tracking
      const operationCode = targetApplication 
        ? `credit_expiry:${targetApplication}:${allocationId}`
        : `credit_expiry:primary_org:${allocationId}`;

      await systemDbConnection
        .insert(creditTransactions)
        .values({
          transactionId: crypto.randomUUID(),
          tenantId: tenantId,
          entityId: entityId,
          transactionType: 'expiry',
          amount: (-expiredCredits).toString(),
          previousBalance: currentBalance.toString(),
          newBalance: newBalance.toString(),
          operationCode: operationCode,
          createdAt: new Date()
        });

      const allocationType = targetApplication ? `application-specific (${targetApplication})` : 'primary org';
      console.log(`✅ [CreditExpiryService] Deducted ${expiredCredits} expired ${allocationType} credits from entity ${entityId}`);
    } catch (error) {
      console.error(`❌ [CreditExpiryService] Error deducting expired credits:`, error);
      throw error;
    }
  }

  /**
   * Get credits expiring soon (within specified days)
   * @param {number} daysAhead - Number of days to look ahead (default: 7)
   * @param {string} tenantId - Optional tenant ID to filter by
   * @param {string} entityId - Optional entity ID to filter by
   * @param {string} targetApplication - Optional application code to filter by (null for primary org)
   */
  static async getExpiringCredits(daysAhead = 7, tenantId = null, entityId = null, targetApplication = null) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const now = new Date();

    const conditions = [
      eq(seasonalCreditAllocations.isActive, true),
      eq(seasonalCreditAllocations.isExpired, false),
      isNotNull(seasonalCreditAllocations.expiresAt),
      gte(seasonalCreditAllocations.expiresAt, now),
      lte(seasonalCreditAllocations.expiresAt, futureDate)
    ];

    if (tenantId) {
      conditions.push(eq(seasonalCreditAllocations.tenantId, tenantId));
    }

    if (entityId) {
      conditions.push(eq(seasonalCreditAllocations.entityId, entityId));
    }

    // Filter by target application if specified
    if (targetApplication !== undefined) {
      if (targetApplication === null) {
        // Filter for primary org allocations (targetApplication IS NULL)
        conditions.push(isNull(seasonalCreditAllocations.targetApplication));
      } else {
        // Filter for specific application
        conditions.push(eq(seasonalCreditAllocations.targetApplication, targetApplication));
      }
    }

    const expiringAllocations = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(and(...conditions))
      .orderBy(seasonalCreditAllocations.expiresAt);

    return expiringAllocations.map(allocation => {
      const expiryDate = new Date(allocation.expiresAt);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const unusedCredits = parseFloat(allocation.allocatedCredits || 0) - parseFloat(allocation.usedCredits || 0);
      const allocationType = allocation.targetApplication ? `application-specific (${allocation.targetApplication})` : 'primary org';

      return {
        ...allocation,
        daysUntilExpiry,
        unusedCredits,
        expiresAt: expiryDate.toISOString(),
        allocationType
      };
    });
  }

  /**
   * Send expiry warnings to organization admins
   * TODO: Implement notification system
   */
  static async sendExpiryWarnings(daysAhead = 7) {
    const expiringCredits = await this.getExpiringCredits(daysAhead);

    console.log(`📧 [CreditExpiryService] Sending expiry warnings for ${expiringCredits.length} allocations`);

    // Group by tenant and entity
    const grouped = expiringCredits.reduce((acc, allocation) => {
      const key = `${allocation.tenantId}:${allocation.entityId}`;
      if (!acc[key]) {
        acc[key] = {
          tenantId: allocation.tenantId,
          entityId: allocation.entityId,
          allocations: []
        };
      }
      acc[key].allocations.push(allocation);
      return acc;
    }, {});

    // TODO: Send notifications to organization admins
    // For each group, send a notification with:
    // - Total credits expiring
    // - Expiry date
    // - Days remaining
    // - Link to purchase more credits

    return {
      warningsSent: Object.keys(grouped).length,
      totalAllocations: expiringCredits.length
    };
  }

  /**
   * Get expiry statistics for a tenant/entity
   * @param {string} tenantId - Tenant ID
   * @param {string} entityId - Entity ID (organization)
   */
  static async getExpiryStats(tenantId, entityId) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get expiring within 7 days
    const expiringSoon = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(and(
        eq(seasonalCreditAllocations.tenantId, tenantId),
        eq(seasonalCreditAllocations.entityId, entityId),
        eq(seasonalCreditAllocations.isActive, true),
        eq(seasonalCreditAllocations.isExpired, false),
        isNotNull(seasonalCreditAllocations.expiresAt),
        gte(seasonalCreditAllocations.expiresAt, now),
        lte(seasonalCreditAllocations.expiresAt, sevenDaysFromNow)
      ));

    // Get expiring within 30 days
    const expiringWithin30Days = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(and(
        eq(seasonalCreditAllocations.tenantId, tenantId),
        eq(seasonalCreditAllocations.entityId, entityId),
        eq(seasonalCreditAllocations.isActive, true),
        eq(seasonalCreditAllocations.isExpired, false),
        isNotNull(seasonalCreditAllocations.expiresAt),
        gte(seasonalCreditAllocations.expiresAt, now),
        lte(seasonalCreditAllocations.expiresAt, thirtyDaysFromNow)
      ));

    // Calculate total unused credits that will expire
    const calculateUnusedCredits = (allocations) => {
      return allocations.reduce((total, allocation) => {
        const allocated = parseFloat(allocation.allocatedCredits || 0);
        const used = parseFloat(allocation.usedCredits || 0);
        return total + (allocated - used);
      }, 0);
    };

    return {
      expiringSoon: {
        count: expiringSoon.length,
        unusedCredits: calculateUnusedCredits(expiringSoon)
      },
      expiringWithin30Days: {
        count: expiringWithin30Days.length,
        unusedCredits: calculateUnusedCredits(expiringWithin30Days)
      }
    };
  }
}

