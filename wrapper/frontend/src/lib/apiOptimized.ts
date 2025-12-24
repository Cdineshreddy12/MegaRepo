// OPTIMIZED API - Performance improvements for onboarding lag issues

import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

// Point directly to backend since all routes are registered under /api/*
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Store for Kinde token getter function
let kindeTokenGetter: (() => Promise<string | null>) | null = null;

// CACHE for token to avoid repeated expensive searches
let cachedToken: string | null = null;
let tokenCacheTime: number = 0;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to set the Kinde token getter (called from components that have access to useKindeAuth)
export const setKindeTokenGetter = (getter: () => Promise<string | null>) => {
  kindeTokenGetter = getter;
};

// Enhanced JWT token validation - simplified
const isValidJWT = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.length < 20) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    return header && typeof header === 'object' && header.alg;
  } catch (e) {
    return false;
  }
};

// OPTIMIZED: Simplified token retrieval with caching
const getKindeToken = async (): Promise<string | null> => {
  // Check cache first
  const now = Date.now();
  if (cachedToken && (now - tokenCacheTime) < TOKEN_CACHE_DURATION) {
    return cachedToken;
  }

  try {
    // Method 1: Try Kinde SDK if available (fastest)
    if (kindeTokenGetter) {
      try {
        const token = await kindeTokenGetter();
        if (token && isValidJWT(token)) {
          cachedToken = token;
          tokenCacheTime = now;
          return token;
        }
      } catch (error) {
        // Continue to fallback methods
      }
    }

    // Method 2: Check backup token (fast localStorage check)
    const backupToken = localStorage.getItem('kinde_backup_token');
    if (backupToken && isValidJWT(backupToken)) {
      cachedToken = backupToken;
      tokenCacheTime = now;
      return backupToken;
    }

    // Method 3: Quick search for common token keys (limited to avoid performance issues)
    const commonKeys = ['kinde.access_token', 'access_token', 'id_token'];
    for (const key of commonKeys) {
      const token = localStorage.getItem(key);
      if (token && isValidJWT(token)) {
        cachedToken = token;
        tokenCacheTime = now;
        return token;
      }
    }

    // If no token found, clear cache
    cachedToken = null;
    tokenCacheTime = 0;
    return null;

  } catch (error) {
    console.error('Error getting authentication token:', error);
    cachedToken = null;
    tokenCacheTime = 0;
    return null;
  }
};

// Create axios instance
export const apiOptimized = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// OPTIMIZED: Request interceptor - simplified logging
apiOptimized.interceptors.request.use(async (config) => {
  const authToken = await getKindeToken();

  if (authToken && authToken.trim() !== '' && authToken.length > 10) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers['Authorization'] = `Bearer ${authToken}`;
  } else {
    if (config.headers?.Authorization === 'Bearer' || config.headers?.Authorization === '') {
      delete config.headers.Authorization;
    }
  }

  return config
}, (error) => {
  console.error('API Request Error:', error);
  return Promise.reject(error);
})

// Response interceptor - simplified
apiOptimized.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log('Authentication required')
      localStorage.removeItem('kinde_token')
      localStorage.removeItem('authToken')
      // Clear our cache too
      cachedToken = null;
      tokenCacheTime = 0;
    }

    if (error.response?.status && error.response.status >= 500) {
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

// Onboarding API - optimized for performance
export const onboardingAPIOptimized = {
  checkSubdomain: async (subdomain: string) => {
    return await apiOptimized.get(`/onboarding/check-subdomain?subdomain=${subdomain}`)
  },

  checkStatus: async () => {
    return await apiOptimized.get('/onboarding/status')
  },

  markUserAsOnboarded: async (tenantId: string) => {
    return await apiOptimized.post('/onboarding/mark-onboarded', { tenantId })
  },

  getUserOrganization: () => apiOptimized.get('/onboarding/user-organization'),

  getDataByEmail: (email: string, kindeUserId?: string) =>
    apiOptimized.post('/onboarding/get-data', { email, kindeUserId }),

  markComplete: (organizationId: string) =>
    apiOptimized.post('/onboarding/mark-complete', { organizationId }),

  updateStep: (step: string, data?: any, email?: string, formData?: any) =>
    apiOptimized.post('/onboarding/update-step', { step, data, email, formData }),

  reset: (targetUserId?: string) =>
    apiOptimized.post('/onboarding/reset', targetUserId ? { targetUserId } : {}),

  verifyPAN: async (pan: string, name?: string) => {
    return await apiOptimized.post('/onboarding/verify-pan', { pan, name })
  },

  verifyGSTIN: async (gstin: string, businessName?: string) => {
    return await apiOptimized.post('/onboarding/verify-gstin', { gstin, businessName })
  },
}

export default apiOptimized