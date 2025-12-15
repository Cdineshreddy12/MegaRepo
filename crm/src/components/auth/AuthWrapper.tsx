import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/KindeAuthContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { authService } from '@/services/api/authService';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useRedirectAuth } from '@/hooks/useRedirectAuth';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { toast } from 'sonner';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading,
    error,
    silentAuthAttempted,
    login,
    user: kindeUser
  } = useAuth();

  const { setUserSession, isLoading: sessionLoading } = useUserSession();
  const { isAuthenticating: redirectAuthenticating, error: redirectError, clearError } = useRedirectAuth();
  const [redirectAuthCompleted, setRedirectAuthCompleted] = useState(false);

  // Get direct access to Kinde SDK for token retrieval
  const kindeAuth = useKindeAuth();

  const startLogin = async () => {
    try {
      await kindeAuth.login();
    } catch (e) {
      console.error('❌ Login initiation failed:', e);
      // As a last resort, push to callback to restart auth flow
      // Updated for subdomain structure (crm.zopkit.com)
      window.location.href = `/callback`;
    }
  };

  // Handle redirect authentication for users coming from external apps
  useEffect(() => {
    console.log('🔄 AuthWrapper useEffect triggered:', {
      isAuthenticated,
      sessionLoading,
      redirectAuthCompleted,
      timestamp: new Date().toISOString()
    });

    const handleRedirectAuth = async () => {
      if (isAuthenticated && !sessionLoading && !redirectAuthCompleted) {
        console.log('✅ Conditions met for redirect auth, proceeding...');
        try {
          // Get token directly from Kinde SDK first (more reliable than localStorage)
          let kindeToken = null;
          try {
            kindeToken = await kindeAuth.getToken();
            console.log('🔑 Got token from Kinde SDK:', {
              exists: !!kindeToken,
              length: kindeToken?.length
            });
          } catch (tokenError) {
            console.log('⚠️ Could not get token from Kinde SDK:', tokenError);
          }

          // Fallback to localStorage if SDK doesn't have token yet
          let token = kindeToken || localStorage.getItem('token');
          const sessionData = localStorage.getItem('userSession');

          console.log('🔍 Checking redirect auth conditions:', {
            hasTokenFromSDK: !!kindeToken,
            hasTokenFromStorage: !!localStorage.getItem('token'),
            hasToken: !!token,
            hasSessionData: !!sessionData,
            isAuthenticated,
            sessionLoading,
            redirectAuthCompleted
          });

          // Always try redirect auth for authenticated users without proper CRM session
          // This handles both redirected users and regular users who need tenant setup
          // Wait a bit for token to be available if authenticated but no token yet
          if (!token && isAuthenticated) {
            console.log('⏳ Waiting for token to be available...');
            // Give Kinde a moment to store the token (multiple retries)
            let finalToken = null;
            for (let i = 0; i < 3; i++) {
              await new Promise(resolve => setTimeout(resolve, 300));
              finalToken = await kindeAuth.getToken() || localStorage.getItem('token');
              if (finalToken) {
                console.log('✅ Token now available after retry', i + 1);
                token = finalToken;
                break;
              }
            }
            if (!token) {
              console.log('⚠️ Still no token after retries - starting login');
              await startLogin();
              return;
            }
          }

          if (token && !sessionData) {
            console.log('🔄 Detected need for redirect authentication');
            console.log('📧 Kinde user email:', kindeUser?.email);

            // Try to get email from Kinde user, fallback to extracting from token
            let email = kindeUser?.email;
            if (!email && token) {
              try {
                // Extract email from JWT token payload
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(atob(parts[1]));
                  // Try different possible email fields
                  email = payload.email || payload.sub || payload.preferred_username;
                  // If sub looks like an email, use it
                  if (!email && payload.sub && payload.sub.includes('@')) {
                    email = payload.sub;
                  }
                  console.log('📧 Extracted email from token:', email, 'from payload:', { sub: payload.sub, email: payload.email });
                }
              } catch (e) {
                console.log('⚠️ Could not extract email from token');
              }
            }

            // Final fallback - use the email from the URL or known user
            if (!email) {
              email = 'reddycdinesh41@gmail.com'; // Known demo user
              console.log('📧 Using fallback email:', email);
            }

            // Use token from above (already got from SDK or localStorage)
            // If we don't have it yet, get it directly from Kinde SDK
            const finalToken = token || await kindeAuth.getToken();
            console.log('🔑 Using token for redirect auth:', {
              exists: !!finalToken,
              length: finalToken?.length,
              startsWith: finalToken?.substring(0, 20),
              algorithm: finalToken?.startsWith('eyJhbGciOiJSUzI1Ni') ? 'RS256' : 'HS256'
            });

            if (!finalToken) {
              throw new Error('No authentication token available for redirect auth');
            }

            // Perform redirect authentication with the Kinde token
            let authResult;
            try {
              authResult = await authService.redirectAuth(email, finalToken);
            } catch (authError: any) {
              console.error('❌ Redirect auth failed:', authError);

              // If it's a token-related error, try to refresh the token
              if (authError.message?.includes('token') || authError.message?.includes('Token')) {
                console.log('🔄 Attempting token refresh...');
                try {
                  await kindeAuth.login();
                  return; // This will trigger a redirect, so exit here
                } catch (refreshError) {
                  console.error('❌ Token refresh also failed:', refreshError);
                }
              }

              // Re-throw the original error if we can't handle it
              throw authError;
            }

            // Validate auth result structure
            if (!authResult || !authResult.user) {
              console.error('❌ Invalid auth result structure:', authResult);
              throw new Error('Authentication failed: Invalid response structure from server');
            }

            // Check for sync failures and show toast
            if (authResult.syncFailureInfo && authResult.syncFailureInfo.hasFailedCollections) {
              console.log('⚠️ Sync failures detected, showing toast');
              toast.error(authResult.syncFailureInfo.message, {
                description: `Failed collections: ${authResult.syncFailureInfo.failedCollections.map(f => f.collection).join(', ')}`,
                duration: 10000, // Show for 10 seconds
              });
            }

            // Check if user has any roles assigned (with safe access)
            const roles = authResult.user.roles || [];
            const permissions = authResult.user.permissions || [];
            const hasRoles = Array.isArray(roles) && roles.length > 0;
            const hasPermissions = Array.isArray(permissions) && permissions.length > 0;

            console.log('🔍 Checking user roles after redirect auth:', {
              hasRoles,
              rolesCount: Array.isArray(roles) ? roles.length : 'not array',
              hasPermissions,
              permissionsCount: Array.isArray(permissions) ? permissions.length : 'not array',
              roles: Array.isArray(roles) ? roles.map((r: any) => r.roleName || r.roleId || r) : 'not array',
              userStructure: {
                hasUser: !!authResult.user,
                hasRoles: !!authResult.user.roles,
                hasPermissions: !!authResult.user.permissions,
                rolesType: typeof authResult.user.roles,
                permissionsType: typeof authResult.user.permissions
              }
            });

            // If user has no roles and no permissions, redirect to no-role page
            if (!hasRoles && !hasPermissions) {
              console.log('⚠️ User has no roles assigned - redirecting to no-role page');
              window.location.href = `/no-role`; // Updated for subdomain structure
              return;
            }

            // Set session data from redirect auth response
            console.log('🔍 Setting session with entities:', authResult.user.entities);
            setUserSession({
              user: authResult.user,
              tenant: authResult.tenant,
              permissions: authResult.user.permissions || [],
              entities: authResult.user.entities || [],
              totalCredits: authResult.user.totalCredits || 0,
              isTenantAdmin: authResult.user.isTenantAdmin || false
            });

            setRedirectAuthCompleted(true);
            console.log('✅ Redirect authentication completed');
          } else if (token && sessionData) {
            // Check if session data is valid (has permissions)
            const parsedSession = JSON.parse(sessionData);
            if (!parsedSession.permissions || parsedSession.permissions.length === 0) {
              console.log('🔄 Session exists but no permissions, retrying redirect auth');
              // Get token directly from Kinde SDK and perform redirect authentication
              const retryToken = await kindeAuth.getToken() || token;
              if (!retryToken) {
                console.error('❌ No token available for retry');
                throw new Error('No authentication token available');
              }
              const authResult = await authService.redirectAuth(kindeUser?.email, retryToken);

              // Check for sync failures and show toast
              if (authResult.syncFailureInfo && authResult.syncFailureInfo.hasFailedCollections) {
                console.log('⚠️ Sync failures detected on retry, showing toast');
                toast.error(authResult.syncFailureInfo.message, {
                  description: `Failed collections: ${authResult.syncFailureInfo.failedCollections.map(f => f.collection).join(', ')}`,
                  duration: 10000,
                });
              }

              // Check if user has any roles assigned
              const roles = authResult.user.roles || [];
              const permissions = authResult.user.permissions || [];
              const hasRoles = roles.length > 0;
              const hasPermissions = permissions.length > 0;
              
              if (!hasRoles && !hasPermissions) {
                console.log('⚠️ User has no roles assigned - redirecting to no-role page');
                window.location.href = `/no-role`; // Updated for subdomain structure
                return;
              }

              console.log('🔍 Re-setting session with entities:', authResult.user.entities);
              setUserSession({
                user: authResult.user,
                tenant: authResult.tenant,
                permissions: authResult.user.permissions || [],
                entities: authResult.user.entities || [],
                totalCredits: authResult.user.totalCredits || 0,
                isTenantAdmin: authResult.user.isTenantAdmin || false
              });
              setRedirectAuthCompleted(true);
            } else {
              console.log('✅ Valid session data exists');
              setRedirectAuthCompleted(true);
            }
          }
        } catch (error) {
          console.error('❌ Redirect authentication failed:', error);
          toast.error('Failed to authenticate with CRM. Please try again.');
        }
      }
    };

    handleRedirectAuth();
  }, [isAuthenticated, sessionLoading, kindeUser, setUserSession, redirectAuthCompleted]);

  // Initialize user session when authenticated (call /api/auth/me to refresh entities)
  useEffect(() => {
    const initializeUserSession = async () => {
      // Only call /api/auth/me after redirect auth completes to avoid conflicts
      // This ensures we always get fresh entities after sync
      if (isAuthenticated && !sessionLoading && redirectAuthCompleted) {
        try {
          // Get token from SDK first, then fallback to localStorage
          let token = null;
          try {
            token = await kindeAuth.getToken();
          } catch (e) {
            // SDK might not have token, try localStorage
            token = localStorage.getItem('crm_token') || localStorage.getItem('token');
          }
          
          if (!token) {
            console.log('⚠️ No authentication token found, skipping /api/auth/me');
            return;
          }
          
          // Always call /api/auth/me to get fresh entities
          // This ensures entities are up-to-date after sync, even for redirect sessions
          console.log('🔄 Calling /api/auth/me to refresh user session data...');
          const userProfile = await authService.getCurrentUser();
          
          if (userProfile) {
            // Check if user has any roles assigned
            const roles = userProfile.roles || [];
            const permissions = userProfile.permissions || [];
            const hasRoles = roles.length > 0;
            const hasPermissions = permissions.length > 0;
            
            console.log('🔍 Checking user roles:', {
              hasRoles,
              rolesCount: roles.length,
              hasPermissions,
              permissionsCount: permissions.length,
              roles: roles.map((r: any) => r.roleName || r.roleId)
            });

            // If user has no roles and no permissions, redirect to no-role page
            if (!hasRoles && !hasPermissions) {
              console.log('⚠️ User has no roles assigned - redirecting to no-role page');
              window.location.href = `/no-role`; // Updated for subdomain structure
              return;
            }

            // Extract tenant and session data from user profile
            console.log('🔍 Initializing session with entities:', userProfile.entities?.length || 0);
            setUserSession({
              user: userProfile,
              tenant: userProfile.tenantId ? {
                tenantId: userProfile.tenantId,
                tenantName: 'Current Tenant' // This would come from profile in production
              } : undefined,
              permissions: userProfile.permissions || [],
              entities: userProfile.entities || [],
              totalCredits: userProfile.totalCredits || 0,
              isTenantAdmin: userProfile.isTenantAdmin || false
            });
            console.log('✅ User session initialized with', userProfile.entities?.length || 0, 'entities');
            
            // Mark redirect auth as completed if it wasn't already
            if (!redirectAuthCompleted) {
              setRedirectAuthCompleted(true);
            }
            } else {
              console.log('⚠️ No user profile returned from /api/auth/me');
              // If we have existing session data, use it as fallback
              const sessionData = localStorage.getItem('userSession');
              if (sessionData) {
                const parsedSession = JSON.parse(sessionData);
                console.log('🔄 Using existing session data as fallback');
                
                // Check if user has roles in fallback session
                const roles = parsedSession.user?.roles || [];
                const permissions = parsedSession.permissions || [];
                if (roles.length === 0 && permissions.length === 0) {
                  console.log('⚠️ Fallback session has no roles - redirecting to no-role page');
                  window.location.href = `/no-role`; // Updated for subdomain structure
                  return;
                }
                
                setUserSession({
                  user: parsedSession.user,
                  tenant: parsedSession.tenant,
                  permissions: parsedSession.permissions || [],
                  entities: parsedSession.entities || [],
                  totalCredits: parsedSession.totalCredits || 0,
                  isTenantAdmin: parsedSession.isTenantAdmin || false
                });
              } else {
                // No session data and no user profile - redirect to unauthorized
                console.log('⚠️ No user profile and no session data - starting login');
                await startLogin();
              }
            }
        } catch (error) {
          console.error('❌ Failed to initialize user session:', error);
          // Don't show toast for network errors, just log
          if (error instanceof Error && !error.message.includes('Network')) {
            toast.error('Failed to load user session. Please refresh the page.');
          }
        }
      }
    };

    initializeUserSession();
  }, [isAuthenticated, sessionLoading, setUserSession, redirectAuthCompleted]);


  // Show loading during initial authentication check, session loading, redirect auth, or when silent auth hasn't been attempted yet
  const isRedirectAuthInProgress = isAuthenticated && !redirectAuthCompleted && localStorage.getItem('token');
  const showLoading = isLoading || sessionLoading || (!silentAuthAttempted && !isAuthenticated) || isRedirectAuthInProgress;

  if (showLoading) {
    console.log('🔄 AuthWrapper: Checking authentication status...', {
      isLoading,
      sessionLoading,
      isAuthenticated,
      silentAuthAttempted,
      redirectAuthCompleted,
      isRedirectAuthInProgress
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {isRedirectAuthInProgress ? 'Setting up CRM Access' : 'Verifying Authentication'}
            </h3>
            <p className="text-sm text-gray-600">
              {isRedirectAuthInProgress ?
                'Configuring your tenant access and permissions...' :
                'Please wait while we check your login status...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error screen if redirect auth failed
  if (redirectError) {
    console.log('❌ AuthWrapper: Redirect authentication failed:', redirectError);
    return (
      <AuthLoadingScreen
        isLoading={false}
        isValidating={false}
        error={redirectError}
        silentAuthAttempted={true}
        onLogin={() => {
          clearError();
          setRedirectAuthCompleted(false);
          // Retry redirect auth
          window.location.reload();
        }}
        onRetry={() => {
          clearError();
          setRedirectAuthCompleted(false);
          window.location.reload();
        }}
        onClearError={clearError}
      />
    );
  }

  // Check if there's no token at all - redirect to unauthorized page
  const crmToken = localStorage.getItem('crm_token');
  const kindeToken = localStorage.getItem('token');
  const sessionToken = sessionStorage.getItem('kinde_token');
  const hasAnyToken = !!(crmToken || kindeToken || sessionToken);

  if (!hasAnyToken && silentAuthAttempted) {
    console.log('🚫 AuthWrapper: No authentication token found - starting login');
    // Clear any remaining session data
    localStorage.clear();
    sessionStorage.clear();
    startLogin();
    return null;
  }

  // Show login screen if silent auth failed (regardless of error state)
  if (!isAuthenticated && silentAuthAttempted) {
    console.log('🔒 AuthWrapper: User not authenticated after silent auth, checking token status...');
    
    // If we have a token but authentication failed, it might be invalid
    if (hasAnyToken) {
      console.log('⚠️ Token exists but authentication failed - token may be invalid');
      // Don't redirect here - let the API interceptor handle 401 errors
      // But show login screen
      return (
        <AuthLoadingScreen
          isLoading={false}
          isValidating={false}
          error={error}
          silentAuthAttempted={true}
          onLogin={login}
          onRetry={() => window.location.reload()}
          onClearError={() => {}}
        />
      );
    } else {
      // No token - start login
      console.log('🚫 No token found - starting login');
      startLogin();
      return null;
    }
  }

  // User is authenticated, show the app
  console.log('✅ AuthWrapper: User authenticated, showing CRM application');
  return <>{children}</>;
};
