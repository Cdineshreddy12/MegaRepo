/**
 * API Usage Guide for Separated Operation Cost Endpoints
 *
 * NEW SEPARATED APPROACH (Recommended):
 * =====================================
 *
 * 1. Global Operations Only:
 *    operationCostAPI.getGlobalOperationCosts({ search: 'crm.leads' })
 *    → Returns: { data: { operations: [...], type: 'global' } }
 *
 * 2. Tenant-Specific Operations Only:
 *    operationCostAPI.getTenantOperationCosts(tenantId, { search: 'crm.leads' })
 *    → Returns: { data: { operations: [...], type: 'tenant', tenantId } }
 *
 * 3. Smart Auto-Selection (Recommended):
 *    smartOperationCostAPI.getSmartOperationCosts({ tenantId, includeGlobal: true })
 *    → Automatically chooses best endpoint based on context
 *
 * 4. Get Effective Cost with Hierarchy:
 *    smartOperationCostAPI.getEffectiveOperationCost('crm.leads.create', tenantId)
 *    → Returns tenant-specific cost, or global fallback, or null
 *
 * LEGACY APPROACH (Deprecated):
 * ============================
 *
 * operationCostAPI.getOperationCosts({ isGlobal: true })
 * → Still works but mixes concerns - avoid for new code
 *
 * COMPREHENSIVE CONFIGURATION (Best for Management UI):
 * ====================================================
 *
 * creditConfigurationAPI.getTenantConfigurations(tenantId)
 * → Returns both tenant and global configs with proper hierarchy
 *
 */

import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

// Point directly to backend since all routes are registered under /api/*
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Store for Kinde token getter function
let kindeTokenGetter: (() => Promise<string | null>) | null = null;

// Debug utility to inspect all stored tokens
export const debugStoredTokens = () => {
  console.log('🔍 === TOKEN DEBUG INFORMATION ===');

  console.log('📁 localStorage keys:', Object.keys(localStorage));
  console.log('📁 sessionStorage keys:', Object.keys(sessionStorage));
  console.log('🍪 cookies:', document.cookie.split(';').map(c => c.trim().split('=')[0]));

  // Check for potential token locations
  const potentialTokenLocations = [
    'kinde_backup_token',
    'kinde_session',
    'kinde_auth',
    'kinde_token',
    'access_token',
    'id_token',
    'refresh_token'
  ];

  console.log('🔑 Checking potential token locations:');
  potentialTokenLocations.forEach(key => {
    const localValue = localStorage.getItem(key);
    const sessionValue = sessionStorage.getItem(key);

    if (localValue) {
      console.log(`📦 localStorage.${key}: ${localValue.substring(0, 50)}... (${localValue.length} chars)`);
      if (isValidJWT(localValue)) {
        console.log(`✅ ${key} in localStorage is a valid JWT`);
      }
    }

    if (sessionValue) {
      console.log(`📦 sessionStorage.${key}: ${sessionValue.substring(0, 50)}... (${sessionValue.length} chars)`);
      if (isValidJWT(sessionValue)) {
        console.log(`✅ ${key} in sessionStorage is a valid JWT`);
      }
    }
  });

  // Check cookies
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value && (name.includes('token') || name.includes('kinde') || name.includes('auth'))) {
      const decodedValue = decodeURIComponent(value);
      console.log(`🍪 Cookie ${name}: ${decodedValue.substring(0, 50)}... (${decodedValue.length} chars)`);
      if (isValidJWT(decodedValue)) {
        console.log(`✅ ${name} cookie is a valid JWT`);
      }
    }
  });

  console.log('🔍 === END TOKEN DEBUG ===');
};

// Function to set the Kinde token getter (called from components that have access to useKindeAuth)
export const setKindeTokenGetter = (getter: () => Promise<string | null>) => {
  kindeTokenGetter = getter;
};

// Enhanced JWT token validation
const isValidJWT = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  if (token.length < 20) return false;

  // JWT format: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // Try to decode header to ensure it's a valid JWT
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    return header && typeof header === 'object' && header.alg;
  } catch (e) {
    return false;
  }
};

