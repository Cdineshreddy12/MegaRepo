import { db } from '../../../db/index.js';
import { tenants, tenantUsers, entities, subscriptions } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * User Management Routes
 * Handles user tenant verification and other user-related operations
 */
export default async function userRoutes(fastify, options) {

  // ===============================
  // USER TENANT VERIFICATION ENDPOINT
  // ===============================

  // Verify user tenant access for CRM login
  fastify.get('/user/tenant/:email', {
    schema: {
      description: 'Verify if a user has tenant access and retrieve tenant information',
      params: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', description: 'User email address (URL-encoded)' }
        }
      },
      headers: {
        type: 'object',
        properties: {
          'X-Request-Source': { type: 'string', enum: ['crm-backend'] },
          'Authorization': { type: 'string', description: 'Bearer token (optional)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              oneOf: [
                { type: 'null' },
                {
                  type: 'object',
                  properties: {
                    tenantId: { type: 'string' },
                    userId: { type: 'string' },
                    orgCode: { type: 'string' },
                    tenantName: { type: 'string' },
                    status: { type: 'string' },
                    subscription: {
                      type: 'object',
                      properties: {
                        plan: { type: 'string' },
                        status: { type: 'string' }
                      }
                    },
                    organization: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.params;
      const requestSource = request.headers['x-request-source'];

      // Validate request source
      if (requestSource !== 'crm-backend') {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized access',
          statusCode: 401
        });
      }

      // Decode URL-encoded email
      const decodedEmail = decodeURIComponent(email);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(decodedEmail)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid email format',
          statusCode: 400
        });
      }

      console.log(`🔍 Verifying tenant access for user: ${decodedEmail}`);

      // Query user and tenant information
      const [userTenantInfo] = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenants.tenantId,
          tenantName: tenants.companyName,
          tenantStatus: tenants.isActive,
          tenantVerified: tenants.isVerified,
          primaryOrgId: tenantUsers.primaryOrganizationId,
          userActive: tenantUsers.isActive,
          userVerified: tenantUsers.isVerified,
          // Organization info
          orgCode: entities.entityCode,
          orgName: entities.entityName,
          orgType: entities.organizationType,
          // Subscription info
          subscriptionPlan: subscriptions.plan,
          subscriptionStatus: subscriptions.status
        })
        .from(tenantUsers)
        .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
        .leftJoin(entities, eq(tenantUsers.primaryOrganizationId, entities.entityId))
        .leftJoin(subscriptions, and(
          eq(subscriptions.tenantId, tenantUsers.tenantId),
          eq(subscriptions.status, 'active')
        ))
        .where(and(
          eq(tenantUsers.email, decodedEmail),
          eq(tenantUsers.isActive, true),
          eq(tenants.isActive, true)
        ))
        .limit(1);

      // User not found or inactive
      if (!userTenantInfo) {
        console.log(`❌ User not found or inactive: ${decodedEmail}`);
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          statusCode: 404
        });
      }

      // User exists but no active tenant access
      if (!userTenantInfo.tenantId) {
        console.log(`ℹ️ User has no tenant access: ${decodedEmail}`);
        return reply.code(200).send({
          success: true,
          data: null,
          message: 'User has no tenant assigned'
        });
      }

      // User has tenant access - return tenant information
      console.log(`✅ User verified with tenant access: ${decodedEmail} → ${userTenantInfo.tenantName}`);

      const responseData = {
        tenantId: userTenantInfo.tenantId,
        userId: userTenantInfo.userId,
        orgCode: userTenantInfo.orgCode || null,
        tenantName: userTenantInfo.tenantName,
        status: userTenantInfo.tenantStatus ? 'active' : 'inactive',
        subscription: userTenantInfo.subscriptionPlan ? {
          plan: userTenantInfo.subscriptionPlan,
          status: userTenantInfo.subscriptionStatus || 'unknown'
        } : null,
        organization: userTenantInfo.orgName ? {
          name: userTenantInfo.orgName,
          type: userTenantInfo.orgType || 'unknown'
        } : null
      };

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ User tenant verification error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  });
}
