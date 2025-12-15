import { db } from '../db/index.js';
import {
  applications,
  organizationApplications,
  userApplicationPermissions,
  applicationModules
} from '../db/schema/suite-schema.js';
import { tenants, tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

export default async function suiteRoutes(fastify, options) {

  // Get user's available applications
  fastify.get('/applications', async (request, reply) => {
    try {
      const { tenantId } = request.userContext;

      console.log('📱 Getting organization applications:', { tenantId });

      // Get applications enabled for this organization
      const userApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          isCore: applications.isCore,
          sortOrder: applications.sortOrder,
          isEnabled: organizationApplications.isEnabled,
          subscriptionTier: organizationApplications.subscriptionTier,
          enabledModules: organizationApplications.enabledModules
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(and(
          eq(organizationApplications.tenantId, tenantId),
          eq(organizationApplications.isEnabled, true)
        ))
        .orderBy(applications.sortOrder, applications.appName);

      return {
        success: true,
        applications: userApps
      };

    } catch (error) {
      console.error('❌ Failed to get user applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  // Get user activity logs (simplified without SSO)
  fastify.get('/activity', async (request, reply) => {
    try {
      const { internalUserId } = request.userContext;
      const { limit = 50 } = request.query;

      console.log('📊 Getting user activity:', { internalUserId, limit });

      // Return basic activity info since SSO activity tracking is not available
      return {
        success: true,
        activities: [],
        note: 'Activity tracking available through audit logs',
        userId: internalUserId,
        limit: parseInt(limit)
      };

    } catch (error) {
      console.error('❌ Failed to get user activity:', error);
      return reply.code(500).send({
        error: 'Failed to get activity',
        message: error.message
      });
    }
  });

  // Application redirect endpoint (simplified without SSO)
  fastify.post('/app/redirect', async (request, reply) => {
    try {
      const { appCode, returnTo } = request.body;
      const userContext = request.userContext;

      if (!appCode) {
        return reply.code(400).send({
          error: 'Missing required field: appCode'
        });
      }

      console.log('🔄 Handling app redirect:', { appCode, returnTo, userId: userContext.internalUserId });

      // Get application details
      const [app] = await db
        .select()
        .from(applications)
        .where(eq(applications.appCode, appCode))
        .limit(1);

      if (!app) {
        return reply.code(404).send({
          error: 'Application not found'
        });
      }

      // Build redirect URL
      const redirectUrl = returnTo
        ? `${app.baseUrl}${returnTo}`
        : app.baseUrl;

      return {
        success: true,
        redirectUrl,
        app: {
          appCode: app.appCode,
          appName: app.appName,
          baseUrl: app.baseUrl
        }
      };

    } catch (error) {
      console.error('❌ App redirect failed:', error);
      return reply.code(500).send({
        error: 'App redirect failed',
        message: error.message
      });
    }
  });

  // Get all applications (admin only)
  fastify.get('/admin/applications', async (request, reply) => {
    try {
      console.log('🔧 Getting all applications (admin)');

      const allApps = await db
        .select()
        .from(applications)
        .orderBy(applications.sortOrder, applications.appName);

      return {
        success: true,
        applications: allApps
      };

    } catch (error) {
      console.error('❌ Failed to get all applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  // Create new application (admin only)
  fastify.post('/admin/applications', async (request, reply) => {
    try {
      const { 
        appCode, 
        appName, 
        description, 
        icon, 
        baseUrl, 
        isCore = false, 
        sortOrder = 0 
      } = request.body;

      if (!appCode || !appName || !baseUrl) {
        return reply.code(400).send({
          error: 'Missing required fields: appCode, appName, baseUrl'
        });
      }

      console.log('🆕 Creating new application:', { appCode, appName });

      const [newApp] = await db
        .insert(applications)
        .values({
          appCode,
          appName,
          description,
          icon,
          baseUrl,
          isCore,
          sortOrder
        })
        .returning();

      return {
        success: true,
        application: newApp
      };

    } catch (error) {
      console.error('❌ Failed to create application:', error);
      return reply.code(500).send({
        error: 'Failed to create application',
        message: error.message
      });
    }
  });

  // Get organization applications
  fastify.get('/admin/organizations/:orgId/applications', async (request, reply) => {
    try {
      const { orgId } = request.params;

      console.log('🏢 Getting organization applications:', { orgId });

      const orgApps = await db
        .select({
          id: organizationApplications.id,
          appId: organizationApplications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          isEnabled: organizationApplications.isEnabled,
          enabledModules: organizationApplications.enabledModules,
          subscriptionTier: organizationApplications.subscriptionTier,
          licenseCount: organizationApplications.licenseCount,
          maxUsers: organizationApplications.maxUsers,
          expiresAt: organizationApplications.expiresAt
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(eq(organizationApplications.tenantId, orgId));

      return {
        success: true,
        applications: orgApps
      };

    } catch (error) {
      console.error('❌ Failed to get organization applications:', error);
      return reply.code(500).send({
        error: 'Failed to get organization applications',
        message: error.message
      });
    }
  });

  // Enable/disable application for organization
  fastify.post('/admin/organizations/:orgId/applications/:appId/toggle', async (request, reply) => {
    try {
      const { orgId, appId } = request.params;
      const { isEnabled, subscriptionTier, enabledModules, maxUsers } = request.body;

      console.log('🔄 Toggling application for organization:', { orgId, appId, isEnabled });

      // Check if record exists
      const [existing] = await db
        .select()
        .from(organizationApplications)
        .where(and(
          eq(organizationApplications.tenantId, orgId),
          eq(organizationApplications.appId, appId)
        ))
        .limit(1);

      let result;
      if (existing) {
        // Update existing record
        [result] = await db
          .update(organizationApplications)
          .set({
            isEnabled,
            subscriptionTier,
            enabledModules,
            maxUsers,
            updatedAt: new Date()
          })
          .where(eq(organizationApplications.id, existing.id))
          .returning();
      } else {
        // Create new record
        [result] = await db
          .insert(organizationApplications)
          .values({
            tenantId: orgId,
            appId,
            isEnabled: isEnabled ?? true,
            subscriptionTier: subscriptionTier || 'basic',
            enabledModules,
            maxUsers
          })
          .returning();
      }

      return {
        success: true,
        organizationApplication: result
      };

    } catch (error) {
      console.error('❌ Failed to toggle application:', error);
      return reply.code(500).send({
        error: 'Failed to toggle application',
        message: error.message
      });
    }
  });



  // Test endpoint for debugging
  fastify.get('/debug', async (request, reply) => {
    try {
      const userContext = request.userContext;

      return {
        success: true,
        debug: {
          userContext,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      };

    } catch (error) {
      console.error('❌ Debug endpoint failed:', error);
      return reply.code(500).send({
        error: 'Debug failed',
        message: error.message
      });
    }
  });
} 