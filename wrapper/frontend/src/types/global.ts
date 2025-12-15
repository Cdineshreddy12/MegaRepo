// Global TypeScript types

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Organization {
  id: string
  name: string
  code: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface Application {
  id: string
  name: string
  description?: string
  url?: string
  icon?: string
  createdAt?: string
  updatedAt?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
  success: boolean
}

export interface Theme {
  mode: 'light' | 'dark' | 'system'
}

export interface UIState {
  sidebarOpen: boolean
  theme: Theme['mode']
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  status: Status
  error: string | null
}