// Function to get Kinde token from localStorage/sessionStorage
const getKindeToken = async () => {
  console.log('🔍 Starting enhanced token search...');

  // Method 0: Check for backup token first
  const backupToken = localStorage.getItem('kinde_backup_token');
  if (backupToken && isValidJWT(backupToken)) {
    console.log('🔄 Found valid backup token, using it');
    return backupToken;
  }

  // Method 1: Try Kinde SDK if available
  if (kindeTokenGetter) {
    try {
      console.log('🔑 Trying Kinde SDK getToken()...');
      const token = await kindeTokenGetter();
      if (token && isValidJWT(token)) {
        console.log('✅ Got valid token from Kinde SDK');
        localStorage.setItem('kinde_backup_token', token);
        return token;
      } else if (token) {
        console.log('⚠️ Kinde SDK returned invalid token format');
      }
    } catch (error) {
      console.log('❌ Kinde SDK getToken() failed:', error);
    }
  }

  // Method 2: Enhanced manual search
  try {
    console.log('🔍 Performing enhanced manual token search...');

    // Search all storage locations for JWT-like tokens
    const searchLocations = [
      { storage: localStorage, name: 'localStorage' },
      { storage: sessionStorage, name: 'sessionStorage' }
    ];

    for (const { storage, name } of searchLocations) {
      console.log(`🔍 Searching in ${name}...`);

      // Check for Kinde-specific patterns
      const kindeKeys = ['kinde_session', 'kinde_auth', 'kinde_token', 'kinde.access_token'];
      for (const key of kindeKeys) {
        const value = storage.getItem(key);
        if (value) {
          console.log(`📱 Found ${key} in ${name}`);
          try {
            const parsed = JSON.parse(value);
            if (parsed.access_token && isValidJWT(parsed.access_token)) {
              console.log('✅ Found valid access_token in', key);
              return parsed.access_token;
            }
            if (parsed.id_token && isValidJWT(parsed.id_token)) {
              console.log('✅ Found valid id_token in', key);
              return parsed.id_token;
            }
            if (parsed.token && isValidJWT(parsed.token)) {
              console.log('✅ Found valid token in', key);
              return parsed.token;
            }
          } catch (e) {
            // If it's not JSON, check if the value itself is a JWT
            if (isValidJWT(value)) {
              console.log('✅ Found JWT token directly in', key);
              return value;
            }
          }
        }
      }

      // Check for general auth patterns
      const allKeys = Object.keys(storage);
      for (const key of allKeys) {
        if (key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('auth') ||
            key.toLowerCase().includes('kinde')) {
          const value = storage.getItem(key);
          if (value && isValidJWT(value)) {
            console.log(`✅ Found JWT token in ${name} key: ${key}`);
            return value;
          }
        }
      }
    }

    // Method 3: Enhanced search for any JWT tokens in storage
    console.log('🔍 Performing comprehensive JWT search...');

    // Check all storage for any JWT-like tokens
    for (const { storage, name } of searchLocations) {
      const allKeys = Object.keys(storage);
      for (const key of allKeys) {
        const value = storage.getItem(key);
        if (value && isValidJWT(value)) {
          console.log(`✅ Found JWT token in ${name} key: ${key}`);
          return value;
        }
      }
    }

    // Method 4: Check cookies as final fallback
    console.log('🔍 Checking cookies for JWT tokens...');
    const cookies = document.cookie.split(';');
    console.log('🍪 Available cookies:', cookies.map(c => c.trim().split('=')[0]));

    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        const decodedValue = decodeURIComponent(value);
        if (isValidJWT(decodedValue)) {
          console.log('✅ Found JWT token in cookies:', name);
          return decodedValue;
        }
      }
    }

    // Method 5: Last resort - check for any long strings that might be tokens
    console.log('🔍 Last resort: checking for any long strings that might be tokens...');
    for (const { storage, name } of searchLocations) {
      const allKeys = Object.keys(storage);
      for (const key of allKeys) {
        const value = storage.getItem(key);
        if (value && value.length > 100 && !value.includes(' ') && !value.includes('{') && !value.includes('"')) {
          // Check if it looks like a JWT (has dots and reasonable length)
          if (value.split('.').length === 3 && value.length > 200) {
            console.log(`🎯 Found potential JWT in ${name} key: ${key} (length: ${value.length})`);
            try {
              // Quick validation
              const parts = value.split('.');
              JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
              console.log('✅ Validated as JWT token');
              return value;
            } catch (e) {
              console.log('❌ Failed JWT validation for potential token');
            }
          }
        }
      }
    }

    console.log('❌ No authentication token found in any storage location');
    console.log('💡 This might mean the user is not authenticated or tokens are stored differently');
    console.log('🔍 Available storage keys for debugging:');
    console.log('📁 localStorage keys:', Object.keys(localStorage));
    console.log('📁 sessionStorage keys:', Object.keys(sessionStorage));
    console.log('🍪 cookies:', document.cookie.split(';').map(c => c.trim().split('=')[0]));

    return null;
  } catch (error) {
    console.error('🚨 Error getting authentication token:', error);
    console.error('🚨 Error details:', error);
    return null;
  }
};

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})


