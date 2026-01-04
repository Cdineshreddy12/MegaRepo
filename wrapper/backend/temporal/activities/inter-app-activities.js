/**
 * Inter-App Temporal Activities
 * Wraps inter-app event processing logic as Temporal activities
 */

/**
 * Route inter-app event to target application
 */
export async function routeInterAppEvent(eventData) {
  const { targetApplication, eventType, tenantId, ...data } = eventData;

  if (!targetApplication) {
    throw new Error('targetApplication is required for routeInterAppEvent activity');
  }

  if (!eventType) {
    throw new Error('eventType is required for routeInterAppEvent activity');
  }

  console.log(`[Inter-App Activity] Routing ${eventType} to ${targetApplication}`);

  // Import inter-app event service
  const { InterAppEventService } = await import('../../src/services/inter-app-event-service.js');

  // Publish the event (routing happens via Redis streams)
  const result = await InterAppEventService.publishEvent({
    sourceApplication: data.sourceApplication || 'wrapper',
    targetApplication,
    eventType,
    tenantId,
    entityId: data.entityId,
    eventData: data.eventData || data,
    publishedBy: data.publishedBy || 'temporal',
  });

  return result;
}

/**
 * Process inter-app event
 */
export async function processInterAppEvent(eventData) {
  const { targetApplication, eventType, tenantId, ...data } = eventData;

  console.log(`[Inter-App Activity] Processing ${eventType} for ${targetApplication}`);

  // Import inter-app consumer to access handler methods
  const { InterAppEventConsumer } = await import('../../src/services/inter-app-consumer.js');
  const consumer = new InterAppEventConsumer();
  
  // Ensure Redis connection is established
  if (!consumer.redis.isConnected) {
    await consumer.connect();
  }

  // Create event object matching Redis stream format
  const event = {
    id: data.eventId || `event-${Date.now()}`,
    message: {
      eventId: data.eventId || `event-${Date.now()}`,
      sourceApplication: data.sourceApplication || 'wrapper',
      targetApplication,
      eventType,
      tenantId,
      entityId: data.entityId,
      eventData: typeof data.eventData === 'string' ? data.eventData : JSON.stringify(data.eventData || data),
    },
  };

  // Skip Redis acknowledgment since we're in a Temporal activity context
  // (not consuming from Redis streams directly)
  return await consumer.processInterAppEvent(event, { skipAck: true });
}

