import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useAuthStatus, useTenant } from '@/hooks/useSharedQueries';
import toast from 'react-hot-toast';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  level: string;
}

export interface UserRole {
  roleId: string;
  roleName: string;
  description: string;
  isSystemRole: boolean;
}

export interface UserContextData {
  userId: string;
  kindeUserId: string;
  email: string;
  name: string;
  tenantId: string;
  isTenantAdmin: boolean;
  isActive: boolean;
  onboardingCompleted: boolean;
  needsOnboarding: boolean;
}

export interface TenantData {
  tenantId: string;
  companyName: string;
  subdomain: string;
  industry: string;
}

interface UserContextType {
  // State
  user: UserContextData | null;
  tenant: TenantData | null;
  permissions: UserPermission[];
  roles: UserRole[];
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  refreshUserContext: () => Promise<void>;
  checkPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  logout: () => void;

  // Permission refresh settings
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  lastRefreshTime: Date | null;
}

const UserContext = createContext<UserContextType | null>(null);

interface UserContextProviderProps {
  children: ReactNode;
  refreshInterval?: number; // in milliseconds, default 30 seconds
}

export const UserContextProvider: React.FC<UserContextProviderProps> = React.memo(({
  children,
  refreshInterval = 30000
}) => {
  const { isAuthenticated, user: kindeUser } = useKindeAuth();
  const location = useLocation();
  const [user, setUser] = useState<UserContextData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Fetch user context from API using shared hook
  const { data: authData, isLoading: authLoading, error: authError } = useAuthStatus();

  // Fetch tenant data using shared hook with caching
  const tenantId = authData?.authStatus?.tenantId;
  const { data: tenantData, isLoading: tenantLoading } = useTenant(tenantId);

  // Fetch user context from API
  const fetchUserContext = useCallback(async (showToast = false) => {
    try {
      console.log('🔄 Refreshing user context...');

      if (authData?.success && authData.authStatus) {
        const authStatus = authData.authStatus;

        // Create user object from authStatus with Kinde user data
        const userName = kindeUser?.givenName
          ? `${kindeUser.givenName}${kindeUser.familyName ? ' ' + kindeUser.familyName : ''}`
          : authStatus.email || 'Unknown';

        const userData: UserContextData = {
          userId: authStatus.userId,
          kindeUserId: authStatus.userId,
          email: authStatus.email,
          name: userName,
          tenantId: authStatus.tenantId,
          isTenantAdmin: authStatus.isTenantAdmin || false,
          isActive: true, // Assume active if authenticated
          onboardingCompleted: authStatus.onboardingCompleted || false,
          needsOnboarding: authStatus.needsOnboarding || false
        };

        // Use tenant data from shared hook (already cached and optimized)
        let effectiveTenantData: TenantData = {
          tenantId: authStatus.tenantId,
          companyName: 'Organization',
          subdomain: 'unknown',
          industry: 'Business'
        };

        // Use cached tenant data if available
        if (tenantData) {
          effectiveTenantData = {
            tenantId: tenantData.tenantId || authStatus.tenantId,
            companyName: tenantData.companyName || 'Organization',
            subdomain: tenantData.subdomain || 'unknown',
            industry: tenantData.industry || 'Business',
          };
        }

        setUser(userData);
        setTenant(effectiveTenantData);
        setPermissions(authStatus.userPermissions || authStatus.legacyPermissions || []);
        setRoles(authStatus.userRoles || []);
        setLastRefreshTime(new Date());

        console.log('✅ User context refreshed:', {
          userId: userData.userId,
          email: userData.email,
          tenantId: authStatus.tenantId,
          tenantName: tenantData?.companyName || 'Organization',
          permissions: (authStatus.userPermissions || authStatus.legacyPermissions || []).length,
          roles: (authStatus.userRoles || []).length
        });

        if (showToast) {
          toast.success('Permissions refreshed successfully');
        }
      } else if (!authData?.authStatus?.isAuthenticated) {
        // User is not authenticated
        setUser(null);
        setTenant(null);
        setPermissions([]);
        setRoles([]);
        setLastRefreshTime(null);
        console.log('ℹ️ User not authenticated');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch user context:', error);

      if (error.response?.status === 401) {
        // Authentication failed - clear state
        setUser(null);
        setTenant(null);
        setPermissions([]);
        setRoles([]);
        setLastRefreshTime(null);
      } else if (showToast) {
        toast.error('Failed to refresh permissions');
      }
    } finally {
      setLoading(false);
    }
  }, [authData, kindeUser, tenantData, location.pathname]);

  // Manual refresh function exposed to components
  const refreshUserContext = useCallback(async () => {
    setLoading(true);
    await fetchUserContext(true);
  }, [fetchUserContext]);

  // Check if user has a specific permission
  const checkPermission = useCallback((permissionName: string): boolean => {
    if (!user) return false;
    if (user.isTenantAdmin) return true;
    return permissions.some(p => p.name === permissionName);
  }, [user, permissions]);

  // Check if user has a specific role
  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    return roles.some(r => r.roleName === roleName);
  }, [user, roles]);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setTenant(null);
    setPermissions([]);
    setRoles([]);
    setLastRefreshTime(null);
    setAutoRefresh(false);

    // Clear any stored tokens or session data
    localStorage.removeItem('auth_token');

    // Redirect to login or home
    window.location.href = '/login';
  }, []);

  // Initial load - use shared auth hook data
  useEffect(() => {
    // Only fetch user context if user is authenticated
    // This prevents unnecessary API calls on public pages like invitation acceptance
    if (isAuthenticated && authData) {
      fetchUserContext(false);
    } else if (isAuthenticated && !authLoading && !authData && !authError) {
      // If auth data is not available but user is authenticated, still proceed
      setLoading(false);
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, authData, authLoading, authError, fetchUserContext]);

  // Update tenant data when cached tenant data changes
  useEffect(() => {
    if (tenantData && user) {
      setTenant({
        tenantId: tenantData.tenantId || user.tenantId,
        companyName: tenantData.companyName || 'Organization',
        subdomain: tenantData.subdomain || 'unknown',
        industry: tenantData.industry || 'Business',
      });
    }
  }, [tenantData, user]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing user context...');
      fetchUserContext(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, user, refreshInterval, fetchUserContext]);

  // Listen for storage events (for multi-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user_permissions_changed') {
        console.log('🔄 Permission change detected in another tab, refreshing...');
        fetchUserContext(false);
        // Remove the flag
        localStorage.removeItem('user_permissions_changed');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchUserContext]);

  // Update loading state to include tenant loading
  const effectiveLoading = loading || authLoading || tenantLoading;

  const value: UserContextType = {
    user,
    tenant,
    permissions,
    roles,
    loading: effectiveLoading,
    isAuthenticated: !!user,
    refreshUserContext,
    checkPermission,
    hasRole,
    logout,
    autoRefresh,
    setAutoRefresh,
    lastRefreshTime
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
});

UserContextProvider.displayName = 'UserContextProvider';

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserContextProvider');
  }
  return context;
};

// Hook for checking permissions with better TypeScript support
export const usePermissionCheck = () => {
  // Guard against context not being available
  let contextValue;
  try {
    contextValue = useUserContext();
  } catch (error) {
    console.log('🔧 usePermissionCheck: Context not available yet');
    return {
      hasPermission: () => false,
      hasRole: () => false,
      isAdmin: false,
      isAuthenticated: false
    };
  }

  const { checkPermission, hasRole, user } = contextValue;

  return {
    hasPermission: checkPermission,
    hasRole,
    isAdmin: user?.isTenantAdmin || false,
    isAuthenticated: !!user
  };
};

// Component for conditional rendering based on permissions
interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  role,
  requireAll = false,
  fallback = null,
  children
}) => {
  const { checkPermission, hasRole, user } = useUserContext();

  if (!user) return <>{fallback}</>;

  if (user.isTenantAdmin) return <>{children}</>;

  let hasAccess = false;

  if (role) {
    hasAccess = hasRole(role);
  } else if (permission) {
    hasAccess = checkPermission(permission);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every(p => checkPermission(p));
    } else {
      hasAccess = permissions.some(p => checkPermission(p));
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
