import { authenticateToken } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers } from '../../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import ErrorResponses from '../../../utils/error-responses.js';

/**
 * Data Management Routes
 * Handles data retrieval, organization info, and step tracking endpoints
 */

export default async function dataManagementRoutes(fastify, options) {

  // Get user's organization info after onboarding
  fastify.get('/user-organization', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const userId = request.userContext.userId;

      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!user) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, user.tenantId))
        .limit(1);

      if (!tenant) {
        return ErrorResponses.notFound(reply, 'Organization', 'Organization not found');
      }

      return {
        success: true,
        data: {
          organization: {
            id: tenant.tenantId,
            name: tenant.companyName,
            domain: tenant.domain,
            subdomain: tenant.subdomain,
            createdAt: tenant.createdAt
          },
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
            isAdmin: user.isTenantAdmin,
            onboardingCompleted: user.onboardingCompleted
          }
        }
      };

    } catch (error) {
      request.log.error('Error getting user organization:', error);
      return reply.code(500).send({ error: 'Failed to get user organization' });
    }
  });

  // Mark onboarding as complete (with organization ID)
  fastify.post('/mark-complete', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.userContext.userId;
      const { organizationId } = request.body;

      // Verify user belongs to this organization
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!user) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      if (user.tenantId !== organizationId) {
        return reply.code(403).send({ error: 'User does not belong to this organization' });
      }

      // Mark onboarding as completed
      await db
        .update(tenantUsers)
        .set({
          onboardingCompleted: true,
          onboardingStep: 'completed',
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        message: 'Onboarding marked as completed',
        data: {
          userId,
          organizationId,
          completedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      request.log.error('Error marking onboarding complete:', error);
      return reply.code(500).send({ error: 'Failed to mark onboarding as complete' });
    }
  });

  // Update onboarding step (for step-by-step tracking)
  fastify.post('/update-step', {
    schema: {
      body: {
        type: 'object',
        required: ['step'],
        properties: {
          step: { type: 'string' },
          data: { type: 'object' },
          formData: { type: 'object' }, // Store form data for pre-filling
          email: { type: 'string', format: 'email' } // Optional email for non-authenticated users
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { step, data, formData, email } = request.body;
      let userId = null;

      // Try to get user ID from authenticated context first
      if (request.userContext?.userId) {
        userId = request.userContext.userId;
      } else if (email) {
        // If not authenticated, try to find user by email (for onboarding process)
        const [user] = await db
          .select()
          .from(tenantUsers)
          .where(eq(tenantUsers.email, email))
          .limit(1);

        if (user) {
          userId = user.userId;
        } else {
          // If user doesn't exist yet, we can't update step - this is fine during early onboarding
          console.log('User not found for email during onboarding step update:', email);
          return {
            success: true,
            message: 'Step tracking skipped - user not yet created',
            data: {
              step,
              reason: 'user_not_created_yet'
            }
          };
        }
      } else {
        return reply.code(400).send({
          error: 'Either authentication token or email is required'
        });
      }

      // Get current user data to merge with existing preferences
      const [currentUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!currentUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Prepare onboarding data to store
      const existingPreferences = currentUser.preferences || {};
      const onboardingData = existingPreferences.onboarding || {};

      // Update onboarding progress
      const updatedOnboardingData = {
        ...onboardingData,
        currentStep: step,
        lastUpdated: new Date().toISOString(),
        stepData: {
          ...onboardingData.stepData,
          [step]: {
            ...data,
            completedAt: new Date().toISOString()
          }
        }
      };

      // Store form data if provided (for pre-filling)
      if (formData) {
        updatedOnboardingData.formData = {
          ...onboardingData.formData,
          ...formData
        };
      }

      // Update user record with new onboarding data
      const updatedPreferences = {
        ...existingPreferences,
        onboarding: updatedOnboardingData
      };

      await db
        .update(tenantUsers)
        .set({
          preferences: updatedPreferences,
          onboardingStep: step,
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        message: 'Onboarding step updated successfully',
        data: {
          step,
          userId,
          updatedAt: new Date().toISOString(),
          onboardingData: updatedOnboardingData
        }
      };

    } catch (error) {
      request.log.error('Error updating onboarding step:', error);
      return reply.code(500).send({ error: 'Failed to update onboarding step' });
    }
  });
}
