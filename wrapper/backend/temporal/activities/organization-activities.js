/**
 * Organization Assignment Temporal Activities
 * Wraps organization assignment processing logic as Temporal activities
 */

/**
 * Process organization assignment
 */
export async function processOrganizationAssignment(eventData) {
  const { eventType, tenantId, ...data } = eventData;

  if (!eventType) {
    throw new Error('eventType is required for processOrganizationAssignment activity');
  }

  console.log(`[Organization Activity] Processing ${eventType}`);

  // Import organization assignment consumer
  const { OrganizationAssignmentConsumer } = await import('../../src/services/organization-assignment-consumer.js');
  const consumer = new OrganizationAssignmentConsumer();

  // Create event object matching Redis stream format
  const event = {
    eventType,
    tenantId,
    data: data.data || data,
  };

  // Route to appropriate handler
  switch (eventType) {
    case 'organization.assignment.created':
      return await consumer.handleAssignmentCreated(event);

    case 'organization.assignment.updated':
      return await consumer.handleAssignmentUpdated(event);

    case 'organization.assignment.deactivated':
      return await consumer.handleAssignmentDeactivated(event);

    case 'organization.assignment.activated':
      return await consumer.handleAssignmentActivated(event);

    case 'organization.assignment.deleted':
      return await consumer.handleAssignmentDeleted(event);

    default:
      throw new Error(`Unknown organization assignment event type: ${eventType}`);
  }
}

/**
 * Sync organization to CRM
 */
export async function syncOrganizationToCRM(eventData) {
  const { tenantId, organizationId, ...data } = eventData;

  if (!tenantId) {
    throw new Error('tenantId is required for syncOrganizationToCRM activity');
  }

  if (!organizationId) {
    throw new Error('organizationId is required for syncOrganizationToCRM activity');
  }

  console.log(`[Organization Activity] Syncing organization ${organizationId} to CRM`);

  // Import CRM sync service if available
  // For now, just log the sync action
  // In production, this would call CRM API or publish to CRM stream
  
  return {
    success: true,
    organizationId,
    tenantId,
    syncedAt: new Date().toISOString(),
  };
}


