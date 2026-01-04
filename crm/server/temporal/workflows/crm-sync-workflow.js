import { proxyActivities, workflowInfo } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
// proxyActivities creates stubs that connect to actual activities at runtime
const {
  syncUserToCRM,
  deactivateUserInCRM,
  deleteUserFromCRM,
  createRoleInCRM,
  updateRoleInCRM,
  deleteRoleInCRM,
  assignRoleInCRM,
  unassignRoleInCRM,
  allocateCreditsInCRM,
  updateCreditConfigInCRM,
  createOrganizationInCRM,
  handleOrganizationAssignmentCreated,
  handleOrganizationAssignmentUpdated,
  handleOrganizationAssignmentDeleted,
} = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['ValidationError', 'NotFoundError'],
  },
});

/**
 * Main CRM sync workflow
 * Routes different event types to appropriate activities
 * 
 * Workflow execution timeout: 30 minutes (for long-running syncs)
 * Workflow task timeout: 10 seconds (for workflow logic execution)
 */
export async function crmSyncWorkflow(eventData) {
  const { eventType, tenantId, ...data } = eventData;
  const workflowStartTime = Date.now();

  if (!tenantId) {
    throw new Error('tenantId is required in workflow event data');
  }

  if (!eventType) {
    throw new Error('eventType is required in workflow event data');
  }

  console.log(`[CRM Workflow] Processing event: ${eventType} for tenant ${tenantId}`);
  console.log(`[CRM Workflow] Workflow ID: ${workflowInfo().workflowId}`);
  console.log(`[CRM Workflow] Run ID: ${workflowInfo().runId}`);

  const activityData = {
    tenantId,
    ...data,
  };

  let result;
  let error;

  try {
    switch (eventType) {
      case 'user.created':
      case 'user_created':
        result = await syncUserToCRM(activityData);
        break;

      case 'user.deactivated':
      case 'user_deactivated':
        result = await deactivateUserInCRM(activityData);
        break;

      case 'user.deleted':
      case 'user_deleted':
        result = await deleteUserFromCRM(activityData);
        break;

      case 'role.created':
      case 'role_created':
        result = await createRoleInCRM(activityData);
        break;

      case 'role.updated':
      case 'role_updated':
        result = await updateRoleInCRM(activityData);
        break;

      case 'role.deleted':
      case 'role_deleted':
        result = await deleteRoleInCRM(activityData);
        break;

      case 'role.assigned':
      case 'role_assigned':
        result = await assignRoleInCRM(activityData);
        break;

      case 'role.unassigned':
      case 'role_unassigned':
        result = await unassignRoleInCRM(activityData);
        break;

      case 'credit.allocated':
      case 'credit_allocated':
        result = await allocateCreditsInCRM(activityData);
        break;

      case 'credit.config.updated':
      case 'credit_config_updated':
        result = await updateCreditConfigInCRM(activityData);
        break;

      case 'org.created':
      case 'org_created':
        result = await createOrganizationInCRM(activityData);
        break;

      case 'organization.assignment.created':
        result = await handleOrganizationAssignmentCreated(activityData);
        break;

      case 'organization.assignment.updated':
        result = await handleOrganizationAssignmentUpdated(activityData);
        break;

      case 'organization.assignment.deleted':
        result = await handleOrganizationAssignmentDeleted(activityData);
        break;

      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }

    const duration = Date.now() - workflowStartTime;
    console.log(`[CRM Workflow] Completed successfully in ${duration}ms`);

    return {
      success: true,
      eventType,
      tenantId,
      result,
      durationMs: duration,
      workflowId: workflowInfo().workflowId,
      runId: workflowInfo().runId,
    };
  } catch (err) {
    error = err;
    const duration = Date.now() - workflowStartTime;
    console.error(`[CRM Workflow] Failed after ${duration}ms:`, err.message);

    // Return structured error for monitoring
    return {
      success: false,
      eventType,
      tenantId,
      error: {
        message: err.message,
        type: err.constructor?.name || 'Error',
        stack: err.stack,
      },
      durationMs: duration,
      workflowId: workflowInfo().workflowId,
      runId: workflowInfo().runId,
    };
  }
}

