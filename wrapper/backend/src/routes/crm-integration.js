/**
 * CRM Integration Routes - API endpoints for CRM tenant synchronization
 * Provides comprehensive tenant data for initial CRM sync and ongoing updates
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tenants,
  tenantUsers,
  entities,
  customRoles,
  userRoleAssignments,
  organizationMemberships,
  creditConfigurations,
  // REMOVED: creditAllocations - Table removed, applications manage their own credits
} from '../db/schema/index.js';

export default async function crmIntegrationRoutes(fastify, options) {

  // Apply authentication and tenant isolation to all routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Verify authentication
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({
        success: false,
        message: 'Authentication failed'
      });
    }

    // Check if request comes from CRM backend (case-insensitive)
    const requestSource = request.headers['x-request-source'] || request.headers['X-Request-Source'];
    console.log('🔍 CRM Header check:', {
      'x-request-source': requestSource,
      'X-Request-Source': request.headers['X-Request-Source'],
      allHeaders: Object.keys(request.headers).filter(h => h.toLowerCase().includes('request-source'))
    });

    // Accept both 'crm-backend' and 'crm-tenant-sync-v2' headers for compatibility
    const validHeaders = ['crm-backend', 'crm-tenant-sync-v2'];
    if (!requestSource || !validHeaders.includes(requestSource.toLowerCase())) {
      return reply.code(403).send({
        success: false,
        message: 'Access restricted to CRM backend',
        receivedHeader: requestSource,
        expectedHeaders: validHeaders
      });
    }

    // Verify tenant access
    const { tenantId } = request.params;
    if (!tenantId) {
      return reply.code(400).send({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // For CRM backend, allow access to any tenant (service-level access)
    // Regular users are restricted to their own tenant
    if (!requestSource.includes('crm-backend')) {
      if (request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied to this tenant'
        });
      }
    }
  });

  // Note: The following endpoints are already defined in wrapper-crm-sync.js
  // to avoid duplicate route registration, we skip them here:
  // - GET /tenants/:tenantId
  // - GET /tenants/:tenantId/organizations
  // - GET /tenants/:tenantId/roles
  // - GET /tenants/:tenantId/users
  // - GET /tenants/:tenantId/employee-assignments
  // - GET /tenants/:tenantId/role-assignments
  // - GET /tenants/:tenantId/credit-configs
  // - GET /tenants/:tenantId/entity-credits
  // - POST /tenants/:tenantId/sync
  // - GET /tenants/:tenantId/sync/status (note: wrapper-crm-sync uses /sync/status, not /sync-status)
  // - GET /data-requirements

  // All routes are already defined in wrapper-crm-sync.js
  // This file is kept for reference but contains no route definitions to avoid duplicates
}
