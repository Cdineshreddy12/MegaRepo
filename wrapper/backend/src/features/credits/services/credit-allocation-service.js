import { db } from '../../../db/index.js';
import { eq, and, sql, gte, desc, sum } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CreditService } from './credit-service.js';
import { creditAllocations, creditAllocationTransactions, entities, creditTransactions, credits } from '../../../db/schema/index.js';
import { crmSyncStreams } from '../../../utils/redis.js';
import { EventTrackingService } from '../../../services/event-tracking-service.js';

class CreditAllocationService {
  // Supported applications that can have credit allocations
  static SUPPORTED_APPLICATIONS = ['crm', 'hr', 'affiliate', 'system'];

  /**
   * Allocate credits from organization pool to a specific application
   */
  async allocateCreditsToApplication({
    tenantId,
    sourceEntityId,
    targetApplication,
    creditAmount,
    allocationPurpose = '',
    allocatedBy,
    expiresAt = null,
    autoReplenish = false
  }) {
    try {
      console.log('💰 Allocating credits to application:', {
        tenantId,
        sourceEntityId,
        targetApplication,
        creditAmount,
        allocatedBy
      });

      // Validate target application
      if (!this.constructor.SUPPORTED_APPLICATIONS.includes(targetApplication)) {
        throw new Error(`Unsupported application: ${targetApplication}`);
      }

      // Check if source entity has enough available credits
      const sourceBalance = await CreditService.getCurrentBalance(tenantId, 'organization', sourceEntityId);
      if (!sourceBalance || sourceBalance.availableCredits < creditAmount) {
        throw new Error(`Insufficient credits in source entity. Available: ${sourceBalance?.availableCredits || 0}, Required: ${creditAmount}`);
      }

      // Check if allocation already exists for this application
      const existingAllocation = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.sourceEntityId, sourceEntityId),
          eq(creditAllocations.targetApplication, targetApplication),
          eq(creditAllocations.isActive, true)
        ))
        .limit(1);

      const allocationId = existingAllocation.length > 0 ? existingAllocation[0].allocationId : uuidv4();

      // Start transaction
      const result = await db.transaction(async (tx) => {
        let allocationRecord;

        if (existingAllocation.length > 0) {
          // Update existing allocation
          const currentAllocation = existingAllocation[0];
          const newAllocatedCredits = parseFloat(currentAllocation.allocatedCredits) + creditAmount;

          [allocationRecord] = await tx
            .update(creditAllocations)
            .set({
              allocatedCredits: newAllocatedCredits.toString(),
              availableCredits: (newAllocatedCredits - parseFloat(currentAllocation.usedCredits)).toString(),
              updatedBy: allocatedBy,
              lastUpdatedAt: new Date()
            })
            .where(eq(creditAllocations.allocationId, allocationId))
            .returning();
        } else {
          // Create new allocation
          [allocationRecord] = await tx
            .insert(creditAllocations)
            .values({
              allocationId,
              tenantId,
              sourceEntityId,
              targetApplication,
              allocatedCredits: creditAmount.toString(),
              availableCredits: creditAmount.toString(),
              allocationPurpose,
              expiresAt,
              autoReplenish,
              allocatedBy
            })
            .returning();
        }

        // Deduct credits from entity's available balance
        // Get current entity credit balance
        const currentBalance = await CreditService.getCurrentBalance(tenantId, 'organization', sourceEntityId);
        if (!currentBalance) {
          throw new Error(`No credit balance found for entity ${sourceEntityId}`);
        }

        const newAvailableCredits = currentBalance.availableCredits - creditAmount;
        if (newAvailableCredits < 0) {
          throw new Error(`Insufficient credits. Available: ${currentBalance.availableCredits}, Required: ${creditAmount}`);
        }

        // Update entity's credit balance in credits table
        await tx
          .update(credits)
          .set({
            availableCredits: newAvailableCredits.toString(),
            lastUpdatedAt: new Date()
          })
          .where(and(
            eq(credits.tenantId, tenantId),
            eq(credits.entityId, sourceEntityId)
          ));

        // Create credit transaction record for the deduction
        await tx
          .insert(creditTransactions)
          .values({
            transactionId: uuidv4(),
            tenantId,
            entityId: sourceEntityId,
            transactionType: 'allocation',
            amount: (-creditAmount).toString(), // Negative for deduction
            previousBalance: currentBalance.availableCredits.toString(),
            newBalance: newAvailableCredits.toString(),
            initiatedBy: allocatedBy
          });

        // Create allocation transaction record
        await tx
          .insert(creditAllocationTransactions)
          .values({
            tenantId,
            allocationId,
            transactionType: 'allocation',
            amount: creditAmount.toString(),
            previousAllocated: existingAllocation.length > 0 ? existingAllocation[0].allocatedCredits : '0',
            newAllocated: allocationRecord.allocatedCredits,
            previousUsed: existingAllocation.length > 0 ? existingAllocation[0].usedCredits : '0',
            newUsed: allocationRecord.usedCredits,
            description: `Allocated ${creditAmount} credits to ${targetApplication}`,
            initiatedBy: allocatedBy
          });

        return allocationRecord;
      });

      console.log('✅ Credits allocated to application successfully:', {
        allocationId,
        targetApplication,
        allocatedCredits: result.allocatedCredits,
        availableCredits: result.availableCredits
      });

      // Publish credit application allocation event to Redis streams
      let publishedEventId = null;
      try {
        const publishResult = await crmSyncStreams.publishCreditAllocation(tenantId, sourceEntityId, creditAmount, {
          allocationId,
          reason: allocationPurpose || 'application_allocation',
          entityType: 'organization',
          targetApplication,
          allocatedBy,
          availableCredits: parseFloat(result.availableCredits)
        });

        // Track the published event
        if (publishResult) {
          publishedEventId = publishResult.eventId;
          await EventTrackingService.trackPublishedEvent({
            eventId: publishedEventId,
            eventType: 'credit.allocated',
            tenantId,
            entityId: sourceEntityId,
            streamKey: 'credit-events',
            sourceApplication: 'wrapper',
            targetApplication: targetApplication, // crm, hr, affiliate, system
            eventData: {
              allocationId,
              amount: creditAmount,
              targetApplication,
              allocatedBy,
              availableCredits: parseFloat(result.availableCredits)
            },
            publishedBy: allocatedBy,
            metadata: {
              operation: 'credit_allocation_to_application',
              allocationPurpose
            }
          });
        }
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit application allocation event:', streamError.message);
        // Still track the attempt even if publishing failed
        if (publishedEventId) {
          await EventTrackingService.markEventFailed(publishedEventId, streamError.message, false);
        }
      }

      return {
        success: true,
        allocationId,
        tenantId,
        sourceEntityId,
        targetApplication,
        allocatedCredits: parseFloat(result.allocatedCredits),
        availableCredits: parseFloat(result.availableCredits),
        allocationPurpose,
        expiresAt,
        autoReplenish
      };

    } catch (error) {
      console.error('❌ Error allocating credits to application:', error);
      throw error;
    }
  }

  /**
   * Consume credits from application allocation
   */
  async consumeApplicationCredits({
    tenantId,
    sourceEntityId, // The organization/entity that allocated the credits
    application,
    creditAmount,
    operationCode,
    operationId,
    description,
    initiatedBy
  }) {
    try {
      console.log('💰 Consuming application credits:', {
        tenantId,
        application,
        creditAmount,
        operationCode
      });

      // Find active allocation for this application and organization
      const [allocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          sourceEntityId ? eq(creditAllocations.sourceEntityId, sourceEntityId) : undefined,
          eq(creditAllocations.targetApplication, application),
          eq(creditAllocations.isActive, true),
          gte(creditAllocations.availableCredits, creditAmount.toString())
        ).filter(Boolean)) // Remove undefined conditions
        .limit(1);

      if (!allocation) {
        const entityInfo = sourceEntityId ? ` for organization ${sourceEntityId}` : '';
        return {
          success: false,
          message: `No active credit allocation found for application ${application}${entityInfo} with sufficient credits`,
          data: {
            application,
            sourceEntityId,
            requiredCredits: creditAmount,
            availableCredits: 0
          }
        };
      }

      // Start transaction to consume credits
      const result = await db.transaction(async (tx) => {
        const newUsedCredits = parseFloat(allocation.usedCredits) + creditAmount;
        const newAvailableCredits = parseFloat(allocation.allocatedCredits) - newUsedCredits;

        // Update allocation
        const [updatedAllocation] = await tx
          .update(creditAllocations)
          .set({
            usedCredits: newUsedCredits.toString(),
            availableCredits: newAvailableCredits.toString(),
            lastUpdatedAt: new Date()
          })
          .where(eq(creditAllocations.allocationId, allocation.allocationId))
          .returning();

        // Create consumption transaction record
        await tx
          .insert(creditAllocationTransactions)
          .values({
            tenantId,
            allocationId: allocation.allocationId,
            transactionType: 'consumption',
            amount: (-creditAmount).toString(),
            previousAllocated: allocation.allocatedCredits,
            newAllocated: allocation.allocatedCredits,
            previousUsed: allocation.usedCredits,
            newUsed: updatedAllocation.usedCredits,
            operationCode,
            description,
            initiatedBy
          });

        return updatedAllocation;
      });

      console.log('✅ Application credits consumed successfully:', {
        application,
        consumedCredits: creditAmount,
        remainingCredits: parseFloat(result.availableCredits)
      });

      // Publish credit consumption event to Redis streams
      let publishedEventId = null;
      try {
        const publishResult = await crmSyncStreams.publishCreditConsumption(
          tenantId,
          sourceEntityId || allocation.sourceEntityId,
          initiatedBy,
          creditAmount,
          operationCode,
          operationId,
          {
            resourceType: description ? 'operation' : 'application',
            resourceId: operationId || application,
            remainingCredits: parseFloat(result.availableCredits),
            allocationId: allocation.allocationId
          }
        );

        // Track the published event
        if (publishResult) {
          publishedEventId = publishResult.eventId;
          await EventTrackingService.trackPublishedEvent({
            eventId: publishedEventId,
            eventType: 'credit.consumed',
            tenantId,
            entityId: sourceEntityId || allocation.sourceEntityId,
            streamKey: 'credit-events',
            sourceApplication: 'wrapper',
            targetApplication: application, // crm, hr, affiliate, system
            eventData: {
              amount: creditAmount,
              operationCode,
              operationId,
              application,
              remainingCredits: parseFloat(result.availableCredits),
              allocationId: allocation.allocationId
            },
            publishedBy: initiatedBy,
            metadata: {
              operation: 'credit_consumption_from_application',
              resourceType: description ? 'operation' : 'application'
            }
          });
        }
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit consumption event:', streamError.message);
        // Still track the attempt even if publishing failed
        if (publishedEventId) {
          await EventTrackingService.markEventFailed(publishedEventId, streamError.message, false);
        }
      }

      return {
        success: true,
        allocationId: allocation.allocationId,
        application,
        consumedCredits: creditAmount,
        remainingCredits: parseFloat(result.availableCredits)
      };

    } catch (error) {
      console.error('❌ Error consuming application credits:', error);
      throw error;
    }
  }

  /**
   * Get credit allocation summary for a tenant
   */
  async getApplicationAllocations(tenantId, sourceEntityId = null) {
    try {
      console.log('💰 Getting application credit allocations:', { tenantId, sourceEntityId });

      let whereConditions = [eq(creditAllocations.tenantId, tenantId), eq(creditAllocations.isActive, true)];

      if (sourceEntityId) {
        whereConditions.push(eq(creditAllocations.sourceEntityId, sourceEntityId));
      }

      const allocations = await db
        .select({
          allocationId: creditAllocations.allocationId,
          tenantId: creditAllocations.tenantId,
          sourceEntityId: creditAllocations.sourceEntityId,
          targetApplication: creditAllocations.targetApplication,
          allocatedCredits: creditAllocations.allocatedCredits,
          usedCredits: creditAllocations.usedCredits,
          availableCredits: creditAllocations.availableCredits,
          allocationType: creditAllocations.allocationType,
          allocationPurpose: creditAllocations.allocationPurpose,
          allocatedAt: creditAllocations.allocatedAt,
          expiresAt: creditAllocations.expiresAt,
          autoReplenish: creditAllocations.autoReplenish
        })
        .from(creditAllocations)
        .where(and(...whereConditions))
        .orderBy(desc(creditAllocations.allocatedAt));

      // Calculate totals
      const totals = allocations.reduce((acc, allocation) => {
        acc.totalAllocated += parseFloat(allocation.allocatedCredits);
        acc.totalUsed += parseFloat(allocation.usedCredits);
        acc.totalAvailable += parseFloat(allocation.availableCredits);
        return acc;
      }, { totalAllocated: 0, totalUsed: 0, totalAvailable: 0 });

      return {
        success: true,
        data: {
          allocations: allocations.map(allocation => ({
            ...allocation,
            allocatedCredits: parseFloat(allocation.allocatedCredits),
            usedCredits: parseFloat(allocation.usedCredits),
            availableCredits: parseFloat(allocation.availableCredits)
          })),
          summary: totals
        }
      };

    } catch (error) {
      console.error('❌ Error getting application allocations:', error);
      throw error;
    }
  }

  /**
   * Get credit balance for a specific application
   */
  async getApplicationCreditBalance(tenantId, application) {
    try {
      console.log('💰 Getting application credit balance:', { tenantId, application });

      const [allocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.targetApplication, application),
          eq(creditAllocations.isActive, true)
        ))
        .limit(1);

      if (!allocation) {
        return {
          success: true,
          data: {
            tenantId,
            application,
            allocatedCredits: 0,
            usedCredits: 0,
            availableCredits: 0,
            hasAllocation: false
          }
        };
      }

      return {
        success: true,
        data: {
          tenantId,
          application,
          allocationId: allocation.allocationId,
          allocatedCredits: parseFloat(allocation.allocatedCredits),
          usedCredits: parseFloat(allocation.usedCredits),
          availableCredits: parseFloat(allocation.availableCredits),
          allocationPurpose: allocation.allocationPurpose,
          allocatedAt: allocation.allocatedAt,
          expiresAt: allocation.expiresAt,
          autoReplenish: allocation.autoReplenish,
          hasAllocation: true
        }
      };

    } catch (error) {
      console.error('❌ Error getting application credit balance:', error);
      throw error;
    }
  }

  /**
   * Transfer credits between applications
   */
  async transferCreditsBetweenApplications({
    tenantId,
    fromApplication,
    toApplication,
    creditAmount,
    transferReason = '',
    initiatedBy
  }) {
    try {
      console.log('💰 Transferring credits between applications:', {
        tenantId,
        fromApplication,
        toApplication,
        creditAmount
      });

      // Get allocations for both applications
      const [fromAllocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.targetApplication, fromApplication),
          eq(creditAllocations.isActive, true),
          gte(creditAllocations.availableCredits, creditAmount.toString())
        ))
        .limit(1);

      if (!fromAllocation) {
        throw new Error(`Insufficient credits in ${fromApplication} allocation`);
      }

      const [toAllocation] = await db
        .select()
        .from(creditAllocations)
        .where(and(
          eq(creditAllocations.tenantId, tenantId),
          eq(creditAllocations.targetApplication, toApplication),
          eq(creditAllocations.isActive, true)
        ))
        .limit(1);

      if (!toAllocation) {
        throw new Error(`No active allocation found for ${toApplication}`);
      }

      // Start transaction
      await db.transaction(async (tx) => {
        // Decrease from allocation
        const fromNewUsed = parseFloat(fromAllocation.usedCredits) + creditAmount;
        const fromNewAvailable = parseFloat(fromAllocation.allocatedCredits) - fromNewUsed;

        await tx
          .update(creditAllocations)
          .set({
            usedCredits: fromNewUsed.toString(),
            availableCredits: fromNewAvailable.toString(),
            lastUpdatedAt: new Date()
          })
          .where(eq(creditAllocations.allocationId, fromAllocation.allocationId));

        // Increase to allocation
        const toNewAllocated = parseFloat(toAllocation.allocatedCredits) + creditAmount;
        const toNewAvailable = toNewAllocated - parseFloat(toAllocation.usedCredits);

        await tx
          .update(creditAllocations)
          .set({
            allocatedCredits: toNewAllocated.toString(),
            availableCredits: toNewAvailable.toString(),
            lastUpdatedAt: new Date()
          })
          .where(eq(creditAllocations.allocationId, toAllocation.allocationId));

        // Create transfer transaction records
        await tx
          .insert(creditAllocationTransactions)
          .values([
            {
              tenantId,
              allocationId: fromAllocation.allocationId,
              transactionType: 'transfer_out',
              amount: (-creditAmount).toString(),
              previousAllocated: fromAllocation.allocatedCredits,
              newAllocated: fromAllocation.allocatedCredits,
              previousUsed: fromAllocation.usedCredits,
              newUsed: fromNewUsed.toString(),
              description: `Transferred ${creditAmount} credits to ${toApplication}: ${transferReason}`,
              initiatedBy
            },
            {
              tenantId,
              allocationId: toAllocation.allocationId,
              transactionType: 'transfer_in',
              amount: creditAmount.toString(),
              previousAllocated: toAllocation.allocatedCredits,
              newAllocated: toNewAllocated.toString(),
              previousUsed: toAllocation.usedCredits,
              newUsed: toAllocation.usedCredits,
              description: `Received ${creditAmount} credits from ${fromApplication}: ${transferReason}`,
              initiatedBy
            }
          ]);
      });

      console.log('✅ Credits transferred between applications successfully');

      return {
        success: true,
        fromApplication,
        toApplication,
        transferredCredits: creditAmount,
        transferReason
      };

    } catch (error) {
      console.error('❌ Error transferring credits between applications:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility

  async allocateTrialCredits(tenantId, entityId, options = {}) {
    const {
      creditAmount = 1000,
      trialDays = 30,
      creditType = 'trial'
    } = options;

    return await CreditService.addCreditsToEntity({
      tenantId,
      entityType: 'organization',
      entityId,
      creditAmount,
      source: 'trial_allocation',
      sourceId: uuidv4(),
      description: `Trial credit allocation: ${creditAmount} credits for ${trialDays} days`,
      initiatedBy: 'system'
    });
  }

  async getCreditBalance(tenantId) {
    return await CreditService.getCurrentBalance(tenantId);
  }

  async deductCredits(tenantId, amount, reason = '') {
    // This is now handled by consumeCredits in CreditService
    console.warn('CreditAllocationService.deductCredits is deprecated. Use CreditService.consumeCredits instead.');
    return { success: false, message: 'Method deprecated' };
  }

  async extendTrialCredits(tenantId, additionalDays = 7) {
    console.warn('CreditAllocationService.extendTrialCredits is deprecated.');
    return { success: false, message: 'Method deprecated' };
  }
}

// Export the class for extension
export { CreditAllocationService };
// Export default instance for backward compatibility
export default new CreditAllocationService();
