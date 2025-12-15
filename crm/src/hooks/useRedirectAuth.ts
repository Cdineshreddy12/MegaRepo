import { useEffect, useState } from 'react';
import { authService } from '@/services/api/authService';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Hook to handle authentication for users redirected from external applications
 * Automatically detects redirect scenarios and performs authentication
 */
export const useRedirectAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const kindeAuth = useKindeAuth();

  useEffect(() => {
    const handleRedirectAuth = async () => {
      // Check if this is a redirect scenario
      const urlParams = new URLSearchParams(window.location.search);
      const isRedirect = urlParams.get('redirect') === 'true' ||
                        window.location.pathname.includes('/redirect') ||
                        localStorage.getItem('redirect_auth_pending') === 'true';

      // Check if user has a token but no session data (indicating redirect)
      const token = localStorage.getItem('token');
      const sessionData = localStorage.getItem('userSession');

      if (isRedirect || (token && !sessionData)) {
        console.log('🔄 Detected redirect authentication scenario');

        setIsAuthenticating(true);
        setError(null);

        try {
          // Extract email from URL params if available
          const email = urlParams.get('email') || undefined;

          // Get token directly from Kinde SDK and perform redirect authentication
          const kindeToken = await kindeAuth.getToken();
          const authResult = await authService.redirectAuth(email, kindeToken);

          console.log('✅ Redirect authentication successful:', authResult);

          // Clear redirect flags
          localStorage.removeItem('redirect_auth_pending');
          urlParams.delete('redirect');
          urlParams.delete('email');

          // Update URL without redirect params
          const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);

          // Navigate to dashboard
          navigate('/dashboard', { replace: true });

        } catch (err: any) {
          console.error('❌ Redirect authentication failed:', err);

          const errorMessage = err?.response?.data?.message ||
                              err?.message ||
                              'Authentication failed';

          setError(errorMessage);

          // Clear invalid tokens
          localStorage.removeItem('token');
          localStorage.removeItem('userSession');

        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    handleRedirectAuth();
  }, [navigate]);

  return {
    isAuthenticating,
    error,
    clearError: () => setError(null)
  };
};

/**
 * Hook to check if current session is from a redirect
 */
export const useIsRedirectSession = () => {
  const [isRedirect, setIsRedirect] = useState(false);

  useEffect(() => {
    const sessionData = localStorage.getItem('userSession');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        setIsRedirect(session.redirect === true);
      } catch (err) {
        console.error('Error parsing session data:', err);
      }
    }
  }, []);

  return isRedirect;
};

/**
 * Utility function to initiate redirect authentication manually
 */
export const initiateRedirectAuth = async (email?: string, kindeToken?: string | null) => {
  try {
    console.log('🔄 Manually initiating redirect authentication...');
    const result = await authService.redirectAuth(email, kindeToken);
    return result;
  } catch (error) {
    console.error('❌ Manual redirect authentication failed:', error);
    throw error;
  }
};

/**
 * Debug utility to check current authentication state
 */
export const debugAuthState = () => {
  const state = {
    kindeToken: !!localStorage.getItem('token'),
    crmToken: !!localStorage.getItem('crm_token'),
    userSession: !!localStorage.getItem('userSession'),
    sessionData: null as any
  };

  const sessionStr = localStorage.getItem('userSession');
  if (sessionStr) {
    try {
      state.sessionData = JSON.parse(sessionStr);
    } catch (e) {
      state.sessionData = { error: 'Invalid JSON' };
    }
  }

  return state;
};