// Request interceptor - add debugging and ensure cookies are sent
api.interceptors.request.use(async (config) => {
  // Try to get the authentication token and add it to headers
  const authToken = await getKindeToken();
  
  if (authToken && authToken.trim() !== '' && authToken.length > 10) {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }

    // Set the Authorization header
    config.headers['Authorization'] = `Bearer ${authToken}`;
    console.log('🔑 Added authentication token to request headers');
    console.log('🔍 Token preview:', authToken.substring(0, 20) + '...');
  } else {
    console.log('❌ No valid authentication token found for request');
    console.log('🔍 authToken details:', {
      exists: !!authToken,
      length: authToken?.length || 0,
      trimmedLength: authToken?.trim()?.length || 0,
      isEmpty: !authToken || authToken.trim() === '',
      value: authToken || 'null/undefined'
    });

    // Ensure we NEVER send incomplete Bearer headers
    if (config.headers?.Authorization === 'Bearer' || config.headers?.Authorization === '') {
      console.log('🚨 Removing incomplete Authorization header');
      delete config.headers.Authorization;
    }
  }

  console.log('🔍 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    withCredentials: config.withCredentials,
    hasAuthToken: !!authToken,
    authTokenLength: authToken?.length || 0,
    authTokenType: typeof authToken,
    authHeader: config.headers?.Authorization || 'NOT SET',
    isAuthHeaderEmpty: config.headers?.Authorization === 'Bearer' || config.headers?.Authorization === ''
  });
  
  return config
}, (error) => {
  console.error('🚨 API Request Error:', error);
  return Promise.reject(error);
})

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Don't log authentication errors in production
    if (error.response?.status !== 401) {
      console.error('🚨 API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      })
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🔐 Authentication required - redirecting to login')
      // Clear any stale auth data
      localStorage.removeItem('kinde_token')
      localStorage.removeItem('authToken')
      
      // TODO: Re-enable this redirect once backend API is properly set up
      // window.location.href = '/login'
    }

    // Handle trial expiry (200 status with subscriptionExpired flag) - Graceful handling without excessive toasts
    if (error.response?.status === 200 && (error.response?.data as any)?.subscriptionExpired) {
      const responseData = error.response.data as any
      
      if (responseData?.code === 'TRIAL_EXPIRED' || responseData?.code === 'SUBSCRIPTION_EXPIRED') {
        console.log('🚫 Trial/Subscription expired response intercepted:', responseData)
        
        // Store trial/subscription expiry state for banner to use
        const expiredData = {
          expired: true,
          expiredAt: new Date().toISOString(),
          isTrialExpired: responseData.isTrialExpired,
          isSubscriptionExpired: responseData.isSubscriptionExpired,
          trialEnd: responseData.data?.trialEnd,
          currentPeriodEnd: responseData.data?.currentPeriodEnd,
          expiredDate: responseData.data?.expiredDate,
          expiredDuration: responseData.data?.expiredDuration,
          plan: responseData.data?.plan,
          message: responseData.message,
          immediate: responseData.immediate,
          code: responseData.code
        }
        
        // Store in localStorage for persistence
        localStorage.setItem('trialExpired', JSON.stringify(expiredData))
        
        // Only emit events if not already done to prevent spam
        const lastEmitted = localStorage.getItem('trialExpiredEventEmitted')
        const now = Date.now()
        
        if (!lastEmitted || (now - parseInt(lastEmitted)) > 5000) { // 5 second cooldown
          localStorage.setItem('trialExpiredEventEmitted', now.toString())
          
          // Emit immediate event for banner to show instantly
          window.dispatchEvent(new CustomEvent('apiTrialExpired', { 
            detail: responseData 
          }))
          
          // Also emit the original event for compatibility
          window.dispatchEvent(new CustomEvent('trialExpired', { 
            detail: expiredData 
          }))
        }
        
        // Don't show additional error toasts - let the banner and dashboard handle it gracefully
        return Promise.reject(error)
      }
    }

    // Handle server errors - but don't spam toasts for trial expiry scenarios
    if (error.response?.status && error.response.status >= 500) {
      console.error('🚨 Server error intercepted:', error.response.status)
      
      // Don't show server error toasts if we're in a trial expiry state
      const trialExpired = localStorage.getItem('trialExpired')
      if (!trialExpired) {
        toast.error('Server temporarily unavailable. Please try again in a moment.', {
          duration: 4000,
          position: 'top-center'
        })
      }
    }
    
    return Promise.reject(error)
  }
)

// API Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  tenantId: string
  lastActiveAt: string
  createdAt: string
}

// Unified user interface that matches the backend response
export interface UnifiedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  invitationStatus: 'active' | 'pending' | 'inactive'
  invitedAt: string
  expiresAt: string | null
  lastActiveAt: string | null
  invitationId: string | null
  status: string
  userType: 'active' | 'invited'
  originalData?: any
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface Tenant {
  id: string
  name: string
  domain: string
  status: 'active' | 'suspended' | 'pending'
  plan: string
  createdAt: string
  settings: Record<string, any>
}

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  amount: number
  currency: string
}

export interface UsageMetrics {
  apiCalls: number
  storage: number
  users: number
  bandwidth: number
}

export interface Plan {
  id: string
  name: string
  price: number
  currency: string
  features: Record<string, any>
  limits: Record<string, number>
}

export interface Permission {
  id: string
  name: string
  description: string
  category: string
  resource: string
  action: string
}

// Enhanced Role interface that supports both legacy flat and new hierarchical permission formats
export interface Role {
  roleId: string
  roleName: string
  name?: string // Alternative name field for compatibility
  description?: string
  color?: string
  // Support both permission formats
  permissions: string[] | Record<string, any>
  restrictions?: {
    // Legacy fields
    ipWhitelist?: string[]
    timeRestrictions?: {
      allowedHours?: number[]
      allowedDays?: number[]
      timezone?: string
    }
    dataAccess?: {
      ownDataOnly?: boolean
      departmentOnly?: boolean
      allowedApps?: string[]
    }
    // New comprehensive restrictions
    planType?: string
    maxUsers?: number
    maxRoles?: number
    storageLimit?: string
    apiCallLimit?: number
  }
  isSystemRole: boolean
  isDefault: boolean
  priority: number
  createdBy: string
  createdAt: string
  updatedAt: string
  // Additional fields for enhanced role management
  userCount?: number
  icon?: string
  category?: string
  inheritance?: {
    parentRoles: string[]
    inheritanceMode: 'additive' | 'restrictive'
    priority: number
  }
  metadata?: {
    icon?: string
    category?: string
    tags?: string[]
    level?: string
    department?: string
    isTemplate?: boolean
  }
}

export interface RoleTemplate {
  templateId: string
  templateName: string
  displayName: string
  description?: string
  category?: string
  permissions: string[]
  restrictions?: any
  targetTools: string[]
  isActive: boolean
  sortOrder: number
}

