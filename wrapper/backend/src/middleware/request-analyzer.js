export class RequestAnalyzer {
  static analyzeRequest(req) {
    const analysis = {
      subdomain: this.extractSubdomain(req),
      path: req.url,
      method: req.method,
      isOnboarding: this.isOnboardingRequest(req),
      isSystemOperation: this.isSystemOperation(req),
      isAdminOperation: this.isAdminOperation(req),
      isPublicEndpoint: this.isPublicEndpoint(req),
      requiresBypass: false,
      tenantId: null,
      connectionType: 'app', // 'app' or 'system'
      securityLevel: 'standard' // 'standard', 'elevated', 'system'
    };

    // Determine connection type and security level
    if (analysis.isOnboarding || analysis.isSystemOperation || analysis.isAdminOperation) {
      analysis.requiresBypass = true;
      analysis.connectionType = 'system';
      analysis.securityLevel = analysis.isSystemOperation ? 'system' : 'elevated';
    }

    // Log analysis for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Request Analysis:', {
        path: analysis.path,
        method: analysis.method,
        connectionType: analysis.connectionType,
        securityLevel: analysis.securityLevel,
        requiresBypass: analysis.requiresBypass,
        subdomain: analysis.subdomain
      });
    }

    return analysis;
  }

  static extractSubdomain(req) {
    const host = req.headers.host || '';
    const parts = host.split('.');

    // Handle Supabase domains and custom domains
    // Skip www and main domain (adjust based on your domain structure)
    if (parts.length > 2 && parts[0] !== 'www' && !host.includes('supabase')) {
      return parts[0];
    }
    return null;
  }

  static isOnboardingRequest(req) {
    return req.url.startsWith('/api/onboarding/') ||
           req.url.startsWith('/api/signup/') ||
           req.url === '/api/create-tenant' ||
           req.url.startsWith('/api/tenants') && req.method === 'POST';
  }

  static isSystemOperation(req) {
    const systemPaths = [
      '/api/admin/',
      '/api/system/',
      '/api/internal/',
      '/api/webhooks/',
      '/api/auth/logout',
      '/health',
      '/api/health',
      '/api/debug-routes',
      '/api/test-no-middleware',
      '/api/permissions/sync',
      '/api/user-sync/',
      '/api/permission-sync/',
      '/api/enhanced-crm-integration/system/'
    ];

    return systemPaths.some(path => req.url.startsWith(path));
  }

  static isAdminOperation(req) {
    return req.url.startsWith('/api/admin/') ||
           (req.url.includes('/management') && req.method !== 'GET') ||
           req.url.startsWith('/api/roles') && ['POST', 'PUT', 'DELETE'].includes(req.method);
  }

  static isPublicEndpoint(req) {
    const publicPaths = [
      '/health',
      '/api/health',
      '/api/auth',
      '/api/invitations',
      '/api/locations',
      '/api/credits/packages',
      '/api/credits/test-route',
      '/docs',
      '/api/metrics/',
      '/test-auth',
      '/auth',
      '/logout'
    ];

    return publicPaths.some(path => req.url.startsWith(path));
  }

  // Helper method to get connection type for a given request
  static getConnectionType(req) {
    const analysis = this.analyzeRequest(req);
    return analysis.connectionType;
  }

  // Helper method to check if request requires elevated privileges
  static requiresElevatedAccess(req) {
    const analysis = this.analyzeRequest(req);
    return analysis.securityLevel === 'elevated' || analysis.securityLevel === 'system';
  }

  // Helper method to check if request should bypass RLS
  static shouldBypassRLS(req) {
    const analysis = this.analyzeRequest(req);
    return analysis.requiresBypass;
  }
}
