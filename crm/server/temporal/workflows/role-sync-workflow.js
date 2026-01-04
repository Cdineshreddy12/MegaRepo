import { proxyActivities } from '@temporalio/workflow';

// DO NOT import activity modules in workflows - they are registered in the worker
const {
  createRoleInCRM,
  updateRoleInCRM,
  deleteRoleInCRM,
  assignRoleInCRM,
  unassignRoleInCRM,
} = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 3,
  },
});

/**
 * Specialized workflow for role synchronization events
 */
export async function roleSyncWorkflow(eventData) {
  const { eventType, tenantId, ...data } = eventData;

  if (!tenantId) {
    throw new Error('tenantId is required in role sync workflow');
  }

  if (!eventType) {
    throw new Error('eventType is required in role sync workflow');
  }

  console.log(`[Role Sync Workflow] Processing ${eventType} for tenant ${tenantId}`);

  const activityData = {
    tenantId,
    ...data,
  };

  switch (eventType) {
    case 'role.created':
    case 'role_created':
      return await createRoleInCRM(activityData);

    case 'role.updated':
    case 'role_updated':
      return await updateRoleInCRM(activityData);

    case 'role.deleted':
    case 'role_deleted':
      return await deleteRoleInCRM(activityData);

    case 'role.assigned':
    case 'role_assigned':
      return await assignRoleInCRM(activityData);

    case 'role.unassigned':
    case 'role_unassigned':
      return await unassignRoleInCRM(activityData);

    default:
      throw new Error(`Unknown role event type: ${eventType}`);
  }
}