export interface RoleAssignment {
  assignmentId: string
  userId: string
  roleId: string
  roleName: string
  assignedBy: string
  assignedAt: string
  isTemporary: boolean
  expiresAt?: string
  isActive: boolean
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface AuditLogEntry {
  logId: string
  tenantId: string
  userId?: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  details?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
}

// Auth API
export const authAPI = {
  getLoginUrl: (subdomain: string) => api.get(`/auth/login/${subdomain}`),
  handleCallback: (code: string, state?: string) =>
    api.get('/auth/callback', { params: { code, state } }),
  getUserInfo: () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProviders: () => api.get('/auth/providers'),
}

// Tenant API
export const tenantAPI = {
  // Get current tenant details
  getCurrentTenant: () => api.get<Tenant>('/tenants/current'),

  // Get tenant users
  getUsers: () => api.get<ApiResponse<UnifiedUser[]>>('/tenants/current/users'),

  // Invite user to tenant
  inviteUser: (data: { email: string; roleId: string; message?: string }) =>
    api.post<ApiResponse<any>>('/tenants/current/users/invite', data),

  // Remove user from tenant
  removeUser: (userId: string) =>
    api.delete<ApiResponse<any>>(`/tenants/current/users/${userId}`),

  // Update user role
  updateUserRole: (userId: string, roleId: string) =>
    api.put<ApiResponse<any>>(`/tenants/current/users/${userId}/role`, { roleId }),

  // Get tenant usage
  getUsage: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<any>>('/tenants/current/usage', { params }),

  // Export users
  exportUsers: () => api.get('/tenants/current/users/export'),

  // Get organization assignments
  getOrganizationAssignments: () => api.get<ApiResponse<any>>('/tenants/current/organization-assignments'),
}

// Subscription API
export const subscriptionAPI = {
  // Debug endpoint for testing authentication
  debugAuth: () => api.get('/subscriptions/debug-auth'),

  getCurrent: () => api.get('/subscriptions/current'),
  getAvailablePlans: () => api.get('/subscriptions/plans'),
  getBillingHistory: () => api.get('/subscriptions/billing-history'),
  getConfigStatus: () => api.get('/subscriptions/config-status'),
  createCheckout: (data: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
  }) => api.post('/subscriptions/checkout', data),
  checkProfileStatus: () => api.get('/payment-upgrade/profile-status'),
  changePlan: (data: {
    planId: string;
    billingCycle?: 'monthly' | 'yearly';
  }) => api.post('/subscriptions/change-plan', data),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  updatePaymentMethod: () => api.post('/subscriptions/update-payment-method'),
  getUsage: () => api.get('/subscriptions/usage'),

  // Enhanced payment management
  immediateDowngrade: (data: { newPlan: string; reason?: string; refundRequested?: boolean }) =>
    api.post('/subscriptions/immediate-downgrade', data),
  processRefund: (data: { paymentId: string; amount?: number; reason?: string }) =>
    api.post('/subscriptions/refund', data),
  getPaymentDetailsById: (paymentId: string) =>
    api.get(`/subscriptions/payment/${paymentId}`),
  getSubscriptionActions: () =>
    api.get('/subscriptions/actions'),
  getPlanLimits: () =>
    api.get('/subscriptions/plan-limits'),
  cleanupDuplicatePayments: () =>
    api.post('/subscriptions/cleanup-duplicate-payments'),
  getPaymentDetailsBySession: (sessionId: string) => api.get(`/subscriptions/payment/${sessionId}`),
  toggleTrialRestrictions: (disable: boolean) =>
    api.post('/subscriptions/toggle-trial-restrictions', { disable }),
}

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getMetrics: (period?: string) =>
    api.get('/api/analytics/metrics', { params: { period } }),
  getPerformance: () => api.get('/api/analytics/performance'),
  getReports: () => api.get('/api/analytics/reports'),
  exportData: (type: string) => api.get(`/api/analytics/export/${type}`),
}

// Usage API
export const usageAPI = {
  getCurrent: () => api.get<UsageMetrics>('/api/usage/current'),
  getMetrics: (period?: string) =>
    api.get('/api/usage/metrics', { params: { period } }),
  getBreakdown: () => api.get('/api/usage/breakdown'),
  getAlerts: () => api.get('/api/usage/alerts'),
  getLogs: (page = 1, limit = 50) =>
    api.get('/api/usage/logs', { params: { page, limit } }),
}

