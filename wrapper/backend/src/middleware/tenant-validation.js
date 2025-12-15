/**
 * Tenant Validation Middleware
 * 
 * Ensures that authenticated users have valid tenant associations
 * before accessing tenant-specific resources
 */

import ErrorResponses from '../utils/error-responses.js';
import Logger from '../utils/logger.js';

/**
 * Middleware to require tenantId for protected routes
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function requireTenantId(request, reply) {
  const requestId = Logger.generateRequestId('tenant-validation');
  
  console.log(`🏢 [${requestId}] Validating tenant ID for ${request.method} ${request.url}`);
  
  // Check if user is authenticated first
  if (!request.userContext?.isAuthenticated) {
    console.log(`❌ [${requestId}] User not authenticated`);
    return ErrorResponses.unauthorized(reply, 'Authentication required');
  }
  
  // Check if tenantId exists
  if (!request.userContext?.tenantId) {
    console.log(`❌ [${requestId}] No tenantId found for user:`, {
      userId: request.userContext?.userId,
      email: request.userContext?.email,
      kindeUserId: request.userContext?.kindeUserId
    });
    
    return ErrorResponses.unauthorized(reply, 'User is not associated with any organization. Please complete onboarding first.', {
      action: 'redirect_to_onboarding',
      redirectUrl: '/onboarding',
      missingField: 'tenantId'
    });
  }
  
  console.log(`✅ [${requestId}] Tenant validation passed for tenant: ${request.userContext.tenantId}`);
}

/**
 * Middleware to require admin permissions for tenant operations
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function requireTenantAdmin(request, reply) {
  const requestId = Logger.generateRequestId('tenant-admin-validation');
  
  console.log(`👑 [${requestId}] Validating tenant admin permissions for ${request.method} ${request.url}`);
  
  // First ensure tenant validation passes
  await requireTenantId(request, reply);
  
  // If reply was already sent (validation failed), return
  if (reply.sent) {
    return;
  }
  
  // Check if user has admin permissions for the tenant
  if (!request.userContext?.isTenantAdmin) {
    console.log(`❌ [${requestId}] User is not a tenant admin:`, {
      userId: request.userContext?.userId,
      email: request.userContext?.email,
      tenantId: request.userContext?.tenantId,
      isTenantAdmin: request.userContext?.isTenantAdmin
    });
    
    return ErrorResponses.forbidden(reply, 'Admin permissions required for this operation', {
      requiredPermission: 'tenant_admin',
      userPermissions: request.userContext?.permissions || []
    });
  }
  
  console.log(`✅ [${requestId}] Tenant admin validation passed for tenant: ${request.userContext.tenantId}`);
}

/**
 * Middleware to validate that the requested resource belongs to the user's tenant
 * @param {string} paramName - Name of the parameter containing the tenantId (default: 'tenantId')
 * @returns {Function} Middleware function
 */
export function requireTenantMatch(paramName = 'tenantId') {
  return async (request, reply) => {
    const requestId = Logger.generateRequestId('tenant-match-validation');
    
    console.log(`🔄 [${requestId}] Validating tenant match for parameter: ${paramName}`);
    
    // First ensure tenant validation passes
    await requireTenantId(request, reply);
    
    // If reply was already sent (validation failed), return
    if (reply.sent) {
      return;
    }
    
    const requestedTenantId = request.params[paramName];
    const userTenantId = request.userContext.tenantId;
    
    if (!requestedTenantId) {
      console.log(`❌ [${requestId}] No ${paramName} parameter found in request`);
      return ErrorResponses.badRequest(reply, `Missing ${paramName} parameter`, {
        paramName,
        availableParams: Object.keys(request.params)
      });
    }
    
    if (requestedTenantId !== userTenantId) {
      console.log(`❌ [${requestId}] Tenant mismatch:`, {
        requestedTenantId,
        userTenantId,
        paramName
      });
      
      return ErrorResponses.forbidden(reply, 'Access denied. Resource does not belong to your organization.', {
        requestedTenantId,
        userTenantId
      });
    }
    
    console.log(`✅ [${requestId}] Tenant match validation passed: ${requestedTenantId}`);
  };
}

/**
 * Helper function to create a preHandler hook for tenant validation
 * @param {string} validationType - Type of validation ('basic', 'admin', or 'match')
 * @param {string} paramName - Parameter name for match validation
 * @returns {Function} PreHandler function
 */
export function createTenantValidation(validationType = 'basic', paramName = 'tenantId') {
  switch (validationType) {
    case 'admin':
      return requireTenantAdmin;
    case 'match':
      return requireTenantMatch(paramName);
    case 'basic':
    default:
      return requireTenantId;
  }
}

export default {
  requireTenantId,
  requireTenantAdmin,
  requireTenantMatch,
  createTenantValidation
};
