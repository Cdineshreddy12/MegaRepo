import { CreditAllocationService, CreditService } from '../features/credits/index.js';

/**
 * Middleware to validate credit allocations for application-specific operations
 * Ensures that applications have sufficient allocated credits before operations proceed
 */
export async function validateApplicationCreditAllocation(request, reply) {
  try {
    const { userContext } = request;
    const tenantId = userContext?.tenantId;

    if (!tenantId) {
      console.warn('⚠️ Credit allocation validation skipped: No tenant context');
      return;
    }

    // Extract application code from operation if available
    const operationCode = request.body?.operationCode || request.params?.operationCode;
    const applicationCode = operationCode ? CreditService.extractApplicationFromOperationCode(operationCode) : null;

    if (!applicationCode) {
      // Not an application-specific operation, skip validation
      return;
    }

    console.log('🔍 Validating credit allocation for application operation:', {
      tenantId,
      applicationCode,
      operationCode
    });

    // Check if application has an active credit allocation
    const allocationResult = await CreditAllocationService.getApplicationCreditBalance(tenantId, applicationCode);

    if (!allocationResult.success || !allocationResult.data.hasAllocation) {
      console.warn('⚠️ No credit allocation found for application:', applicationCode);

      return reply.code(402).send({
        error: 'Credit Allocation Required',
        message: `Application ${applicationCode} does not have any allocated credits. Please allocate credits to this application before proceeding.`,
        application: applicationCode,
        actionRequired: 'allocate_credits_to_application',
        statusCode: 402,
        requestId: `credit_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      });
    }

    const allocation = allocationResult.data;

    // Check if allocation has available credits
    if (allocation.availableCredits <= 0) {
      console.warn('⚠️ Application allocation has no available credits:', {
        application: applicationCode,
        allocatedCredits: allocation.allocatedCredits,
        usedCredits: allocation.usedCredits,
        availableCredits: allocation.availableCredits
      });

      return reply.code(402).send({
        error: 'Insufficient Application Credits',
        message: `Application ${applicationCode} has exhausted its allocated credits (${allocation.usedCredits}/${allocation.allocatedCredits}). Please allocate more credits or transfer credits from another application.`,
        application: applicationCode,
        allocatedCredits: allocation.allocatedCredits,
        usedCredits: allocation.usedCredits,
        availableCredits: allocation.availableCredits,
        actionRequired: 'allocate_more_credits_to_application',
        statusCode: 402,
        requestId: `credit_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check if allocation is expiring soon (within 7 days)
    if (allocation.expiresAt) {
      const daysUntilExpiry = Math.floor(
        (new Date(allocation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        console.warn('⚠️ Application credit allocation expiring soon:', {
          application: applicationCode,
          daysUntilExpiry,
          expiresAt: allocation.expiresAt
        });

        // Add warning header but don't block the operation
        reply.header('X-Credit-Allocation-Warning',
          `Application ${applicationCode} credit allocation expires in ${daysUntilExpiry} days`);
      } else if (daysUntilExpiry <= 0) {
        console.warn('⚠️ Application credit allocation has expired:', {
          application: applicationCode,
          expiresAt: allocation.expiresAt
        });

        return reply.code(402).send({
          error: 'Expired Credit Allocation',
          message: `Application ${applicationCode} credit allocation expired on ${allocation.expiresAt}. Please renew the allocation.`,
          application: applicationCode,
          expiresAt: allocation.expiresAt,
          actionRequired: 'renew_credit_allocation',
          statusCode: 402,
          requestId: `credit_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Add allocation info to request for downstream processing
    request.applicationCreditAllocation = {
      application: applicationCode,
      allocationId: allocation.allocationId,
      availableCredits: allocation.availableCredits,
      allocatedCredits: allocation.allocatedCredits,
      usedCredits: allocation.usedCredits,
      allocationPurpose: allocation.allocationPurpose,
      autoReplenish: allocation.autoReplenish
    };

    console.log('✅ Credit allocation validation passed for application:', applicationCode);

  } catch (error) {
    console.error('❌ Error in credit allocation validation middleware:', error);

    // On validation error, return 500 but don't block operations
    // This prevents the middleware from breaking the API if there are issues
    console.warn('⚠️ Credit allocation validation failed, proceeding without validation');
  }
}

/**
 * Middleware to validate credit consumption amounts against application allocations
 * This is a stricter version that checks the actual credit cost before proceeding
 */
export async function validateCreditConsumption(request, reply) {
  try {
    const { userContext } = request;
    const tenantId = userContext?.tenantId;

    if (!tenantId) {
      return;
    }

    const operationCode = request.body?.operationCode;
    const creditCost = request.body?.creditCost || request.body?.creditAmount;

    if (!operationCode || !creditCost) {
      return; // Not a credit-consuming operation
    }

    const applicationCode = CreditService.extractApplicationFromOperationCode(operationCode);

    if (!applicationCode) {
      return; // Not an application-specific operation
    }

    console.log('🔍 Validating credit consumption for application:', {
      tenantId,
      applicationCode,
      operationCode,
      creditCost
    });

    // Get current allocation balance
    const allocationResult = await CreditAllocationService.getApplicationCreditBalance(tenantId, applicationCode);

    if (!allocationResult.success || !allocationResult.data.hasAllocation) {
      return reply.code(402).send({
        error: 'Credit Allocation Required',
        message: `Application ${applicationCode} does not have any allocated credits.`,
        application: applicationCode,
        actionRequired: 'allocate_credits_to_application'
      });
    }

    const allocation = allocationResult.data;

    // Check if there's enough credits for this operation
    if (allocation.availableCredits < creditCost) {
      console.warn('⚠️ Insufficient credits for operation:', {
        application: applicationCode,
        required: creditCost,
        available: allocation.availableCredits
      });

      return reply.code(402).send({
        error: 'Insufficient Application Credits',
        message: `Operation requires ${creditCost} credits but application ${applicationCode} only has ${allocation.availableCredits} credits available.`,
        application: applicationCode,
        requiredCredits: creditCost,
        availableCredits: allocation.availableCredits,
        allocatedCredits: allocation.allocatedCredits,
        usedCredits: allocation.usedCredits,
        actionRequired: 'allocate_more_credits_to_application'
      });
    }

    console.log('✅ Credit consumption validation passed');

  } catch (error) {
    console.error('❌ Error in credit consumption validation:', error);
    // On error, proceed without validation to avoid breaking operations
  }
}

/**
 * Middleware to automatically replenish application credits if auto-replenish is enabled
 */
export async function autoReplenishApplicationCredits(request, reply) {
  try {
    const { userContext } = request;
    const tenantId = userContext?.tenantId;

    if (!tenantId) {
      return;
    }

    const operationCode = request.body?.operationCode;
    const creditCost = request.body?.creditCost || request.body?.creditAmount;

    if (!operationCode || !creditCost) {
      return;
    }

    const applicationCode = CreditService.extractApplicationFromOperationCode(operationCode);

    if (!applicationCode) {
      return;
    }

    // Check if application has auto-replenish enabled and is running low
    const allocationResult = await CreditAllocationService.getApplicationCreditBalance(tenantId, applicationCode);

    if (allocationResult.success && allocationResult.data.hasAllocation) {
      const allocation = allocationResult.data;

      // If auto-replenish is enabled and credits are low, attempt to replenish
      if (allocation.autoReplenish && allocation.availableCredits < creditCost * 2) { // Low threshold
        console.log('🔄 Auto-replenishing application credits:', {
          application: applicationCode,
          availableCredits: allocation.availableCredits,
          creditCost
        });

        try {
          // Attempt to allocate more credits from organization pool
          // This is a simple auto-replenish strategy - could be made more sophisticated
          const replenishAmount = Math.max(creditCost * 5, 100); // Replenish with 5x the cost or 100 credits minimum

          await CreditAllocationService.allocateCreditsToApplication({
            tenantId,
            sourceEntityId: tenantId, // Use tenantId as default source
            targetApplication: applicationCode,
            creditAmount: replenishAmount,
            allocationPurpose: 'Auto-replenishment due to low credits',
            allocatedBy: 'system'
          });

          console.log('✅ Auto-replenished application credits:', {
            application: applicationCode,
            replenishAmount
          });

          // Add header to indicate auto-replenishment occurred
          reply.header('X-Credit-Auto-Replenished', `${replenishAmount} credits added to ${applicationCode}`);

        } catch (replenishError) {
          console.warn('⚠️ Auto-replenishment failed:', replenishError.message);
          // Continue with operation even if replenishment fails
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in auto-replenish middleware:', error);
    // Don't block operations on auto-replenish errors
  }
}