// Permissions API
export const permissionsAPI = {
  getAvailablePermissions: () => api.get('/api/permissions/available'),

  // Applications and modules
  getApplications: () => api.get('/api/permissions/applications'),

  // Users
  getUsers: () => api.get('/api/permissions/users'),
  getUserPermissions: (userId: string) => api.get(`/api/permissions/users/${userId}/permissions`),

  // Bulk operations
  bulkAssignPermissions: (assignments: Array<{
    userId: string;
    appId: string;
    moduleId: string;
    permissions: string[];
  }>) => api.post('/api/permissions/bulk-assign', { assignments }),

  // Template operations
  getTemplates: () => api.get('/api/permissions/templates'),
  applyTemplate: (userId: string, data: {
    templateId: string;
    clearExisting?: boolean;
  }) => api.post(`/api/permissions/users/${userId}/apply-template`, data),

  // Permission removal
  removeUserPermissions: (userId: string, data: {
    appId?: string;
    moduleId?: string;
    permissionIds?: string[];
  }) => api.delete(`/api/permissions/users/${userId}/permissions`, { data }),

  // Roles - Basic operations only (creation moved to builder)
  getRoles: (params?: { page?: number; limit?: number; search?: string; type?: string }) =>
    api.get('/api/permissions/roles', { params }),
  updateRole: (roleId: string, data: {
    name?: string;
    description?: string;
    permissions?: string[];
    restrictions?: any
  }) => api.put(`/api/permissions/roles/${roleId}`, data),
  deleteRole: (roleId: string) => api.delete(`/api/permissions/roles/${roleId}`),

  // Role Templates - REMOVED (using application/module builder instead)

  // Custom Role Builder (using applications/modules tables)
  getRoleBuilderOptions: () => api.get('/api/custom-roles/builder-options'),
  createRoleFromBuilder: (data: {
    roleName: string;
    description?: string;
    selectedApps: string[];
    selectedModules: Record<string, string[]>;
    selectedPermissions: Record<string, string[]>;
    restrictions?: Record<string, boolean>;
    metadata?: any;
  }) => api.post('/custom-roles/create-from-builder', data),
  assignUserPermissions: (data: {
    userId: string;
    appCode: string;
    moduleCode: string;
    permissions: string[];
    reason?: string;
    expiresAt?: string;
  }) => api.post('/custom-roles/assign-user-permissions', data),
  getCustomUserPermissions: (userId: string) => api.get(`/custom-roles/user-permissions/${userId}`),
  
  // Role Assignments
  getAssignments: (params?: { 
    userId?: string; 
    roleId?: string; 
    page?: number; 
    limit?: number 
  }) => api.get('/permissions/assignments', { params }),
  assignRole: (data: {
    userId: string;
    roleId: string;
    expiresAt?: string;
    conditions?: any;
  }) => api.post('/permissions/assignments', data),
  removeAssignment: (assignmentId: string) => 
    api.delete(`/permissions/assignments/${assignmentId}`),
  bulkAssignRoles: (assignments: Array<{
    userId: string;
    roleId: string;
    expiresAt?: string;
  }>) => api.post('/permissions/assignments/bulk', { assignments }),
  
  // Permission Checking
  checkPermissions: (data: {
    permissions: string[];
    userId?: string;
    resource?: string;
    context?: any;
  }) => api.post('/permissions/check', data),
  getUserEffectivePermissions: (userId: string) => 
    api.get(`/permissions/user/${userId}/effective`),
  
  // Audit
  getAuditLog: (params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/permissions/audit', { params }),
}

// User API
export const userAPI = {
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) => api.put('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/users/password', data),
  getActivityLogs: () => api.get('/users/activity'),
  completeOnboarding: (data: Record<string, any>) => 
    api.post('/users/onboarding', data),
}

// Onboarding API
export const onboardingAPI = {
  checkSubdomain: async (subdomain: string) => {
    return await api.get(`/onboarding/check-subdomain?subdomain=${subdomain}`)
  },

  checkStatus: async () => {
    return await api.get('/onboarding/status')
  },

  markUserAsOnboarded: async (tenantId: string) => {
    return await api.post('/onboarding/mark-onboarded', { tenantId })
  },

  // Removed syncUser - overly complex, replaced with proper onboarding flow

  // Get user's organization info after onboarding
  getUserOrganization: () => api.get('/onboarding/user-organization'),
  
  // Get saved onboarding data by email (for pre-filling)
  getDataByEmail: (email: string) => 
    api.post('/onboarding/get-data', { email }),
  
  // Mark onboarding as complete (called after successful setup)
  markComplete: (organizationId: string) => 
    api.post('/onboarding/mark-complete', { organizationId }),
  
  // Update current onboarding step for progress tracking
  updateStep: (step: string, data?: any, email?: string, formData?: any) => 
    api.post('/onboarding/update-step', { step, data, email, formData }),
  
  // Reset onboarding status (for testing/admin purposes)
  reset: (targetUserId?: string) => 
    api.post('/onboarding/reset', targetUserId ? { targetUserId } : {}),
}

// User Sync and Classification API
export const userSyncAPI = {
  // Get all users classified by application access
  getUserClassification: () => 
    api.get('/user-sync/classification'),

  // Get users for specific application
  getUsersForApplication: (appCode: string) => 
    api.get(`/user-sync/classification/${appCode}`),

  // Get specific user's application access
  getUserApplicationAccess: (userId: string) => 
    api.get(`/user-sync/user/${userId}/access`),

  // Sync all users to their applications
  syncAllUsers: (options: { syncType?: 'full' | 'incremental', dryRun?: boolean } = {}) => 
    api.post('/user-sync/sync/all', options),

  // Sync users for specific application
  syncUsersForApplication: (appCode: string, options: { syncType?: 'full' | 'incremental' } = {}) => 
    api.post(`/user-sync/sync/application/${appCode}`, options),

  // Sync individual user
  syncUser: (userId: string, options: { syncType?: 'full' | 'update' } = {}) => 
    api.post(`/user-sync/sync/user/${userId}`, options),

  // Refresh user classification after role changes
  refreshUserClassification: (userId: string, options: { 
    autoSync?: boolean, 
    previousApps?: string[] 
  } = {}) => 
    api.post(`/user-sync/refresh/${userId}`, options),

  // Get sync status for tenant
  getSyncStatus: () => 
    api.get('/user-sync/status'),

  // Test connectivity to applications
  testConnectivity: (appCode?: string) => 
    api.post('/user-sync/test-connectivity', { appCode })
}

