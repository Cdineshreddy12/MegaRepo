import React, { useEffect, useState, useRef } from 'react';
import { KindeProvider as OriginalKindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import useSilentAuth from '@/hooks/useSilentAuth';
import { setKindeTokenGetter } from '@/lib/api';

interface KindeProviderProps {
  children: React.ReactNode;
}

// Component to set up the token getter and silent auth after Kinde is initialized
function TokenSetupComponent() {
  const { getToken, isAuthenticated, user } = useKindeAuth();
  const tokenGetterSetupRef = useRef(false);

  useEffect(() => {
    // Prevent React StrictMode from setting up token getter multiple times
    if (tokenGetterSetupRef.current) {
      return;
    }
    tokenGetterSetupRef.current = true;

    // Enhanced token getter with backup storage
    setKindeTokenGetter(async () => {
      try {
        console.log('🔑 TokenGetter: Called - isAuthenticated:', isAuthenticated, 'user:', !!user);

        const token = await getToken();

        if (token) {
          console.log('✅ TokenGetter: Successfully retrieved token from Kinde');
          // Always store as backup when we get a valid token
          localStorage.setItem('kinde_backup_token', token);
          return token;
        } else {
          console.log('❌ TokenGetter: No token from Kinde, trying backup...');
          const backupToken = localStorage.getItem('kinde_backup_token');
          if (backupToken) {
            console.log('🔄 TokenGetter: Using backup token');
            return backupToken;
          }
          return null;
        }
      } catch (error: any) {
        // Handle invalid_grant errors gracefully
        const isInvalidGrant = error?.message?.includes('invalid_grant') || 
                              error?.message?.includes('refresh token') ||
                              error?.error === 'invalid_grant';
        
        if (isInvalidGrant) {
          console.log('⚠️ TokenGetter: invalid_grant error - trying backup token');
          // Clear potentially corrupted refresh tokens
          try {
            const storageKeys = Object.keys(localStorage);
            storageKeys.forEach(key => {
              if (key.includes('refresh') || key.includes('kinde_refresh')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {
            // Ignore errors when clearing
          }
        } else {
          console.error('❌ TokenGetter: Error getting token, trying backup...', error);
        }
        
        const backupToken = localStorage.getItem('kinde_backup_token');
        if (backupToken) {
          console.log('🔄 TokenGetter: Using backup token after error');
          return backupToken;
        }
        return null;
      }
    });
  }, [getToken, isAuthenticated, user]);

  // Store backup token when user becomes authenticated
  useEffect(() => {
    const storeBackupToken = async () => {
      if (isAuthenticated && user) {
        try {
          const token = await getToken();
          if (token) {
            localStorage.setItem('kinde_backup_token', token);
            console.log('💾 Stored backup token for user:', user.email);
          }
        } catch (error) {
          console.log('❌ Failed to store backup token:', error);
        }
      }
    };

    storeBackupToken();
  }, [isAuthenticated, user, getToken]);

  // Clear backup token when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      const hadBackupToken = localStorage.getItem('kinde_backup_token');
      if (hadBackupToken) {
        localStorage.removeItem('kinde_backup_token');
        console.log('🗑️ Cleared backup token on logout');
      }
    }
  }, [isAuthenticated]);

  return null; // This component doesn't render anything
}

// Component to handle silent authentication initialization
function SilentAuthInitializer() {
  const { isLoading } = useKindeAuth();
  const { checkSilentAuth, isChecking, hasChecked } = useSilentAuth();
  const [initStarted, setInitStarted] = useState(false);

  useEffect(() => {
    // Only start silent auth check once Kinde is loaded and we haven't started yet
    if (!isLoading && !initStarted && !hasChecked && !isChecking) {
      console.log('🔄 SilentAuth: Initializing silent authentication...');
      setInitStarted(true);

      // Add a small delay to ensure everything is properly initialized
      const timer = setTimeout(() => {
        checkSilentAuth().then((result) => {
          console.log('✅ SilentAuth: Initial silent auth check completed:', result);
        }).catch((error) => {
          console.log('ℹ️ SilentAuth: Initial silent auth check failed (expected):', error);
        });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isLoading, checkSilentAuth, initStarted, hasChecked, isChecking]);

  return null; // This component doesn't render anything
}

export const KindeProvider: React.FC<KindeProviderProps> = ({
  children
}) => {
  // Keep the auth subdomain - Kinde handles domain-wide cookies automatically
  const domain = import.meta.env.VITE_KINDE_DOMAIN || 'https://auth.zopkit.com';
  const clientId = import.meta.env.VITE_KINDE_CLIENT_ID;

  // CRITICAL: Set a consistent redirect URI to prevent OAuth 400 errors
  // The redirect URI must match between authorization and token requests
  // Default to the standard callback path if not explicitly configured
  // Normalize the redirect URI (remove trailing slashes, ensure exact match)
  const baseRedirectUri = import.meta.env.VITE_KINDE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  const redirectUri = baseRedirectUri.replace(/\/$/, ''); // Remove trailing slash
  const logoutUri = (import.meta.env.VITE_KINDE_LOGOUT_URI || window.location.origin).replace(/\/$/, '');

  if (!domain || !clientId) {
    console.error('Kinde configuration missing. Please check environment variables.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 max-w-md">
          <div className="mb-4">
            <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-600 font-bold">🔧</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-red-700 mb-4">
            Authentication is not properly configured.
            Please check your environment variables.
          </p>
          <div className="text-sm text-red-600">
            <p>Required environment variables:</p>
            <ul className="list-disc list-inside mt-2">
              <li>VITE_KINDE_DOMAIN</li>
              <li>VITE_KINDE_CLIENT_ID</li>
              <li>VITE_KINDE_GOOGLE_CONNECTION_ID (for custom auth)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Let Kinde handle organization management automatically
  console.log('🔄 KindeProvider: Using Kinde built-in organization handling');

  // Validate configuration to prevent OAuth 400 errors
  useEffect(() => {
    const validateConfig = () => {
      console.log('🔍 KindeProvider: Validating OAuth configuration...');

      // Check domain format
      if (!domain.startsWith('https://')) {
        console.error('❌ VITE_KINDE_DOMAIN must start with https://');
      }

      // Check client ID format
      if (!clientId || clientId.trim() === '') {
        console.error('❌ VITE_KINDE_CLIENT_ID is empty or missing');
      }

      // Check redirect URI format
      if (!redirectUri || !redirectUri.startsWith('http')) {
        console.error('❌ Redirect URI is invalid:', redirectUri);
      }

      // Log configuration (without sensitive data)
      console.log('✅ OAuth Configuration:', {
        domain,
        clientIdLength: clientId?.length,
        redirectUri, // Log full redirect URI for debugging
        logoutUri,
        environment: import.meta.env.MODE
      });
    };

    validateConfig();
  }, [domain, clientId, redirectUri, logoutUri]);


  return (
    <OriginalKindeProvider
      clientId={clientId}
      domain={domain}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
      scope="openid profile email offline"
      useInsecureForRefreshToken={import.meta.env.DEV || import.meta.env.MODE === 'development'}
    >
      <TokenSetupComponent />
      <SilentAuthInitializer />
      {children}
    </OriginalKindeProvider>
  );
};

export default KindeProvider; 