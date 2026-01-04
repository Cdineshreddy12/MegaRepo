import { proxyActivities } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
const { processOrganizationAssignment, syncOrganizationToCRM } = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 3,
  },
});

/**
 * Organization assignment workflow
 * Processes organization assignment events and syncs to CRM
 */
export async function organizationAssignmentWorkflow(eventData) {
  const { eventType, tenantId, ...data } = eventData;

  if (!eventType) {
    throw new Error('eventType is required in organization assignment workflow');
  }

  if (!tenantId) {
    throw new Error('tenantId is required in organization assignment workflow');
  }

  console.log(`[Organization Assignment Workflow] Processing ${eventType}`);

  // Process the assignment event
  const assignmentResult = await processOrganizationAssignment({
    eventType,
    tenantId,
    ...data,
  });

  // If assignment was created or updated, sync to CRM
  if (eventType === 'organization.assignment.created' || eventType === 'organization.assignment.updated') {
    const syncResult = await syncOrganizationToCRM({
      tenantId,
      organizationId: data.organizationId || data.data?.organizationId,
      assignmentData: data.data || data,
    });

    return {
      assignmentResult,
      syncResult,
    };
  }

  return {
    assignmentResult,
  };
}

