import { proxyActivities } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
const { allocateCreditsInCRM } = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 3,
  },
});

/**
 * Specialized workflow for credit allocation events
 * Can include multi-step processes if needed
 */
export async function creditAllocationWorkflow(eventData) {
  const { tenantId, ...data } = eventData;

  if (!tenantId) {
    throw new Error('tenantId is required in credit allocation workflow');
  }

  console.log(`[Credit Allocation Workflow] Processing credit allocation for tenant ${tenantId}`);

  // Execute credit allocation activity
  const result = await allocateCreditsInCRM({
    tenantId,
    ...data,
  });

  // Future: Could add additional steps here like:
  // - Notify users
  // - Update analytics
  // - Trigger other workflows

  return result;
}

