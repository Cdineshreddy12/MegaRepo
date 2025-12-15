import { useState, useMemo } from 'react';

interface User {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  title?: string;
  department?: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  lastActiveAt?: string;
  lastLoginAt?: string;
  onboardingCompleted: boolean;
  applicationAccess: ApplicationAccess[];
  totalApplications: number;
  hasAnyAccess: boolean;
}

interface ApplicationAccess {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  icon: string;
  baseUrl: string;
  status: string;
  isCore: boolean;
  modules: ModuleAccess[];
  permissions: Permission[];
}

interface ModuleAccess {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface Permission {
  permissionId: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

export function useUserFilters(users: User[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);

  // Get unique applications from users
  const uniqueApps = useMemo(() => {
    const apps = new Set<string>();
    users.forEach(user => {
      user.applicationAccess.forEach(app => {
        apps.add(app.appCode);
      });
    });
    return Array.from(apps);
  }, [users]);

  // Filter users based on search and filter criteria
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterApp !== 'all') {
      filtered = filtered.filter(user => 
        user.applicationAccess.some(app => app.appCode === filterApp)
      );
    }
    
    if (!showInactiveUsers) {
      filtered = filtered.filter(user => user.isActive);
    }

    return filtered;
  }, [users, searchTerm, filterApp, showInactiveUsers]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterApp('all');
    setShowInactiveUsers(false);
  };

  return {
    searchTerm,
    setSearchTerm,
    filterApp,
    setFilterApp,
    showInactiveUsers,
    setShowInactiveUsers,
    uniqueApps,
    filteredUsers,
    resetFilters
  };
}
