import { proxyActivities, setHandler, condition } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
// proxyActivities creates stubs that connect to actual activities at runtime
const {
  handleOrganizationAssignmentCreated,
  handleOrganizationAssignmentDeleted,
  handleOrganizationAssignmentActivated,
  handleOrganizationAssignmentDeactivated,
} = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['ValidationError', 'NotFoundError'],
  },
});

/**
 * Organization Assignment Workflow
 * 
 * Long-running workflow per tenant that processes organization assignment events.
 * Handles duplicate signals gracefully using idempotency tracking.
 * 
 * One workflow per tenant - events are signals, not workflow starts.
 */
export async function organizationAssignmentWorkflow({ tenantId }) {
  console.log(`[Org Assignment Workflow] Started for tenant: ${tenantId}`);

  // Track processed signals for idempotency (in-memory Set)
  // Key format: eventType-assignmentId-userId-organizationId
  const processedSignals = new Set();

  // Keep workflow alive and process signals
  while (true) {
    let pendingEvent = null;
    let eventPayload = null;

    // Register signal handlers
    setHandler('organization.assignment.created', (payload) => {
      // Create idempotency key
      const idempotencyKey = `created-${payload.assignmentId}-${payload.userId}-${payload.organizationId}`;
      
      // Check if already processed
      if (processedSignals.has(idempotencyKey)) {
        console.log(`[Org Assignment Workflow] Duplicate signal ignored: ${idempotencyKey}`);
        return; // Ignore duplicate
      }
      
      // Mark as processed and queue for processing
      processedSignals.add(idempotencyKey);
      pendingEvent = { type: 'created', data: payload };
      eventPayload = payload;
    });

    setHandler('organization.assignment.deleted', (payload) => {
      const idempotencyKey = `deleted-${payload.assignmentId}-${payload.userId}-${payload.organizationId}`;
      
      if (processedSignals.has(idempotencyKey)) {
        console.log(`[Org Assignment Workflow] Duplicate signal ignored: ${idempotencyKey}`);
        return;
      }
      
      processedSignals.add(idempotencyKey);
      pendingEvent = { type: 'deleted', data: payload };
      eventPayload = payload;
    });

    setHandler('organization.assignment.activated', (payload) => {
      const idempotencyKey = `activated-${payload.assignmentId}-${payload.userId}-${payload.organizationId}`;
      
      if (processedSignals.has(idempotencyKey)) {
        console.log(`[Org Assignment Workflow] Duplicate signal ignored: ${idempotencyKey}`);
        return;
      }
      
      processedSignals.add(idempotencyKey);
      pendingEvent = { type: 'activated', data: payload };
      eventPayload = payload;
    });

    setHandler('organization.assignment.deactivated', (payload) => {
      const idempotencyKey = `deactivated-${payload.assignmentId}-${payload.userId}-${payload.organizationId}`;
      
      if (processedSignals.has(idempotencyKey)) {
        console.log(`[Org Assignment Workflow] Duplicate signal ignored: ${idempotencyKey}`);
        return;
      }
      
      processedSignals.add(idempotencyKey);
      pendingEvent = { type: 'deactivated', data: payload };
      eventPayload = payload;
    });

    // Wait for a signal
    await condition(() => pendingEvent !== null);

    // Process the event
    const eventType = pendingEvent.type;
    const payload = eventPayload;
    pendingEvent = null;
    eventPayload = null;

    try {
      switch (eventType) {
        case 'created':
          await handleOrganizationAssignmentCreated({
            tenantId,
            ...payload,
          });
          console.log(`[Org Assignment Workflow] Processed creation: ${payload.assignmentId}`);
          break;
        case 'deleted':
          await handleOrganizationAssignmentDeleted({
            tenantId,
            ...payload,
          });
          console.log(`[Org Assignment Workflow] Processed deletion: ${payload.assignmentId}`);
          break;
        case 'activated':
          await handleOrganizationAssignmentActivated({
            tenantId,
            ...payload,
          });
          console.log(`[Org Assignment Workflow] Processed activation: ${payload.assignmentId}`);
          break;
        case 'deactivated':
          await handleOrganizationAssignmentDeactivated({
            tenantId,
            ...payload,
          });
          console.log(`[Org Assignment Workflow] Processed deactivation: ${payload.assignmentId}`);
          break;
        default:
          console.warn(`[Org Assignment Workflow] Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`[Org Assignment Workflow] Failed to process ${eventType}:`, error.message);
      // Temporal will retry automatically based on activity retry policy
      // Don't remove from processedSignals - let retry handle it
    }
  }
}

