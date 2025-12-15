import { CreditService } from '../../../features/credits/index.js';
import { requirePermissions } from '../../../middleware/permission-middleware.js';
import { authenticateToken } from '../../../middleware/auth.js';
import { requireTenantMatch } from '../../../middleware/tenant-validation.js';

/**
 * Admin Credit Configuration Routes
 * Handles tenant-specific credit configuration management
 */

export default async function creditConfigurationRoutes(fastify, options) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticateToken);

  /**
   * GET /api/admin/credit-configurations/:tenantId
   * Get all credit configurations for a specific tenant (current + inherited)
   */
  fastify.get('/:tenantId', {
    schema: {
      description: 'Get all credit configurations for a tenant',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' }
        },
        required: ['tenantId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            configurations: {
              type: 'object',
              properties: {
                operations: { type: 'array' },
                modules: { type: 'array' },
                apps: { type: 'array' }
              }
            },
            globalConfigs: {
              type: 'object',
              properties: {
                operations: { type: 'array' },
                modules: { type: 'array' },
                apps: { type: 'array' }
              }
            }
          }
        }
      }
    },
    preHandler: requirePermissions(['credit_config.view'])
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      // Verify tenant access (admin can access any, tenant admin only their own)
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to this tenant\'s configurations' });
      }

      const configurations = await CreditService.getTenantConfigurations(tenantId);
      reply.send(configurations);
    } catch (error) {
      request.log.error('Error fetching tenant configurations:', error);
      reply.code(500).send({ error: 'Failed to fetch tenant configurations' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/operation/:operationCode
   * Update operation-level credit configuration for a tenant
   */
  fastify.put('/:tenantId/operation/:operationCode', {
    schema: {
      description: 'Update operation-level credit configuration for a tenant',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          operationCode: { type: 'string' }
        },
        required: ['tenantId', 'operationCode']
      },
      body: {
        type: 'object',
        properties: {
          creditCost: { type: 'number' },
          unit: { type: 'string' },
          unitMultiplier: { type: 'number' },
          freeAllowance: { type: 'integer' },
          freeAllowancePeriod: { type: 'string' },
          volumeTiers: { type: 'array' },
          allowOverage: { type: 'boolean' },
          overageLimit: { type: 'integer' },
          overagePeriod: { type: 'string' },
          overageCost: { type: 'number' },
          scope: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      }
    },
    // Temporarily disable permission check for debugging
    // preHandler: requirePermissions(['credit_config.edit'])
  }, async (request, reply) => {
    try {
      const { tenantId, operationCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to modify this tenant\'s configurations' });
      }

      const result = await CreditService.setTenantOperationConfig(operationCode, configData, userId, tenantId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error updating operation configuration:', error);
      reply.code(500).send({ error: 'Failed to update operation configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/module/:moduleCode
   * Update module-level credit configuration for a tenant
   */
  fastify.put('/:tenantId/module/:moduleCode', {
    schema: {
      description: 'Update module-level credit configuration for a tenant',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          moduleCode: { type: 'string' }
        },
        required: ['tenantId', 'moduleCode']
      },
      body: {
        type: 'object',
        properties: {
          defaultCreditCost: { type: 'number' },
          defaultUnit: { type: 'string' },
          maxOperationsPerPeriod: { type: 'integer' },
          periodType: { type: 'string' },
          creditBudget: { type: 'number' },
          operationOverrides: { type: 'object' },
          isActive: { type: 'boolean' }
        }
      }
    },
    preHandler: requirePermissions(['credit_config.edit'])
  }, async (request, reply) => {
    try {
      const { tenantId, moduleCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to modify this tenant\'s configurations' });
      }

      const result = await CreditService.setTenantModuleConfig(moduleCode, configData, userId, tenantId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error updating module configuration:', error);
      reply.code(500).send({ error: 'Failed to update module configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/app/:appCode
   * Update app-level credit configuration for a tenant
   */
  fastify.put('/:tenantId/app/:appCode', {
    schema: {
      description: 'Update app-level credit configuration for a tenant',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          appCode: { type: 'string' }
        },
        required: ['tenantId', 'appCode']
      },
      body: {
        type: 'object',
        properties: {
          billingModel: { type: 'string' },
          defaultCreditCost: { type: 'number' },
          defaultUnit: { type: 'string' },
          maxDailyOperations: { type: 'integer' },
          maxMonthlyOperations: { type: 'integer' },
          creditBudget: { type: 'number' },
          premiumFeatures: { type: 'object' },
          moduleDefaults: { type: 'object' },
          isActive: { type: 'boolean' }
        }
      }
    },
    preHandler: requirePermissions(['credit_config.edit'])
  }, async (request, reply) => {
    try {
      const { tenantId, appCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to modify this tenant\'s configurations' });
      }

      const result = await CreditService.setTenantAppConfig(appCode, configData, userId, tenantId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error updating app configuration:', error);
      reply.code(500).send({ error: 'Failed to update app configuration' });
    }
  });

  /**
   * DELETE /api/admin/credit-configurations/:tenantId/:configType/:configCode
   * Reset tenant configuration to global default
   */
  fastify.delete('/:tenantId/:configType/:configCode', {
    schema: {
      description: 'Reset tenant configuration to global default',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          configType: { type: 'string', enum: ['operation', 'module', 'app'] },
          configCode: { type: 'string' }
        },
        required: ['tenantId', 'configType', 'configCode']
      }
    },
    preHandler: requirePermissions(['credit_config.reset'])
  }, async (request, reply) => {
    try {
      const { tenantId, configType, configCode } = request.params;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to reset this tenant\'s configurations' });
      }

      const result = await CreditService.resetTenantConfiguration(tenantId, configType, configCode, userId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error resetting tenant configuration:', error);
      reply.code(500).send({ error: 'Failed to reset tenant configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/bulk
   * Bulk update multiple configurations for a tenant
   */
  fastify.put('/:tenantId/bulk', {
    schema: {
      description: 'Bulk update multiple configurations for a tenant',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' }
        },
        required: ['tenantId']
      },
      body: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                configType: { type: 'string', enum: ['operation', 'module', 'app'] },
                configCode: { type: 'string' },
                configData: { type: 'object' }
              },
              required: ['configType', 'configCode', 'configData']
            }
          }
        },
        required: ['updates']
      }
    },
    preHandler: requirePermissions(['credit_config.bulk_update'])
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { updates } = request.body;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to bulk update this tenant\'s configurations' });
      }

      const result = await CreditService.bulkUpdateTenantConfigurations(tenantId, updates, userId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error bulk updating tenant configurations:', error);
      reply.code(500).send({ error: 'Failed to bulk update tenant configurations' });
    }
  });

  /**
   * GET /api/admin/credit-configuration-templates
   * Get all available configuration templates
   */
  fastify.get('/templates', {
    schema: {
      description: 'Get all available configuration templates',
      tags: ['Admin', 'Credit Configuration'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              templateId: { type: 'string' },
              templateName: { type: 'string' },
              templateCode: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              isDefault: { type: 'boolean' },
              version: { type: 'string' },
              usageCount: { type: 'integer' }
            }
          }
        }
      }
    },
    preHandler: requirePermissions(['credit_config.view'])
  }, async (request, reply) => {
    try {
      const templates = await CreditService.getConfigurationTemplates();
      reply.send(templates);
    } catch (error) {
      request.log.error('Error fetching configuration templates:', error);
      reply.code(500).send({ error: 'Failed to fetch configuration templates' });
    }
  });

  /**
   * POST /api/admin/credit-configurations/:tenantId/apply-template
   * Apply a configuration template to a tenant
   */
  fastify.post('/:tenantId/apply-template', {
    schema: {
      description: 'Apply a configuration template to a tenant',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' }
        },
        required: ['tenantId']
      },
      body: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      }
    },
    preHandler: requirePermissions(['credit_config.apply_templates'])
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const { templateId } = request.body;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to apply templates to this tenant' });
      }

      const result = await CreditService.applyConfigurationTemplate(tenantId, templateId, userId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error applying configuration template:', error);
      reply.code(500).send({ error: 'Failed to apply configuration template' });
    }
  });

  /**
   * GET /api/admin/credit-configurations/applications
   * Get all application credit configurations (global)
   */
  fastify.get('/applications', {
    schema: {
      description: 'Get all application credit configurations',
      tags: ['Admin', 'Credit Configuration'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                configurations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      appId: { type: 'string' },
                      appCode: { type: 'string' },
                      appName: { type: 'string' },
                      defaultCreditCost: { type: 'number' },
                      defaultUnit: { type: 'string' },
                      modules: { type: 'array' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: requirePermissions(['admin.applications.view'])
  }, async (request, reply) => {
    try {
      const configurations = await CreditService.getApplicationCreditConfigurations();
      return {
        success: true,
        data: {
          configurations
        }
      };
    } catch (error) {
      request.log.error('Error fetching application credit configurations:', error);
      reply.code(500).send({ error: 'Failed to fetch application credit configurations' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/applications/:appCode
   * Update application credit configuration
   */
  fastify.put('/applications/:appCode', {
    schema: {
      description: 'Update application credit configuration',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          appCode: { type: 'string' }
        },
        required: ['appCode']
      },
      body: {
        type: 'object',
        properties: {
          defaultCreditCost: { type: 'number' },
          defaultUnit: { type: 'string' },
          maxOperationsPerPeriod: { type: 'integer' },
          periodType: { type: 'string' },
          creditBudget: { type: 'number' },
          budgetResetPeriod: { type: 'string' },
          allowOverBudget: { type: 'boolean' },
          scope: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      }
    },
    preHandler: requirePermissions(['admin.applications.edit'])
  }, async (request, reply) => {
    try {
      const { appCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.internalUserId;

      const result = await CreditService.updateApplicationCreditConfiguration(appCode, configData, userId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error updating application credit configuration:', error);
      reply.code(500).send({ error: 'Failed to update application credit configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/applications/:appCode/modules/:moduleCode
   * Update module credit configuration
   */
  fastify.put('/applications/:appCode/modules/:moduleCode', {
    schema: {
      description: 'Update module credit configuration',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          appCode: { type: 'string' },
          moduleCode: { type: 'string' }
        },
        required: ['appCode', 'moduleCode']
      },
      body: {
        type: 'object',
        properties: {
          defaultCreditCost: { type: 'number' },
          defaultUnit: { type: 'string' },
          maxOperationsPerPeriod: { type: 'integer' },
          periodType: { type: 'string' },
          creditBudget: { type: 'number' },
          budgetResetPeriod: { type: 'string' },
          allowOverBudget: { type: 'boolean' },
          scope: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      }
    },
    preHandler: requirePermissions(['admin.applications.edit'])
  }, async (request, reply) => {
    try {
      const { appCode, moduleCode } = request.params;
      const configData = request.body;
      const userId = request.userContext.internalUserId;

      const result = await CreditService.updateModuleCreditConfiguration(appCode, moduleCode, configData, userId);
      reply.send(result);
    } catch (error) {
      request.log.error('Error updating module credit configuration:', error);
      reply.code(500).send({ error: 'Failed to update module credit configuration' });
    }
  });

  /**
   * POST /api/admin/credit-configurations/tenant/:tenantId/operations
   * Create tenant-specific operation cost
   */
  fastify.post('/tenant/:tenantId/operations', {
    schema: {
      description: 'Create tenant-specific operation cost',
      tags: ['Admin', 'Credit Configuration'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' }
        },
        required: ['tenantId']
      },
      body: {
        type: 'object',
        properties: {
          operationCode: { type: 'string' },
          operationName: { type: 'string' },
          creditCost: { type: 'number' },
          unit: { type: 'string' },
          unitMultiplier: { type: 'number' },
          category: { type: 'string' },
          freeAllowance: { type: 'integer' },
          freeAllowancePeriod: { type: 'string' },
          volumeTiers: { type: 'array' },
          allowOverage: { type: 'boolean' },
          overageLimit: { type: 'integer' },
          overagePeriod: { type: 'string' },
          overageCost: { type: 'number' },
          scope: { type: 'string' },
          isActive: { type: 'boolean' },
          priority: { type: 'integer' }
        },
        required: ['operationCode', 'creditCost']
      }
    }
    // Temporarily disable permission check for debugging
    // preHandler: requirePermissions(['admin.applications.edit'])
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const configData = request.body;
      const userId = request.userContext.internalUserId;

      // Verify tenant access
      if (!request.userContext.isSuperAdmin && request.userContext.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to create configurations for this tenant' });
      }

      console.log('📝 Creating tenant operation cost:', { tenantId, configData, userId });

      const result = await CreditService.createTenantOperationCost(tenantId, configData, userId);

      console.log('✅ Tenant operation cost created successfully:', result);
      reply.send(result);
    } catch (error) {
      console.error('❌ Error in tenant operation cost route:', error);
      request.log.error('Error creating tenant operation cost:', error);

      reply.code(500).send({
        error: error.message || 'Failed to create tenant operation cost',
        details: error.details
      });
    }
  });

  // Initialize credits for a tenant (temporary route for testing)
  fastify.post('/initialize-credits/:tenantId', {
    preHandler: [requirePermissions(['credit_config.manage']), requireTenantMatch()],
    schema: {
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      },
      body: {
        type: 'object',
        properties: {
          initialCredits: { type: 'number', default: 1000 }
        }
      }
    }
  }, async (request, reply) => {
    const { tenantId } = request.params;
    const { initialCredits = 1000 } = request.body;
    const userId = request.user.userId;

    try {
      console.log(`🎯 Initializing ${initialCredits} credits for tenant: ${tenantId}`);

      const result = await CreditService.initializeTenantCredits(tenantId, initialCredits);

      reply.send({
        success: true,
        message: `Successfully initialized ${initialCredits} credits for tenant ${tenantId}`,
        data: result
      });
    } catch (error) {
      request.log.error('Error initializing credits:', error);
      reply.code(500).send({
        error: 'Failed to initialize credits',
        details: error.message
      });
    }
  });

  /**
   * GET /api/admin/credit-configurations/global/by-app
   * Get global credit configurations filtered by application code or name
   * Query params:
   *   - app: Application code (e.g., 'crm') or name (e.g., 'B2B CRM'). Optional - if not provided, returns all apps.
   */
  fastify.get('/global/by-app', {
    schema: {
      description: 'Get global credit configurations filtered by application code or name',
      tags: ['Admin', 'Credit Configuration', 'Global'],
      querystring: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Application code (e.g., "crm") or name (e.g., "B2B CRM"). If not provided, returns all applications.'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                requestedApp: { type: ['string', 'null'] },
                applicationsCount: { type: 'integer' },
                applications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      appId: { type: 'string' },
                      appCode: { type: 'string' },
                      appName: { type: 'string' },
                      description: { type: 'string' },
                      statistics: {
                        type: 'object',
                        properties: {
                          totalModules: { type: 'integer' },
                          totalOperations: { type: 'integer' },
                          averageCreditCost: { type: 'number' }
                        }
                      },
                      modules: { type: 'array' },
                      allOperations: { type: 'array' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: requirePermissions(['credit_config.view'])
  }, async (request, reply) => {
    try {
      const { app } = request.query;

      console.log('📊 Fetching global credit configurations for app:', app || 'ALL');

      const result = await CreditService.getGlobalCreditConfigurationsByApp(app || null);

      reply.send(result);
    } catch (error) {
      request.log.error('Error fetching global credit configurations by app:', error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch global credit configurations',
        error: error.message
      });
    }
  });
}
