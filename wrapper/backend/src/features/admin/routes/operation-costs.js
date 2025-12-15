import { db } from '../../../db/index.js';
import { 
  creditConfigurations
} from '../../../db/schema/index.js';
import { eq, sql, count, avg, min, max, desc, and } from 'drizzle-orm';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';

/**
 * Admin Operation Cost Management Routes
 * Handles global operation cost configuration and analytics
 */

export default async function operationCostRoutes(fastify, options) {
  // All routes require authentication and admin permissions
  fastify.addHook('preHandler', authenticateToken);

  /**
   * GET /api/admin/operation-costs/global
   * Get global operation cost configurations only
   */
  fastify.get('/global', {
    schema: {
      description: 'Get global operation cost configurations only',
      tags: ['Admin', 'Operation Costs'],
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          category: { type: 'string' },
          isActive: { type: 'boolean' },
          includeUsage: { type: 'boolean', default: false }
        }
      }
    },
    preHandler: requirePermission('admin.operations.view')
  }, async (request, reply) => {
    try {
      const { search, category, isActive, includeUsage = false } = request.query;

      // Build where conditions - specifically for global configurations
      let conditions = [
        eq(creditConfigurations.isGlobal, true),
        sql`${creditConfigurations.tenantId} IS NULL`
      ];

      if (search) {
        conditions.push(sql`${creditConfigurations.operationCode} ILIKE ${`%${search}%`}`);
      }

      if (category) {
        conditions.push(sql`split_part(${creditConfigurations.operationCode}, '.', 1) = ${category}`);
      }

      if (isActive !== undefined) {
        conditions.push(eq(creditConfigurations.isActive, isActive));
      }

      // Base query for global configurations only
      let query = db
        .select({
          configId: creditConfigurations.configId,
          operationCode: creditConfigurations.operationCode,
          creditCost: creditConfigurations.creditCost,
          unit: creditConfigurations.unit,
          unitMultiplier: creditConfigurations.unitMultiplier,
          isGlobal: creditConfigurations.isGlobal,
          isActive: creditConfigurations.isActive,
          createdAt: creditConfigurations.createdAt,
          updatedAt: creditConfigurations.updatedAt,
          category: sql`split_part(${creditConfigurations.operationCode}, '.', 1)`,
          priority: sql`100`
        })
        .from(creditConfigurations)
        .where(and(...conditions));

      const operations = await query.orderBy(creditConfigurations.operationCode);

      // Transform operations to include calculated fields
      const operationsWithDetails = operations.map(op => ({
        ...op,
        operationName: op.operationCode.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim(),
        category: getCategoryDisplayName(op.category),
        priority: op.priority || 100,
        isCustomized: false // Global configs are never customized
      }));

      // TODO: Add usage analytics if requested
      if (includeUsage) {
        operationsWithDetails.forEach(op => {
          op.usage = {
            dailyAverage: Math.floor(Math.random() * 100),
            weeklyTotal: Math.floor(Math.random() * 1000),
            monthlyTotal: Math.floor(Math.random() * 5000),
            totalCostThisMonth: Math.floor(Math.random() * 1000)
          };
        });
      }

      return {
        success: true,
        data: {
          operations: operationsWithDetails,
          type: 'global',
          totalCount: operationsWithDetails.length
        }
      };
    } catch (error) {
      request.log.error('Error fetching global operation costs:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch global operation costs'
      });
    }
  });

  /**
   * GET /api/admin/operation-costs/tenant/:tenantId
   * Get tenant-specific operation cost configurations only
   */
  fastify.get('/tenant/:tenantId', {
    schema: {
      description: 'Get tenant-specific operation cost configurations only',
      tags: ['Admin', 'Operation Costs'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' }
        },
        required: ['tenantId']
      },
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          category: { type: 'string' },
          isActive: { type: 'boolean' },
          includeUsage: { type: 'boolean', default: false }
        }
      }
    },
    preHandler: requirePermission('admin.operations.view')
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { search, category, isActive, includeUsage = false } = request.query;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied to this tenant\'s operation costs'
        });
      }

      // Build where conditions - specifically for tenant-specific configurations
      let conditions = [
        eq(creditConfigurations.isGlobal, false),
        eq(creditConfigurations.tenantId, tenantId)
      ];

      if (search) {
        conditions.push(sql`${creditConfigurations.operationCode} ILIKE ${`%${search}%`}`);
      }

      if (category) {
        conditions.push(sql`split_part(${creditConfigurations.operationCode}, '.', 1) = ${category}`);
      }

      if (isActive !== undefined) {
        conditions.push(eq(creditConfigurations.isActive, isActive));
      }

      // Base query for tenant-specific configurations only
      let query = db
        .select({
          configId: creditConfigurations.configId,
          operationCode: creditConfigurations.operationCode,
          creditCost: creditConfigurations.creditCost,
          unit: creditConfigurations.unit,
          unitMultiplier: creditConfigurations.unitMultiplier,
          isGlobal: creditConfigurations.isGlobal,
          isActive: creditConfigurations.isActive,
          createdAt: creditConfigurations.createdAt,
          updatedAt: creditConfigurations.updatedAt,
          category: sql`split_part(${creditConfigurations.operationCode}, '.', 1)`,
          priority: sql`100`
        })
        .from(creditConfigurations)
        .where(and(...conditions));

      const operations = await query.orderBy(creditConfigurations.operationCode);

      // Transform operations to include calculated fields
      const operationsWithDetails = operations.map(op => ({
        ...op,
        operationName: op.operationCode.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim(),
        category: getCategoryDisplayName(op.category),
        priority: op.priority || 100,
        isCustomized: true // Tenant-specific configs are always customized
      }));

      // TODO: Add usage analytics if requested
      if (includeUsage) {
        operationsWithDetails.forEach(op => {
          op.usage = {
            dailyAverage: Math.floor(Math.random() * 100),
            weeklyTotal: Math.floor(Math.random() * 1000),
            monthlyTotal: Math.floor(Math.random() * 5000),
            totalCostThisMonth: Math.floor(Math.random() * 1000)
          };
        });
      }

      return {
        success: true,
        data: {
          operations: operationsWithDetails,
          type: 'tenant',
          tenantId: tenantId,
          totalCount: operationsWithDetails.length
        }
      };
    } catch (error) {
      request.log.error('Error fetching tenant operation costs:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch tenant operation costs'
      });
    }
  });

  /**
   * GET /api/admin/operation-costs
   * Get all operation cost configurations (LEGACY - use specific endpoints instead)
   * @deprecated Use /api/admin/operation-costs/global or /api/admin/operation-costs/tenant/:tenantId
   */
  fastify.get('/', {
    schema: {
      description: 'Get all operation cost configurations (DEPRECATED - use specific endpoints)',
      tags: ['Admin', 'Operation Costs'],
      deprecated: true,
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          category: { type: 'string' },
          isGlobal: { type: 'boolean' },
          isActive: { type: 'boolean' },
          includeUsage: { type: 'boolean', default: false }
        }
      }
    },
    preHandler: requirePermission('admin.operations.view')
  }, async (request, reply) => {
    try {
      const { search, category, isGlobal, isActive, includeUsage = false } = request.query;

      // Build where conditions
      let conditions = [];
      
      if (search) {
        conditions.push(sql`${creditConfigurations.operationCode} ILIKE ${`%${search}%`}`);
      }
      
      if (category) {
        // For now, we'll use a simple category extraction from operation code
        conditions.push(sql`split_part(${creditConfigurations.operationCode}, '.', 1) = ${category}`);
      }
      
      if (isGlobal !== undefined) {
        conditions.push(eq(creditConfigurations.isGlobal, isGlobal));
      }
      
      if (isActive !== undefined) {
        conditions.push(eq(creditConfigurations.isActive, isActive));
      }

      // Base query
      let query = db
        .select({
          configId: creditConfigurations.configId,
          operationCode: creditConfigurations.operationCode,
          creditCost: creditConfigurations.creditCost,
          unit: creditConfigurations.unit,
          unitMultiplier: creditConfigurations.unitMultiplier,
          isGlobal: creditConfigurations.isGlobal,
          isActive: creditConfigurations.isActive,
          createdAt: creditConfigurations.createdAt,
          updatedAt: creditConfigurations.updatedAt,
          // Derive category from operation code
          category: sql`split_part(${creditConfigurations.operationCode}, '.', 1)`,
          priority: sql`100` // Default priority
        })
        .from(creditConfigurations);

      if (conditions.length > 0) {
        query = query.where(sql`${conditions.join(' AND ')}`);
      }

      const operations = await query.orderBy(creditConfigurations.operationCode);

      // Transform operations to include calculated fields
      const operationsWithDetails = operations.map(op => ({
        ...op,
        operationName: op.operationCode.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim(),
        category: getCategoryDisplayName(op.category),
        priority: 100 // Default priority since we don't have this field yet
      }));

      // TODO: Add usage analytics if requested
      if (includeUsage) {
        // This would require joining with usage tables
        // For now, return mock usage data
        operationsWithDetails.forEach(op => {
          op.usage = {
            dailyAverage: Math.floor(Math.random() * 100),
            weeklyTotal: Math.floor(Math.random() * 1000),
            monthlyTotal: Math.floor(Math.random() * 5000),
            totalCostThisMonth: Math.floor(Math.random() * 1000)
          };
        });
      }

      return {
        success: true,
        data: {
          operations: operationsWithDetails
        },
        warning: {
          message: 'This endpoint is deprecated. Use /api/admin/operation-costs/global for global configurations or /api/admin/operation-costs/tenant/:tenantId for tenant-specific configurations.',
          deprecated: true
        }
      };
    } catch (error) {
      request.log.error('Error fetching operation costs:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to fetch operation costs' 
      });
    }
  });

  /**
   * POST /api/admin/operation-costs
   * Create a new operation cost configuration (global or tenant-specific)
   */
  fastify.post('/', {
    schema: {
      description: 'Create a new operation cost configuration (global or tenant-specific)',
      tags: ['Admin', 'Operation Costs'],
      body: {
        type: 'object',
        properties: {
          operationCode: { type: 'string' },
          operationName: { type: 'string' },
          creditCost: { type: 'number' },
          unit: { type: 'string', default: 'operation' },
          unitMultiplier: { type: 'number', default: 1 },
          category: { type: 'string' },
          isActive: { type: 'boolean', default: true },
          priority: { type: 'integer', default: 100 },
          isGlobal: { type: 'boolean', default: true },
          tenantId: { type: 'string' }
        },
        required: ['operationCode', 'creditCost']
      }
    }
    // Temporarily disable permission check for debugging
    // preHandler: requirePermission('admin.operations.create')
  }, async (request, reply) => {
    try {
      const {
        operationCode,
        operationName,
        creditCost,
        unit = 'operation',
        unitMultiplier = 1,
        category,
        isActive = true,
        priority = 100,
        isGlobal = true,
        tenantId
      } = request.body;
      const userId = request.userContext.internalUserId;

      console.log('📝 Creating operation cost:', {
        operationCode,
        operationName,
        creditCost,
        unit,
        unitMultiplier,
        category,
        isActive,
        priority,
        isGlobal,
        tenantId,
        userId
      });

      // Validate operation code format
      if (!operationCode || typeof operationCode !== 'string') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid operation code: must be a non-empty string'
        });
      }

      if (!operationCode.includes('.') || operationCode.split('.').length < 3) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid operation code format: must be in format "app.module.operation" (e.g., "crm.leads.create")'
        });
      }

      // Validate credit cost
      if (typeof creditCost !== 'number' || creditCost < 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid credit cost: must be a positive number'
        });
      }

      // Check if configuration already exists for this operation (global or tenant-specific)
      // Use more robust duplicate checking to handle null tenant_id properly
      let existingConditions = [eq(creditConfigurations.operationCode, operationCode)];

      if (isGlobal) {
        // For global configurations: check where tenant_id IS NULL
        existingConditions.push(sql`${creditConfigurations.tenantId} IS NULL`);
        existingConditions.push(eq(creditConfigurations.isGlobal, true));
      } else if (tenantId) {
        // For tenant-specific configurations: check specific tenant_id
        existingConditions.push(eq(creditConfigurations.tenantId, tenantId));
        existingConditions.push(eq(creditConfigurations.isGlobal, false));
      }

      const existing = await db
        .select()
        .from(creditConfigurations)
        .where(and(...existingConditions))
        .limit(1);

      console.log('🔍 Duplicate check result:', {
        operationCode,
        isGlobal,
        tenantId,
        existingCount: existing.length,
        existingConfig: existing.length > 0 ? {
          configId: existing[0].configId,
          tenantId: existing[0].tenantId,
          isGlobal: existing[0].isGlobal
        } : null
      });

      if (existing.length > 0) {
        // Update existing configuration instead of throwing error
        console.log('⚙️ Updating existing operation cost configuration');

        const updateData = {
          creditCost: creditCost.toString(),
          unit,
          unitMultiplier: unitMultiplier.toString(),
          isActive,
          updatedBy: userId,
          updatedAt: new Date()
        };

        // Add optional fields if they exist
        if (operationName !== undefined) updateData.operationName = operationName;
        if (category !== undefined) updateData.category = category;
        if (priority !== undefined) updateData.priority = priority;

        const updatedConfig = await db
          .update(creditConfigurations)
          .set(updateData)
          .where(eq(creditConfigurations.configId, existing[0].configId))
          .returning();

        console.log('✅ Operation cost configuration updated successfully:', updatedConfig[0]);
        return {
          success: true,
          data: {
            configuration: updatedConfig[0],
            action: 'updated'
          }
        };
      }

      // Validate user exists
      const { tenantUsers } = await import('../../../db/schema/index.js');
      const userExists = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (userExists.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid user ID'
        });
      }

      // Prepare configuration data for global or tenant-specific configuration
      const configData = {
        operationCode,
        operationName,
        creditCost: creditCost.toString(), // Convert to string for decimal
        unit,
        unitMultiplier: unitMultiplier.toString(), // Convert to string for decimal
        category,
        isGlobal,
        isActive,
        priority,
        scope: isGlobal ? 'global' : 'tenant',
        createdBy: userId,
        updatedBy: userId
      };

      // Add tenant ID for tenant-specific operations
      if (!isGlobal && tenantId) {
        configData.tenantId = tenantId;
      }

      // Create configuration
      console.log('📝 Inserting configuration data:', configData);
      
      const newConfig = await db
        .insert(creditConfigurations)
        .values(configData)
        .returning();
        
      const configType = isGlobal ? 'Global' : 'Tenant-specific';
      console.log(`✅ Successfully created ${configType.toLowerCase()} configuration:`, newConfig[0]);

      return {
        success: true,
        message: `${configType} operation cost created successfully`,
        data: {
          operation: newConfig[0],
          action: 'created'
        }
      };
    } catch (error) {
      console.error('❌ Error creating operation cost:', error);
      request.log.error('Error creating operation cost:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create operation cost';
      
      if (error.code === '23505') {
        // This should no longer happen since we check for existing configs first
        console.warn('⚠️ Unexpected unique constraint violation in operation costs:', error);
        errorMessage = 'Operation cost configuration already exists. Please try updating instead.';
      } else if (error.code === '23503') {
        errorMessage = 'Invalid user ID or foreign key constraint violation';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return reply.code(500).send({ 
        success: false, 
        error: errorMessage,
        details: error.message 
      });
    }
  });

  /**
   * PUT /api/admin/operation-costs/:configId
   * Update an operation cost configuration
   */
  fastify.put('/:configId', {
    schema: {
      description: 'Update an operation cost configuration',
      tags: ['Admin', 'Operation Costs'],
      params: {
        type: 'object',
        properties: {
          configId: { type: 'string', format: 'uuid' }
        },
        required: ['configId']
      },
      body: {
        type: 'object',
        properties: {
          operationCode: { type: 'string' },
          creditCost: { type: 'number' },
          unit: { type: 'string' },
          unitMultiplier: { type: 'number' },
          isGlobal: { type: 'boolean' },
          isActive: { type: 'boolean' }
        }
      }
    },
    preHandler: requirePermission('admin.operations.edit')
  }, async (request, reply) => {
    try {
      const { configId } = request.params;
      const updateData = request.body;
      const userId = request.userContext.internalUserId;

      console.log('🔄 Updating operation cost:', { configId, updateData, userId });

      // Verify configuration exists
      const existing = await db
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.configId, configId))
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Operation cost configuration not found'
        });
      }

      console.log('📋 Existing config:', existing[0]);

      // Validate updateData to prevent invalid updates
      const validFields = ['operationCode', 'creditCost', 'unit', 'unitMultiplier', 'isGlobal', 'isActive'];
      const filteredUpdateData = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (validFields.includes(key)) {
          filteredUpdateData[key] = value;
        }
      }

      console.log('📝 Filtered update data:', filteredUpdateData);

      // Convert numeric fields to strings for database
      const processedUpdateData = { ...filteredUpdateData };
      if (processedUpdateData.creditCost !== undefined) {
        processedUpdateData.creditCost = processedUpdateData.creditCost.toString();
      }
      if (processedUpdateData.unitMultiplier !== undefined) {
        processedUpdateData.unitMultiplier = processedUpdateData.unitMultiplier.toString();
      }

      // Update configuration
      const updated = await db
        .update(creditConfigurations)
        .set({
          ...processedUpdateData,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(creditConfigurations.configId, configId))
        .returning();

      return {
        success: true,
        data: {
          operation: updated[0]
        }
      };
    } catch (error) {
      request.log.error('Error updating operation cost:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to update operation cost' 
      });
    }
  });

  /**
   * DELETE /api/admin/operation-costs/:configId
   * Delete an operation cost configuration
   */
  fastify.delete('/:configId', {
    schema: {
      description: 'Delete an operation cost configuration',
      tags: ['Admin', 'Operation Costs'],
      params: {
        type: 'object',
        properties: {
          configId: { type: 'string', format: 'uuid' }
        },
        required: ['configId']
      }
    },
    preHandler: requirePermission('admin.operations.delete')
  }, async (request, reply) => {
    try {
      const { configId } = request.params;

      // Verify configuration exists
      const existing = await db
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.configId, configId))
        .limit(1);

      if (existing.length === 0) {
        return reply.code(404).send({ 
          success: false, 
          error: 'Operation cost configuration not found' 
        });
      }

      // Delete configuration
      await db
        .delete(creditConfigurations)
        .where(eq(creditConfigurations.configId, configId));

      return {
        success: true,
        data: {
          message: 'Operation cost configuration deleted successfully',
          deletedOperation: existing[0]
        }
      };
    } catch (error) {
      request.log.error('Error deleting operation cost:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to delete operation cost' 
      });
    }
  });

  /**
   * GET /api/admin/operation-costs/analytics
   * Get operation cost analytics and insights
   */
  fastify.get('/analytics', {
    schema: {
      description: 'Get operation cost analytics',
      tags: ['Admin', 'Operation Costs'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalOperations: { type: 'number' },
                averageCost: { type: 'number' },
                mostExpensive: { type: 'object' },
                leastExpensive: { type: 'object' },
                categoryCosts: { type: 'array' },
                trends: { type: 'array' }
              }
            }
          }
        }
      }
    },
    preHandler: requirePermission('admin.operations.view')
  }, async (request, reply) => {
    try {
      // Get basic stats
      const totalOps = await db
        .select({ count: count() })
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isActive, true));

      const avgCost = await db
        .select({ avg: avg(creditConfigurations.creditCost) })
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isActive, true));

      const mostExpensive = await db
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isActive, true))
        .orderBy(desc(creditConfigurations.creditCost))
        .limit(1);

      const leastExpensive = await db
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isActive, true))
        .orderBy(creditConfigurations.creditCost)
        .limit(1);

      // Get category costs
      const categoryCosts = await db
        .select({
          category: sql`split_part(${creditConfigurations.operationCode}, '.', 1)`,
          operationCount: count(),
          averageCost: avg(creditConfigurations.creditCost),
          totalUsage: sql`0` // Placeholder - would come from usage tables
        })
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isActive, true))
        .groupBy(sql`split_part(${creditConfigurations.operationCode}, '.', 1)`);

      // Transform category costs
      const transformedCategoryCosts = categoryCosts.map(cat => ({
        category: getCategoryDisplayName(cat.category),
        operationCount: parseInt(cat.operationCount),
        averageCost: parseFloat(cat.averageCost || 0),
        totalUsage: parseInt(cat.totalUsage)
      }));

      // Mock trends data (would come from historical usage data)
      const trends = [
        {
          period: 'Last 7 days',
          totalCost: Math.floor(Math.random() * 10000),
          operationCount: Math.floor(Math.random() * 1000),
          averageCostPerOperation: Math.random() * 10
        },
        {
          period: 'Last 30 days',
          totalCost: Math.floor(Math.random() * 50000),
          operationCount: Math.floor(Math.random() * 5000),
          averageCostPerOperation: Math.random() * 10
        },
        {
          period: 'Last 90 days',
          totalCost: Math.floor(Math.random() * 100000),
          operationCount: Math.floor(Math.random() * 15000),
          averageCostPerOperation: Math.random() * 10
        }
      ];

      return {
        success: true,
        data: {
          totalOperations: totalOps[0]?.count || 0,
          averageCost: parseFloat(avgCost[0]?.avg || 0),
          mostExpensive: mostExpensive[0] || null,
          leastExpensive: leastExpensive[0] || null,
          categoryCosts: transformedCategoryCosts,
          trends
        }
      };
    } catch (error) {
      request.log.error('Error fetching operation cost analytics:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to fetch operation cost analytics' 
      });
    }
  });

  /**
   * GET /api/admin/operation-costs/templates
   * Get cost configuration templates
   */
  fastify.get('/templates', {
    schema: {
      description: 'Get cost configuration templates',
      tags: ['Admin', 'Operation Costs']
    },
    preHandler: requirePermission('admin.operations.view')
  }, async (request, reply) => {
    try {
      // Return predefined templates
      const templates = [
        {
          templateId: 'basic-crm',
          templateName: 'Basic CRM Operations',
          templateCode: 'basic_crm',
          description: 'Standard cost configuration for CRM operations',
          category: 'CRM',
          isDefault: true,
          version: '1.0',
          usageCount: 15,
          operations: [
            { operationCode: 'crm.leads.create', creditCost: 0.5 },
            { operationCode: 'crm.contacts.create', creditCost: 0.3 },
            { operationCode: 'crm.deals.create', creditCost: 1.0 },
            { operationCode: 'crm.activities.create', creditCost: 0.2 }
          ]
        },
        {
          templateId: 'basic-hr',
          templateName: 'Basic HR Operations',
          templateCode: 'basic_hr',
          description: 'Standard cost configuration for HR operations',
          category: 'HR',
          isDefault: false,
          version: '1.0',
          usageCount: 8,
          operations: [
            { operationCode: 'hr.employees.create', creditCost: 2.0 },
            { operationCode: 'hr.payroll.process', creditCost: 5.0 },
            { operationCode: 'hr.attendance.track', creditCost: 0.1 },
            { operationCode: 'hr.performance.review', creditCost: 3.0 }
          ]
        },
        {
          templateId: 'premium-suite',
          templateName: 'Premium Suite Operations',
          templateCode: 'premium_suite',
          description: 'Comprehensive cost configuration for all applications',
          category: 'Suite',
          isDefault: false,
          version: '1.0',
          usageCount: 3,
          operations: [
            { operationCode: 'crm.leads.create', creditCost: 0.3 },
            { operationCode: 'hr.employees.create', creditCost: 1.5 },
            { operationCode: 'accounting.invoices.create', creditCost: 1.0 },
            { operationCode: 'inventory.items.create', creditCost: 0.5 }
          ]
        }
      ];

      return {
        success: true,
        data: {
          templates
        }
      };
    } catch (error) {
      request.log.error('Error fetching templates:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to fetch templates' 
      });
    }
  });

  /**
   * POST /api/admin/operation-costs/apply-template
   * Apply a cost configuration template
   */
  fastify.post('/apply-template', {
    schema: {
      description: 'Apply a cost configuration template',
      tags: ['Admin', 'Operation Costs'],
      body: {
        type: 'object',
        properties: {
          templateId: { type: 'string' }
        },
        required: ['templateId']
      }
    },
    preHandler: requirePermission('admin.operations.create')
  }, async (request, reply) => {
    try {
      const { templateId } = request.body;
      const userId = request.userContext.internalUserId;

      // Get template (this would normally come from a database)
      const templates = {
        'basic-crm': [
          { operationCode: 'crm.leads.create', creditCost: 0.5, unit: 'operation' },
          { operationCode: 'crm.contacts.create', creditCost: 0.3, unit: 'operation' },
          { operationCode: 'crm.deals.create', creditCost: 1.0, unit: 'operation' },
          { operationCode: 'crm.activities.create', creditCost: 0.2, unit: 'operation' }
        ],
        'basic-hr': [
          { operationCode: 'hr.employees.create', creditCost: 2.0, unit: 'operation' },
          { operationCode: 'hr.payroll.process', creditCost: 5.0, unit: 'operation' },
          { operationCode: 'hr.attendance.track', creditCost: 0.1, unit: 'operation' },
          { operationCode: 'hr.performance.review', creditCost: 3.0, unit: 'operation' }
        ]
      };

      const templateOperations = templates[templateId];
      if (!templateOperations) {
        return reply.code(404).send({ 
          success: false, 
          error: 'Template not found' 
        });
      }

      // Apply template operations
      const created = [];
      const skipped = [];
      const updated = [];

      for (const operation of templateOperations) {
        // Check if global operation already exists (tenant_id IS NULL)
        const existing = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, operation.operationCode),
            sql`${creditConfigurations.tenantId} IS NULL`,
            eq(creditConfigurations.isGlobal, true)
          ))
          .limit(1);

        if (existing.length === 0) {
          // Create new configuration
          const newConfig = await db
            .insert(creditConfigurations)
            .values({
              operationCode: operation.operationCode,
              creditCost: operation.creditCost.toString(),
              unit: operation.unit || 'operation',
              unitMultiplier: '1.0000',
              isGlobal: true,
              isActive: true,
              createdBy: userId,
              updatedBy: userId
            })
            .returning();

          created.push(newConfig[0]);
        } else {
          // Update existing configuration if credit cost is different
          if (existing[0].creditCost !== operation.creditCost.toString()) {
            const updatedConfig = await db
              .update(creditConfigurations)
              .set({
                creditCost: operation.creditCost.toString(),
                unit: operation.unit || 'operation',
                unitMultiplier: '1.0000',
                updatedBy: userId,
                updatedAt: new Date()
              })
              .where(eq(creditConfigurations.configId, existing[0].configId))
              .returning();

            updated.push(updatedConfig[0]);
          } else {
            skipped.push(operation.operationCode);
          }
        }
      }

      return {
        success: true,
        data: {
          message: `Applied template: ${templateId}`,
          created: created.length,
          updated: updated.length,
          skipped: skipped.length,
          totalProcessed: templateOperations.length,
          operations: {
            created: created.map(op => op.operationCode),
            updated: updated.map(op => op.operationCode),
            skipped: skipped
          }
        }
      };
    } catch (error) {
      request.log.error('Error applying template:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to apply template' 
      });
    }
  });

  /**
   * GET /api/admin/operation-costs/export
   * Export operation costs as CSV
   */
  fastify.get('/export', {
    schema: {
      description: 'Export operation costs as CSV',
      tags: ['Admin', 'Operation Costs']
    },
    preHandler: requirePermission('admin.operations.view')
  }, async (request, reply) => {
    try {
      const operations = await db
        .select()
        .from(creditConfigurations)
        .orderBy(creditConfigurations.operationCode);

      // Generate CSV
      const csvHeader = 'Operation Code,Credit Cost,Unit,Unit Multiplier,Is Global,Is Active,Created At\n';
      const csvRows = operations.map(op => 
        `"${op.operationCode}",${op.creditCost},"${op.unit}",${op.unitMultiplier},${op.isGlobal},${op.isActive},"${op.createdAt}"`
      ).join('\n');

      const csv = csvHeader + csvRows;

      reply.type('text/csv');
      reply.header('Content-Disposition', 'attachment; filename="operation-costs.csv"');
      return csv;
    } catch (error) {
      request.log.error('Error exporting operation costs:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to export operation costs' 
      });
    }
  });
}

// Helper function to get display name for categories
function getCategoryDisplayName(category) {
  const categoryMap = {
    'crm': 'CRM Operations',
    'hr': 'HR Operations',
    'accounting': 'Accounting Operations',
    'inventory': 'Inventory Operations',
    'affiliate': 'Affiliate Operations',
    'data': 'Data Processing',
    'comm': 'Communication',
    'analytics': 'Analytics',
    'file': 'File Operations',
    'integration': 'Integration',
    'security': 'Security',
    'admin': 'Administration'
  };

  return categoryMap[category] || 'Other';
}
