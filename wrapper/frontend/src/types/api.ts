// API-related TypeScript types

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

export interface ApiClientConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  [key: string]: any
}

export interface PaginationParams {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  requiresAuth?: boolean
  cacheTime?: number
  staleTime?: number
}

export interface ApiCacheConfig {
  enabled: boolean
  maxAge: number
  maxSize: number
}

export interface RetryConfig {
  enabled: boolean
  maxAttempts: number
  delay: number
  backoffMultiplier: number
}
