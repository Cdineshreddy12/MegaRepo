import { authenticateToken } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers, onboardingFormData } from '../../../db/schema/index.js';
import { eq, and, or } from 'drizzle-orm';
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
      let kindeUserId = null;
      let userEmail = null;

      // Get Kinde user ID and email from authenticated context
      if (request.userContext?.userId) {
        kindeUserId = request.userContext.userId;
        userEmail = request.userContext.email || email;
      } else if (email) {
        userEmail = email;
        // Try to get Kinde ID from existing onboarding data
        const [existingData] = await db
          .select()
          .from(onboardingFormData)
          .where(eq(onboardingFormData.email, email))
          .limit(1);
        
        if (existingData) {
          kindeUserId = existingData.kindeUserId;
        }
      } else {
        return reply.code(400).send({
          error: 'Either authentication token or email is required'
        });
      }

      if (!kindeUserId || !userEmail) {
        return reply.code(400).send({
          error: 'Kinde user ID and email are required'
        });
      }

      // Check if onboarding form data already exists
      const [existingFormData] = await db
        .select()
        .from(onboardingFormData)
        .where(
          and(
            eq(onboardingFormData.kindeUserId, kindeUserId),
            eq(onboardingFormData.email, userEmail)
          )
        )
        .limit(1);

      // Prepare step data - FIXED: Only update if step doesn't exist or data is different
      const stepDataUpdate = {
        ...data,
        completedAt: new Date().toISOString()
      };

      // Prepare form data - merge with existing if present
      const existingFormDataObj = existingFormData?.formData || {};
      const mergedFormData = formData 
        ? { ...existingFormDataObj, ...formData }
        : existingFormDataObj;

      // FIXED: Prepare step data object - check if step already exists to prevent duplicates
      const existingStepData = existingFormData?.stepData || {};
      
      // Only update step data if it's different or doesn't exist
      const existingStepEntry = existingStepData[step];
      const stepNeedsUpdate = !existingStepEntry || 
        JSON.stringify(existingStepEntry) !== JSON.stringify(stepDataUpdate);
      
      const updatedStepData = stepNeedsUpdate
        ? {
            ...existingStepData,
            [step]: stepDataUpdate
          }
        : existingStepData; // Keep existing if no changes

      if (existingFormData) {
        // Update existing record
        const [updated] = await db
          .update(onboardingFormData)
          .set({
            currentStep: step,
            formData: mergedFormData,
            stepData: updatedStepData,
            lastSaved: new Date(),
            updatedAt: new Date()
          })
          .where(eq(onboardingFormData.id, existingFormData.id))
          .returning();

        return reply.code(200).send({
          success: true,
          message: 'Onboarding step updated successfully',
          data: {
            step,
            kindeUserId,
            email: userEmail,
            formDataId: updated.id,
            updatedAt: updated.updatedAt
          }
        });
      } else {
        // Create new record
        const [created] = await db
          .insert(onboardingFormData)
          .values({
            kindeUserId,
            email: userEmail,
            currentStep: step,
            flowType: data?.flowType || 'newBusiness',
            formData: mergedFormData,
            stepData: updatedStepData,
            lastSaved: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return reply.code(201).send({
          success: true,
          message: 'Onboarding form data created successfully',
          data: {
            step,
            kindeUserId,
            email: userEmail,
            formDataId: created.id,
            createdAt: created.createdAt
          }
        });
      }

    } catch (error) {
      request.log.error('Error updating onboarding step:', error);
      return reply.code(500).send({ error: 'Failed to update onboarding step' });
    }
  });
}
