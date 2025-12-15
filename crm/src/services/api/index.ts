import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

// Prefer explicit env; if it points to localhost in prod, fall back to current origin
// Updated for subdomain structure (crm.zopkit.com) - no /crm path prefix needed
const envApiBase = import.meta.env.VITE_API_BASE_URL;
const runtimeApiBase = (() => {
  if (typeof window === 'undefined') return '/api';
  const origin = window.location.origin;
  return `${origin}/api`;
})();
export const API_BASE_URL =
  envApiBase && !envApiBase.includes('localhost') && !envApiBase.includes('127.0.0.1')
    ? envApiBase
    : runtimeApiBase;

// Debug log to verify which base URL is active (safe, no secrets)
if (typeof window !== 'undefined') {
  console.log('🔧 API Base URL resolved:', {
    envApiBase,
    runtimeApiBase,
    API_BASE_URL,
    locationOrigin: window.location.origin
  });
}

// Helper function to get the correct token for API calls
export const getApiToken = (): string | null => {
  // Priority: CRM JWT > Kinde token (localStorage) > Kinde token (sessionStorage) > no token
  const crmToken = localStorage.getItem('crm_token'); // CRM JWT token
  const kindeToken = localStorage.getItem('token'); // Kinde token
  const sessionToken = sessionStorage.getItem('kinde_token');

  if (crmToken) {
    return crmToken;
  } else if (kindeToken) {
    return kindeToken;
  } else if (sessionToken) {
    return sessionToken;
  }

  return null;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get current entityId (imported dynamically to avoid circular dependency)
const getCurrentEntityId = (): string | null => {
  try {
    const userSessionData = localStorage.getItem('userSession');

    if (userSessionData) {
      const session = JSON.parse(userSessionData);

      if (session.currentEntityId) {
        return session.currentEntityId;
      } else {
        // Fallback: Try to get entityId from entities array
        if (session.entities && session.entities.length > 0) {
          // Try to find entity by id (ObjectId) first
          const entityWithId = session.entities.find((e: any) => e.id);
          if (entityWithId?.id) {
            return entityWithId.id;
          }

          // Fallback to orgCode if id is not available
          const firstEntity = session.entities[0];
          if (firstEntity?.orgCode) {
            return firstEntity.orgCode;
          }
        }

        // Last resort: Check org-store
        try {
          const orgStoreData = localStorage.getItem('org-store');
          if (orgStoreData) {
            const orgStore = JSON.parse(orgStoreData);
            if (orgStore.state?.selectedOrg) {
              return orgStore.state.selectedOrg;
            }
          }
        } catch (orgStoreError) {
          // Silent error - org-store issues are not critical
        }
      }
    }
  } catch (error) {
    console.error('❌ Error getting currentEntityId:', error);
  }
  return null;
};

// Add request interceptor to handle auth tokens and multipart form data
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Ensure headers object exists
    const cfg: InternalAxiosRequestConfig = {
      ...config,
      headers: config.headers || {},
    };

    // Handle multipart form data (remove Content-Type so boundary is set automatically)
    if (cfg.headers['Content-Type'] === 'multipart/form-data') {
      delete cfg.headers['Content-Type'];
    }

    // Ensure fresh data for user listing, contacts, leads, and admin reports to avoid 304/ETag cache issues
    if (cfg.method === 'get' && cfg.url && (cfg.url.includes('/admin/users') || cfg.url.includes('/contacts') || cfg.url.includes('/leads') || cfg.url.includes('/admin/reports'))) {
      cfg.params = {
        ...(cfg.params || {}),
        ts: Date.now(),
      };
      cfg.headers['Cache-Control'] = 'no-cache';
        // Some proxies respect Pragma for legacy caches
        // @ts-ignore
      cfg.headers['Pragma'] = 'no-cache';
    }

    // Add entityId to all requests if available (for proper filtering)
    if (cfg.method === 'get' || cfg.method === 'post' || cfg.method === 'put' || cfg.method === 'delete') {
      const currentEntityId = getCurrentEntityId();
      console.log('🔗 Request details:', {
        method: cfg.method,
        url: cfg.url,
        currentEntityId: currentEntityId,
        params: cfg.params
      });

      // Only add entityId if not already present in params (to avoid overriding explicit entityId)
      if (currentEntityId && !cfg.params?.entityId) {
        cfg.params = {
          ...(cfg.params || {}),
          entityId: currentEntityId,
        };
        // EntityId added to request (silent operation)
      }
    }

    // Add authentication token - prioritize CRM JWT token over Kinde token
    let token = null;
    const crmToken = localStorage.getItem('crm_token'); // CRM JWT token
    const kindeToken = localStorage.getItem('token'); // Kinde token
    const sessionToken = sessionStorage.getItem('kinde_token');

    // Skip Authorization header for redirect-auth endpoint (token sent in body)
    const isRedirectAuth = cfg.url === '/auth/redirect-auth';

    if (!isRedirectAuth) {
      // Priority: CRM JWT > Kinde token (localStorage) > Kinde token (sessionStorage) > no token
      if (crmToken) {
        token = crmToken;
      } else if (kindeToken) {
        token = kindeToken;
      } else if (sessionToken) {
        token = sessionToken;
      } else {
        
        // Check if this is a protected endpoint (not public/auth endpoints)
        const isPublicEndpoint = cfg.url?.includes('/auth/login') || 
                                 cfg.url?.includes('/auth/register') ||
                                 cfg.url?.includes('/auth/redirect-auth');
        
        // If it's a protected endpoint and no token, we'll let it fail and handle in response interceptor
        // This allows the backend to return 401 which will trigger redirect to unauthorized
        if (!isPublicEndpoint && !token) {
          console.log('🚫 Protected endpoint called without token - request will fail and redirect to unauthorized');
        }
      }

      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      console.log('🔄 Skipping Authorization header for redirect-auth (token sent in body)');
    }

    // Add debug logging for token usage (only when token exists)
    if (token) {
      console.log('🔍 API Request Details:', {
        url: cfg.url,
        fullUrl: `${API_BASE_URL}${cfg.url}`,
        tokenType: isRedirectAuth ? 'body' : 'header',
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`,
        kindeTokenExists: !!kindeToken,
        sessionTokenExists: !!sessionToken,
        tokenSet: !!token
      });
    } else if (!isRedirectAuth) {
      console.log('⚠️ No authentication token available for API call to:', cfg.url, {
        kindeToken: !!kindeToken,
        sessionToken: !!sessionToken,
        token: !!token
      });
    }

    return cfg;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors and credit deductions (temporarily disabled)
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data && typeof response.data === 'object') {
      const data = response.data as any;

      // Check for creditDeduction in response (could be nested in different structures)
      let creditDeduction = data.creditDeduction;

      // Also check nested structures (e.g., response.data.opportunity.creditDeduction)
      if (!creditDeduction && data.data && typeof data.data === 'object') {
        creditDeduction = data.data.creditDeduction;
      }
      if (!creditDeduction && data.opportunity && typeof data.opportunity === 'object') {
        creditDeduction = data.opportunity.creditDeduction;
      }

      if (creditDeduction && typeof creditDeduction === 'object') {
        const requestUrl = response.config?.url || '';
        const requestMethod = response.config?.method?.toUpperCase() || '';

        console.log('🎯 API Interceptor detected creditDeduction in response:', {
          url: requestUrl,
          method: requestMethod,
          creditDeduction,
          fullData: JSON.stringify(data).substring(0, 200) + '...'
        });

        let operationCode = creditDeduction.operationCode;
        let resourceType = 'unknown';
        
        // Infer operation code from URL if not provided
        if (!operationCode) {
          if (requestUrl.includes('/opportunities')) {
            operationCode = requestMethod === 'POST' ? 'crm.opportunities.create' : 'crm.opportunities.update';
            resourceType = 'opportunity';
          } else if (requestUrl.includes('/sales-orders')) {
            operationCode = requestMethod === 'POST' ? 'crm.sales-orders.create' : 'crm.sales-orders.update';
            resourceType = 'sales-order';
          } else if (requestUrl.includes('/invoices')) {
            operationCode = requestMethod === 'POST' ? 'crm.invoices.create' : 'crm.invoices.update';
            resourceType = 'invoice';
          } else if (requestUrl.includes('/accounts')) {
            operationCode = requestMethod === 'POST' ? 'crm.accounts.create' : 'crm.accounts.update';
            resourceType = 'account';
          } else if (requestUrl.includes('/contacts')) {
            operationCode = requestMethod === 'POST' ? 'crm.contacts.create' : 'crm.contacts.update';
            resourceType = 'contact';
          } else if (requestUrl.includes('/leads')) {
            operationCode = requestMethod === 'POST' ? 'crm.leads.create' : 'crm.leads.update';
            resourceType = 'lead';
          } else if (requestUrl.includes('/quotations')) {
            operationCode = requestMethod === 'POST' ? 'crm.quotations.create' : requestMethod === 'DELETE' ? 'crm.quotations.delete' : 'crm.quotations.update';
            resourceType = 'quotation';
          } else if (requestUrl.includes('/tasks')) {
            operationCode = requestMethod === 'POST' ? 'crm.tasks.create' : 'crm.tasks.update';
            resourceType = 'task';
          } else if (requestUrl.includes('/tickets')) {
            operationCode = requestMethod === 'POST' ? 'crm.tickets.create' : 'crm.tickets.update';
            resourceType = 'ticket';
          } else if (requestUrl.includes('/product-orders')) {
            operationCode = requestMethod === 'POST' ? 'crm.product-orders.create' : 'crm.product-orders.update';
            resourceType = 'product-order';
          }
        }
        
        // Extract resource ID
        const resourceId = data._id || data.id || data.data?._id || data.data?.id || data.opportunity?._id || data.opportunity?.id;
        
        // Emit credit deduction event
        const event = new CustomEvent('creditDeducted', {
          detail: {
            operationCode: operationCode || creditDeduction.operationCode || 'unknown',
            creditsDeducted: creditDeduction.creditsDeducted || 0,
            availableCredits: creditDeduction.availableCredits !== undefined ? creditDeduction.availableCredits : undefined,
            resourceType: resourceType,
            resourceId: resourceId,
          },
          bubbles: true,
        });
        window.dispatchEvent(event);
        console.log('💰 Credit deduction event auto-emitted from API response:', {
          operationCode,
          creditsDeducted: creditDeduction.creditsDeducted,
          availableCredits: creditDeduction.availableCredits,
          resourceType,
          resourceId,
        });
      }
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Handle deleted user (410 Gone) - user account has been removed
    if (error.response?.status === 410) {
      const errorData = error.response?.data as any;
      const isUserDeleted = errorData?.code === 'USER_DELETED' || 
                          errorData?.message?.toLowerCase().includes('removed') ||
                          errorData?.message?.toLowerCase().includes('deleted');
      
      if (isUserDeleted) {
        console.log('🚨 User account has been deleted:', error.config?.url);
        
        // Clear all authentication data
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to user deleted page (updated for subdomain structure)
        window.location.href = `/user-deleted`;
        
        // Return early to prevent further error handling
        return Promise.reject(error);
      }
    }

    // Handle unauthorized access (401) - redirect to unauthorized page if no token
    if (error.response?.status === 401) {
      console.log('🚨 API 401 Unauthorized error:', error.config?.url);

      // Check if there's any token available
      const crmToken = localStorage.getItem('crm_token');
      const kindeToken = localStorage.getItem('token');
      const sessionToken = sessionStorage.getItem('kinde_token');
      const hasToken = !!(crmToken || kindeToken || sessionToken);

      // Check if this is an authentication/permission endpoint
      const isAuthEndpoint = error.config?.url?.includes('/auth/') ||
                            error.config?.url?.includes('/permission') ||
                            error.config?.url?.includes('/user-context');

      const loginRedirect = `/callback`; // Updated for subdomain structure

      if (!hasToken) {
        // No token available - start login instead of unauthorized
        console.log('🚫 No authentication token found - starting login');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = loginRedirect;
        return Promise.reject(error);
      }

      if (isAuthEndpoint) {
        console.log('🔄 Auth endpoint failed - clearing tokens and restarting login');
        // Clear tokens and restart login
        localStorage.removeItem('token');
        localStorage.removeItem('crm_token');
        sessionStorage.removeItem('kinde_token');
        window.location.href = loginRedirect;
      } else {
        console.log('ℹ️ Regular API 401 with token - token may be invalid, restarting login');
        // Token exists but is invalid - restart login
        localStorage.removeItem('token');
        localStorage.removeItem('crm_token');
        sessionStorage.removeItem('kinde_token');
        window.location.href = loginRedirect;
      }
    }

    // Handle forbidden access (403) - permission denied
    if (error.response?.status === 403) {
      console.log('🚫 API 403 Forbidden error:', error.config?.url);

      // Extract error message from response
      const errorData = error.response?.data as any;
      const baseMessage = errorData?.message || errorData?.error || 'Access denied. You do not have permission to perform this action.';

      // Extract operation code from required permissions
      const requiredPermissions = errorData?.required;
      let operationCode = '';
      if (Array.isArray(requiredPermissions) && requiredPermissions.length > 0) {
        operationCode = requiredPermissions[0]; // Take the first permission as the operation code
      } else if (typeof requiredPermissions === 'string') {
        operationCode = requiredPermissions;
      }

      // Build enhanced error message with operation code
      const errorMessage = operationCode
        ? `${baseMessage} (Operation: ${operationCode})`
        : baseMessage;

      // Show user-friendly toast notification
      import('@/hooks/useToast').then(({ toast }) => {
        toast({
          title: "Access Denied",
          description: errorMessage,
          variant: "destructive",
        });
      }).catch(err => {
        console.error('Failed to load toast:', err);
        // Fallback: use browser alert if toast fails
        alert(`Access Denied: ${errorMessage}`);
      });

      console.log('🚫 Permission error displayed to user:', errorMessage);
    }

    // Handle payment required (402) - insufficient credits
    if (error.response?.status === 402) {
      console.log('💰 API 402 Payment Required error:', error.config?.url);

      const errorData = error.response?.data as any;
      const errorMessage = errorData?.message || 'Insufficient credits to perform this action.';

      // Show payment required notification
      import('@/hooks/useToast').then(({ toast }) => {
        toast({
          title: "Payment Required",
          description: errorMessage,
          variant: "destructive",
        });
      }).catch(err => {
        console.error('Failed to load toast:', err);
        alert(`Payment Required: ${errorMessage}`);
      });

      console.log('💰 Payment error displayed to user:', errorMessage);
    }

    return Promise.reject(error);
  }
);

// Export common types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// Helper function to handle API errors
export function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as ErrorResponse | undefined;
    if (response?.message) {
      return new Error(response.message);
    }
    return new Error(error.message || 'An unknown error occurred');
  }
  return error instanceof Error ? error : new Error('An unknown error occurred');
}

// Helper function for creating full URLs (useful for file downloads, etc.)
export function getFullApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// Export getCurrentEntityId for use in components
export { getCurrentEntityId };