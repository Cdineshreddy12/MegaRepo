// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/health',
  '/api/auth',
  '/api/webhooks',
  '/api/invitations',
  '/docs'
];

export async function unifiedAuthMiddleware(request, reply) {
  // Skip auth for public routes
  if (isPublicRoute(request.url)) {
    return;
  }

  console.log('🔍 Unified Auth - Processing request (SSO removed):', {
    method: request.method,
    url: request.url,
    hasAuthHeader: !!request.headers.authorization
  });

  // Set basic user context (SSO validation removed)
  request.userContext = {
    // Basic user identity (would be populated from JWT/session in production)
    userId: 'system',
    email: 'system@example.com',
    name: 'System User',
    isAdmin: true,
    isActive: true,

    // Organization context
    tenantId: 'default',
    organizationName: 'Default Organization',
    subdomain: 'default',

    // Basic permissions (would be loaded from database in production)
    permissions: {},
    restrictions: {},
    roles: ['admin'],

    // Helper methods (simplified)
    hasPermission: (module, action) => true, // Allow all for now
    hasAppAccess: (appCode) => true, // Allow all apps for now

    // Authentication flags
    isAuthenticated: true,
    needsOnboarding: false
  };

  // Legacy compatibility
  request.user = request.userContext;

  console.log('✅ Basic user context set (SSO removed)');
}

function isPublicRoute(url) {
  return PUBLIC_ROUTES.some(route => url.startsWith(route));
}

function extractToken(request) {
  // Try Authorization header first
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookies
  return request.cookies?.kinde_token || request.cookies?.token || null;
}