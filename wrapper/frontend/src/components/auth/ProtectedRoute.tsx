import React, { useEffect, useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import AuthButton from './AuthButton';
import { useAuthStatus } from '@/hooks/useSharedQueries';
import AnimatedLoader from '@/components/common/AnimatedLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredOrganization?: string;
  requiredPermissions?: string[];
  fallbackComponent?: React.ComponentType;
  redirectTo?: string;
  skipOnboardingCheck?: boolean;
}

interface AuthRequiredProps {
  orgCode?: string;
  redirectUri?: string;
  message?: string;
}

const AuthRequired: React.FC<AuthRequiredProps> = ({ 
  orgCode, 
  redirectUri,
  message = "Please sign in to access this page."
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-2xl">Authentication Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 text-center">
            {message}
          </p>
          
          <div className="space-y-3">
            <AuthButton 
              provider="google" 
              orgCode={orgCode}
              redirectUri={redirectUri}
              showDropdown={false}
              size="lg"
            />
            <AuthButton 
              provider="github" 
              orgCode={orgCode}
              redirectUri={redirectUri}
              showDropdown={false}
              size="lg"
              variant="outline"
            />
            <AuthButton 
              provider="microsoft" 
              orgCode={orgCode}
              redirectUri={redirectUri}
              showDropdown={false}
              size="lg"
              variant="outline"
            />
          </div>
          
          {orgCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Signing in to organization: <strong>{orgCode}</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <AnimatedLoader size="lg" className="mb-6" />
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Checking authentication...</p>
      </div>
    </div>
  );
};

const AccessDenied: React.FC<{ reason: string }> = ({ reason }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 text-center">
            {reason}
          </p>
          
          <div className="flex justify-center">
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = React.memo(({
  children,
  requiredOrganization,
  requiredPermissions = [],
  fallbackComponent: FallbackComponent,
  redirectTo,
  skipOnboardingCheck = false
}) => {
  const {
    isAuthenticated,
    isLoading,
    user
  } = useKindeAuth();
  const location = useLocation();
  const { data: authData, isLoading: authStatusLoading, error: authError } = useAuthStatus();

  const backendAuthStatus = authData?.authStatus || null;

  console.log('🔒 ProtectedRoute: Called for path:', location.pathname, {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userId: user?.id,
    skipOnboardingCheck,
    authStatusLoading,
    hasAuthData: !!backendAuthStatus
  });

  // Show loading spinner while checking authentication
  if (isLoading || authStatusLoading) {
    console.log('🔄 ProtectedRoute: Still loading for:', location.pathname);
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return <LoadingSpinner />;
  }

  // Handle unauthenticated users
  // Only redirect if Kinde is not still loading (prevents redirect loops)
  if ((!isAuthenticated || !user) && !isLoading) {
    console.log('🚫 ProtectedRoute: Not authenticated (Kinde loaded), redirecting to login', {
      isAuthenticated,
      hasUser: !!user,
      isLoading,
      pathname: location.pathname
    });

    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check backend authentication status
  if (!backendAuthStatus?.isAuthenticated) {
    console.log('🚫 ProtectedRoute: Backend says user not authenticated');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check onboarding status (skip for certain routes and debug routes)
  if (!skipOnboardingCheck && 
      location.pathname !== '/onboarding' && 
      backendAuthStatus?.needsOnboarding) {
    
    console.log('🔄 ProtectedRoute: User needs onboarding, redirecting...', {
      needsOnboarding: backendAuthStatus.needsOnboarding,
      onboardingCompleted: backendAuthStatus.onboardingCompleted,
      pathname: location.pathname
    });
    
    // Build onboarding URL with context
    const params = new URLSearchParams();
    params.set('from', 'protected_route');
    if (user.email) params.set('email', user.email);
    
    return <Navigate to={`/onboarding?${params.toString()}`} replace />;
  }

  // Log successful authentication for debugging
  console.log('✅ ProtectedRoute: Access granted for:', location.pathname, {
    isAuthenticated,
    hasUser: !!user,
    userId: user.id,
    needsOnboarding: backendAuthStatus?.needsOnboarding,
    onboardingCompleted: backendAuthStatus?.onboardingCompleted,
    skipOnboardingCheck
  });

  // User is authenticated and authorized
  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute; 