import kindeService from '../services/kinde-service.js';

export default async function authRoutes(fastify, options) {
  // OAuth login for onboarding (no specific organization yet)
  fastify.get('/oauth/login', async (request, reply) => {
    const { state, redirect_uri, provider, prompt, login_hint } = request.query;

    console.log('🔍 OAuth login request:', { state, redirect_uri, provider, prompt, login_hint });

    try {
      let authUrl;

      // Generate provider-specific auth URL if provider is specified
      if (provider) {
        authUrl = kindeService.getSocialAuthUrl(provider, {
          redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
          state: state || 'onboarding',
          prompt,
          loginHint: login_hint,
          additionalParams: {
            // Add any provider-specific parameters
            ...(provider === 'google' && { access_type: 'offline' })
          }
        });
      } else {
        // Generate generic Kinde auth URL for onboarding flow
        authUrl = kindeService.generateSocialLoginUrl({
          redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
          state: state || 'onboarding',
          prompt,
          loginHint: login_hint
        });
      }

      console.log('✅ Generated auth URL:', authUrl);
      console.log('🚀 Redirecting to social login');

      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ OAuth login error:', error);
      request.log.error('OAuth login error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate OAuth login URL',
      });
    }
  });

  // Specific Google OAuth login
  fastify.get('/oauth/google', async (request, reply) => {
    const { state, redirect_uri, prompt = 'select_account' } = request.query;

    console.log('🔍 Google OAuth login request:', { state, redirect_uri, prompt });

    try {
      const authUrl = kindeService.generateGoogleLoginUrl({
        redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
        state: state || 'onboarding',
        prompt,
        additionalParams: {
          access_type: 'offline', // For refresh token
          include_granted_scopes: 'true'
        }
      });

      console.log('✅ Generated Google auth URL:', authUrl);
      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate Google OAuth URL',
      });
    }
  });

  // Specific GitHub OAuth login
  fastify.get('/oauth/github', async (request, reply) => {
    const { state, redirect_uri } = request.query;

    console.log('🔍 GitHub OAuth login request:', { state, redirect_uri });

    try {
      const authUrl = kindeService.generateGithubLoginUrl({
        redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
        state: state || 'onboarding'
      });

      console.log('✅ Generated GitHub auth URL:', authUrl);
      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ GitHub OAuth error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate GitHub OAuth URL',
      });
    }
  });

  // Specific Microsoft OAuth login
  fastify.get('/oauth/microsoft', async (request, reply) => {
    const { state, redirect_uri, prompt = 'select_account' } = request.query;

    console.log('🔍 Microsoft OAuth login request:', { state, redirect_uri, prompt });

    try {
      const authUrl = kindeService.generateMicrosoftLoginUrl({
        redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
        state: state || 'onboarding',
        prompt
      });

      console.log('✅ Generated Microsoft auth URL:', authUrl);
      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ Microsoft OAuth error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate Microsoft OAuth URL',
      });
    }
  });

  // Specific Apple OAuth login
  fastify.get('/oauth/apple', async (request, reply) => {
    const { state, redirect_uri } = request.query;

    console.log('🔍 Apple OAuth login request:', { state, redirect_uri });

    try {
      const authUrl = kindeService.generateAppleLoginUrl({
        redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
        state: state || 'onboarding'
      });

      console.log('✅ Generated Apple auth URL:', authUrl);
      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ Apple OAuth error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate Apple OAuth URL',
      });
    }
  });

  // Specific LinkedIn OAuth login
  fastify.get('/oauth/linkedin', async (request, reply) => {
    const { state, redirect_uri } = request.query;

    console.log('🔍 LinkedIn OAuth login request:', { state, redirect_uri });

    try {
      const authUrl = kindeService.generateLinkedInLoginUrl({
        redirectUri: redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`,
        state: state || 'onboarding'
      });

      console.log('✅ Generated LinkedIn auth URL:', authUrl);
      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ LinkedIn OAuth error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate LinkedIn OAuth URL',
      });
    }
  });

  // Login with subdomain (organization-specific login)
  fastify.get('/login/:subdomain', async (request, reply) => {
    const { subdomain } = request.params;
    const { provider, prompt } = request.query;

    console.log('🔍 Organization login request:', { subdomain, provider, prompt });

    if (!subdomain) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Subdomain parameter is required',
      });
    }

    try {
      let authUrl;
      const redirectUri = `${process.env.BACKEND_URL}/api/auth/callback`;
      const state = JSON.stringify({ subdomain, flow: 'login' });

      if (provider) {
        authUrl = kindeService.getSocialAuthUrl(provider, {
          orgCode: subdomain,
          redirectUri,
          state,
          prompt
        });
      } else {
        authUrl = kindeService.generateSocialLoginUrl({
          orgCode: subdomain,
          redirectUri,
          state
        });
      }

      console.log('✅ Generated organization login URL:', authUrl);
      return reply.redirect(authUrl);
    } catch (error) {
      console.error('❌ Organization login error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate organization login URL',
      });
    }
  });

  // Enhanced OAuth callback handler - handles both onboarding and app authentication
  fastify.get('/callback', async (request, reply) => {
    const { code, state, error: authError } = request.query;

    console.log('🔍 OAuth callback received:', {
      hasCode: !!code,
      state,
      error: authError
    });

    // Handle OAuth errors
    if (authError) {
      console.error('❌ OAuth error in callback:', { authError });

      // Check if this is an app authentication flow
      let appContext = {};
      try {
        appContext = state ? JSON.parse(state) : {};
      } catch (error) {
        console.warn('⚠️ Failed to parse state for error handling');
      }

      if (appContext.app_code && appContext.redirect_url) {
        // App authentication error - redirect to frontend AuthCallback with error state
        const frontendCallbackUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        frontendCallbackUrl.searchParams.set('state', JSON.stringify({
          app_code: appContext.app_code,
          redirect_url: appContext.redirect_url,
          error: 'auth_failed',
          error_description: 'Authentication failed'
        }));
        return reply.redirect(frontendCallbackUrl.toString());
      } else {
        // Onboarding error - redirect to onboarding
        const errorRedirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`);
        errorRedirectUrl.searchParams.set('error', 'auth_failed');
        errorRedirectUrl.searchParams.set('error_description', 'Authentication failed');
        return reply.redirect(errorRedirectUrl.toString());
      }
    }

    if (!code) {
      console.error('❌ No authorization code received');

      // Check if this is an app authentication flow
      let appContext = {};
      try {
        appContext = state ? JSON.parse(state) : {};
      } catch (error) {
        console.warn('⚠️ Failed to parse state for error handling');
      }

      if (appContext.app_code && appContext.redirect_url) {
        // App authentication error - redirect to frontend AuthCallback with error state
        const frontendCallbackUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        frontendCallbackUrl.searchParams.set('state', JSON.stringify({
          app_code: appContext.app_code,
          redirect_url: appContext.redirect_url,
          error: 'no_code',
          error_description: 'No authorization code provided'
        }));
        return reply.redirect(frontendCallbackUrl.toString());
      } else {
        // Onboarding error - redirect to onboarding
        const errorRedirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`);
        errorRedirectUrl.searchParams.set('error', 'no_code');
        return reply.redirect(errorRedirectUrl.toString());
      }
    }

    try {
      // Parse state to understand the flow
      let parsedState = { flow: 'onboarding' };
      if (state) {
        try {
          parsedState = typeof state === 'string' ? JSON.parse(state) : state;
        } catch (e) {
          console.warn('Could not parse state, using default:', state);
          if (state === 'onboarding') {
            parsedState = { flow: 'onboarding' };
          }
        }
      }

      console.log('🔍 Parsed state:', parsedState);

      // Exchange code for tokens
      const redirectUri = `${process.env.BACKEND_URL}/api/auth/callback`;
      const tokens = await kindeService.exchangeCodeForTokens(code, redirectUri);

      console.log('✅ Successfully exchanged code for tokens');

      // Get enhanced user information
      const userInfo = await kindeService.getEnhancedUserInfo(tokens.access_token);

      console.log('✅ Retrieved user info:', {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.given_name + ' ' + userInfo.family_name,
        socialProvider: userInfo.socialProvider,
        hasMultipleOrganizations: userInfo.hasMultipleOrganizations
      });

      // Set authentication cookies with proper domain configuration
      const cookieOptions = {
        httpOnly: false, // Allow JavaScript access for token management
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
        domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.zopkit.com' : undefined),
        path: '/'
      };

      reply
        .setCookie('kinde_token', tokens.access_token, {
          ...cookieOptions,
          maxAge: (tokens.expires_in || 3600) * 1000, // Convert to milliseconds
        })
        .setCookie('kinde_refresh_token', tokens.refresh_token, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        });

      // Handle app authentication flow
      if (parsedState.app_code && parsedState.redirect_url) {
        console.log('🔍 Processing app authentication flow:', parsedState.app_code);
        console.log('🔍 App redirect URL:', parsedState.redirect_url);
        console.log('🔍 User info:', { id: userInfo.id, email: userInfo.email });

        // Redirect to frontend AuthCallback with state data for proper CRM flow handling
        const frontendCallbackUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        frontendCallbackUrl.searchParams.set('state', JSON.stringify({
          app_code: parsedState.app_code,
          redirect_url: parsedState.redirect_url
        }));

        console.log('🚀 Redirecting to frontend AuthCallback for CRM flow:', frontendCallbackUrl.toString());
        return reply.redirect(frontendCallbackUrl.toString());
      }

      // Handle organization login flow
      if (parsedState.flow === 'login' && parsedState.subdomain) {
        // Organization login flow - redirect to organization dashboard
        const orgDashboardUrl = `https://${parsedState.subdomain}.${process.env.FRONTEND_DOMAIN || 'localhost:3001'}/dashboard`;
        console.log('🚀 Redirecting to organization dashboard:', orgDashboardUrl);
        return reply.redirect(orgDashboardUrl);
      } else {
        // Onboarding flow - redirect to frontend with user data
        const redirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`);
        redirectUrl.searchParams.set('email', userInfo.email);
        redirectUrl.searchParams.set('name', `${userInfo.given_name} ${userInfo.family_name}`.trim());
        redirectUrl.searchParams.set('step', '2'); // Skip to company info step

        // Add social provider info
        if (userInfo.socialProvider && userInfo.socialProvider !== 'unknown') {
          redirectUrl.searchParams.set('provider', userInfo.socialProvider);
        }

        console.log('🚀 Redirecting to onboarding with user data');
        return reply.redirect(redirectUrl.toString());
      }

    } catch (error) {
      console.error('❌ OAuth callback error:', error);

      // Check if this is an app authentication flow
      let appContext = {};
      try {
        appContext = state ? JSON.parse(state) : {};
      } catch (parseError) {
        console.warn('⚠️ Failed to parse state for error handling');
      }

      if (appContext.app_code && appContext.redirect_url) {
        // App authentication error - redirect to frontend AuthCallback with error state
        const frontendCallbackUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        frontendCallbackUrl.searchParams.set('state', JSON.stringify({
          app_code: appContext.app_code,
          redirect_url: appContext.redirect_url,
          error: 'callback_failed',
          error_description: error.message || 'Failed to process authentication'
        }));
        return reply.redirect(frontendCallbackUrl.toString());
      } else {
        // Onboarding error - redirect to onboarding
        const errorRedirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/onboarding`);
        errorRedirectUrl.searchParams.set('error', 'callback_failed');
        errorRedirectUrl.searchParams.set('error_description', 'Failed to process authentication');
        return reply.redirect(errorRedirectUrl.toString());
      }
    }
  });

  // Get current user info
  fastify.get('/me', async (request, reply) => {
    try {
      // This route requires authentication, so userContext should be set by middleware
      if (!request.userContext || !request.userContext.isAuthenticated) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      return reply.send({
        success: true,
        data: {
          user: request.userContext,
          organization: request.userContext.organization
        }
      });
    } catch (error) {
      console.error('❌ Error getting user info:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get user information',
      });
    }
  });

  // Logout endpoint
  fastify.post('/logout', async (request, reply) => {
    const { redirect_uri } = request.body || {};

    try {
      // Clear authentication cookies with proper domain configuration
      const clearCookieOptions = {
        path: '/',
        domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.zopkit.com' : undefined),
      };

      reply
        .clearCookie('kinde_token', clearCookieOptions)
        .clearCookie('kinde_refresh_token', clearCookieOptions);

      // Generate Kinde logout URL
      const logoutUrl = kindeService.generateLogoutUrl(
        redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`
      );

      return reply.send({
        success: true,
        data: {
          logoutUrl,
          message: 'Logged out successfully'
        }
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to logout',
      });
    }
  });

  // Token refresh endpoint
  fastify.post('/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.kinde_refresh_token;

      if (!refreshToken) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Refresh token not found',
        });
      }

      // Refresh the access token
      const tokens = await kindeService.refreshToken(refreshToken);

      // Set new authentication cookies
      // Set authentication cookies with proper domain configuration
      const cookieOptions = {
        httpOnly: false, // Allow JavaScript access for token management
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
        domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.zopkit.com' : undefined),
        path: '/'
      };

      reply.setCookie('kinde_token', tokens.access_token, {
        ...cookieOptions,
        maxAge: (tokens.expires_in || 3600) * 1000, // Convert to milliseconds
      });

      // Update refresh token if a new one was provided
      if (tokens.refresh_token) {
        reply.setCookie('kinde_refresh_token', tokens.refresh_token, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        });
      }

      return reply.send({
        success: true,
        data: {
          message: 'Token refreshed successfully'
        }
      });
    } catch (error) {
      console.error('❌ Token refresh error:', error);

      // Clear invalid cookies with proper domain configuration
      const clearCookieOptions = {
        path: '/',
        domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.zopkit.com' : undefined),
      };

      reply
        .clearCookie('kinde_token', clearCookieOptions)
        .clearCookie('kinde_refresh_token', clearCookieOptions);

      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Failed to refresh token',
      });
    }
  });

  // Get available social providers
  fastify.get('/providers', async (request, reply) => {
    try {
      const providers = [
        {
          id: 'google',
          name: 'Google',
          icon: 'google',
          url: `/api/auth/oauth/google`,
          description: 'Sign in with Google',
          primary: true
        },
        {
          id: 'github',
          name: 'GitHub',
          icon: 'github',
          url: `/api/auth/oauth/github`,
          description: 'Sign in with GitHub'
        },
        {
          id: 'microsoft',
          name: 'Microsoft',
          icon: 'microsoft',
          url: `/api/auth/oauth/microsoft`,
          description: 'Sign in with Microsoft'
        },
        {
          id: 'apple',
          name: 'Apple',
          icon: 'apple',
          url: `/api/auth/oauth/apple`,
          description: 'Sign in with Apple'
        },
        {
          id: 'linkedin',
          name: 'LinkedIn',
          icon: 'linkedin',
          url: `/api/auth/oauth/linkedin`,
          description: 'Sign in with LinkedIn'
        }
      ];

      return reply.send({
        success: true,
        data: { providers }
      });
    } catch (error) {
      console.error('❌ Error getting providers:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get social providers',
      });
    }
  });

  // 🔄 **CRM INTEGRATION ENDPOINTS**

  // Authentication endpoint for CRM and other applications (accessed via /api/auth/auth)
  fastify.get('/auth', async (request, reply) => {
    try {
      const { app_code, redirect_url } = request.query;

      console.log('🔍 App authentication request:', { app_code, redirect_url });

      // Validate app_code
      const validAppCodes = ['crm', 'hr', 'affiliate', 'accounting', 'inventory'];
      if (!app_code || !validAppCodes.includes(app_code)) {
        return reply.code(400).send({
          error: 'Invalid app_code',
          message: `app_code must be one of: ${validAppCodes.join(', ')}`
        });
      }

      // Check if user is already authenticated
      const token = request.headers.authorization?.replace('Bearer ', '') ||
        request.cookies?.auth_token ||
        request.query.token;

      // SSO token validation removed - rely on standard auth middleware

      // User not authenticated, redirect to Kinde auth with app context
      // Use frontend URL as redirect URI to match Kinde configuration
      const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback`;
      const stateData = {
        app_code,
        redirect_url: redirect_url || getDefaultRedirectUrl(app_code),
        timestamp: Date.now()
      };

      console.log('🔍 Generating Kinde auth URL with:', {
        redirectUri,
        stateData,
        frontendUrl: process.env.FRONTEND_URL
      });

      const kindeAuthUrl = kindeService.generateSocialLoginUrl({
        redirectUri,
        state: JSON.stringify(stateData),
        prompt: 'login'
      });

      console.log('🚀 Redirecting to Kinde authentication:', kindeAuthUrl);
      return reply.redirect(kindeAuthUrl);

    } catch (error) {
      console.error('❌ Authentication error:', error);
      return reply.code(500).send({
        error: 'Authentication failed',
        message: error.message
      });
    }
  });

  // Token validation endpoint for applications
  // SSO token validation route removed

  // CRM-specific user permissions endpoint (no auth required for testing)
  fastify.post('/crm-permissions', async (request, reply) => {
    try {
      const { kinde_user_id, kinde_org_code, requesting_app, force_refresh } = request.body;

      console.log('🔍 CRM permissions request:', {
        kinde_user_id,
        kinde_org_code,
        requesting_app,
        force_refresh
      });

      if (!kinde_user_id || !kinde_org_code || requesting_app !== 'crm') {
        return reply.code(400).send({
          success: false,
          error: 'Missing required parameters'
        });
      }

      // For test tokens, return mock permissions
      if (kinde_user_id === 'test-user-123' || kinde_user_id.includes('test')) {
        console.log('🧪 Returning test permissions for CRM');

        return {
          success: true,
          data: {
            user: {
              id: kinde_user_id,
              email: 'test@example.com',
              name: 'Test User',
              kindeUserId: kinde_user_id
            },
            organization: {
              id: 'test-org-123',
              name: 'Test Organization',
              subdomain: 'test',
              kindeOrgId: kinde_org_code
            },
            permissions: {
              "accounts": ["read", "write", "delete"],
              "leads": ["read", "write", "delete"],
              "opportunities": ["read", "write"],
              "contacts": ["read", "write"],
              "invoices": ["read", "write"],
              "quotations": ["read", "write"],
              "sales": ["read", "write"],
              "product-orders": ["read", "write"],
              "tickets": ["read", "write"],
              "communications": ["read", "write"],
              "calendar": ["read", "write"],
              "form-template-builder": ["read", "write"],
              "admin": ["read", "write"]
            },
            restrictions: {
              "max_leads": 1000,
              "max_accounts": 500,
              "max_opportunities": 200,
              "max_contacts": 1000,
              "max_invoices": 100,
              "max_quotations": 100,
              "max_sales": 100,
              "max_product_orders": 100,
              "max_tickets": 200
            },
            roles: ['test-admin'],
            subscription: {
              plan: 'premium',
              status: 'active'
            },
            source: 'test',
            cachedAt: new Date().toISOString()
          }
        };
      }

      // For real users, try to get from database
      try {
        const userPermissions = await getUserPermissionsForApp(
          kinde_user_id,
          kinde_org_code,
          requesting_app
        );

        return {
          success: true,
          data: {
            ...userPermissions,
            source: 'database',
            cachedAt: new Date().toISOString()
          }
        };
      } catch (dbError) {
        console.error('❌ Database lookup failed:', dbError);

        // Fallback to basic permissions
        return {
          success: true,
          data: {
            user: {
              id: kinde_user_id,
              email: 'user@example.com',
              name: 'User',
              kindeUserId: kinde_user_id
            },
            organization: {
              id: kinde_org_code,
              name: 'Organization',
              subdomain: kinde_org_code,
              kindeOrgId: kinde_org_code
            },
            permissions: {
              "accounts": ["read", "write"],
              "leads": ["read", "write"],
              "opportunities": ["read", "write"],
              "contacts": ["read", "write"],
              "invoices": ["read"],
              "quotations": ["read"],
              "sales": ["read"],
              "product-orders": ["read"],
              "tickets": ["read", "write"],
              "communications": ["read"],
              "calendar": ["read"],
              "form-template-builder": ["read"],
              "admin": ["read"]
            },
            restrictions: {},
            roles: ['user'],
            subscription: {
              plan: 'basic',
              status: 'active'
            },
            source: 'fallback',
            cachedAt: new Date().toISOString()
          }
        };
      }

    } catch (error) {
      console.error('❌ CRM permissions error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch permissions',
        message: error.message
      });
    }
  });

  // SSO app token generation endpoint removed

  // Logout endpoint for applications
  fastify.get('/logout', async (request, reply) => {
    try {
      const { app_code, redirect_url } = request.query;

      console.log('🔍 App logout request:', { app_code, redirect_url });

      // Clear any session cookies with proper domain configuration
      const clearCookieOptions = {
        path: '/',
        domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.zopkit.com' : undefined),
      };

      reply.clearCookie('auth_token', clearCookieOptions);
      reply.clearCookie('session_id', clearCookieOptions);

      // If Kinde logout URL is available, redirect there first
      const kindeLogoutUrl = kindeService.getLogoutUrl();

      if (kindeLogoutUrl && redirect_url) {
        // Create a logout URL that will eventually redirect back to the app
        const logoutUrl = new URL(kindeLogoutUrl);
        logoutUrl.searchParams.set('returnTo', redirect_url);

        console.log('🚀 Redirecting to Kinde logout');
        return reply.redirect(logoutUrl.toString());
      }

      // Direct redirect to app or default location
      const finalRedirectUrl = redirect_url ||
        getDefaultRedirectUrl(app_code) ||
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`;

      console.log('✅ Logout completed, redirecting to:', finalRedirectUrl);
      return reply.redirect(finalRedirectUrl);

    } catch (error) {
      console.error('❌ Logout error:', error);

      // Even if logout fails, redirect to a safe location
      const fallbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`;
      return reply.redirect(fallbackUrl);
    }
  });



  // Helper function to get user permissions for specific app
  async function getUserPermissionsForApp(kindeUserId, kindeOrgId, appCode) {
    try {
      // Use the internal user-permissions endpoint logic
      const { TenantService } = await import('../services/tenant-service.js');
      const { db } = await import('../../db/index.js');
      const { tenantUsers } = await import('../../db/schema/users.js');
      const { customRoles, userRoleAssignments } = await import('../../db/schema/permissions.js');
      const { eq, and } = await import('drizzle-orm');

      // Get tenant
      const tenant = await TenantService.getByKindeOrgId(kindeOrgId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get user
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
            eq(tenantUsers.kindeUserId, kindeUserId),
            eq(tenantUsers.tenantId, tenant.tenantId)
          )
        )
        .limit(1);

      if (!userResult.length || !userResult[0].isActive) {
        throw new Error('User not found or inactive');
      }

      const user = userResult[0];

      // Get user roles and permissions
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

      // Filter active roles
      const now = new Date();
      const activeRoles = userRolesResult.filter(role =>
        !role.expiresAt || new Date(role.expiresAt) > now
      );

      if (!activeRoles.length) {
        throw new Error('No active roles found for user');
      }

      // Aggregate permissions for the requesting app
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

        const appPermissions = rolePermissions[appCode] || {};

        Object.keys(appPermissions).forEach(resource => {
          if (!aggregatedPermissions[resource]) {
            aggregatedPermissions[resource] = [];
          }

          const resourcePermissions = appPermissions[resource];
          if (Array.isArray(resourcePermissions)) {
            resourcePermissions.forEach(permission => {
              if (!aggregatedPermissions[resource].includes(permission)) {
                aggregatedPermissions[resource].push(permission);
              }
            });
          }
        });

        Object.keys(roleRestrictions).forEach(key => {
          if (key.startsWith(`${appCode}.`)) {
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

      return {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
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
          requesting_app: appCode,
          kinde_org_code: kindeOrgId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      throw error;
    }
  }

  // Helper function to get default redirect URLs for apps
  function getDefaultRedirectUrl(appCode) {
    const defaultUrls = {
      crm: process.env.CRM_APP_URL || 'http://localhost:3002',
      hr: process.env.HR_APP_URL || 'http://localhost:3003',
      affiliate: process.env.AFFILIATE_APP_URL || 'http://localhost:3004',
      accounting: process.env.ACCOUNTING_APP_URL || 'http://localhost:3005',
      inventory: process.env.INVENTORY_APP_URL || 'http://localhost:3006'
    };

    return defaultUrls[appCode] ? `${defaultUrls[appCode]}/auth` : null;
  }

} 