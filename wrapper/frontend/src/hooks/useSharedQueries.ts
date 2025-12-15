import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { api } from '@/lib/api'
import { useLocation } from 'react-router-dom'

// Query keys for consistent caching
export const queryKeys = {
  authStatus: ['authStatus'] as const,
  creditStatus: ['creditStatus'] as const,
  onboardingStatus: ['onboardingStatus'] as const,
  userContext: ['userContext'] as const,
  entityScope: ['entityScope'] as const,
  tenant: ['tenant'] as const,
  tenantApps: (tenantId: string) => ['tenantApps', tenantId] as const,
  applicationAllocations: (entityId?: string) => ['applicationAllocations', entityId].filter(Boolean) as const,
  notifications: ['notifications'] as const,
  unreadCount: ['unreadCount'] as const,
  users: (entityId?: string | null) => ['users', entityId].filter(Boolean) as const,
  roles: (filters?: { search?: string; type?: string }) => ['roles', filters] as const,
} as const

// Shared auth status hook to prevent duplicate API calls
export function useAuthStatus() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.authStatus,
    queryFn: async () => {
      console.log('🔍 useAuthStatus: Fetching auth status...')
      const response = await api.get('/admin/auth-status')
      console.log('✅ useAuthStatus: Auth status received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry auth errors, but retry network errors
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared entity scope hook with caching
export function useEntityScope() {
  const { isAuthenticated, user } = useKindeAuth()
  const location = useLocation()
  
  const isOnboardingPage = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/')

  return useQuery({
    queryKey: queryKeys.entityScope,
    queryFn: async () => {
      console.log('🔍 useEntityScope: Fetching entity scope...')
      const response = await api.get('/admin/entity-scope')
      
      if (response.data.success) {
        console.log('✅ useEntityScope: Entity scope received')
        return response.data.scope
      }
      
      throw new Error('Failed to fetch entity scope')
    },
    enabled: !!isAuthenticated && !!user && !isOnboardingPage,
    staleTime: 5 * 60 * 1000, // 5 minutes - entity scope doesn't change often
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    // Return default scope if disabled
    placeholderData: {
      scope: 'none' as const,
      entityIds: [],
      isUnrestricted: false
    }
  })
}

// Shared tenant hook with caching
export function useTenant(tenantId?: string) {
  const { isAuthenticated, user } = useKindeAuth()
  const location = useLocation()
  const { data: authData } = useAuthStatus()
  
  const isOnboardingPage = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/')
  const effectiveTenantId = tenantId || authData?.authStatus?.tenantId

  return useQuery({
    queryKey: [...queryKeys.tenant, effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required')
      }
      
      console.log('🔍 useTenant: Fetching tenant details...')
      const response = await api.get('/admin/tenant', {
        headers: {
          'X-Tenant-ID': effectiveTenantId,
        },
      })

      if (response.data?.success && response.data?.data) {
        console.log('✅ useTenant: Tenant details received')
        return response.data.data
      }
      
      throw new Error('Failed to fetch tenant details')
    },
    enabled: !!isAuthenticated && !!user && !!effectiveTenantId && !isOnboardingPage,
    staleTime: 5 * 60 * 1000, // 5 minutes - tenant data doesn't change often
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 404) return false
      return failureCount < 2
    },
  })
}

// Shared tenant applications hook with caching
export function useTenantApplications(tenantId?: string) {
  const { isAuthenticated, user } = useKindeAuth()
  const { data: authData } = useAuthStatus()
  
  const effectiveTenantId = tenantId || authData?.authStatus?.tenantId

  return useQuery({
    queryKey: queryKeys.tenantApps(effectiveTenantId || ''),
    queryFn: async () => {
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required')
      }
      
      console.log('🔍 useTenantApplications: Fetching tenant applications...')
      const response = await api.get(`/admin/application-assignments/tenant-apps/${effectiveTenantId}`)
      
      if (response.data?.success) {
        const apps = response.data.data?.applications || response.data.applications || []
        console.log('✅ useTenantApplications: Tenant applications received', apps.length)
        return apps
      }
      
      throw new Error('Failed to fetch tenant applications')
    },
    enabled: !!isAuthenticated && !!user && !!effectiveTenantId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    // Return empty array as placeholder
    placeholderData: []
  })
}

