import { proxyActivities } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
const { routeInterAppEvent, processInterAppEvent } = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 3,
  },
});

/**
 * Inter-app workflow
 * Handles cross-application event routing
 */
export async function interAppWorkflow(eventData) {
  const { targetApplication, eventType, tenantId, ...data } = eventData;

  if (!targetApplication) {
    throw new Error('targetApplication is required in inter-app workflow');
  }

  if (!eventType) {
    throw new Error('eventType is required in inter-app workflow');
  }

  console.log(`[Inter-App Workflow] Processing ${eventType} for ${targetApplication}`);

  // Route the event to target application
  const routeResult = await routeInterAppEvent({
    targetApplication,
    eventType,
    tenantId,
    ...data,
  });

  // Process the event
  const processResult = await processInterAppEvent({
    targetApplication,
    eventType,
    tenantId,
    ...data,
  });

  return {
    routeResult,
    processResult,
  };
}

