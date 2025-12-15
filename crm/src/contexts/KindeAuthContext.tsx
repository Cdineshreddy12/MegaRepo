import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
  silentAuthAttempted: boolean;
}

interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const kindeAuth = useKindeAuth();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [silentAuthAttempted, setSilentAuthAttempted] = useState(false);

  // Debug Kinde state changes
  useEffect(() => {
    console.log('🔍 Kinde State Debug:', {
      isAuthenticated: kindeAuth.isAuthenticated,
      isLoading: kindeAuth.isLoading,
      user: !!kindeAuth.user,
      error: kindeAuth.error,
      timestamp: new Date().toISOString()
    });
  }, [kindeAuth.isAuthenticated, kindeAuth.isLoading, kindeAuth.user, kindeAuth.error]);

  // Get token from Kinde (now with persistent session support)
  const getKindeToken = async () => {
    try {
      if (kindeAuth.isAuthenticated && kindeAuth.getToken) {
        const accessToken = await kindeAuth.getToken();
        console.log('✅ Token retrieved successfully from Kinde persistent session');
        return accessToken;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get Kinde token from persistent session:', error);
      return null;
    }
  };


  // Handle token updates
  useEffect(() => {
    const updateToken = async () => {
      if (kindeAuth.isAuthenticated && !kindeAuth.isLoading) {
        console.log('🔍 User is authenticated, getting token...');
        const newToken = await getKindeToken();
        
        if (newToken && newToken !== token) {
          console.log('✅ Token updated');
          localStorage.setItem('token', newToken);
          sessionStorage.setItem('kinde_token', newToken);

          // Store the original Kinde token separately to prevent CRM token overwrite
          // Accept RS256 tokens (they can vary in length, just check the algorithm)
          if (newToken.startsWith('eyJhbGciOiJSUzI1Ni')) {
            localStorage.setItem('original_kinde_token', newToken);
            console.log('💾 [UPDATED CODE] Stored original Kinde RS256 token separately', {
              length: newToken.length,
              startsWith: newToken.substring(0, 20),
              storedIn: 'original_kinde_token',
              algorithm: 'RS256'
            });
          } else {
            console.log('⚠️ Token received but not Kinde RS256 format:', {
              length: newToken.length,
              startsWith: newToken.substring(0, 20),
              algorithm: newToken.startsWith('eyJhbGciOiJSUzI1Ni') ? 'RS256' : 'HS256'
            });
          }

          setToken(newToken);
        }
      } else if (!kindeAuth.isAuthenticated && !kindeAuth.isLoading) {
        console.log('🔒 User not authenticated, clearing token');
        localStorage.removeItem('token');
        sessionStorage.removeItem('kinde_token');
        localStorage.removeItem('original_kinde_token');
        setToken(null);
        setError(null);
      }
    };

    updateToken();
  }, [kindeAuth.isAuthenticated, kindeAuth.isLoading]);

  // Initialize persistent session check on app load
  useEffect(() => {
    const initializeSession = async () => {
      // Check if we have a persistent session from Kinde
      if (!kindeAuth.isLoading && !silentAuthAttempted) {
        console.log('🔍 Checking for persistent Kinde session...');

        // Kinde will automatically handle the persistent token
        // If authenticated, it will restore the session
        if (kindeAuth.isAuthenticated) {
          console.log('✅ Persistent Kinde session found');
        } else {
          console.log('🔒 No persistent session found');
          setSilentAuthAttempted(true);
        }
      }
    };

    initializeSession();
  }, [kindeAuth.isLoading, kindeAuth.isAuthenticated, silentAuthAttempted]);

  const login = () => {
    setError(null);
    kindeAuth.login();
  };

  const logout = () => {
    setToken(null);
    setError(null);
    setSilentAuthAttempted(false);
    kindeAuth.logout();
  };

  
  const contextValue: AuthContextType = {
    user: kindeAuth.user,
    isAuthenticated: kindeAuth.isAuthenticated,
    isLoading: kindeAuth.isLoading,
    token: token,
    error,
    silentAuthAttempted,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