// Shared application allocations hook with caching
export function useApplicationAllocations(entityId?: string) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.applicationAllocations(entityId),
    queryFn: async () => {
      if (entityId) {
        console.log('🔍 useApplicationAllocations: Fetching allocations for entity', entityId)
        const response = await api.get(`/admin/credits/entity/${entityId}/application-allocations`)
        
        if (response.data?.success) {
          const allocations = response.data.data?.allocations || []
          console.log('✅ useApplicationAllocations: Allocations received', allocations.length)
          return allocations
        }
      } else {
        console.log('🔍 useApplicationAllocations: Fetching all allocations')
        const response = await api.get('/admin/credits/application-allocations')
        
        if (response.data?.success) {
          const allocations = response.data.data?.allocations || []
          console.log('✅ useApplicationAllocations: All allocations received', allocations.length)
          return allocations
        }
      }
      
      throw new Error('Failed to fetch application allocations')
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    placeholderData: []
  })
}

// Shared notifications hook with caching and optimized polling
export function useNotifications(options: {
  limit?: number;
  offset?: number;
  includeRead?: boolean;
  includeDismissed?: boolean;
  type?: string;
  priority?: string;
} = {}) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: [...queryKeys.notifications, options],
    queryFn: async () => {
      console.log('🔍 useNotifications: Fetching notifications...')
      const params = new URLSearchParams()

      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
      if (options.includeRead !== undefined) params.append('includeRead', options.includeRead.toString())
      if (options.includeDismissed !== undefined) params.append('includeDismissed', options.includeDismissed.toString())
      if (options.type) params.append('type', options.type)
      if (options.priority) params.append('priority', options.priority)

      const response = await api.get(`/notifications?${params.toString()}`)

      if (response.data.success) {
        console.log('✅ useNotifications: Notifications received', response.data.data?.length || 0)
        return response.data.data || []
      }

      throw new Error('Failed to fetch notifications')
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 30 * 1000, // 30 seconds - notifications change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    placeholderData: []
  })
}

// Shared unread count hook with optimized polling
export function useUnreadCount() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      console.log('🔍 useUnreadCount: Fetching unread count...')
      const response = await api.get('/notifications/unread-count')

      if (response.data.success) {
        const count = response.data.data?.count || 0
        console.log('✅ useUnreadCount: Unread count received', count)
        return count
      }

      return 0
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds (less frequent than notifications)
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 1 // Only retry once for unread count
    },
    placeholderData: 0
  })
}

// Shared credit status hook
export function useCreditStatusQuery(enabled: boolean = true) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: [...queryKeys.creditStatus, user?.id],
    queryFn: async () => {
      console.log('🔍 useCreditStatusQuery: Fetching credit status...')
      const response = await api.get('/credits/current')
      console.log('✅ useCreditStatusQuery: Credit status received')
      return response.data
    },
    enabled: enabled && !!isAuthenticated && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit usage summary hook
