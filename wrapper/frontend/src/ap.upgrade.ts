import { toast } from "sonner"

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: any

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Enhanced API client with retry logic and monitoring
export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private retryAttempts: number
  private retryDelay: number

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api'
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
    this.retryAttempts = 3
    this.retryDelay = 1000
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await requestFn()
    } catch (error) {
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        await this.delay(this.retryDelay * attempt)
        return this.retryRequest(requestFn, attempt + 1)
      }
      throw error
    }
  }

  private shouldRetry(error: any): boolean {
    if (error instanceof ApiError) {
      return error.status >= 500 || error.status === 429
    }
    return true // Retry network errors
  }

  async fetch<T = unknown>(
    path: string, 
    opts: RequestInit = {}
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`
    
    const config: RequestInit = {
      headers: {
        ...this.defaultHeaders,
        ...opts.headers,
      },
      ...opts,
    }

    return this.retryRequest(async () => {
      const startTime = performance.now()
      
      try {
        const res = await fetch(url, config)
        const duration = performance.now() - startTime
        
        // Log API call for monitoring
        console.log(`API Call: ${opts.method || 'GET'} ${path} - ${res.status} (${duration.toFixed(2)}ms)`)
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new ApiError(
            errorData.message || res.statusText,
            res.status,
            errorData.code,
            errorData
          )
        }
        
        return res.json()
      } catch (error) {
        if (error instanceof ApiError) {
          // Show user-friendly error messages
          this.handleApiError(error)
          throw error
        }
        
        // Network or other errors
        const networkError = new ApiError(
          'Network error occurred. Please check your connection.',
          0,
          'NETWORK_ERROR'
        )
        this.handleApiError(networkError)
        throw networkError
      }
    })
  }

  private handleApiError(error: ApiError): void {
    // Log error for monitoring
    console.error('API Error:', error)
    
    // Show user-friendly toast messages
    if (error.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.status === 401) {
      toast.error('Please log in to continue.')
    } else if (error.status === 403) {
      toast.error('You do not have permission to perform this action.')
    } else if (error.status === 404) {
      toast.error('The requested resource was not found.')
    } else if (error.status === 429) {
      toast.error('Too many requests. Please try again later.')
    } else if (error.code === 'NETWORK_ERROR') {
      toast.error('Network error. Please check your connection.')
    } else {
      toast.error(error.message || 'An unexpected error occurred.')
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Legacy function for backward compatibility
export async function apiFetch<T = unknown>(
  path: string, 
  opts: RequestInit = {}
): Promise<T> {
  return apiClient.fetch<T>(path, opts)
}

// Query key factory for consistent cache keys
export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  posts: ['posts'] as const,
  post: (id: string) => ['posts', id] as const,
  // Add more query keys as needed
  auth: ['auth'] as const,
  profile: ['profile'] as const,
} as const

// Token getter for Kinde authentication
let kindeTokenGetter: (() => Promise<string | null>) | null = null

export function setKindeTokenGetter(getter: () => Promise<string | null>): void {
  kindeTokenGetter = getter
}

export function getKindeToken(): Promise<string | null> {
  if (!kindeTokenGetter) {
    return Promise.resolve(null)
  }
  return kindeTokenGetter()
}

// Default export for backward compatibility
export default apiClient

// Legacy API exports for backward compatibility
export const api = apiClient

// User type for backward compatibility
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

// Auth API for backward compatibility
export const authAPI = {
  login: (credentials: any) => apiClient.fetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => apiClient.fetch('/auth/logout', { method: 'POST' }),
  getProfile: () => apiClient.fetch('/auth/profile'),
}

// Tenant API for backward compatibility
export const tenantAPI = {
  getUsers: () => apiClient.fetch('/tenants/users'),
  createUser: (userData: any) => apiClient.fetch('/tenants/users', { method: 'POST', body: JSON.stringify(userData) }),
}

// Invitation API for backward compatibility
export const invitationAPI = {
  sendInvitation: (invitationData: any) => apiClient.fetch('/invitations', { method: 'POST', body: JSON.stringify(invitationData) }),
  getInvitations: () => apiClient.fetch('/invitations'),
}

// Permissions API for backward compatibility
export const permissionsAPI = {
  getUserPermissions: (userId: string) => apiClient.fetch(`/permissions/users/${userId}`),
  updatePermissions: (userId: string, permissions: any) => apiClient.fetch(`/permissions/users/${userId}`, { method: 'PUT', body: JSON.stringify(permissions) }),
}

// Usage API for backward compatibility
export const usageAPI = {
  getCurrent: () => apiClient.fetch('/usage/current'),
  getMetrics: (period: string) => apiClient.fetch(`/usage/metrics?period=${period}`),
  getBreakdown: () => apiClient.fetch('/usage/breakdown'),
  getAlerts: () => apiClient.fetch('/usage/alerts'),
  getLogs: () => apiClient.fetch('/usage/logs'),
}

export const subscriptionAPI = {
  getCurrentBalance: () => apiClient.fetch('/credits/current'),
}

export const creditAPI = {
  getCurrentBalance: () => apiClient.fetch('/credits/current'),
}

export const onboardingAPI = {
  checkStatus: () => apiClient.fetch('/onboarding/status'),
}

//define all these apis operationCostAPI, creditConfigurationAPI, applicationAssignmentAPI
export const operationCostAPI = {
  getOperationCosts: () => apiClient.fetch('/operation-costs'),
  getOperationCost: (id: string) => apiClient.fetch(`/operation-costs/${id}`),
  updateOperationCost: (id: string, cost: any) => apiClient.fetch(`/operation-costs/${id}`, { method: 'PUT', body: JSON.stringify(cost) }),
}

export const creditConfigurationAPI = {
  getCreditConfigurations: () => apiClient.fetch('/credit-configurations'),
  getCreditConfiguration: (id: string) => apiClient.fetch(`/credit-configurations/${id}`),
  updateCreditConfiguration: (id: string, configuration: any) => apiClient.fetch(`/credit-configurations/${id}`, { method: 'PUT', body: JSON.stringify(configuration) }),
}

export const applicationAssignmentAPI = {
  getApplicationAssignments: () => apiClient.fetch('/application-assignments'),
  getApplicationAssignment: (id: string) => apiClient.fetch(`/application-assignments/${id}`),
  updateApplicationAssignment: (id: string, assignment: any) => apiClient.fetch(`/application-assignments/${id}`, { method: 'PUT', body: JSON.stringify(assignment) }),
}

export const adminAPI = {
  getUsers: () => apiClient.fetch('/admin/users'),
  getUser: (id: string) => apiClient.fetch(`/admin/users/${id}`),
  getUserPermissions: (userId: string) => apiClient.fetch(`/admin/users/${userId}/permissions`),
  updateUserPermissions: (userId: string, permissions: any) => apiClient.fetch(`/admin/users/${userId}/permissions`, { method: 'PUT', body: JSON.stringify(permissions) }),
}

export const adminCreditConfigurationAPI = {
  getCreditConfigurations: () => apiClient.fetch('/admin/credit-configurations'),
  getCreditConfiguration: (id: string) => apiClient.fetch(`/admin/credit-configurations/${id}`),
  updateCreditConfiguration: (id: string, configuration: any) => apiClient.fetch(`/admin/credit-configurations/${id}`, { method: 'PUT', body: JSON.stringify(configuration) }),
}

export const adminApplicationAssignmentAPI = {
  getApplicationAssignments: () => apiClient.fetch('/admin/application-assignments'),
  getApplicationAssignment: (id: string) => apiClient.fetch(`/admin/application-assignments/${id}`),
  updateApplicationAssignment: (id: string, assignment: any) => apiClient.fetch(`/admin/application-assignments/${id}`, { method: 'PUT', body: JSON.stringify(assignment) }),
}

export const adminOperationCostAPI = {
  getOperationCosts: () => apiClient.fetch('/admin/operation-costs'),
  getOperationCost: (id: string) => apiClient.fetch(`/admin/operation-costs/${id}`),
  updateOperationCost: (id: string, cost: any) => apiClient.fetch(`/admin/operation-costs/${id}`, { method: 'PUT', body: JSON.stringify(cost) }),
}

// Subscription types for backward compatibility
export interface Subscription {
  id: string
  plan: string
  status: string
  currentPeriodEnd: string
}

export interface Plan {
  id: string
  name: string
  price: number
  features: string[]
}

export interface UsageMetrics {
  totalRequests: number
  totalCost: number
  period: string
}

// Tenant type for backward compatibility
export interface Tenant {
  id: string
  name: string
  domain: string
  users: User[]
}

// Unified User type for backward compatibility
export interface UnifiedUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  lastLogin: string
}