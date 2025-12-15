import { create } from 'zustand'
import { Tenant, User } from '@/lib/api'

interface TenantState {
  tenant: Tenant | null
  users: User[]
  loading: boolean
  error: string | null
  
  // Actions
  setTenant: (tenant: Tenant) => void
  setUsers: (users: User[]) => void
  addUser: (user: User) => void
  removeUser: (userId: string) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  users: [],
  loading: false,
  error: null,

  setTenant: (tenant) => set({ tenant }),
  
  setUsers: (users) => set({ users }),
  
  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  })),
  
  removeUser: (userId) => set((state) => ({
    users: state.users.filter(user => user.id !== userId)
  })),
  
  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    )
  })),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
})) 