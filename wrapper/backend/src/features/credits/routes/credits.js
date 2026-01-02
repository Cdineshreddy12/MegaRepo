import { CreditService } from '../services/credit-service.js';
// REMOVED: CreditAllocationService - Application-specific allocations removed completely
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { trackUsage } from '../../../middleware/usage.js';
import { getPlanLimits } from '../../../middleware/planRestrictions.js';
// REMOVED: credit-allocation-validation middleware - Applications manage their own credits
import { db } from '../../../db/index.js';
import { credits, creditTransactions, creditPurchases, tenantUsers, entities } from '../../../db/schema/index.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import ErrorResponses from '../../../utils/error-responses.js';

export default async function creditRoutes(fastify, options) {
  console.log('🔧 REGISTERING CREDIT ROUTES...');

  // Test endpoint to verify route registration
  fastify.get('/test-route', async (request, reply) => {
    console.log('🎯 CREDIT TEST ROUTE HIT!');
    return { success: true, message: 'Credit routes are working!' };
  });
  // Get current credit balance for authenticated user
  fastify.get('/current', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      // Try to import Redis cache (may fail if Redis is not available)
      let creditCache = null;
      try {
        const cacheModule = await import('../utils/redis-cache.js');
        creditCache = cacheModule.creditCache;
      } catch (cacheError) {
        console.warn('⚠️ Redis cache not available, skipping cache:', cacheError.message);
      }

      console.log('🔍 Credit API: Request received', request.userContext);
      const userId = request.userContext.userId;
      let tenantId = request.userContext.tenantId;
      
      // Generate cache key
      const cacheKey = `credits:current:${userId}:${tenantId || 'no-tenant'}`;

      console.log('💰 Credit API: Request received', {
        userId,
        tenantId,
        hasTenantId: !!tenantId,
        userContext: request.userContext
      });

      if (!tenantId) {
        console.log('⚠️ Credit API: User not associated with organization, checking onboarding status')
        // Check if user needs onboarding instead of hard error
        try {
          console.log('🔍 Credit API: Querying database for user record');
          const onboardingResponse = await db
            .select()
            .from(tenantUsers)
            .where(eq(tenantUsers.kindeUserId, userId))
            .limit(1);

          console.log('✅ Credit API: Database query successful, found', onboardingResponse.length, 'records');

          if (onboardingResponse.length === 0) {
            // User doesn't exist in our system - likely needs onboarding
            console.log('🏢 Credit API: User record not found, likely needs onboarding')
            return reply.code(404).send({
              success: false,
              error: 'Organization Required',
              message: 'Please complete organization setup to access credit features',
              resource: 'Organization',
              statusCode: 404,
              requestId: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              requiresOnboarding: true
            });
          }

          // User exists - check if they have a tenant
          const userRecord = onboardingResponse[0];
          console.log('👤 Credit API: Found user record:', {
            userId: userRecord.userId,
            tenantId: userRecord.tenantId,
            onboardingCompleted: userRecord.onboardingCompleted,
            hasTenantId: !!userRecord.tenantId
          });

          // CRITICAL FIX: If user has a tenant in database but request context has null tenantId,
          // use the tenantId from the database record
          if (userRecord.tenantId && userRecord.onboardingCompleted) {
            console.log('✅ Credit API: User has completed onboarding with tenant, querying credit data');
            // Set the tenantId from database and continue with normal credit query
            tenantId = userRecord.tenantId;
          } else {
            // User doesn't have a completed tenant setup
            console.log('⚠️ Credit API: User does not have completed tenant setup, returning onboarding required');
            return reply.code(404).send({
              success: false,
              error: 'Organization Required',
              message: 'Please complete organization setup to access credit features',
              resource: 'Organization',
              statusCode: 404,
              requestId: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              requiresOnboarding: true
            });
          }
        } catch (onboardingError) {
          console.error('❌ Credit API: Error checking onboarding status:', onboardingError);

          // CRITICAL FIX: If database query fails but user is authenticated,
          // provide default credit balance instead of hard error
          console.log('⚠️ Credit API: Database query failed but user is authenticated, returning default credit balance');
        }

        // Return default credit balance for authenticated users without tenant context
        console.log('💰 Credit API: Returning default credit balance for authenticated user');
        return {
          success: true,
          data: {
            tenantId: null, // No tenant yet
            availableCredits: 0,
            freeCredits: 0,
            paidCredits: 0,
            seasonalCredits: 0,
            reservedCredits: 0,
            totalCredits: 0,
            creditBalance: 0,
            plan: 'free',
            status: 'no_credits',
            lastPurchase: null,
            creditExpiry: null,
            freeCreditsExpiry: null,
            paidCreditsExpiry: null,
            seasonalCreditsExpiry: null,
            usageThisPeriod: 0,
            periodLimit: 0,
            periodType: 'month',
            lowBalanceThreshold: 100,
            criticalBalanceThreshold: 10,
            restrictionsActive: true,
            alerts: [{
              id: 'onboarding_required',
              type: 'info',
              message: 'Complete your organization setup to access credit features',
              priority: 'medium'
            }]
          }
        };
      }

      // Find all organization entities for this tenant
      console.log('🔍 Credit API: Finding organization entities for tenant:', tenantId);
      let organizationEntities = [];
      try {
        organizationEntities = await db
          .select()
          .from(entities)
          .where(and(
            eq(entities.tenantId, tenantId),
            eq(entities.entityType, 'organization'),
            eq(entities.isActive, true)
          ));
      } catch (dbError) {
        console.error('❌ Error querying organization entities:', dbError);
        throw new Error(`Database query failed: ${dbError.message}`);
      }

      let creditBalance = null;

      if (organizationEntities.length > 0) {
        console.log('✅ Credit API: Found organization entities:', organizationEntities.length);

        // Try to find credits on any organization entity for this tenant
        // Start with the default entity if available, otherwise try all entities
        const defaultEntity = organizationEntities.find(entity => entity.isDefault);
        const entitiesToCheck = defaultEntity ? [defaultEntity] : organizationEntities;

        for (const entity of entitiesToCheck) {
          console.log('🔍 Checking credits for entity:', entity.entityId, entity.entityName);

          try {
            const entityCreditBalance = await CreditService.getCurrentBalance(tenantId, 'organization', entity.entityId);

            // If we found credits (not the default "no credits" response), use this balance
            if (entityCreditBalance && entityCreditBalance.availableCredits > 0) {
              console.log('💰 Credit API: Found credits on entity:', entity.entityId, entity.entityName);
              creditBalance = entityCreditBalance;
              creditBalance.entityId = entity.entityId; // Ensure correct entity ID is returned
              break; // Use the first entity that has credits
            }
          } catch (entityError) {
            console.error(`❌ Error checking credits for entity ${entity.entityId}:`, entityError);
            // Continue to next entity instead of failing
          }
        }

        // If no entity has credits, use the default entity for consistent API response
        if (!creditBalance && defaultEntity) {
          console.log('⚠️ Credit API: No credits found, using default entity for response');
          try {
            creditBalance = await CreditService.getCurrentBalance(tenantId, 'organization', defaultEntity.entityId);
            creditBalance.entityId = defaultEntity.entityId;
          } catch (entityError) {
            console.error(`❌ Error getting balance for default entity ${defaultEntity.entityId}:`, entityError);
            // Will fall through to default response
          }
        } else if (!creditBalance && organizationEntities.length > 0) {
          // Fallback to first entity if no default
          console.log('⚠️ Credit API: No credits found, using first entity for response');
          try {
            creditBalance = await CreditService.getCurrentBalance(tenantId, 'organization', organizationEntities[0].entityId);
            creditBalance.entityId = organizationEntities[0].entityId;
          } catch (entityError) {
            console.error(`❌ Error getting balance for first entity ${organizationEntities[0].entityId}:`, entityError);
            // Will fall through to default response
          }
        }

        console.log('💰 Credit API: Final credit balance:', creditBalance);
      } else {
        console.log('⚠️ Credit API: No organization entities found for tenant');
      }

      if (!creditBalance) {
        // Return default credit balance for new users
        const defaultEntityId = organizationEntities.length > 0 ? organizationEntities[0].entityId : tenantId;
        return {
          success: true,
          data: {
            tenantId,
            entityId: defaultEntityId,
            availableCredits: 0,
            freeCredits: 0,
            paidCredits: 0,
            seasonalCredits: 0,
            reservedCredits: 0,
            lowBalanceThreshold: 100,
            criticalBalanceThreshold: 10,
            plan: 'credit_based',
            status: 'no_credits',
            creditExpiry: null,
            freeCreditsExpiry: null,
            paidCreditsExpiry: null,
            seasonalCreditsExpiry: null,
            usageThisPeriod: 0,
            periodLimit: 0,
            periodType: 'month',
            alerts: [{
              id: 'no_credit_record',
              type: 'no_credit_record',
              severity: 'info',
              title: 'No Credit Record',
              message: 'This entity does not have a credit record yet',
              threshold: 0,
              currentValue: 0,
              actionRequired: 'initialize_credits'
            }]
          }
        };
      }

      // Try to get from cache first
      if (creditCache) {
        try {
          const cachedBalance = await creditCache.get(cacheKey);
          if (cachedBalance) {
            console.log('✅ Credit balance retrieved from cache');
            return {
              success: true,
              data: cachedBalance,
              cached: true
            };
          }
        } catch (cacheError) {
          console.warn('⚠️ Cache read error (non-fatal):', cacheError.message);
        }
      }

      // Cache the result for 60 seconds (short TTL for frequently changing data)
      if (creditBalance && creditCache) {
        try {
          await creditCache.set(cacheKey, creditBalance, 60);
          console.log('✅ Credit balance cached');
        } catch (cacheError) {
          console.warn('⚠️ Cache write error (non-fatal):', cacheError.message);
          // Don't fail the request if caching fails
        }
      }

      return {
        success: true,
        data: creditBalance
      };
    } catch (error) {
      console.error('❌ Error fetching current credit balance:', error);
      request.log.error('Error fetching current credit balance:', error);
      
      // Provide more detailed error information
      const errorMessage = error.message || 'Unknown error';
      const errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
      
      return reply.code(500).send({ 
        error: 'Failed to fetch credit balance',
        message: errorMessage,
        ...(errorStack && { stack: errorStack })
      });
    }
  });

  // Get credit transaction history
  fastify.get('/transactions', {
    preHandler: authenticateToken,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 50 },
          type: { type: 'string', enum: ['purchase', 'consumption', 'expiry', 'transfer_in', 'transfer_out', 'refund', 'adjustment'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 50, type, startDate, endDate } = request.query;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      const transactions = await CreditService.getTransactionHistory(tenantId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        startDate,
        endDate
      });

      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      request.log.error('Error fetching credit transactions:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit transactions' });
    }
  });

  // Get credit alerts/notifications
  fastify.get('/alerts', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      const alerts = await CreditService.getActiveAlerts(tenantId);

      return {
        success: true,
        data: alerts
      };
    } catch (error) {
      request.log.error('Error fetching credit alerts:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit alerts' });
    }
  });

  // Purchase credits
  fastify.post('/purchase', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['creditAmount', 'paymentMethod'],
        properties: {
          creditAmount: { type: 'number', minimum: 1 },
          paymentMethod: { type: 'string', enum: ['stripe', 'bank_transfer', 'check'] },
          currency: { type: 'string', default: 'USD' },
          notes: { type: 'string' },
          entityType: { type: 'string', enum: ['organization', 'location'], default: 'organization' },
          entityId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { creditAmount, paymentMethod, currency = 'USD', notes, entityType = 'organization', entityId } = request.body;
      const tenantId = request.userContext.tenantId;
      const internalUserId = request.userContext.internalUserId; // Use internal UUID instead of Kinde ID

      if (!tenantId) {
        return reply.code(400).send({
          error: 'No organization found',
          message: 'User must be associated with an organization to purchase credits'
        });
      }

      console.log('🔄 Credit purchase requested:', { tenantId, creditAmount, paymentMethod, currency });

      const result = await CreditService.purchaseCredits({
        tenantId,
        userId: internalUserId, // Pass internal UUID instead of Kinde ID
        creditAmount: parseInt(creditAmount),
        paymentMethod,
        currency,
        notes,
        entityType,
        entityId
      });

      // Log successful credit purchase initiation
      try {
        const ActivityLogger = (await import('../../../services/activityLogger.js')).default;
        const requestContext = ActivityLogger.createRequestContext(request);
        await ActivityLogger.logActivity(
          internalUserId,
          tenantId,
          null,
          'credit.purchase_success',
          {
            creditAmount: parseInt(creditAmount),
            paymentMethod,
            currency,
            purchaseId: result.purchaseId,
            sessionId: result.sessionId,
            entityType,
            entityId
          },
          requestContext
        );
      } catch (logError) {
        console.warn('⚠️ Failed to log credit purchase activity:', logError.message);
      }

      return {
        success: true,
        data: result,
        message: 'Credit purchase initiated successfully'
      };
    } catch (error) {
      request.log.error('Error processing credit purchase:', error);
      
      // Log failed credit purchase
      try {
        const ActivityLogger = (await import('../../../services/activityLogger.js')).default;
        const requestContext = ActivityLogger.createRequestContext(request);
        await ActivityLogger.logActivity(
          request.userContext?.internalUserId || request.userContext?.userId,
          request.userContext?.tenantId,
          null,
          'credit.purchase_failed',
          {
            error: error.message,
            creditAmount: request.body?.creditAmount,
            paymentMethod: request.body?.paymentMethod,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          },
          requestContext
        );
      } catch (logError) {
        console.warn('⚠️ Failed to log credit purchase failure activity:', logError.message);
      }
      
      return reply.code(500).send({
        error: 'Failed to process credit purchase',
        message: error.message
      });
    }
  });

  // Consume credits (for operations)
  // REMOVED: validateApplicationCreditAllocation, autoReplenishApplicationCredits, validateCreditConsumption - Applications manage their own credits
  // Credit validation is handled by CreditService.consumeCredits() in the route handler
  fastify.post('/consume', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['operationCode', 'creditCost'],
        properties: {
          operationCode: { type: 'string' },
          creditCost: { type: 'number', minimum: 0.01 },
          operationId: { type: 'string' },
          description: { type: 'string' },
          metadata: { type: 'object' },
          entityType: { type: 'string', enum: ['organization', 'location'], default: 'organization' },
          entityId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { operationCode, creditCost, operationId, description, metadata, entityType = 'organization', entityId } = request.body;
      const tenantId = request.userContext.tenantId;
      const userId = request.userContext.userId;

      if (!tenantId) {
        return reply.code(400).send({
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      const result = await CreditService.consumeCredits({
        tenantId,
        userId,
        operationCode,
        creditCost: parseFloat(creditCost),
        operationId,
        description,
        metadata,
        entityType,
        entityId
      });

      if (!result.success) {
        return reply.code(402).send({
          error: 'Insufficient credits',
          message: result.message,
          data: result.data
        });
      }

      return {
        success: true,
        data: result.data,
        message: 'Credits consumed successfully'
      };
    } catch (error) {
      request.log.error('Error consuming credits:', error);
      return reply.code(500).send({
        error: 'Failed to consume credits',
        message: error.message
      });
    }
  });

  // Get credit usage summary
  fastify.get('/usage-summary', {
    preHandler: authenticateToken,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { period = 'month', startDate, endDate } = request.query;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      const summary = await CreditService.getUsageSummary(tenantId, {
        period,
        startDate,
        endDate
      });

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      request.log.error('Error fetching credit usage summary:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage summary' });
    }
  });

  // Transfer credits between entities
  fastify.post('/transfer', {
    preHandler: [authenticateToken, requirePermission('credits:transfer')],
    schema: {
      body: {
        type: 'object',
        required: ['toEntityType', 'toEntityId', 'creditAmount'],
        properties: {
          fromEntityId: { type: 'string', format: 'uuid' }, // Optional: specify source entity
          toEntityType: { type: 'string', enum: ['organization', 'location'] },
          toEntityId: { type: 'string' },
          creditAmount: { type: 'number', minimum: 0.01 },
          reason: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { fromEntityId, toEntityType, toEntityId, creditAmount, reason } = request.body;
      const tenantId = request.userContext.tenantId;
      const internalUserId = request.userContext.internalUserId; // Use internal UUID instead of Kinde ID

      if (!tenantId) {
        return reply.code(400).send({
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      // Find the source entity that has credits
      let sourceEntityId = fromEntityId;

      if (!sourceEntityId) {
        // If no source entity specified, find the entity that has credits
        console.log('🔍 Finding source entity with credits for tenant:', tenantId);

        const organizationEntities = await db
          .select()
          .from(entities)
          .where(and(
            eq(entities.tenantId, tenantId),
            eq(entities.entityType, 'organization'),
            eq(entities.isActive, true)
          ));

        if (organizationEntities.length > 0) {
          // Try to find credits on any organization entity for this tenant
          const defaultEntity = organizationEntities.find(entity => entity.isDefault);
          const entitiesToCheck = defaultEntity ? [defaultEntity] : organizationEntities;

          for (const entity of entitiesToCheck) {
            console.log('🔍 Checking credits for entity:', entity.entityId, entity.entityName);

            const entityCreditBalance = await CreditService.getCurrentBalance(tenantId, 'organization', entity.entityId);

            // If we found credits (not the default "no credits" response), use this as source
            if (entityCreditBalance && entityCreditBalance.availableCredits > 0) {
              console.log('💰 Found credits on entity:', entity.entityId, entity.entityName);
              sourceEntityId = entity.entityId;
              break; // Use the first entity that has credits
            }
          }

          // If no entity has credits, use the default entity as fallback
          if (!sourceEntityId) {
            if (defaultEntity) {
              console.log('⚠️ No credits found, using default entity as source:', defaultEntity.entityId);
              sourceEntityId = defaultEntity.entityId;
            } else {
              console.log('⚠️ No credits found, using first entity as source:', organizationEntities[0].entityId);
              sourceEntityId = organizationEntities[0].entityId;
            }
          }
        } else {
          return reply.code(400).send({
            error: 'No source entity found',
            message: 'No organization entities found for this tenant'
          });
        }
      }

      if (!sourceEntityId) {
        return reply.code(400).send({
          error: 'No source entity with credits',
          message: 'Could not find a source entity with available credits'
        });
      }

      console.log('🔄 Transferring credits from entity:', sourceEntityId, 'to entity:', toEntityId);

      const result = await CreditService.transferCredits({
        fromTenantId: sourceEntityId, // Use the entity ID that has credits
        toEntityType,
        toEntityId,
        creditAmount: parseFloat(creditAmount),
        initiatedBy: internalUserId,
        reason
      });

      if (!result.success) {
        return reply.code(400).send({
          error: 'Transfer failed',
          message: result.message
        });
      }

      return {
        success: true,
        data: result.data,
        message: 'Credits transferred successfully'
      };
    } catch (error) {
      request.log.error('Error transferring credits:', error);
      return reply.code(500).send({
        error: 'Failed to transfer credits',
        message: error.message
      });
    }
  });

  // Get effective credit configuration for operations (tenant-specific → global → default)
  fastify.get('/config/:operationCode', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['operationCode'],
        properties: {
          operationCode: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { operationCode } = request.params;
      const tenantId = request.userContext.tenantId; // May be null for users without tenant association

      const config = await CreditService.getOperationConfig(operationCode, tenantId);

      return {
        success: true,
        data: config
      };
    } catch (error) {
      request.log.error('Error fetching credit configuration:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit configuration' });
    }
  });

  // Get effective module credit configuration (tenant-specific → global → default)
  fastify.get('/config/module/:moduleCode', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['moduleCode'],
        properties: {
          moduleCode: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { moduleCode } = request.params;
      const tenantId = request.userContext.tenantId; // May be null for users without tenant association

      const config = await CreditService.getModuleConfig(moduleCode, tenantId);

      return {
        success: true,
        data: config
      };
    } catch (error) {
      request.log.error('Error fetching module configuration:', error);
      return reply.code(500).send({ error: 'Failed to fetch module configuration' });
    }
  });

  // Get effective application credit configuration (tenant-specific → global → default)
  fastify.get('/config/app/:appCode', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['appCode'],
        properties: {
          appCode: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { appCode } = request.params;
      const tenantId = request.userContext.tenantId; // May be null for users without tenant association

      const config = await CreditService.getAppConfig(appCode, tenantId);

      return {
        success: true,
        data: config
      };
    } catch (error) {
      request.log.error('Error fetching application configuration:', error);
      return reply.code(500).send({ error: 'Failed to fetch application configuration' });
    }
  });

  // Get all global credit configurations (public - any authenticated user)
  fastify.get('/configurations', {
    preHandler: authenticateToken,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { isActive } = request.query;

      const configurations = await CreditService.getAllConfigurations({
        isActive
      });

      return {
        success: true,
        data: configurations
      };
    } catch (error) {
      request.log.error('Error fetching global configurations:', error);
      return reply.code(500).send({ error: 'Failed to fetch configurations' });
    }
  });

  // Set operation configuration (global or tenant-specific, company admin only)
  fastify.post('/config/operation/:operationCode', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      params: {
        type: 'object',
        required: ['operationCode'],
        properties: {
          operationCode: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['creditCost'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' }, // Optional: set for tenant-specific, omit for global
          moduleCode: { type: 'string' },
          appCode: { type: 'string' },
          creditCost: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: ['operation', 'record', 'minute', 'MB', 'GB'], default: 'operation' },
          unitMultiplier: { type: 'number', minimum: 0, default: 1 },
          freeAllowance: { type: 'integer', minimum: 0, default: 0 },
          freeAllowancePeriod: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' },
          volumeTiers: { type: 'array' },
          allowOverage: { type: 'boolean', default: true },
          overageLimit: { type: 'integer', minimum: 0 },
          overagePeriod: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' },
          overageCost: { type: 'number', minimum: 0 },
          scope: { type: 'string', enum: ['global', 'organization'], default: 'global' },
          isInherited: { type: 'boolean', default: false },
          isActive: { type: 'boolean', default: true },
          priority: { type: 'integer', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { operationCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.userId;
      const tenantId = configData.tenantId || null; // Extract tenantId from request body

      const result = await CreditService.setOperationConfig(operationCode, configData, userId, tenantId);

      const configType = tenantId ? 'tenant-specific' : 'global';
      return {
        success: true,
        data: result,
        message: `${configType} operation configuration updated successfully`
      };
    } catch (error) {
      request.log.error('Error setting operation configuration:', error);
      return reply.code(500).send({ error: 'Failed to update operation configuration' });
    }
  });

  // Set module configuration (global or tenant-specific, company admin only)
  fastify.post('/config/module/:moduleCode', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      params: {
        type: 'object',
        required: ['moduleCode'],
        properties: {
          moduleCode: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['defaultCreditCost'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' }, // Optional: set for tenant-specific, omit for global
          appCode: { type: 'string' },
          defaultCreditCost: { type: 'number', minimum: 0 },
          defaultUnit: { type: 'string', enum: ['operation', 'record', 'minute', 'MB', 'GB'], default: 'operation' },
          maxOperationsPerPeriod: { type: 'integer', minimum: 0 },
          periodType: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' },
          creditBudget: { type: 'number', minimum: 0 },
          operationOverrides: { type: 'object' },
          isActive: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { moduleCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.userId;
      const tenantId = configData.tenantId || null; // Extract tenantId from request body

      const result = await CreditService.setModuleConfig(moduleCode, configData, userId, tenantId);

      const configType = tenantId ? 'tenant-specific' : 'global';
      return {
        success: true,
        data: result,
        message: `${configType} module configuration updated successfully`
      };
    } catch (error) {
      request.log.error('Error setting module configuration:', error);
      return reply.code(500).send({ error: 'Failed to update module configuration' });
    }
  });

  // Set application configuration (global or tenant-specific, company admin only)
  fastify.post('/config/app/:appCode', {
    preHandler: [authenticateToken, requirePermission('admin:credits')],
    schema: {
      params: {
        type: 'object',
        required: ['appCode'],
        properties: {
          appCode: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['defaultCreditCost'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' }, // Optional: set for tenant-specific, omit for global
          billingModel: { type: 'string', enum: ['bulk_then_per_usage', 'per_usage_only', 'bulk_only'], default: 'bulk_then_per_usage' },
          defaultCreditCost: { type: 'number', minimum: 0 },
          defaultUnit: { type: 'string', enum: ['operation', 'record', 'minute', 'MB', 'GB'], default: 'operation' },
          maxDailyOperations: { type: 'integer', minimum: 0 },
          maxMonthlyOperations: { type: 'integer', minimum: 0 },
          creditBudget: { type: 'number', minimum: 0 },
          premiumFeatures: { type: 'object' },
          moduleDefaults: { type: 'object' },
          isActive: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { appCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.userId;
      const tenantId = configData.tenantId || null; // Extract tenantId from request body

      const result = await CreditService.setAppConfig(appCode, configData, userId, tenantId);

      const configType = tenantId ? 'tenant-specific' : 'global';
      return {
        success: true,
        data: result,
        message: `${configType} application configuration updated successfully`
      };
    } catch (error) {
      request.log.error('Error setting application configuration:', error);
      return reply.code(500).send({ error: 'Failed to update application configuration' });
    }
  });

  // Mark alert as read
  fastify.put('/alerts/:alertId/read', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['alertId'],
        properties: {
          alertId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { alertId } = request.params;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      await CreditService.markAlertAsRead(tenantId, alertId);

      return {
        success: true,
        message: 'Alert marked as read'
      };
    } catch (error) {
      request.log.error('Error marking alert as read:', error);
      return reply.code(500).send({ error: 'Failed to mark alert as read' });
    }
  });

  // Get credit packages available for purchase
  fastify.get('/packages', async (request, reply) => {
    try {
      const packages = await CreditService.getAvailablePackages();

      return {
        success: true,
        data: packages
      };
    } catch (error) {
      request.log.error('Error fetching credit packages:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit packages' });
    }
  });

  // ===============================
  // REMOVED: APPLICATION CREDIT ALLOCATION ROUTES
  // ===============================
  // Applications now manage their own credit consumption
  // They consume directly from organization balance using CreditService.consumeCredits()
  // All application allocation routes have been removed:
  // - POST /allocate/application
  // - GET /allocations/application
  // - GET /balance/application/:application
  // - POST /transfer/application
  // - POST /consume/application
  // - POST /sync-balance
  // - POST /sync-balance-check

  // Get credit balance monitor status (admin only)
  fastify.get('/monitor-status', {
    preHandler: [authenticateToken, requirePermission('admin:credits')]
  }, async (request, reply) => {
    try {
      const creditBalanceMonitor = (await import('../services/credit-balance-monitor.js')).default;
      const status = creditBalanceMonitor.getStatus();

      return {
        success: true,
        data: status
      };
    } catch (error) {
      request.log.error('Error fetching monitor status:', error);
      return reply.code(500).send({
        error: 'Failed to fetch monitor status',
        message: error.message
      });
    }
  });

  // REMOVED: All application allocation routes - Applications manage their own credits
  // The following routes have been completely removed:
  // - POST /allocate/application
  // - GET /allocations/application  
  // - GET /balance/application/:application
  // - POST /transfer/application
  // - POST /consume/application
  // - POST /sync-balance
  // - POST /sync-balance-check
  // Applications now consume directly from organization balance using CreditService.consumeCredits()

  // Get credit statistics for dashboard
  fastify.get('/stats', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      const stats = await CreditService.getCreditStats(tenantId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      request.log.error('Error fetching credit statistics:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit statistics' });
    }
  });

  // Get detailed credit purchase payment information by sessionId
  fastify.get('/payment/:identifier', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['identifier'],
        properties: {
          identifier: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { identifier } = request.params;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      let payment;
      let stripeSession = null;
      let paymentMethodDetails = {};

      try {
        // Check if identifier is a valid UUID (purchaseId)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

        if (isUUID) {
          // Try to find by purchaseId first (if it's a UUID)
          let [purchaseById] = await db
            .select()
            .from(creditPurchases)
            .where(and(
              eq(creditPurchases.purchaseId, identifier),
              eq(creditPurchases.tenantId, tenantId)
            ))
            .limit(1);

          if (purchaseById) {
            payment = purchaseById;
          }
        }

        // If not found by purchaseId or identifier is not a UUID, try by Stripe payment intent ID
        if (!payment) {
          let [purchaseByIntent] = await db
            .select()
            .from(creditPurchases)
            .where(and(
              eq(creditPurchases.stripePaymentIntentId, identifier),
              eq(creditPurchases.tenantId, tenantId)
            ))
            .limit(1);

          if (purchaseByIntent) {
            payment = purchaseByIntent;
          }
        }

        // Also try by Stripe checkout session ID - need to get payment intent from Stripe first
        if (!payment && (identifier.startsWith('cs_test_') || identifier.startsWith('cs_live_'))) {
          try {
            // Import Stripe to get payment intent from checkout session
            const Stripe = (await import('stripe')).default;
            if (process.env.STRIPE_SECRET_KEY) {
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
              stripeSession = await stripe.checkout.sessions.retrieve(identifier, {
                expand: ['payment_intent.payment_method']
              });
              
              if (stripeSession.payment_intent) {
                let [purchaseByIntent] = await db
                  .select()
                  .from(creditPurchases)
                  .where(and(
                    eq(creditPurchases.stripePaymentIntentId, typeof stripeSession.payment_intent === 'string' 
                      ? stripeSession.payment_intent 
                      : stripeSession.payment_intent.id),
                    eq(creditPurchases.tenantId, tenantId)
                  ))
                  .limit(1);

                if (purchaseByIntent) {
                  payment = purchaseByIntent;
                }

                // Fetch payment method details from Stripe
                try {
                  const paymentIntent = typeof stripeSession.payment_intent === 'string'
                    ? await stripe.paymentIntents.retrieve(stripeSession.payment_intent, {
                        expand: ['payment_method']
                      })
                    : stripeSession.payment_intent;

                  if (paymentIntent.payment_method) {
                    const pm = typeof paymentIntent.payment_method === 'string'
                      ? await stripe.paymentMethods.retrieve(paymentIntent.payment_method)
                      : paymentIntent.payment_method;
                    
                    if (pm.card) {
                      paymentMethodDetails = {
                        card: {
                          brand: pm.card.brand,
                          last4: pm.card.last4,
                          exp_month: pm.card.exp_month,
                          exp_year: pm.card.exp_year
                        }
                      };
                    }
                  }
                } catch (pmError) {
                  console.log('Could not fetch payment method details:', pmError.message);
                }
              }
            }
          } catch (stripeError) {
            console.log('Could not retrieve Stripe session:', stripeError.message);
            // Continue to return 404 if not found
          }
        }
      } catch (dbError) {
        console.error('Database error in credit payment lookup:', dbError);
        return reply.code(500).send({
          error: 'Database error',
          message: 'Failed to query credit payment records'
        });
      }

      if (!payment) {
        // Check if this is a checkout session that hasn't completed yet
        if (identifier.startsWith('cs_test_') || identifier.startsWith('cs_live_')) {
          return reply.code(404).send({
            error: 'Payment not found',
            message: 'Checkout session found but payment has not been completed yet. Please complete the payment process.',
            code: 'PAYMENT_PENDING'
          });
        }

        return ErrorResponses.notFound(reply, 'Credit Payment', 'Credit payment not found or does not belong to your organization');
      }

      try {
        // Try to get payment method details from payments table
        let paymentMethodDetailsFromDB = {};
        try {
          const { payments } = await import('../../../db/schema/subscriptions.js');
          const { eq, and } = await import('drizzle-orm');
          
          const [paymentRecord] = await db
            .select()
            .from(payments)
            .where(and(
              eq(payments.stripePaymentIntentId, payment.stripePaymentIntentId || identifier),
              eq(payments.tenantId, tenantId),
              eq(payments.paymentType, 'credit_purchase')
            ))
            .limit(1);
          
          if (paymentRecord?.paymentMethodDetails) {
            paymentMethodDetailsFromDB = paymentRecord.paymentMethodDetails;
          }
        } catch (dbError) {
          console.log('Could not fetch payment record:', dbError.message);
        }

        // Use payment method details from DB if available, otherwise use Stripe fetch
        const finalPaymentMethodDetails = Object.keys(paymentMethodDetailsFromDB).length > 0 
          ? paymentMethodDetailsFromDB 
          : paymentMethodDetails;

        // Get credit details and current balance using CreditService
        const creditBalance = await CreditService.getCurrentBalance(tenantId);
        
        // Calculate credits added in this transaction
        const creditsAdded = parseFloat(payment.creditAmount || 0);
        const totalAmount = parseFloat(payment.totalAmount || 0);
        
        // Calculate credit details from balance
        const availableCredits = parseFloat(creditBalance?.availableCredits || 0);
        const reservedCredits = parseFloat(creditBalance?.reservedCredits || 0);
        
        // Check if payment has been processed (credits added)
        const isProcessed = payment.status === 'completed' || payment.paymentStatus === 'completed' || payment.creditedAt;
        
        // For display purposes, treat all available credits as paid credits (since we don't track free vs paid separately in simplified schema)
        // If payment is pending, show what the balance will be after processing
        const finalAvailableCredits = isProcessed ? availableCredits : (availableCredits + creditsAdded);
        
        const creditDetails = {
          freeCredits: 0, // Not tracked in simplified schema
          paidCredits: finalAvailableCredits, // All available credits are considered paid
          freeCreditsExpiry: creditBalance?.freeCreditsExpiry || null,
          paidCreditsExpiry: creditBalance?.paidCreditsExpiry || null,
          totalCredits: finalAvailableCredits,
          availableCredits: finalAvailableCredits,
          reservedCredits: reservedCredits
        };

        // Return data in the format expected by PaymentSuccess component
        return {
          success: true,
          data: {
            sessionId: identifier, // Use the identifier (checkout session ID) passed in
            transactionId: payment.purchaseId,
            amount: totalAmount,
            currency: 'USD',
            planId: 'credit-purchase',
            planName: 'Credit Purchase',
            billingCycle: 'one-time',
            paymentMethod: payment.paymentMethod || 'card',
            paymentMethodDetails: finalPaymentMethodDetails,
            status: payment.status || payment.paymentStatus || 'completed',
            createdAt: payment.createdAt || payment.requestedAt,
            processedAt: payment.creditedAt || payment.paidAt || payment.createdAt,
            description: `Credit purchase: ${creditsAdded.toLocaleString()} credits for $${totalAmount.toFixed(2)}`,
            subscription: null, // Credit purchases don't have subscriptions
            features: [
              `${creditsAdded.toLocaleString()} credits added to account`,
              'Credits never expire',
              'Use across all applications'
            ],
            credits: creditsAdded,
            // Additional credit-specific fields
            creditsAdded: creditsAdded,
            creditDetails: creditDetails,
            creditBalance: {
              freeCredits: creditDetails.freeCredits,
              paidCredits: creditDetails.paidCredits,
              totalCredits: creditDetails.totalCredits,
              availableCredits: creditDetails.availableCredits,
              reservedCredits: creditDetails.reservedCredits
            },
            // Include full balance object for compatibility
            balance: creditBalance,
            // Include Stripe raw data for frontend extraction
            stripeRawData: stripeSession || {}
          }
        };
      } catch (error) {
        request.log.error('Error fetching credit payment details:', error);
        return reply.code(500).send({
          error: 'Failed to fetch credit payment details',
          message: error.message
        });
      }
    } catch (error) {
      request.log.error('Error in credit payment details route:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to process credit payment details request'
      });
    }
  });

  // Stripe webhook for credit purchase completion
  fastify.post('/webhook', {
    // Webhook endpoint should be public and handle raw body
    preHandler: (request, reply, done) => {
      // Stripe webhooks require raw body, not parsed JSON
      if (request.headers['content-type'] === 'application/json') {
        request.rawBody = JSON.stringify(request.body);
      } else {
        request.rawBody = request.body;
      }
      done();
    }
  }, async (request, reply) => {
    console.log('🎣 CREDIT WEBHOOK ENDPOINT HIT!');
    console.log('================================\n');

    try {
      console.log('🔥 WEBHOOK TRY BLOCK EXECUTING');

      const signature = request.headers['stripe-signature'];
      const rawBody = request.rawBody;

      console.log('🎣 CREDIT PURCHASE WEBHOOK RECEIVED');
      console.log('=====================================\n');

      console.log('📡 Webhook headers:', {
        'content-type': request.headers['content-type'],
        'stripe-signature': signature ? 'present' : 'missing',
        'user-agent': request.headers['user-agent']
      });

      console.log('📦 Raw body type:', typeof rawBody);
      console.log('📦 Raw body length:', rawBody ? rawBody.length : 'null');

      // Handle webhook verification with development mode support
      console.log('🔧 STARTING WEBHOOK VERIFICATION PROCESS');
      let event;
      try {
        // Check if we should bypass signature verification (development mode)
        const bypassSignature = process.env.BYPASS_WEBHOOK_SIGNATURE === 'true' ||
                               !process.env.STRIPE_WEBHOOK_SECRET ||
                               process.env.NODE_ENV === 'development';
        console.log('🔍 Bypass signature:', bypassSignature);

        if (signature && process.env.STRIPE_WEBHOOK_SECRET && !bypassSignature) {
          const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
          const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
          event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
          console.log('✅ Webhook signature verified');
        } else {
          console.log('⚠️ Webhook signature verification bypassed (dev mode)');

          // Parse the raw body - it's already a string from the content parser
          let eventData;
          try {
            console.log('🔍 Parsing webhook payload...');
            console.log('📝 Raw body preview:', rawBody.substring(0, 200) + '...');

            eventData = JSON.parse(rawBody);
            console.log('✅ Successfully parsed webhook payload');
            console.log('🎯 Event type:', eventData.type);

          } catch (parseError) {
            console.error('❌ Failed to parse webhook payload:', parseError.message);
            console.log('🔍 Raw body content (first 500 chars):', rawBody.substring(0, 500));
            return reply.code(400).send({ error: 'Invalid webhook payload format' });
          }

          event = {
            id: eventData.id || `evt_${Date.now()}`,
            type: eventData.type,
            data: { object: eventData.data?.object },
            created: Math.floor(Date.now() / 1000)
          };
        }
      } catch (error) {
        console.error('❌ Webhook verification failed:', error.message);
        return reply.code(400).send({ error: 'Webhook verification failed' });
      }

      console.log('🎯 Processing webhook event:', event.type);
      console.log('📋 Event ID:', event.id);

      // Handle credit purchase completion
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        console.log('💳 CHECKOUT SESSION COMPLETED:');
        console.log('   • Session ID:', session.id);
        console.log('   • Payment Status:', session.payment_status);
        console.log('   • Amount:', session.amount_total / 100);

        if (session.payment_status === 'paid' && session.metadata?.creditAmount) {
          console.log('\n🎯 CREDIT PURCHASE DETECTED - PROCESSING...\n');

          try {
            // Extract metadata
            const tenantId = session.metadata.tenantId;
            const userId = session.metadata.userId;
            const creditAmount = parseInt(session.metadata.creditAmount);
            const entityType = session.metadata.entityType || 'organization';
            const entityId = session.metadata.entityId || tenantId;

            console.log('📋 PURCHASE DETAILS:');
            console.log('   • Tenant ID:', tenantId);
            console.log('   • User ID:', userId);
            console.log('   • Credits:', creditAmount);
            console.log('   • Entity Type:', entityType);
            console.log('   • Entity ID:', entityId);

            if (!tenantId || !userId || !creditAmount) {
              console.error('❌ Missing required metadata');
              return reply.code(400).send({ error: 'Missing required metadata' });
            }

            // Fetch payment method details from Stripe
            let paymentMethodDetails = {};
            try {
              const Stripe = (await import('stripe')).default;
              if (process.env.STRIPE_SECRET_KEY && session.payment_intent) {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
                
                if (paymentIntent.payment_method) {
                  const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                  if (paymentMethod.card) {
                    paymentMethodDetails = {
                      card: {
                        brand: paymentMethod.card.brand,
                        last4: paymentMethod.card.last4,
                        exp_month: paymentMethod.card.exp_month,
                        exp_year: paymentMethod.card.exp_year
                      }
                    };
                    console.log('💳 Payment method details fetched:', paymentMethodDetails);
                  }
                }
              }
            } catch (stripeError) {
              console.warn('⚠️ Could not fetch payment method details from Stripe:', stripeError.message);
            }

            // Process the credit purchase
            const purchaseResult = await CreditService.purchaseCredits({
              tenantId,
              userId,
              creditAmount,
              paymentMethod: 'stripe',
              currency: 'USD',
              entityType,
              entityId,
              notes: `Stripe webhook: ${session.id}`,
              paymentMethodDetails: paymentMethodDetails
            });

            // Create payment record with payment method details
            try {
              const { PaymentService } = await import('../../subscriptions/services/payment-service.js');
              const totalAmount = parseFloat(session.metadata.totalAmount || (session.amount_total / 100).toString());
              
              await PaymentService.recordPayment({
                tenantId,
                stripePaymentIntentId: session.payment_intent || session.id,
                stripeCustomerId: session.customer,
                amount: totalAmount.toString(),
                currency: (session.currency || 'USD').toUpperCase(),
                status: 'succeeded',
                paymentMethod: 'card',
                paymentMethodDetails: paymentMethodDetails,
                paymentType: 'credit_purchase',
                description: `Credit purchase: ${creditAmount.toLocaleString()} credits for $${totalAmount.toFixed(2)}`,
                metadata: {
                  stripeCheckoutSessionId: session.id,
                  creditAmount: creditAmount.toString(),
                  purchaseId: purchaseResult.purchaseId,
                  entityType,
                  entityId,
                  ...session.metadata
                },
                stripeRawData: session,
                paidAt: new Date()
              });
              console.log('✅ Payment record created with payment method details');
            } catch (paymentRecordError) {
              console.warn('⚠️ Could not create payment record:', paymentRecordError.message);
            }

            console.log('✅ CREDIT PURCHASE PROCESSED:');
            console.log('   • Purchase ID:', purchaseResult.purchaseId);
            console.log('   • Credits Allocated:', creditAmount);
            console.log('   • Status: completed');

            return reply.code(200).send({
              success: true,
              message: 'Credit purchase processed successfully',
              purchaseId: purchaseResult.purchaseId,
              creditsAllocated: creditAmount
            });

          } catch (purchaseError) {
            console.error('❌ Credit purchase processing failed:', purchaseError.message);

            // Still return 200 to Stripe to prevent retries
            return reply.code(200).send({
              success: false,
              error: 'Credit purchase processing failed',
              message: purchaseError.message
            });
          }
        } else {
          console.log('⚠️ Payment not completed or not a credit purchase');
          return reply.code(200).send({ message: 'Payment not completed or not a credit purchase' });
        }
      } else {
        console.log('ℹ️ Unhandled webhook event type:', event.type);
        return reply.code(200).send({
          message: 'Event type not handled',
          receivedEventType: event.type,
          expectedEventType: 'checkout.session.completed'
        });
      }

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      // Return 500 for unexpected errors to trigger Stripe retry
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });
}
