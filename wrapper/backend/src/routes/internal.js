import { validateInternalApiKey } from '../middleware/internal.js';
import { TenantService } from '../services/tenant-service.js';
import { db } from '../db/index.js';
import { tenantUsers, customRoles, userRoleAssignments } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import DistributedSSOCache, { CacheKeys, CacheTTL } from '../utils/distributed-sso-cache.js';
import crypto from 'crypto';
import ErrorResponses from '../utils/error-responses.js';

export default async function internalRoutes(fastify, options) {
    // Internal health check for tools
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'wrapper-backend',
      };
    });
  
    // Get tenant configuration for tools
    fastify.get('/tenant/:tenantId/config', async (request, reply) => {
      // Validate internal request (could add API key validation here)
      const internalApiKey = request.headers['x-internal-api-key'];
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const { tenantId } = request.params;
        const { SubscriptionService } = await import('../services/subscription-service.js');
        
        const tenant = await TenantService.getTenantDetails(tenantId);
        
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
        }
  
        const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
  
        return {
          success: true,
          data: {
            tenant: {
              id: tenant.tenantId,
              name: tenant.companyName,
              subdomain: tenant.subdomain,
              isActive: tenant.isActive,
              settings: tenant.settings,
              branding: {
                logoUrl: tenant.logoUrl,
                primaryColor: tenant.primaryColor,
              },
            },
            subscription: {
              plan: subscription?.plan,
              status: subscription?.status,
              subscribedTools: subscription?.subscribedTools || [],
              usageLimits: subscription?.usageLimits || {},
            },
          },
        };
      } catch (error) {
        fastify.log.error('Error fetching tenant config:', error);
        return reply.code(500).send({ error: 'Failed to fetch tenant config' });
      }
    });
  
    // Validate user access for tools
    fastify.post('/validate-access', async (request, reply) => {
      const internalApiKey = request.headers['x-internal-api-key'];
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const { tenantId, userId, tool, action } = request.body;
        
        if (!tenantId || !userId || !tool) {
          return reply.code(400).send({ error: 'Missing required fields' });
        }
  
        // TODO: Implement permission checking logic
        // For now, just check if user exists and tenant is active
        const { db } = await import('../db/index.js');
        const { tenantUsers } = await import('../db/schema/index.js');
        const { eq, and } = await import('drizzle-orm');
  
        const tenant = await TenantService.getTenantDetails(tenantId);
        
        if (!tenant || !tenant.isActive) {
          return reply.code(403).send({ 
            error: 'Tenant not active',
            hasAccess: false 
          });
        }
  
        const [user] = await db
          .select()
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.isActive, true)
          ))
          .limit(1);
  
        if (!user) {
          return reply.code(403).send({ 
            error: 'User not found or inactive',
            hasAccess: false 
          });
        }
  
        return {
          success: true,
          hasAccess: true,
          user: {
            id: user.userId,
            name: user.name,
            email: user.email,
            isTenantAdmin: user.isTenantAdmin,
          },
          tenant: {
            id: tenant.tenantId,
            name: tenant.companyName,
          },
        };
      } catch (error) {
        fastify.log.error('Error validating access:', error);
        return reply.code(500).send({ error: 'Failed to validate access' });
      }
    });
  
    // Log usage from tools
    fastify.post('/log-usage', async (request, reply) => {
      const internalApiKey = request.headers['x-internal-api-key'];
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const { 
          tenantId, 
          userId, 
          app, 
          endpoint, 
          method, 
          statusCode, 
          responseTime,
          metadata 
        } = request.body;
  
        if (!tenantId || !app || !endpoint) {
          return reply.code(400).send({ error: 'Missing required fields' });
        }
  
        // Log to database
        const { db } = await import('../db/index.js');
        const { usageLogs } = await import('../db/schema/index.js');
        const { v4: uuidv4 } = await import('uuid');
  
        await db.insert(usageLogs).values({
          logId: uuidv4(),
          tenantId,
          userId,
          app,
          endpoint,
          method: method || 'GET',
          statusCode: statusCode || 200,
          responseTime: responseTime?.toString() || '0',
          source: 'tool_direct',
          metadata: metadata || {},
        });
  
        // Update cache counters
        const { UsageCache } = await import('../utils/redis.js');
        await UsageCache.incrementApiCalls(tenantId, app);
  
        if (userId) {
          await UsageCache.trackActiveUser(tenantId, userId);
        }
  
        return {
          success: true,
          message: 'Usage logged successfully',
        };
      } catch (error) {
        fastify.log.error('Error logging usage:', error);
        return reply.code(500).send({ error: 'Failed to log usage' });
      }
    });
  
    // Get feature flags for tenant
    fastify.get('/tenant/:tenantId/features', async (request, reply) => {
      const internalApiKey = request.headers['x-internal-api-key'];
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const { tenantId } = request.params;
        const { SubscriptionService } = await import('../services/subscription-service.js');
        
        const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
        
        if (!subscription) {
          return ErrorResponses.notFound(reply, 'Subscription', 'Subscription not found');
        }
  
        // Default feature flags based on plan
        const featureFlags = {
          crm_advanced_reports: subscription.plan !== 'trial' && subscription.plan !== 'starter',
          hr_payroll: subscription.plan === 'professional' || subscription.plan === 'enterprise',
          affiliate_custom_commissions: subscription.plan === 'enterprise',
          white_label: subscription.plan === 'enterprise',
          api_access: subscription.plan !== 'trial',
          webhook_support: subscription.plan === 'professional' || subscription.plan === 'enterprise',
          custom_integrations: subscription.plan === 'enterprise',
          priority_support: subscription.plan === 'professional' || subscription.plan === 'enterprise',
        };
  
        return {
          success: true,
          data: {
            tenantId,
            plan: subscription.plan,
            featureFlags,
          },
        };
      } catch (error) {
        fastify.log.error('Error fetching feature flags:', error);
        return reply.code(500).send({ error: 'Failed to fetch feature flags' });
      }
    });
  
    // Sync data between tools
    fastify.post('/sync', async (request, reply) => {
      const internalApiKey = request.headers['x-internal-api-key'];
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const { tenantId, sourceApp, targetApp, dataType, data } = request.body;
  
        if (!tenantId || !sourceApp || !targetApp || !dataType) {
          return reply.code(400).send({ error: 'Missing required fields' });
        }
  
        // Log the sync operation
        fastify.log.info(`Data sync: ${sourceApp} -> ${targetApp} (${dataType}) for tenant ${tenantId}`);
  
        // Here you would implement actual data synchronization logic
        // For now, just acknowledge the sync request
        
        return {
          success: true,
          message: 'Data sync completed',
          syncId: `sync_${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        fastify.log.error('Error syncing data:', error);
        return reply.code(500).send({ error: 'Failed to sync data' });
      }
    });

    // Enhanced user permissions endpoint with distributed caching
    fastify.post('/user-permissions', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          required: ['kinde_user_id', 'kinde_org_code', 'requesting_app'],
          properties: {
            kinde_user_id: { type: 'string' },
            kinde_org_code: { type: 'string' },
            requesting_app: { type: 'string', enum: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'] },
            force_refresh: { type: 'boolean', default: false }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const { kinde_user_id, kinde_org_code, requesting_app, force_refresh } = request.body;
        
        console.log(`🔍 Processing user permissions request: ${kinde_user_id} for ${requesting_app}`);
        
        // Step 1: Check cache first (unless force refresh)
        if (!force_refresh) {
          const cachedAuth = await DistributedSSOCache.getUserAuth(kinde_user_id, kinde_org_code);
          if (cachedAuth) {
            console.log(`🚀 CACHE HIT: Returning cached auth data for ${kinde_user_id}`);
            
            // Also check cached permissions for this specific app
            const cachedPermissions = await DistributedSSOCache.getUserPermissions(
              cachedAuth.user.id, 
              cachedAuth.tenant.id, 
              requesting_app
            );
            
            if (cachedPermissions) {
              console.log(`🎯 CACHE HIT: Returning cached permissions for ${requesting_app}`);
              return {
                success: true,
                data: {
                  ...cachedAuth,
                  permissions: cachedPermissions.permissions || cachedPermissions,
                  source: 'cache',
                  cachedAt: cachedAuth.cachedAt || new Date().toISOString()
                }
              };
            }
          }
        }
        
        console.log(`💾 Cache MISS: Fetching fresh data from database`);
        
        // Step 2: Fetch fresh data from database
        const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found', { kinde_org_code });
        }

        const userResult = await db
          .select({
            id: tenantUsers.id,
            email: tenantUsers.email,
            firstName: tenantUsers.firstName,
            lastName: tenantUsers.lastName,
            isActive: tenantUsers.isActive
          })
          .from(tenantUsers)
          .where(
            and(
              eq(tenantUsers.kindeUserId, kinde_user_id),
              eq(tenantUsers.tenantId, tenant.tenantId)
            )
          )
          .limit(1);

        if (!userResult.length) {
          return ErrorResponses.notFound(reply, 'User', 'User not found in tenant', { 
            kinde_user_id,
            tenant_id: tenant.tenantId
          });
        }

        const user = userResult[0];

        if (!user.isActive) {
          return reply.code(403).send({ 
            error: 'User account is inactive',
            user_id: user.id
          });
        }

        // Step 3: Get user roles and permissions
        const userRolesResult = await db
          .select({
            roleId: customRoles.roleId,
            roleName: customRoles.roleName,
            permissions: customRoles.permissions,
            restrictions: customRoles.restrictions,
            isActive: userRoleAssignments.isActive,
            expiresAt: userRoleAssignments.expiresAt
          })
          .from(userRoleAssignments)
          .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
          .where(
            and(
              eq(userRoleAssignments.userId, user.id),
              eq(userRoleAssignments.isActive, true)
            )
          );

        const now = new Date();
        const activeRoles = userRolesResult.filter(role => 
          !role.expiresAt || new Date(role.expiresAt) > now
        );

        if (!activeRoles.length) {
          return reply.code(403).send({ 
            error: 'No active roles found for user',
            user_id: user.id
          });
        }

        // Step 4: Aggregate permissions for the requesting app
        const aggregatedPermissions = {};
        const aggregatedRestrictions = {};
        const userRoleNames = [];

        for (const role of activeRoles) {
          userRoleNames.push(role.roleName);
          
          const rolePermissions = typeof role.permissions === 'string' 
            ? JSON.parse(role.permissions) 
            : role.permissions;

          const roleRestrictions = typeof role.restrictions === 'string'
            ? JSON.parse(role.restrictions || '{}')
            : (role.restrictions || {});

          const toolPermissions = rolePermissions[requesting_app] || {};
          
          Object.keys(toolPermissions).forEach(resource => {
            if (!aggregatedPermissions[resource]) {
              aggregatedPermissions[resource] = [];
            }
            
            const resourcePermissions = toolPermissions[resource];
            if (Array.isArray(resourcePermissions)) {
              resourcePermissions.forEach(permission => {
                if (!aggregatedPermissions[resource].includes(permission)) {
                  aggregatedPermissions[resource].push(permission);
                }
              });
            }
          });

          Object.keys(roleRestrictions).forEach(key => {
            if (key.startsWith(`${requesting_app}.`)) {
              if (typeof roleRestrictions[key] === 'number') {
                aggregatedRestrictions[key] = Math.min(
                  aggregatedRestrictions[key] || Number.MAX_SAFE_INTEGER,
                  roleRestrictions[key]
                );
              } else {
                if (!aggregatedRestrictions[key]) {
                  aggregatedRestrictions[key] = roleRestrictions[key];
                }
              }
            }
          });
        }

        if (Object.keys(aggregatedPermissions).length === 0) {
          return reply.code(403).send({ 
            error: 'No permissions for requested application',
            requesting_app,
            available_tools: getAvailableTools(activeRoles)
          });
        }

        // Step 5: Prepare response data
        const responseData = {
          user: {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            kinde_user_id
          },
          tenant: {
            id: tenant.tenantId,
            name: tenant.companyName,
            subdomain: tenant.subdomain
          },
          roles: userRoleNames,
          permissions: aggregatedPermissions,
          restrictions: aggregatedRestrictions,
          context: {
            requesting_app,
            kinde_org_code,
            timestamp: new Date().toISOString()
          }
        };

        // Step 6: Cache the results for future requests
        try {
          await Promise.all([
            // Cache user auth data (shared across all apps)
            DistributedSSOCache.cacheUserAuth(kinde_user_id, kinde_org_code, responseData),
            
            // Cache user roles (shared across all apps)
            DistributedSSOCache.cacheUserRoles(user.id, tenant.tenantId, activeRoles),
            
            // Cache app-specific permissions
            DistributedSSOCache.cacheUserPermissions(user.id, tenant.tenantId, requesting_app, {
              permissions: aggregatedPermissions,
              restrictions: aggregatedRestrictions,
              roles: userRoleNames
            })
          ]);
          
          console.log(`✅ Successfully cached auth data for ${kinde_user_id}:${requesting_app}`);
        } catch (cacheError) {
          console.error('⚠️ Cache write failed (non-critical):', cacheError);
        }

        return {
          success: true,
          data: {
            ...responseData,
            source: 'database',
            cachedAt: new Date().toISOString()
          }
        };

      } catch (error) {
        fastify.log.error('Error fetching user permissions:', error);
        return reply.code(500).send({ 
          error: 'Failed to fetch user permissions',
          message: error.message
        });
      }
    });

    // Enhanced session validation with caching
    fastify.post('/validate-session', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          required: ['kinde_user_id', 'kinde_org_code'],
          properties: {
            kinde_user_id: { type: 'string' },
            kinde_org_code: { type: 'string' },
            force_refresh: { type: 'boolean', default: false }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const { kinde_user_id, kinde_org_code, force_refresh } = request.body;
        
        // Check cache first
        if (!force_refresh) {
          const cachedSession = await DistributedSSOCache.getSessionValidation(kinde_user_id, kinde_org_code);
          if (cachedSession) {
            console.log(`🎯 CACHE HIT: Session validation for ${kinde_user_id}`);
            return cachedSession;
          }
        }
        
        console.log(`💾 Cache MISS: Validating session in database`);
        
        const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
        if (!tenant) {
          const result = { valid: false, error: 'Tenant not found' };
          await DistributedSSOCache.cacheSessionValidation(kinde_user_id, kinde_org_code, false);
          return result;
        }

        const userResult = await db
          .select({ id: tenantUsers.id, isActive: tenantUsers.isActive })
          .from(tenantUsers)
          .where(
            and(
              eq(tenantUsers.kindeUserId, kinde_user_id),
              eq(tenantUsers.tenantId, tenant.tenantId)
            )
          )
          .limit(1);

        const isValid = userResult.length > 0 && userResult[0].isActive;
        const userData = isValid ? {
          tenant_id: tenant.tenantId,
          user_id: userResult[0].id
        } : null;

        // Cache the result
        await DistributedSSOCache.cacheSessionValidation(kinde_user_id, kinde_org_code, isValid, userData);

        return {
          valid: isValid,
          ...userData
        };

      } catch (error) {
        fastify.log.error('Error validating session:', error);
        return { valid: false, error: 'Validation failed' };
      }
    });

    // Enhanced SSO token validation with caching
    fastify.post('/validate-sso-token', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          required: ['token', 'app_code'],
          properties: {
            token: { type: 'string' },
            app_code: { type: 'string' },
            force_refresh: { type: 'boolean', default: false }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const { token, app_code, force_refresh } = request.body;
        
        // Create token hash for caching
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Check cache first
        if (!force_refresh) {
          const cachedToken = await DistributedSSOCache.getSSOToken(tokenHash);
          if (cachedToken) {
            console.log(`🎯 CACHE HIT: SSO token validation`);
            return {
              valid: true,
              ...cachedToken,
              source: 'cache'
            };
          }
        }
        
        console.log(`💾 Cache MISS: Validating SSO token in database`);
        
        // Your existing SSO token validation logic here
        // This is just a placeholder - you'd implement your actual token validation
        const tokenValidation = {
          valid: true,
          user: {
            id: 'user_123',
            email: 'user@example.com',
            name: 'John Doe'
          },
          tenant: {
            id: 'tenant_123',
            name: 'Company Name'
          },
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
        };
        
        // Cache the validation result
        if (tokenValidation.valid) {
          await DistributedSSOCache.cacheSSOToken(tokenHash, tokenValidation);
        }
        
        return {
          ...tokenValidation,
          source: 'database'
        };

      } catch (error) {
        fastify.log.error('Error validating SSO token:', error);
        return reply.code(500).send({ 
          error: 'Failed to validate SSO token',
          message: error.message
        });
      }
    });

    // Cache management endpoints
    fastify.get('/cache/stats', {
      preHandler: [validateInternalApiKey]
    }, async (request, reply) => {
      try {
        const stats = await DistributedSSOCache.getCacheStats();
        return {
          success: true,
          data: stats
        };
      } catch (error) {
        fastify.log.error('Error getting cache stats:', error);
        return reply.code(500).send({ error: 'Failed to get cache stats' });
      }
    });

    fastify.post('/cache/invalidate', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['user', 'tenant', 'app'] },
            identifier: { type: 'string' },
            tenant_id: { type: 'string' }
          },
          required: ['type', 'identifier']
        }
      }
    }, async (request, reply) => {
      try {
        const { type, identifier, tenant_id } = request.body;
        
        switch (type) {
          case 'user':
            await DistributedSSOCache.invalidateUserCache(identifier, tenant_id);
            break;
          case 'tenant':
            await DistributedSSOCache.invalidateTenantCache(identifier);
            break;
          case 'app':
            await DistributedSSOCache.invalidateAppCache(identifier);
            break;
          default:
            return reply.code(400).send({ error: 'Invalid cache type' });
        }
        
        return {
          success: true,
          message: `Cache invalidated for ${type}: ${identifier}`
        };
      } catch (error) {
        fastify.log.error('Error invalidating cache:', error);
        return reply.code(500).send({ error: 'Failed to invalidate cache' });
      }
    });

    // Warm up cache for a user
    fastify.post('/cache/warmup', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          required: ['kinde_user_id', 'kinde_org_code'],
          properties: {
            kinde_user_id: { type: 'string' },
            kinde_org_code: { type: 'string' },
            apps: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const { kinde_user_id, kinde_org_code, apps } = request.body;
        const appsToWarm = apps || ['crm', 'hr', 'affiliate'];
        
        // Warm up cache by fetching data for all specified apps
        const warmupPromises = appsToWarm.map(app => 
          fastify.inject({
            method: 'POST',
            url: '/api/internal/user-permissions',
            headers: request.headers,
            body: {
              kinde_user_id,
              kinde_org_code,
              requesting_app: app,
              force_refresh: true
            }
          })
        );
        
        await Promise.all(warmupPromises);
        
        return {
          success: true,
          message: `Cache warmed up for user ${kinde_user_id} across ${appsToWarm.length} apps`
        };
      } catch (error) {
        fastify.log.error('Error warming up cache:', error);
        return reply.code(500).send({ error: 'Failed to warm up cache' });
      }
    });

    // Get available tools for user
    fastify.post('/user-tools', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          required: ['kinde_user_id', 'kinde_org_code'],
          properties: {
            kinde_user_id: { type: 'string' },
            kinde_org_code: { type: 'string' }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const { kinde_user_id, kinde_org_code } = request.body;

        const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
        }

        // Get user roles
        const userResult = await db
          .select({ id: tenantUsers.id })
          .from(tenantUsers)
          .where(
            and(
              eq(tenantUsers.kindeUserId, kinde_user_id),
              eq(tenantUsers.tenantId, tenant.tenantId)
            )
          )
          .limit(1);

        if (!userResult.length) {
          return ErrorResponses.notFound(reply, 'User', 'User not found');
        }

        const userRolesResult = await db
          .select({ permissions: customRoles.permissions })
          .from(userRoleAssignments)
          .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
          .where(
            and(
              eq(userRoleAssignments.userId, userResult[0].id),
              eq(userRoleAssignments.isActive, true)
            )
          );

        const availableTools = getAvailableTools(userRolesResult);

        return {
          success: true,
          data: {
            available_tools: availableTools,
            tenant_id: tenant.tenantId
          }
        };

      } catch (error) {
        fastify.log.error('Error fetching user tools:', error);
        return reply.code(500).send({ error: 'Failed to fetch user tools' });
      }
    });

    // Service authentication endpoint for CRM to get API tokens
    fastify.post('/service-auth', {
      preHandler: [validateInternalApiKey],
      schema: {
        body: {
          type: 'object',
          required: ['service', 'tenant_id'],
          properties: {
            service: { type: 'string', enum: ['crm', 'hr', 'affiliate'] },
            tenant_id: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const { service, tenant_id, permissions = ['read'] } = request.body;

        console.log(`🔑 Service authentication request: ${service} for tenant ${tenant_id}`);

        // Validate tenant exists
        const tenant = await TenantService.getTenantDetails(tenant_id);
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
        }

        // Generate a service token (JWT) for the requesting service
        const { sign } = await import('jsonwebtoken');

        const payload = {
          service: service,
          tenant_id: tenant_id,
          permissions: permissions,
          type: 'service_token',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        const token = sign(payload, secret);

        console.log(`✅ Service token generated for ${service}`);

        return {
          success: true,
          data: {
            token: token,
            service: service,
            tenant_id: tenant_id,
            permissions: permissions,
            expires_in: 24 * 60 * 60, // 24 hours in seconds
            token_type: 'service_jwt'
          }
        };

      } catch (error) {
        console.error('❌ Service authentication error:', error);
        fastify.log.error('Service authentication error:', error);
        return reply.code(500).send({ error: 'Failed to authenticate service' });
      }
    });
}

// Helper function to extract available tools from roles
function getAvailableTools(roles) {
  const tools = new Set();
  
  roles.forEach(role => {
    const permissions = typeof role.permissions === 'string' 
      ? JSON.parse(role.permissions) 
      : role.permissions;
    
    Object.keys(permissions).forEach(tool => {
      if (Object.keys(permissions[tool]).length > 0) {
        tools.add(tool);
      }
    });
  });
  
  return Array.from(tools);
}