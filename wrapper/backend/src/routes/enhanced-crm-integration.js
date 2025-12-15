import axios from 'axios';

const APP_URLS = {
  crm: process.env.CRM_APP_URL || 'http://localhost:3002',
  hr: process.env.HR_APP_URL || 'http://localhost:3003',
  affiliate: process.env.AFFILIATE_APP_URL || 'http://localhost:3004',
  accounting: process.env.ACCOUNTING_APP_URL || 'http://localhost:3005',
  inventory: process.env.INVENTORY_APP_URL || 'http://localhost:3006'
};

export default async function enhancedCRMIntegration(fastify, options) {

  // 🎯 METHOD 1: Direct App Access (Primary - for UI)
  fastify.get('/app/:appCode', async (request, reply) => {
    try {
      const { appCode } = request.params;
      const userContext = request.userContext;

      console.log('🚀 Direct app access:', { appCode, user: userContext.email });

      // Check app access
      const accessCheck = userContext.hasAppAccess(appCode);
      if (!accessCheck.allowed) {
        return reply.code(403).send({
          error: 'App access denied',
          reason: accessCheck.reason
        });
      }

      const appUrl = APP_URLS[appCode];
      if (!appUrl) {
        return reply.code(404).send({ error: 'App not found' });
      }

      // 🎯 Direct redirect to app (SSO removed)
      const accessUrl = new URL(appUrl);
      accessUrl.searchParams.set('user_id', userContext.kindeUserId || userContext.userId);
      accessUrl.searchParams.set('org_id', userContext.kindeOrgId || userContext.tenantId);
      accessUrl.searchParams.set('app_code', appCode);

      console.log('✅ Redirecting to app (direct access)');
      return reply.redirect(accessUrl.toString());

    } catch (error) {
      console.error('❌ Direct app access failed:', error);
      return reply.code(500).send({
        error: 'App access failed',
        message: error.message
      });
    }
  });

  // 🎯 METHOD 2: Smart API Proxy (Secondary - for AJAX)
  fastify.all('/api/:appCode/*', async (request, reply) => {
    try {
      const { appCode } = request.params;
      const path = request.params['*'];
      const userContext = request.userContext;

      console.log('🔗 Smart API proxy:', { appCode, path, user: userContext.email });

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
        return reply.code(404).send({ error: 'App not found' });
      }

      // 🎯 Forward request with user context headers (SSO removed)
      const proxyRequest = {
        method: request.method,
        url: `${targetUrl}/api/${path}`,
        headers: {
          // 🎯 Include user context in headers
          'X-User-ID': userContext.kindeUserId || userContext.userId,
          'X-Org-ID': userContext.kindeOrgId || userContext.tenantId,
          'X-App-Code': appCode,
          'X-User-Email': userContext.email,
          'X-User-Roles': JSON.stringify(userContext.roles || []),
          'Content-Type': request.headers['content-type'] || 'application/json',
          'Accept': request.headers.accept || 'application/json',
          // Remove problematic headers
          'host': undefined,
          'content-length': undefined
        },
        data: request.body,
        params: request.query,
        timeout: 30000
      };

      console.log('📤 Forwarding API request to:', proxyRequest.url);

      const response = await axios(proxyRequest);

      // Forward response cleanly
      reply.code(response.status);
      Object.keys(response.headers).forEach(key => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          reply.header(key, response.headers[key]);
        }
      });

      return response.data;

    } catch (error) {
      console.error('❌ Smart API proxy failed:', error);
      
      if (error.response) {
        return reply.code(error.response.status).send(error.response.data);
      }
      
      return reply.code(500).send({
        error: 'API proxy failed',
        message: error.message
      });
    }
  });

  // 🎯 METHOD 3: App Discovery (for dashboard)
  fastify.get('/apps', async (request, reply) => {
    try {
      const userContext = request.userContext;

      // Get user's available apps
      const availableApps = userContext.allowedApps.map(appCode => ({
        code: appCode,
        name: appCode.toUpperCase(),
        displayName: getAppDisplayName(appCode),
        description: getAppDescription(appCode),
        icon: getAppIcon(appCode),
        urls: {
          direct: `/app/${appCode}`,
          api: `/api/${appCode}`
        },
        hasAccess: true,
        subscription: userContext.subscription.tier
      }));

      return {
        success: true,
        apps: availableApps,
        subscription: userContext.subscription,
        user: {
          email: userContext.email,
          name: userContext.name,
          isAdmin: userContext.isAdmin
        }
      };

    } catch (error) {
      console.error('❌ Failed to get user apps:', error);
      return reply.code(500).send({
        error: 'Failed to get apps',
        message: error.message
      });
    }
  });

  // 🎯 SSO token validation route removed
}

// Helper functions
function getAppDisplayName(appCode) {
  const names = {
    crm: 'Customer Relationship Management',
    hr: 'Human Resources',
    affiliate: 'Affiliate Management',
    accounting: 'Accounting & Finance',
    inventory: 'Inventory Management'
  };
  return names[appCode] || appCode.toUpperCase();
}

function getAppDescription(appCode) {
  const descriptions = {
    crm: 'Manage customer relationships, deals, and sales pipeline',
    hr: 'Handle employee management, payroll, and HR processes',
    affiliate: 'Track and manage affiliate marketing campaigns',
    accounting: 'Financial management, invoicing, and reporting',
    inventory: 'Stock management and supply chain tracking'
  };
  return descriptions[appCode] || 'Business application';
}

function getAppIcon(appCode) {
  const icons = {
    crm: '🏢',
    hr: '👥',
    affiliate: '💰',
    accounting: '📊',
    inventory: '📦'
  };
  return icons[appCode] || '📱';
} 