// User Application Management API (enhanced functionality)
export const userApplicationAPI = {
  // Get all users with their application access
  getUsersWithApplicationAccess: (params?: {
    includeInactive?: boolean;
    appCode?: string;
    includePermissionDetails?: boolean;
  }) => api.get('/user-sync/classification', { params }),

  // Get specific user's application access
  getUserApplicationAccess: (userId: string, params?: {
    appCode?: string;
    includePermissionDetails?: boolean;
  }) => api.get(`/user-sync/user/${userId}/access`, { params }),

  // Get application access summary
  getApplicationAccessSummary: () =>
    api.get('/user-sync/classification'),

  // Sync users to specific application
  syncUsersToApplication: (appCode: string, options?: {
    dryRun?: boolean;
    userIds?: string[];
    forceSync?: boolean;
  }) => api.post(`/user-sync/sync/application/${appCode}`, options),

  // Bulk sync all users to all applications
  bulkSyncAllUsers: (options?: {
    dryRun?: boolean;
  }) => api.post('/user-sync/sync/all', options),

  // Sync specific user to their applications
  syncUserToApplications: (userId: string, options?: {
    dryRun?: boolean;
    appCodes?: string[];
  }) => api.post(`/user-sync/sync/user/${userId}`, options)
}

// Credit Management API
export const creditAPI = {
  // Get current credit balance
  getCurrentBalance: () => api.get('/credits/current'),

  // Get credit transaction history
  getTransactionHistory: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/credits/transactions', { params }),

  // Get active credit alerts
  getAlerts: () => api.get('/credits/alerts'),

  // Purchase credits
  purchaseCredits: (data: {
    creditAmount: number;
    paymentMethod: 'stripe' | 'bank_transfer' | 'check';
    currency?: string;
    notes?: string;
  }) => api.post('/credits/purchase', data),

  // Consume credits for operation
  consumeCredits: (data: {
    operationCode: string;
    creditCost: number;
    operationId?: string;
    description?: string;
    metadata?: any;
  }) => api.post('/credits/consume', data),

  // Get credit usage summary
  getUsageSummary: (params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
  }) => api.get('/credits/usage-summary', { params }),

  // Transfer credits between entities
  transferCredits: (data: {
    toEntityType: 'organization' | 'location';
    toEntityId: string;
    creditAmount: number;
    reason?: string;
  }) => api.post('/credits/transfer', data),

  // Get credit configuration for operation
  getOperationConfig: (operationCode: string) =>
    api.get(`/credits/config/${operationCode}`),

  // Mark alert as read
  markAlertAsRead: (alertId: string) =>
    api.put(`/credits/alerts/${alertId}/read`),

  // Get available credit packages
  getAvailablePackages: () => api.get('/credits/packages'),

  // Get credit statistics
  getCreditStats: () => api.get('/credits/stats'),

  // Get payment details by session ID
  getPaymentDetails: (sessionId: string) => api.get(`/credits/payment/${sessionId}`)
}

// Application Assignment Management API
export const applicationAssignmentAPI = {
  // Get overview of application assignments
  getOverview: () => api.get('/admin/application-assignments/overview'),

  // Get all tenants with their application assignments
  getTenants: (params?: {
    search?: string;
    hasApps?: boolean;
    appCode?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/admin/application-assignments/tenants', { params }),

  // Get application assignments for a specific tenant
  getTenantAssignments: (tenantId: string) =>
    api.get(`/admin/application-assignments/tenant/${tenantId}`),

  // Get tenant-specific applications with modules and permissions
  getTenantApplications: (tenantId: string) =>
    api.get(`/admin/application-assignments/tenant-apps/${tenantId}`),

  // Assign application to tenant
  assignApplication: (data: {
    tenantId: string;
    appId: string;
    isEnabled?: boolean;
    subscriptionTier?: string;
    enabledModules?: string[];
    customPermissions?: Record<string, string[]>;
    licenseCount?: number;
    maxUsers?: number;
    expiresAt?: string;
  }) => api.post('/admin/application-assignments/assign', data),

  // Update application assignment
  updateAssignment: (assignmentId: string, data: {
    isEnabled?: boolean;
    subscriptionTier?: string;
    enabledModules?: string[];
    licenseCount?: number;
    maxUsers?: number;
    expiresAt?: string;
  }) => api.put(`/admin/application-assignments/${assignmentId}`, data),

  // Remove application assignment
  removeAssignment: (assignmentId: string) =>
    api.delete(`/admin/application-assignments/${assignmentId}`),

  // Bulk assign applications
  bulkAssign: (data: {
    tenantIds: string[];
    appIds: string[];
    defaultConfig?: {
      isEnabled?: boolean;
      subscriptionTier?: string;
      enabledModules?: string[];
      customPermissions?: Record<string, string[]>;
      licenseCount?: number;
      maxUsers?: number;
    };
  }) => api.post('/admin/application-assignments/bulk-assign', data),

  // Get available applications
  getApplications: (params?: {
    includeModules?: boolean;
  }) => api.get('/admin/application-assignments/applications', { params }),

  // Module-level assignment operations
  assignModule: (data: {
    tenantId: string;
    moduleId: string;
  }) => api.post('/admin/application-assignments/assign-module', data),

  updateModulePermissions: (data: {
    tenantId: string;
    moduleId: string;
    permissions: string[];
  }) => api.put('/admin/application-assignments/update-module-permissions', data),

  removeModule: (data: {
    tenantId: string;
    moduleId: string;
  }) => api.delete('/admin/application-assignments/remove-module', { data }),

  getTenantModules: (tenantId: string) =>
    api.get(`/admin/application-assignments/tenant-modules/${tenantId}`)
}

// Operation Cost Management API (Separated by Concern)
export const operationCostAPI = {
  // LEGACY: Get all operation costs (deprecated - use separated APIs)
  getOperationCosts: (params?: {
    search?: string;
    category?: string;
    isGlobal?: boolean;
    isActive?: boolean;
    includeUsage?: boolean;
  }) => api.get('/admin/operation-costs', { params }),

  // NEW: Get global operation costs only
  getGlobalOperationCosts: (params?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    includeUsage?: boolean;
  }) => api.get('/admin/operation-costs/global', { params }),

  // NEW: Get tenant-specific operation costs only
  getTenantOperationCosts: (tenantId: string, params?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    includeUsage?: boolean;
  }) => api.get(`/admin/operation-costs/tenant/${tenantId}`, { params }),

  // Create operation cost
  createOperationCost: (data: {
    operationCode: string;
    operationName?: string;
    creditCost: number;
    unit?: string;
    unitMultiplier?: number;
    category?: string;
    isGlobal?: boolean;
    isActive?: boolean;
    priority?: number;
    tenantId?: string; // Add tenant ID for tenant-specific operations
  }) => api.post('/admin/operation-costs', data),

  // Update operation cost
  updateOperationCost: (configId: string, data: {
    operationCode?: string;
    creditCost?: number;
    unit?: string;
    unitMultiplier?: number;
    isGlobal?: boolean;
    isActive?: boolean;
  }) => api.put(`/admin/operation-costs/${configId}`, data),

  // Delete operation cost
  deleteOperationCost: (configId: string) =>
    api.delete(`/admin/operation-costs/${configId}`),

  // Get analytics
  getAnalytics: () => api.get('/admin/operation-costs/analytics'),

  // Get templates
  getTemplates: () => api.get('/admin/operation-costs/templates'),

  // Apply template
  applyTemplate: (data: {
    templateId: string;
  }) => api.post('/admin/operation-costs/apply-template', data),

  // Export costs
  exportCosts: () => api.get('/admin/operation-costs/export', {
    responseType: 'blob'
  })
}