export function useCreditUsageSummary(params?: {
  period?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
}) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: ['credit', 'usage-summary', params],
    queryFn: async () => {
      console.log('🔍 useCreditUsageSummary: Fetching usage summary...')
      const response = await api.get('/credits/usage-summary', { params })
      console.log('✅ useCreditUsageSummary: Usage summary received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit statistics hook
export function useCreditStats() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: ['credit', 'stats'],
    queryFn: async () => {
      console.log('🔍 useCreditStats: Fetching credit stats...')
      const response = await api.get('/credits/stats')
      console.log('✅ useCreditStats: Credit stats received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit transaction history hook
export function useCreditTransactionHistory(params?: {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: ['credit', 'transactions', params],
    queryFn: async () => {
      console.log('🔍 useCreditTransactionHistory: Fetching transaction history...')
      const response = await api.get('/credits/transactions', { params })
      console.log('✅ useCreditTransactionHistory: Transaction history received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared users hook with caching
export function useUsers(entityId?: string | null) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.users(entityId),
    queryFn: async () => {
      console.log('🔍 useUsers: Fetching users...')
      const params = entityId ? { entityId } : {}
      const response = await api.get('/tenants/current/users', { params })
      
      if (response.data.success) {
        const users = response.data.data || []
        console.log('✅ useUsers: Users received', users.length)
        return users
      }
      
      throw new Error('Failed to fetch users')
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    placeholderData: []
  })
}

// Shared roles hook with caching
export function useRoles(filters?: { search?: string; type?: 'all' | 'custom' | 'system' }) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.roles(filters),
    queryFn: async () => {
      console.log('🔍 useRoles: Fetching roles...')
      
      // Try the new all roles endpoint first, fallback to paginated endpoint
      try {
        const response = await api.get('/admin/roles/all')
        
        if (response.data.success) {
          let rolesData = response.data.data || []
          
          // Apply filters client-side if needed
          if (filters?.search) {
            const searchLower = filters.search.toLowerCase()
            rolesData = rolesData.filter((role: any) => 
              role.roleName?.toLowerCase().includes(searchLower) ||
              role.description?.toLowerCase().includes(searchLower)
            )
          }
          
          if (filters?.type === 'system') {
            rolesData = rolesData.filter((role: any) => role.isSystemRole === true)
          } else if (filters?.type === 'custom') {
            rolesData = rolesData.filter((role: any) => role.isSystemRole === false)
          }
          
          console.log('✅ useRoles: Roles received from /admin/roles/all', rolesData.length)
          return rolesData
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to fetch from /admin/roles/all, trying fallback:', error.message)
      }
      
      // Fallback to paginated endpoint
      const response = await api.get('/permissions/roles', {
        params: {
          search: filters?.search,
          type: filters?.type !== 'all' ? filters?.type : undefined,
          page: 1,
          limit: 100 // Max allowed by API
        }
      })
      
      if (response.data.success) {
        const rolesData = response.data.data?.data || response.data.data || []
        console.log('✅ useRoles: Roles received from fallback endpoint', rolesData.length)
        return rolesData
      }
      
      throw new Error('Failed to fetch roles')
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - roles don't change often
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
    placeholderData: []
  })
}

// Shared onboarding status hook
export function useOnboardingStatus() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.onboardingStatus,
    queryFn: async () => {
      console.log('🔍 useOnboardingStatus: Fetching onboarding status...')
      
      // Build query params with user info as fallback for token validation failures
      const params = new URLSearchParams()
      if (user?.id) {
        params.append('kindeUserId', user.id)
      }
      if (user?.email) {
        params.append('email', user.email)
      }
      
      const queryString = params.toString()
      const url = `/onboarding/status${queryString ? `?${queryString}` : ''}`
      
      const response = await api.get(url)
      console.log('✅ useOnboardingStatus: Onboarding status received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Hook to invalidate all cached queries (useful for manual refresh)
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateAuthStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.authStatus }),
    invalidateCreditStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.creditStatus }),
    invalidateOnboardingStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus }),
    invalidateEntityScope: () => queryClient.invalidateQueries({ queryKey: queryKeys.entityScope }),
    invalidateTenant: (tenantId?: string) => queryClient.invalidateQueries({ queryKey: [...queryKeys.tenant, tenantId] }),
    invalidateTenantApps: (tenantId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.tenantApps(tenantId) }),
    invalidateApplicationAllocations: (entityId?: string) => queryClient.invalidateQueries({ queryKey: queryKeys.applicationAllocations(entityId) }),
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    invalidateUnreadCount: () => queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }),
    invalidateUsers: (entityId?: string | null) => queryClient.invalidateQueries({ queryKey: queryKeys.users(entityId) }),
    invalidateRoles: (filters?: { search?: string; type?: string }) => queryClient.invalidateQueries({ queryKey: queryKeys.roles(filters) }),
    invalidateAll: () => queryClient.invalidateQueries(),
    prefetchAuthStatus: () => queryClient.prefetchQuery({
      queryKey: queryKeys.authStatus,
      queryFn: async () => {
        const response = await api.get('/admin/auth-status')
        return response.data
      },
      staleTime: 2 * 60 * 1000,
    }),
  }
}

// Hook for debounced API calls
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout>()

  return React.useCallback(
    ((...args) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      const newTimer = setTimeout(() => {
        callback(...args)
      }, delay)

      setDebounceTimer(newTimer)
    }) as T,
    [callback, delay, debounceTimer]
  )
}
