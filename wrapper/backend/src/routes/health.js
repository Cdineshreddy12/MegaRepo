/**
 * Health Check Routes
 * Provides endpoints for monitoring application health and deployment verification
 */

export default async function healthRoutes(fastify, options) {
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      // Basic health check
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      };

      // Check database connection if available
      if (fastify.db) {
        try {
          // Simple database query to verify connection
          await fastify.db.execute('SELECT 1');
          health.database = 'connected';
        } catch (error) {
          health.database = 'disconnected';
          health.databaseError = error.message;
        }
      }

      // Check Redis connection if available
      if (fastify.redis) {
        try {
          await fastify.redis.ping();
          health.redis = 'connected';
        } catch (error) {
          health.redis = 'disconnected';
          health.redisError = error.message;
        }
      }

      // Check if all critical services are healthy
      const isHealthy = health.database !== 'disconnected' && health.redis !== 'disconnected';
      
      if (isHealthy) {
        reply.code(200).send(health);
      } else {
        reply.code(503).send({
          ...health,
          status: 'unhealthy',
          message: 'Some services are not responding'
        });
      }
    } catch (error) {
      reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Detailed health check endpoint
  fastify.get('/health/detailed', async (request, reply) => {
    try {
      const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        services: {}
      };

      // Database health check
      if (fastify.db) {
        try {
          const startTime = Date.now();
          await fastify.db.execute('SELECT 1');
          const responseTime = Date.now() - startTime;
          
          detailedHealth.services.database = {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          detailedHealth.services.database = {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Redis health check
      if (fastify.redis) {
        try {
          const startTime = Date.now();
          await fastify.redis.ping();
          const responseTime = Date.now() - startTime;
          
          detailedHealth.services.redis = {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          detailedHealth.services.redis = {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Check overall health
      const unhealthyServices = Object.values(detailedHealth.services)
        .filter(service => service.status === 'unhealthy');
      
      if (unhealthyServices.length > 0) {
        detailedHealth.status = 'degraded';
        detailedHealth.unhealthyServices = unhealthyServices.length;
      }

      reply.code(200).send(detailedHealth);
    } catch (error) {
      reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Readiness probe endpoint
  fastify.get('/health/ready', async (request, reply) => {
    try {
      // Check if application is ready to receive traffic
      const readiness = {
        ready: true,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // Database readiness check
      if (fastify.db) {
        try {
          await fastify.db.execute('SELECT 1');
          readiness.checks.database = 'ready';
        } catch (error) {
          readiness.checks.database = 'not_ready';
          readiness.ready = false;
        }
      }

      // Redis readiness check
      if (fastify.redis) {
        try {
          await fastify.redis.ping();
          readiness.checks.redis = 'ready';
        } catch (error) {
          readiness.checks.redis = 'not_ready';
          readiness.ready = false;
        }
      }

      if (readiness.ready) {
        reply.code(200).send(readiness);
      } else {
        reply.code(503).send(readiness);
      }
    } catch (error) {
      reply.code(500).send({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // Liveness probe endpoint
  fastify.get('/health/live', async (request, reply) => {
    // Simple liveness check - if this endpoint responds, the application is alive
    reply.code(200).send({
      alive: true,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime()
    });
  });

  // Deployment info endpoint
  fastify.get('/health/deployment', async (request, reply) => {
    try {
      const deployment = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        commit: process.env.GIT_COMMIT || 'unknown',
        branch: process.env.GIT_BRANCH || 'unknown',
        buildTime: process.env.BUILD_TIME || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        },
        uptime: process.uptime(),
        pid: process.pid
      };

      reply.code(200).send(deployment);
    } catch (error) {
      reply.code(500).send({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // RLS Health Check endpoint
  fastify.get('/health/rls', async (request, reply) => {
    try {
      const rlsHealth = {
        timestamp: new Date().toISOString(),
        rls_enabled: false,
        tenant_context: null,
        policies_status: {},
        session_status: 'unknown'
      };

      // Check if RLS service is available
      if (global.rlsService) {
        rlsHealth.rls_enabled = true;

        try {
          // Check tenant context
          const tenantContext = await global.rlsService.getTenantContext();
          rlsHealth.tenant_context = tenantContext;

          // Check multi-level context if available
          if (global.rlsService.getMultiLevelContext) {
            try {
              const multiLevelContext = await global.rlsService.getMultiLevelContext();
              rlsHealth.multi_level_context = multiLevelContext;
            } catch (error) {
              rlsHealth.multi_level_context = { error: error.message };
            }
          }

          // Check RLS policies status
          if (fastify.db) {
            const policiesCheck = await fastify.db.execute(`
              SELECT
                schemaname,
                tablename,
                rowsecurity as rls_enabled,
                (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
              FROM pg_tables t
              WHERE t.schemaname = 'public'
                AND t.tablename IN (
                  'tenant_users', 'organizations', 'custom_roles',
                  'credits', 'audit_logs', 'usage_logs'
                )
              ORDER BY tablename;
            `);

            policiesCheck.rows.forEach(row => {
              rlsHealth.policies_status[row.tablename] = {
                rls_enabled: row.rls_enabled,
                policies: row.policy_count
              };
            });
          }

          rlsHealth.session_status = 'healthy';
          reply.code(200).send(rlsHealth);

        } catch (error) {
          rlsHealth.session_status = 'error';
          rlsHealth.error = error.message;
          reply.code(503).send(rlsHealth);
        }
      } else {
        rlsHealth.error = 'RLS service not initialized';
        reply.code(503).send(rlsHealth);
      }
    } catch (error) {
      reply.code(500).send({
        timestamp: new Date().toISOString(),
        rls_enabled: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // RLS Test endpoint (requires tenant headers)
  fastify.get('/health/rls/test', async (request, reply) => {
    try {
      const subdomain = request.headers['x-subdomain'] || request.headers['x-tenant'];

      if (!subdomain) {
        return reply.code(400).send({
          error: 'Tenant identification required',
          message: 'Include X-Subdomain or X-Tenant header'
        });
      }

      if (!global.rlsService) {
        return reply.code(503).send({
          error: 'RLS service not available',
          timestamp: new Date().toISOString()
        });
      }

      // Resolve tenant
      const tenant = await global.rlsService.resolveTenant(subdomain);
      if (!tenant) {
        return reply.code(404).send({
          error: 'Tenant not found',
          subdomain
        });
      }

      // Set tenant context
      await global.rlsService.setTenantContext(tenant.id || tenant.tenantId);

      // Test RLS with a query
      const testResult = {
        timestamp: new Date().toISOString(),
        tenant: {
          id: tenant.id || tenant.tenantId,
          subdomain: tenant.subdomain,
          companyName: tenant.companyName
        },
        rls_test: {}
      };

      // Test tenant_users table
      if (fastify.db) {
        try {
          const userCount = await fastify.db.execute('SELECT COUNT(*) as count FROM tenant_users');
          testResult.rls_test.tenant_users = {
            status: 'success',
            count: userCount.rows[0].count
          };
        } catch (error) {
          testResult.rls_test.tenant_users = {
            status: 'error',
            error: error.message
          };
        }
      }

      // Clear tenant context
      await global.rlsService.clearTenantContext();

      reply.code(200).send(testResult);

    } catch (error) {
      reply.code(500).send({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Hierarchical RLS Test endpoint
  fastify.get('/health/rls/hierarchical', async (request, reply) => {
    try {
      const hierarchicalTest = {
        timestamp: new Date().toISOString(),
        hierarchical_rls_enabled: false,
        multi_level_context: null,
        hierarchical_policies: {},
        test_results: {}
      };

      if (global.rlsService && global.rlsService.getMultiLevelContext) {
        hierarchicalTest.hierarchical_rls_enabled = true;

        try {
          // Get multi-level context
          const context = await global.rlsService.getMultiLevelContext();
          hierarchicalTest.multi_level_context = context;

          // Test hierarchical policies if database is available
          if (fastify.db) {
            const policiesCheck = await fastify.db.execute(`
              SELECT
                schemaname,
                tablename,
                rowsecurity as rls_enabled,
                (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename AND policyname LIKE '%hierarchical%') as hierarchical_policies
              FROM pg_tables t
              WHERE t.schemaname = 'public'
                AND t.tablename IN (
                  'tenant_users', 'organizations', 'custom_roles',
                  'credits', 'audit_logs', 'activity_logs'
                )
              ORDER BY tablename;
            `);

            policiesCheck.rows.forEach(row => {
              hierarchicalTest.hierarchical_policies[row.tablename] = {
                rls_enabled: row.rls_enabled,
                hierarchical_policies: row.hierarchical_policies
              };
            });

            // Test hierarchical context function
            try {
              const contextTest = await fastify.db.execute('SELECT get_hierarchical_context() as context');
              hierarchicalTest.test_results.context_function = contextTest.rows[0]?.context || null;
            } catch (error) {
              hierarchicalTest.test_results.context_function = { error: error.message };
            }
          }

        } catch (error) {
          hierarchicalTest.error = error.message;
        }
      }

      reply.code(200).send(hierarchicalTest);

    } catch (error) {
      reply.code(500).send({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
}