// Smart Operation Cost API (Auto-selects best endpoint based on context)
export const smartOperationCostAPI = {
  /**
   * Smart fetch operation costs - automatically chooses the best endpoint
   * Use Case: When you need both global and tenant-specific costs with proper hierarchy
   */
  getSmartOperationCosts: async (context: {
    tenantId?: string;
    includeGlobal?: boolean;
    params?: {
      search?: string;
      category?: string;
      isActive?: boolean;
      includeUsage?: boolean;
    }
  }) => {
    const { tenantId, includeGlobal = true, params } = context;

    if (!tenantId) {
      // No tenant context - use global only
      return operationCostAPI.getGlobalOperationCosts(params);
    }

    if (!includeGlobal) {
      // Tenant-only context
      return operationCostAPI.getTenantOperationCosts(tenantId, params);
    }

    // Need both tenant and global - use comprehensive endpoint
    return creditConfigurationAPI.getTenantConfigurations(tenantId);
  },

  /**
   * Get operation cost for specific operation with fallback hierarchy
   * Use Case: When you need the effective cost for an operation (tenant → global → default)
   */
  getEffectiveOperationCost: async (operationCode: string, tenantId?: string) => {
    if (!tenantId) {
      // No tenant - get global cost
      const response = await operationCostAPI.getGlobalOperationCosts({
        search: operationCode
      });
      const operation = response.data.operations.find(op => op.operationCode === operationCode);
      return operation || null;
    }

    // Get tenant configurations (includes hierarchy)
    const response = await creditConfigurationAPI.getTenantConfigurations(tenantId);

    // First try tenant-specific
    let operation = response.data.configurations.operations.find(op => op.operationCode === operationCode);
    if (operation) return operation;

    // Fallback to global
    operation = response.data.globalConfigs.operations.find(op => op.operationCode === operationCode);
    if (operation) return operation;

    return null; // Not found
  }
};

