import axios from 'axios';

const APP_URLS = {
  crm: process.env.CRM_APP_URL || 'http://localhost:3002',
  hr: process.env.HR_APP_URL || 'http://localhost:3003',
  affiliate: process.env.AFFILIATE_APP_URL || 'http://localhost:3004',
  accounting: process.env.ACCOUNTING_APP_URL || 'http://localhost:3005',
  inventory: process.env.INVENTORY_APP_URL || 'http://localhost:3006'
};

export default async function unifiedProxyRoutes(fastify, options) {

  // Unified app access endpoint
  fastify.get('/app/:appCode', async (request, reply) => {
    try {
      const { appCode } = request.params;
      const userContext = request.userContext;

      console.log('🚀 App access request:', { appCode, user: userContext.email });

      // Check app access using unified context
      const accessCheck = userContext.hasAppAccess(appCode);
      if (!accessCheck.allowed) {
        return reply.code(403).send({
          error: 'App access denied',
          reason: accessCheck.reason,
          allowedApps: userContext.allowedApps
        });
      }

      // Generate app-specific redirect URL with embedded token
      const appUrl = APP_URLS[appCode];
      if (!appUrl) {
        return reply.code(404).send({
          error: 'App not found',
          appCode
        });
      }

      // Create app access URL with embedded user context
      const accessUrl = new URL(`${appUrl}/auth`);
      
      // Pass user context as URL parameters (downstream apps can read these)
      accessUrl.searchParams.set('user_id', userContext.userId);
      accessUrl.searchParams.set('tenant_id', userContext.tenantId);
      accessUrl.searchParams.set('email', userContext.email);
      accessUrl.searchParams.set('name', userContext.name);
      accessUrl.searchParams.set('is_admin', userContext.isAdmin.toString());
      
      // Pass permissions as JSON string
      accessUrl.searchParams.set('permissions', JSON.stringify(userContext.permissions));
      accessUrl.searchParams.set('restrictions', JSON.stringify(userContext.restrictions));
      
      // Pass organization context
      accessUrl.searchParams.set('org_id', userContext.tenantId);
      accessUrl.searchParams.set('org_name', userContext.organizationName);
      accessUrl.searchParams.set('subdomain', userContext.subdomain);

      console.log('✅ Redirecting to app:', appUrl);

      // Redirect user to the app with context
      return reply.redirect(accessUrl.toString());

    } catch (error) {
      console.error('❌ App access failed:', error);
      return reply.code(500).send({
        error: 'App access failed',
        message: error.message
      });
    }
  });

  // Unified API proxy for downstream apps
  fastify.all('/api/:appCode/*', async (request, reply) => {
    try {
      const { appCode } = request.params;
      const path = request.params['*'];
      const userContext = request.userContext;

      console.log('🔗 API proxy request:', { appCode, path, user: userContext.email });

      // Check app access
      const accessCheck = userContext.hasAppAccess(appCode);
      if (!accessCheck.allowed) {
        return reply.code(403).send({
          error: 'API access denied',
          reason: accessCheck.reason
        });
      }

      const targetUrl = APP_URLS[appCode];
      if (!targetUrl) {
        return reply.code(404).send({
          error: 'App not found',
          appCode
        });
      }

      // Forward request to downstream app
      const proxyUrl = `${targetUrl}/api/${path}`;
      
      const proxyRequest = {
        method: request.method,
        url: proxyUrl,
        headers: {
          ...request.headers,
          // Add user context headers for downstream apps
          'X-User-ID': userContext.userId,
          'X-Tenant-ID': userContext.tenantId,
          'X-User-Email': userContext.email,
          'X-User-Name': userContext.name,
          'X-Is-Admin': userContext.isAdmin.toString(),
          'X-Organization-Name': userContext.organizationName,
          'X-Subdomain': userContext.subdomain,
          'X-Permissions': JSON.stringify(userContext.permissions),
          'X-Restrictions': JSON.stringify(userContext.restrictions),
          // Remove the original authorization header
          'Authorization': undefined
        },
        data: request.body,
        params: request.query,
        timeout: 30000
      };

      console.log('📤 Forwarding request to:', proxyUrl);

      const response = await axios(proxyRequest);

      // Forward response
      reply.code(response.status);
      Object.keys(response.headers).forEach(key => {
        reply.header(key, response.headers[key]);
      });

      return response.data;

    } catch (error) {
      console.error('❌ API proxy failed:', error);
      
      if (error.response) {
        return reply.code(error.response.status).send(error.response.data);
      }
      
      return reply.code(500).send({
        error: 'Proxy request failed',
        message: error.message
      });
    }
  });

  // Get user's available apps
  fastify.get('/apps', async (request, reply) => {
    try {
      const userContext = request.userContext;

      // Return apps user has access to
      const availableApps = userContext.allowedApps.map(appCode => ({
        code: appCode,
        name: appCode.toUpperCase(),
        url: `/app/${appCode}`,
        apiUrl: `/api/${appCode}`,
        hasAccess: true
      }));

      return {
        success: true,
        apps: availableApps,
        subscription: userContext.subscription
      };

    } catch (error) {
      console.error('❌ Failed to get user apps:', error);
      return reply.code(500).send({
        error: 'Failed to get apps',
        message: error.message
      });
    }
  });
}