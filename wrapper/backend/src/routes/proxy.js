import axios from 'axios';

const TOOL_URLS = {
  crm: process.env.CRM_APP_URL || 'http://localhost:3002',
  hr: process.env.HR_APP_URL || 'http://localhost:3003',
  affiliate: process.env.AFFILIATE_APP_URL || 'http://localhost:3004',
  accounting: process.env.ACCOUNTING_APP_URL || 'http://localhost:3005',
  inventory: process.env.INVENTORY_APP_URL || 'http://localhost:3006',
};

export default async function proxyRoutes(fastify, options) {
  // Proxy requests to individual tools
  fastify.all('/proxy/:tool/*', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { tool } = request.params;
    const path = request.params['*'];
    
    if (!TOOL_URLS[tool]) {
      return reply.code(404).send({ error: 'Tool not found' });
    }

    try {
      const { TenantService } = await import('../services/tenant-service.js');
      const tenant = await TenantService.getByKindeOrgId(request.userContext.organization);
      
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Check if tenant has access to this tool
      const { SubscriptionService } = await import('../services/subscription-service.js');
      const subscription = await SubscriptionService.getCurrentSubscription(tenant.tenantId);
      
      if (subscription && !subscription.subscribedTools.includes(tool)) {
        return reply.code(403).send({ 
          error: 'Tool not available in your plan',
          tool,
          availableTools: subscription.subscribedTools 
        });
      }

      // Fetch user permissions for this tool
      let userPermissions = {};
      let userRestrictions = {};
      let userRoles = [];

      try {
        const permissionsResponse = await axios.post(
          `${process.env.API_URL || 'http://localhost:3000'}/api/internal/user-permissions`,
          {
            kinde_user_id: request.userContext.kindeUserId,
            kinde_org_code: request.userContext.organization,
            requesting_app: tool
          },
          {
            headers: {
              'x-internal-api-key': process.env.INTERNAL_API_KEY
            }
          }
        );

        if (permissionsResponse.data.success) {
          userPermissions = permissionsResponse.data.data.permissions;
          userRestrictions = permissionsResponse.data.data.restrictions;
          userRoles = permissionsResponse.data.data.roles;
        }
      } catch (permError) {
        fastify.log.warn('Failed to fetch user permissions:', permError.message);
        // Continue without permissions - tool can handle gracefully
      }

      const targetUrl = `${TOOL_URLS[tool]}/${path}`;
      
      // Prepare headers with tenant context and permissions
      const headers = {
        ...request.headers,
        'x-tenant-id': tenant.tenantId,
        'x-user-id': request.userContext.kindeUserId,
        'x-user-email': request.userContext.email,
        'x-user-name': request.userContext.name,
        'x-tenant-name': tenant.companyName,
        'x-tenant-subdomain': tenant.subdomain,
        'x-user-roles': JSON.stringify(userRoles),
        'x-user-permissions': JSON.stringify(userPermissions),
        'x-user-restrictions': JSON.stringify(userRestrictions),
        'x-kinde-org-code': request.userContext.organization,
        'x-internal-api-key': process.env.INTERNAL_API_KEY,
      };

      // Remove host header to avoid conflicts
      delete headers.host;
      delete headers['content-length'];

      const config = {
        method: request.method,
        url: targetUrl,
        headers,
        timeout: 30000, // 30 seconds
      };

      // Add body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
        config.data = request.body;
      }

      // Add query parameters
      if (request.query && Object.keys(request.query).length > 0) {
        config.params = request.query;
      }

      const response = await axios(config);
      
      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      });

      reply.code(response.status);
      return response.data;

    } catch (error) {
      fastify.log.error(`Proxy error for ${tool}:`, error);
      
      if (error.response) {
        // Tool returned an error response
        reply.code(error.response.status);
        return error.response.data;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
        // Tool is not available
        return reply.code(503).send({ 
          error: 'Service temporarily unavailable',
          tool,
          message: `The ${tool} service is currently not available. Please try again later.`
        });
      } else {
        // Other proxy errors
        return reply.code(500).send({ 
          error: 'Proxy error',
          message: 'Failed to communicate with the requested service'
        });
      }
    }
  });

  // Get available tools for current tenant
  fastify.get('/tools', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { TenantService } = await import('../services/tenant-service.js');
      const tenant = await TenantService.getByKindeOrgId(request.userContext.organization);
      
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      const { SubscriptionService } = await import('../services/subscription-service.js');
      const subscription = await SubscriptionService.getCurrentSubscription(tenant.tenantId);
      
      const availableTools = subscription?.subscribedTools || ['crm'];
      
      // Get user's available tools based on permissions
      let userAvailableTools = availableTools;
      try {
        const toolsResponse = await axios.post(
          `${process.env.API_URL || 'http://localhost:3000'}/api/internal/user-tools`,
          {
            kinde_user_id: request.userContext.kindeUserId,
            kinde_org_code: request.userContext.organization
          },
          {
            headers: {
              'x-internal-api-key': process.env.INTERNAL_API_KEY
            }
          }
        );

        if (toolsResponse.data.success) {
          // Intersection of subscribed tools and user's permitted tools
          const permittedTools = toolsResponse.data.data.available_tools;
          userAvailableTools = availableTools.filter(tool => permittedTools.includes(tool));
        }
      } catch (permError) {
        fastify.log.warn('Failed to fetch user tools:', permError.message);
        // Fall back to subscription-based tools
      }
      
      const tools = userAvailableTools.map(tool => ({
        id: tool,
        name: tool.toUpperCase(),
        url: `/api/proxy/${tool}`,
        available: !!TOOL_URLS[tool],
        description: getToolDescription(tool)
      }));

      return {
        success: true,
        data: {
          tools,
          subscription: {
            plan: subscription?.plan || 'trial',
            status: subscription?.status || 'trialing',
          }
        }
      };
    } catch (error) {
      fastify.log.error('Error fetching available tools:', error);
      return reply.code(500).send({ error: 'Failed to fetch available tools' });
    }
  });

  // Check tool health
  fastify.get('/health/:tool', async (request, reply) => {
    const { tool } = request.params;
    
    if (!TOOL_URLS[tool]) {
      return reply.code(404).send({ error: 'Tool not found' });
    }

    try {
      const response = await axios.get(`${TOOL_URLS[tool]}/health`, {
        timeout: 5000,
      });
      
      return {
        success: true,
        tool,
        status: 'healthy',
        response: response.data,
      };
    } catch (error) {
      return {
        success: false,
        tool,
        status: 'unhealthy',
        error: error.message,
      };
    }
  });
}

function getToolDescription(tool) {
  const descriptions = {
    crm: 'Customer Relationship Management - Manage leads, contacts, and deals',
    hr: 'Human Resources - Employee management, payroll, and HR processes',
    affiliate: 'Affiliate Management - Track partners, commissions, and referrals',
    accounting: 'Accounting & Finance - Invoicing, expenses, and financial reporting',
    inventory: 'Inventory Management - Stock tracking, orders, and warehouse management',
  };
  
  return descriptions[tool] || `${tool.toUpperCase()} application`;
} 