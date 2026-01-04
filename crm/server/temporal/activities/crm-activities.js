/**
 * CRM Temporal Activities
 * Wraps existing CRM event handlers as Temporal activities
 */

import mongoose from 'mongoose';
import RedisStreamsCRMConsumer from '../../services/redisStreamsConsumer.js';

// Create a consumer instance to access handler methods
// Note: We don't need to initialize Redis connection for activities
const consumerInstance = new RedisStreamsCRMConsumer({
  redisUrl: process.env.REDIS_URL,
  tenantId: null, // Will be provided per activity call
});

/**
 * Ensure MongoDB connection is established
 * Called before each activity that uses Mongoose models
 */
async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    // Already connected
    return;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI environment variable is required');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('[Activity] MongoDB connection established');
  } catch (error) {
    console.error('[Activity] Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Sync user to CRM
 */
export async function syncUserToCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for syncUserToCRM activity');
  }

  // Ensure MongoDB connection before using models
  await ensureMongoConnection();

  // Create event object matching Redis stream format
  const event = {
    tenantId,
    data: data,
    ...data, // Also flatten for compatibility
  };

  return await consumerInstance.handleUserCreated(event);
}

/**
 * Deactivate user in CRM
 */
export async function deactivateUserInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for deactivateUserInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleUserDeactivated(event);
}

/**
 * Delete user from CRM
 */
export async function deleteUserFromCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for deleteUserFromCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleUserDeleted(event);
}

/**
 * Create role in CRM
 */
export async function createRoleInCRM(eventData) {
  console.log(`🔍 [createRoleInCRM] Received eventData keys:`, Object.keys(eventData || {}));
  console.log(`🔍 [createRoleInCRM] eventData.tenantId:`, eventData?.tenantId);
  console.log(`🔍 [createRoleInCRM] eventData.roleId:`, eventData?.roleId);
  console.log(`🔍 [createRoleInCRM] eventData.roleName:`, eventData?.roleName);
  
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for createRoleInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  console.log(`🔍 [createRoleInCRM] Created event keys:`, Object.keys(event));
  console.log(`🔍 [createRoleInCRM] event.tenantId:`, event.tenantId);
  console.log(`🔍 [createRoleInCRM] event.roleId:`, event.roleId);
  console.log(`🔍 [createRoleInCRM] event.roleName:`, event.roleName);
  console.log(`🔍 [createRoleInCRM] event.data keys:`, event.data ? Object.keys(event.data) : 'no data');

  return await consumerInstance.handleRoleCreated(event);
}

/**
 * Update role in CRM
 */
export async function updateRoleInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for updateRoleInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleRoleUpdated(event);
}

/**
 * Delete role from CRM
 */
export async function deleteRoleInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for deleteRoleInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleRoleDeleted(event);
}

/**
 * Assign role in CRM
 */
export async function assignRoleInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for assignRoleInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleRoleAssigned(event);
}

/**
 * Unassign role in CRM
 */
export async function unassignRoleInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for unassignRoleInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleRoleUnassigned(event);
}

/**
 * Allocate credits in CRM
 */
export async function allocateCreditsInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for allocateCreditsInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleCreditAllocated(event);
}

/**
 * Update credit config in CRM
 */
export async function updateCreditConfigInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for updateCreditConfigInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleCreditConfigUpdated(event);
}

/**
 * Create organization in CRM
 */
export async function createOrganizationInCRM(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for createOrganizationInCRM activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleOrgCreated(event);
}

/**
 * Handle organization assignment created
 */
export async function handleOrganizationAssignmentCreated(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for handleOrganizationAssignmentCreated activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleOrganizationAssignmentCreated(event);
}

/**
 * Handle organization assignment updated
 */
export async function handleOrganizationAssignmentUpdated(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for handleOrganizationAssignmentUpdated activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleOrganizationAssignmentUpdated(event);
}

/**
 * Handle organization assignment deleted
 */
export async function handleOrganizationAssignmentDeleted(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for handleOrganizationAssignmentDeleted activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleOrganizationAssignmentDeleted(event);
}

/**
 * Handle organization assignment activated
 */
export async function handleOrganizationAssignmentActivated(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for handleOrganizationAssignmentActivated activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleOrganizationAssignmentActivated(event);
}

/**
 * Handle organization assignment deactivated
 */
export async function handleOrganizationAssignmentDeactivated(eventData) {
  const { tenantId, ...data } = eventData;
  
  if (!tenantId) {
    throw new Error('tenantId is required for handleOrganizationAssignmentDeactivated activity');
  }

  await ensureMongoConnection();

  const event = {
    tenantId,
    data: data,
    ...data,
  };

  return await consumerInstance.handleOrganizationAssignmentDeactivated(event);
}

