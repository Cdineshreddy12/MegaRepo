import { handleApiError } from "./errorHandler";
import { api } from "./index";

export interface Organization {
  _id?: string;
  id?: string; // ObjectId for API calls
  orgCode: string;
  orgName: string;
  parentId?: string;
  hierarchy?: {
    level: number;
    path: string[];
    children: string[];
  };
  status?: string;
  metadata?: any;
}

export interface User {
  employeeCode: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode?: string;
  contactMobile: string;
  role: "super_admin" | "admin" | "user";
  avatarUrl?: string;
  department?: string;
  designation: "national_head" | "zonal_head" | "deal_owner";
  isActive: boolean;
  zone: string[]
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  // New fields for external user sync
  authSource?: "local" | "wrapper" | "kinde";
  orgCode?: string;
  externalId?: string;
  lastSyncedAt?: string;
  roles?: string[];
  permissions?: string[];
  roleDetails?: Array<{
    roleId: string;
    roleName: string;
    priority: number;
    permissions: string[];
  }>;
  // Enhanced tenant and permission fields
  userId?: string; // External user ID from wrapper
  tenantId?: string;
  entities?: Organization[];
  totalCredits?: number;
  primaryOrganizationId?: string;
  isTenantAdmin?: boolean;
  lastLoginAt?: string;
  loginCount?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Tenant {
  tenantId: string;
  tenantName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant?: Tenant;
  redirect?: boolean; // Indicates if this was a redirect authentication
  syncFailureInfo?: {
    hasFailedCollections: boolean;
    failedCollections: Array<{ collection: string; error: string }>;
    message?: string;
  };
}

export const authService = {
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post<AuthResponse>("/auth/login", credentials);
      localStorage.setItem("token", response.data.token);

      // Store enhanced session data if available
      if (response.data.user) {
        const sessionData = {
          user: response.data.user,
          tenant: response.data.tenant,
          permissions: response.data.user.permissions || [],
          entities: response.data.user.entities || [],
          totalCredits: response.data.user.totalCredits || 0,
          isTenantAdmin: response.data.user.isTenantAdmin || false
        };
        localStorage.setItem("userSession", JSON.stringify(sessionData));
      }

      return response.data;
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  },

  // Handle authentication for redirected users
  redirectAuth: async (email?: string, kindeToken?: string | null) => {
    try {
      console.log('🔄 [UPDATED CODE] Initiating redirect authentication with Kinde token support...');
      console.log('🔧 Frontend version: Kinde SDK integration active');

      // Debug: Check all available tokens in localStorage
      const allTokens = {
        'token': localStorage.getItem('token'),
        'crm_token': localStorage.getItem('crm_token'),
        'original_kinde_token': localStorage.getItem('original_kinde_token'),
        'kinde_token': sessionStorage.getItem('kinde_token')
      };

      console.log('🔍 Available tokens in storage:', {
        localStorage_token: {
          exists: !!allTokens.token,
          length: allTokens.token?.length,
          startsWith: allTokens.token?.substring(0, 20),
          algorithm: allTokens.token?.startsWith('eyJhbGciOiJSUzI1Ni') ? 'RS256' : 'HS256'
        },
        localStorage_crm_token: {
          exists: !!allTokens.crm_token,
          length: allTokens.crm_token?.length,
          startsWith: allTokens.crm_token?.substring(0, 20)
        },
        localStorage_original_kinde_token: {
          exists: !!allTokens.original_kinde_token,
          length: allTokens.original_kinde_token?.length,
          startsWith: allTokens.original_kinde_token?.substring(0, 20)
        },
        sessionStorage_kinde_token: {
          exists: !!allTokens.kinde_token,
          length: allTokens.kinde_token?.length,
          startsWith: allTokens.kinde_token?.substring(0, 20)
        }
      });

      // Use the token provided directly from Kinde SDK
      console.log('🔑 Using Kinde token provided directly from SDK:', {
        exists: !!kindeToken,
        length: kindeToken?.length,
        startsWith: kindeToken?.substring(0, 20),
        algorithm: kindeToken?.startsWith('eyJhbGciOiJSUzI1Ni') ? 'RS256' : 'HS256'
      });

      // Validate the token
      if (!kindeToken) {
        throw new Error('No Kinde token provided for redirect authentication');
      }

      if (kindeToken.length === 719 && kindeToken.startsWith('eyJhbGciOiJIUzI1Ni')) {
        console.error('❌ Received CRM HS256 token instead of Kinde RS256 token!');
        throw new Error('CRM token received instead of Kinde token. Please ensure you are using the Kinde SDK token.');
      }

      // Accept RS256 tokens (they can vary in length, just check the algorithm)
      if (kindeToken.startsWith('eyJhbGciOiJSUzI1Ni')) {
        console.log('✅ Using correct Kinde RS256 token', {
          length: kindeToken.length,
          algorithm: 'RS256'
        });
      } else {
        console.warn('⚠️ Token validation inconclusive - unexpected format', {
          length: kindeToken.length,
          startsWith: kindeToken.substring(0, 20)
        });
      }

      const response = await api.post<AuthResponse>("/auth/redirect-auth", {
        access_token: kindeToken,
        email: email
      });

      // Store CRM JWT token separately from Kinde token
      localStorage.setItem("crm_token", response.data.token);

      // Store enhanced session data
      if (response.data.user) {
        const sessionData = {
          user: response.data.user,
          tenant: response.data.tenant,
          permissions: response.data.user.permissions || [],
          entities: response.data.user.entities || [],
          totalCredits: response.data.user.totalCredits || 0,
          isTenantAdmin: response.data.user.isTenantAdmin || false,
          redirect: response.data.redirect || false
        };
        localStorage.setItem("userSession", JSON.stringify(sessionData));
      }

      console.log('✅ Redirect authentication successful');
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Redirect authentication failed:', error);
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    try {
      const response = await api.post<AuthResponse>("/auth/register", data);
      localStorage.setItem("token", response.data.token);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  logout: () => {
    localStorage.removeItem("token"); // Kinde token
    localStorage.removeItem("crm_token"); // CRM JWT token
    // Also remove any other auth-related items if they exist
    localStorage.removeItem("user");
    localStorage.removeItem("userSession");
  },

  getCurrentUser: async () => {
    try {
      // Check if any token exists before making the API call
      // Priority: CRM JWT token > Kinde token
      const crmToken = localStorage.getItem("crm_token");
      const kindeToken = localStorage.getItem("token");
      
      if (!crmToken && !kindeToken) {
        console.log('⚠️ No authentication token found, skipping /api/auth/me call');
        return null;
      }
      
      console.log('🔄 Calling /api/auth/me endpoint...');
      const response = await api.get<User>("/auth/me");
      console.log('✅ /api/auth/me response received:', {
        hasUser: !!response.data,
        hasEntities: !!response.data?.entities,
        entitiesCount: response.data?.entities?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error calling /api/auth/me:', error);
      // Handle deleted user (410) - API interceptor will redirect
      const axiosError = error as { response?: { status: number; data?: any } };
      if (axiosError.response?.status === 410) {
        // User deleted - API interceptor will handle redirect
        // Just clear tokens here
        localStorage.clear();
        sessionStorage.clear();
        return null;
      }
      // Clear tokens if unauthorized
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("crm_token");
      }
      return null;
    }
  },
  
  getUsers: async () => {
    try {
      const response = await api.get<User[]>("/auth/users");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("token");
  }
};