// Credit Configuration Management API
export const creditConfigurationAPI = {
  // Get tenant configurations
  getTenantConfigurations: (tenantId: string) =>
    api.get(`/admin/credit-configurations/${tenantId}`),

  // Update operation configuration for tenant
  updateTenantOperationConfig: (tenantId: string, operationCode: string, data: {
    creditCost?: number;
    unit?: string;
    unitMultiplier?: number;
    freeAllowance?: number;
    freeAllowancePeriod?: string;
    volumeTiers?: Array<{
      minVolume: number;
      maxVolume: number;
      creditCost: number;
      isActive: boolean;
    }>;
    allowOverage?: boolean;
    overageLimit?: number;
    overagePeriod?: string;
    overageCost?: number;
    scope?: string;
    isActive?: boolean;
  }) => api.put(`/admin/credit-configurations/${tenantId}/operation/${operationCode}`, data),

  // Update module configuration for tenant
  updateTenantModuleConfig: (tenantId: string, moduleCode: string, data: {
    defaultCreditCost?: number;
    defaultUnit?: string;
    maxOperationsPerPeriod?: number;
    periodType?: string;
    creditBudget?: number;
    budgetResetPeriod?: string;
    allowOverBudget?: boolean;
    scope?: string;
    isActive?: boolean;
  }) => api.put(`/admin/credit-configurations/${tenantId}/module/${moduleCode}`, data),

  // Update app configuration for tenant
  updateTenantAppConfig: (tenantId: string, appCode: string, data: {
    defaultCreditCost?: number;
    defaultUnit?: string;
    maxOperationsPerPeriod?: number;
    periodType?: string;
    creditBudget?: number;
    budgetResetPeriod?: string;
    allowOverBudget?: boolean;
    scope?: string;
    isActive?: boolean;
  }) => api.put(`/admin/credit-configurations/${tenantId}/app/${appCode}`, data),

  // Reset tenant configuration to global
  resetTenantConfig: (tenantId: string, configType: 'operation' | 'module' | 'app', configCode: string) =>
    api.delete(`/admin/credit-configurations/${tenantId}/${configType}/${configCode}`),

  // Get all tenants for credit configuration
  getTenantsForConfig: () =>
    api.get('/admin/credit-configurations/tenants'),

  // Bulk update tenant configurations
  bulkUpdateTenantConfigs: (data: {
    tenantIds: string[];
    configType: 'operation' | 'module' | 'app';
    configCode: string;
    configData: any;
  }) => api.post('/admin/credit-configurations/bulk-update', data)
}

// Application & Module Credit Configuration API
export const applicationCreditAPI = {
  // Get all application credit configurations
  getApplicationCreditConfigs: () =>
    api.get('/admin/credit-configurations/applications'),

  // Update application credit configuration
  updateApplicationCreditConfig: (appCode: string, data: {
    defaultCreditCost?: number;
    defaultUnit?: string;
    maxOperationsPerPeriod?: number;
    periodType?: string;
    creditBudget?: number;
    budgetResetPeriod?: string;
    allowOverBudget?: boolean;
    scope?: string;
    isActive?: boolean;
  }) => api.put(`/admin/credit-configurations/applications/${appCode}`, data),

  // Update module credit configuration
  updateModuleCreditConfig: (appCode: string, moduleCode: string, data: {
    defaultCreditCost?: number;
    defaultUnit?: string;
    maxOperationsPerPeriod?: number;
    periodType?: string;
    creditBudget?: number;
    budgetResetPeriod?: string;
    allowOverBudget?: boolean;
    scope?: string;
    isActive?: boolean;
  }) => api.put(`/admin/credit-configurations/applications/${appCode}/modules/${moduleCode}`, data),

  // Bulk update application credit configurations
  bulkUpdateApplicationConfigs: (data: {
    appCodes: string[];
    configData: any;
  }) => api.post('/admin/credit-configurations/applications/bulk-update', data),

  // Create tenant-specific operation cost
  createTenantOperationCost: (tenantId: string, data: {
    operationCode: string;
    operationName?: string;
    creditCost: number;
    unit?: string;
    unitMultiplier?: number;
    category?: string;
    freeAllowance?: number;
    freeAllowancePeriod?: string;
    volumeTiers?: Array<{
      minVolume: number;
      maxVolume: number;
      creditCost: number;
      isActive: boolean;
    }>;
    allowOverage?: boolean;
    overageLimit?: number;
    overagePeriod?: string;
    overageCost?: number;
    scope?: string;
    isActive?: boolean;
    priority?: number;
  }) => api.post(`/admin/credit-configurations/tenant/${tenantId}/operations`, data),

  // Initialize credits for a tenant
  initializeTenantCredits: (tenantId: string, initialCredits: number = 1000) =>
    api.post(`/admin/credit-configurations/initialize-credits/${tenantId}`, { initialCredits })
}

// Invitation Management API
export const invitationAPI = {
  // Get all invitations for an organization (admin)
  getAdminInvitations: (orgCode: string) => 
    api.get(`/invitations/admin/${orgCode}`),

  // Create invitation for current tenant
  createInvitation: (data: { email: string; roleName: string }) => 
    api.post('/invitations/create', data),

  // Create test invitation
  createTestInvitation: (data: { orgCode: string; email: string; roleName: string }) => 
    api.post('/invitations/create-test-invitation', data),

  // Resend invitation email
  resendInvitation: (orgCode: string, invitationId: string) => 
    api.post(`/invitations/admin/${orgCode}/${invitationId}/resend`),

  // Cancel invitation
  cancelInvitation: (orgCode: string, invitationId: string) => 
    api.delete(`/invitations/admin/${orgCode}/${invitationId}`),

  // Get invitation details (public)
  getInvitationDetails: (org: string, email: string) => 
    api.get('/invitations/details', { params: { org, email } }),

  // Accept invitation (public)
  acceptInvitation: (data: { org: string; email: string; kindeUserId: string }) =>
    api.post('/invitations/accept', data),

  // Assign organization to user
  assignOrganizationToUser: (userId: string, data: {
    entityId: string;
    roleId?: string;
    membershipType?: string;
    isPrimary?: boolean;
  }) => api.post(`/admin/users/${userId}/organizations`, data),

  // Remove organization from user
  removeOrganizationFromUser: (userId: string, membershipId: string) =>
    api.delete(`/admin/users/${userId}/organizations/${membershipId}`),

  // Update user's organization role
  updateUserOrganizationRole: (userId: string, membershipId: string, data: { roleId?: string | null }) =>
    api.put(`/admin/users/${userId}/organizations/${membershipId}`, data)
}

export default api 