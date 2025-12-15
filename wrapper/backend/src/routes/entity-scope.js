import { authenticateToken } from '../middleware/auth.js';
import { getUserAccessibleEntities, canAccessEntity } from '../middleware/entity-scope.js';
import { db } from '../db/index.js';
import { entities, responsiblePersons, tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import ErrorResponses from '../utils/error-responses.js';

export default async function entityScopeRoutes(fastify, options) {
  
  // Get current user's entity scope
  fastify.get('/entity-scope', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { internalUserId, tenantId } = request.userContext;
      
      const entityScope = await getUserAccessibleEntities(internalUserId, tenantId);
      
      return {
        success: true,
        scope: entityScope
      };
    } catch (error) {
      console.error('❌ Failed to get entity scope:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get entity scope',
        message: error.message
      });
    }
  });

  // Update responsible person for an entity
  fastify.patch('/entities/:entityId/responsible-person', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { entityId } = request.params;
      const { userId } = request.body; // User ID to assign as responsible person
      const { tenantId, internalUserId } = request.userContext;
      
      console.log('🔄 Updating responsible person:', { entityId, userId, tenantId });

      // Verify entity exists and belongs to tenant
      const [entity] = await db
        .select({
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          currentResponsiblePersonId: entities.responsiblePersonId
        })
        .from(entities)
        .where(and(
          eq(entities.entityId, entityId),
          eq(entities.tenantId, tenantId)
        ))
        .limit(1);

      if (!entity) {
        return ErrorResponses.notFound(reply, 'Entity', 'Entity not found');
      }

      // If userId is provided, verify user exists
      if (userId && userId !== 'none') {
        const [user] = await db
          .select({ userId: tenantUsers.userId })
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.tenantId, tenantId)
          ))
          .limit(1);

        if (!user) {
          return ErrorResponses.notFound(reply, 'User', 'User not found');
        }
      }

      // Update entity's responsible person
      const responsiblePersonId = (userId === 'none' || !userId) ? null : userId;
      
      await db
        .update(entities)
        .set({ 
          responsiblePersonId,
          updatedAt: new Date()
        })
        .where(and(
          eq(entities.entityId, entityId),
          eq(entities.tenantId, tenantId)
        ));

      // Deactivate old responsible person entry if exists
      if (entity.currentResponsiblePersonId) {
        await db
          .update(responsiblePersons)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(responsiblePersons.entityId, entityId),
            eq(responsiblePersons.userId, entity.currentResponsiblePersonId),
            eq(responsiblePersons.isActive, true)
          ));
      }

      // Create new responsible person entry if userId is provided
      if (responsiblePersonId) {
        await db
          .insert(responsiblePersons)
          .values({
            assignmentId: randomUUID(),
            tenantId,
            entityType: entity.entityType,
            entityId,
            userId: responsiblePersonId,
            responsibilityLevel: 'primary',
            scope: {
              creditManagement: true,
              userManagement: true,
              auditAccess: true,
              configurationManagement: true,
              reportingAccess: true
            },
            assignedBy: internalUserId,
            isActive: true,
            isConfirmed: false
          });
      }

      console.log('✅ Responsible person updated successfully');

      return {
        success: true,
        message: 'Responsible person updated successfully',
        data: {
          entityId,
          entityName: entity.entityName,
          responsiblePersonId
        }
      };
    } catch (error) {
      console.error('❌ Failed to update responsible person:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update responsible person',
        message: error.message
      });
    }
  });


  // Get responsible person details for an entity
  fastify.get('/entities/:entityId/responsible-person', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { entityId } = request.params;
      const { tenantId } = request.userContext;

      const [entity] = await db
        .select({
          responsiblePersonId: entities.responsiblePersonId
        })
        .from(entities)
        .where(and(
          eq(entities.entityId, entityId),
          eq(entities.tenantId, tenantId)
        ))
        .limit(1);

      if (!entity) {
        return ErrorResponses.notFound(reply, 'Entity', 'Entity not found');
      }

      if (!entity.responsiblePersonId) {
        return {
          success: true,
          data: null,
          message: 'No responsible person assigned'
        };
      }

      // Get responsible person details
      const [user] = await db
        .select({
          userId: tenantUsers.userId,
          name: tenantUsers.name,
          email: tenantUsers.email,
          avatar: tenantUsers.avatar
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, entity.responsiblePersonId))
        .limit(1);

      return {
        success: true,
        data: user || null
      };
    } catch (error) {
      console.error('❌ Failed to get responsible person:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get responsible person',
        message: error.message
      });
    }
  });
}

