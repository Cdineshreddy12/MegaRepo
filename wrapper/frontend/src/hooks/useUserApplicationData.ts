import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

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

interface AccessSummary {
  totalUsers: number;
  enabledApplications: number;
  usersWithAccess: number;
  usersWithoutAccess: number;
  applicationUsage: Array<{
    appId: string;
    appCode: string;
    appName: string;
    userCount: number;
  }>;
}

export function useUserApplicationData() {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading user application data...');
      
      // Try classification endpoint first
      let classificationResponse;
      try {
        classificationResponse = await api.get('/user-sync/classification');
        console.log('✅ Classification endpoint response received');
      } catch (error) {
        console.error('❌ Classification endpoint failed, trying alternative...');
        // Fallback to user-applications endpoint
        try {
          const fallbackResponse = await api.get('/user-applications/users');
          console.log('✅ Fallback endpoint response received');
          
          if (fallbackResponse.status === 200 && fallbackResponse.data.success) {
            const fallbackData = fallbackResponse.data.data;
            const transformedUsers = fallbackData.map((user: any) => ({
              userId: user.userId || user.id,
              email: user.email || '',
              name: user.name || '',
              avatar: user.avatar || '',
              title: user.title || '',
              department: user.department || '',
              isActive: user.isActive !== false,
              isTenantAdmin: user.isTenantAdmin || false,
              lastActiveAt: user.lastActiveAt || '',
              lastLoginAt: user.lastLoginAt || '',
              onboardingCompleted: user.onboardingCompleted !== false,
              applicationAccess: user.applicationAccess || [],
              totalApplications: user.applicationAccess ? user.applicationAccess.length : 0,
              hasAnyAccess: user.hasAnyAccess || false
            }));
            
            const transformedSummary = {
              totalUsers: fallbackData.length,
              enabledApplications: fallbackData.filter((u: any) => u.hasAnyAccess).length,
              usersWithAccess: fallbackData.filter((u: any) => u.hasAnyAccess).length,
              usersWithoutAccess: fallbackData.filter((u: any) => !u.hasAnyAccess).length,
              applicationUsage: []
            };
            
            setUsers(transformedUsers);
            setSummary(transformedSummary);
            return;
          }
        } catch (fallbackError) {
          console.error('❌ Both endpoints failed:', fallbackError);
        }
        
        throw error;
      }

      if (classificationResponse.status === 200) {
        const classificationData = classificationResponse.data;
        
        if (classificationData.data && classificationData.success) {
          const transformedUsers = transformClassificationToUsers(classificationData.data);
          const transformedSummary = transformClassificationToSummary(classificationData.data);
          
          setUsers(transformedUsers);
          setSummary(transformedSummary);
        } else {
          setUsers([]);
          setSummary(null);
        }
      } else {
        setError('Failed to load data');
        setUsers([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('💥 Error loading user application data:', error);
      setError('Failed to load user data');
      setUsers([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load data on mount
  useEffect(() => {
    if (!initialLoad) {
      loadData();
      setInitialLoad(true);
    }
  }, [initialLoad, loadData]);

  return {
    users,
    summary,
    loading,
    error,
    loadData
  };
}

// Helper functions for data transformation
const getAppDisplayName = (appCode: string): string => {
  const appNames: Record<string, string> = {
    'crm': 'Customer Relationship Management',
    'hr': 'Human Resources Management',
    'affiliate': 'Affiliate Management',
    'system': 'System Administration'
  };
  return appNames[appCode] || appCode.toUpperCase();
};

const getAppDescription = (appCode: string): string => {
  const appDescriptions: Record<string, string> = {
    'crm': 'Complete CRM solution for managing customers, deals, and sales pipeline',
    'hr': 'Complete HR solution for employee management and payroll',
    'affiliate': 'Manage affiliate partners and commission tracking',
    'system': 'System administration and user management'
  };
  return appDescriptions[appCode] || `${appCode.toUpperCase()} Application`;
};

const getAppIcon = (appCode: string): string => {
  const appIcons: Record<string, string> = {
    'crm': '🎫',
    'hr': '👥',
    'affiliate': '🤝',
    'system': '⚙️'
  };
  return appIcons[appCode] || '🔧';
};

const getAppUrl = (appCode: string): string => {
  const appUrls: Record<string, string> = {
    'crm': 'https://crm.zopkit.com',
    'hr': 'http://localhost:3003',
    'affiliate': 'http://localhost:3004',
    'system': 'http://localhost:3000'
  };
  return appUrls[appCode] || '';
};

const transformClassificationToUsers = (classificationData: any): User[] => {
  console.log('🔄 Transforming classification data to users...');
  
  const byUser = classificationData.byUser || {};
  const byApplication = classificationData.byApplication || {};
  
  if (Object.keys(byUser).length > 0) {
    console.log('✅ Using byUser data directly');
    const users = Object.entries(byUser).map(([userId, userData]: [string, any]) => {
      const allowedApps = userData.allowedApps || [];
      
      return {
        userId,
        email: userData.email || '',
        name: userData.name || '',
        avatar: userData.avatar || '',
        title: userData.title || '',
        department: userData.department || '',
        isActive: userData.isActive !== false,
        isTenantAdmin: userData.isTenantAdmin || false,
        lastActiveAt: userData.lastActiveAt || '',
        lastLoginAt: userData.lastLoginAt || '',
        onboardingCompleted: userData.onboardingCompleted !== false,
        applicationAccess: allowedApps.map((appCode: string) => ({
          appId: appCode,
          appCode,
          appName: getAppDisplayName(appCode),
          description: getAppDescription(appCode),
          icon: getAppIcon(appCode),
          baseUrl: getAppUrl(appCode),
          status: 'active',
          isCore: true,
          modules: [],
          permissions: []
        })),
        totalApplications: allowedApps.length,
        hasAnyAccess: allowedApps.length > 0
      };
    });
    
    console.log('✅ Transformed users from byUser:', users.length);
    return users;
  }
  
  if (Object.keys(byApplication).length > 0) {
    console.log('⚠️ byUser is empty, creating users from application data...');
    
    const allUsers = new Set();
    Object.values(byApplication).forEach((appData: any) => {
      if (appData.users && Array.isArray(appData.users)) {
        appData.users.forEach((user: any) => {
          if (user.userId) {
            allUsers.add(user.userId);
          }
        });
      }
    });
    
    const users: User[] = [];
    
    Array.from(allUsers).forEach(userId => {
      const userApps = Object.keys(byApplication).filter((appCode: string) => {
        const appData = byApplication[appCode];
        return appData.users && appData.users.some((u: any) => u.userId === userId);
      });
      
      let userDetails: any = {};
      Object.values(byApplication).forEach((appData: any) => {
        if (appData.users && Array.isArray(appData.users)) {
          const foundUser = appData.users.find((u: any) => u.userId === userId);
          if (foundUser && !userDetails.userId) {
            userDetails = foundUser;
          }
        }
      });
      
      users.push({
        userId: userId as string,
        email: userDetails.email || '',
        name: userDetails.name || '',
        avatar: userDetails.avatar || '',
        title: userDetails.title || '',
        department: userDetails.department || '',
        isActive: userDetails.isActive !== false,
        isTenantAdmin: userDetails.isTenantAdmin || false,
        lastActiveAt: userDetails.lastActiveAt || '',
        lastLoginAt: userDetails.lastLoginAt || '',
        onboardingCompleted: userDetails.onboardingCompleted !== false,
        applicationAccess: userApps.map((appCode: string) => ({
          appId: appCode,
          appCode,
          appName: getAppDisplayName(appCode),
          description: getAppDescription(appCode),
          icon: getAppIcon(appCode),
          baseUrl: getAppUrl(appCode),
          status: 'active',
          isCore: true,
          modules: [],
          permissions: []
        })),
        totalApplications: userApps.length,
        hasAnyAccess: userApps.length > 0
      });
    });
    
    console.log('✅ Created users from application data:', users.length);
    return users;
  }
  
  console.log('⚠️ No user data found in either byUser or byApplication');
  return [];
};

const transformClassificationToSummary = (classificationData: any): AccessSummary => {
  console.log('🔄 Transforming classification data to summary...');
  
  const byApplication = classificationData.byApplication || {};
  const summary = classificationData.summary || {};
  
  const enabledApplications = Object.keys(byApplication).length;
  
  let totalUsers = summary.totalUsers || 0;
  if (totalUsers === 0 && Object.keys(byApplication).length > 0) {
    const allUsers = new Set();
    Object.values(byApplication).forEach((appData: any) => {
      if (appData.users && Array.isArray(appData.users)) {
        appData.users.forEach((user: any) => {
          if (user.userId) {
            allUsers.add(user.userId);
          }
        });
      }
    });
    totalUsers = allUsers.size;
  }
  
  const applicationUsage = Object.entries(byApplication).map(([appCode, appData]: [string, any]) => ({
    appId: appCode,
    appCode,
    appName: getAppDisplayName(appCode),
    userCount: appData.totalUsers || (appData.users ? appData.users.length : 0)
  }));
  
  const usersWithAccess = summary.applicationBreakdown ? 
    Object.values(summary.applicationBreakdown).reduce((sum: number, count: any) => sum + (count || 0), 0) : 
    totalUsers;
  
  const result = {
    totalUsers,
    enabledApplications,
    usersWithAccess,
    usersWithoutAccess: 0,
    applicationUsage
  };
  
  console.log('✅ Transformed summary:', result);
  return result;
};
