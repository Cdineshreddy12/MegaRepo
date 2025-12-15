import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { authAPI, User } from '@/lib/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User) => void
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      login: (user: User) => {
        set({ 
          user, 
          isAuthenticated: true,
          isLoading: false 
        })
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true })
          const response = await authAPI.getUserInfo()
          
          if (response.data?.user) {
            // Map the backend user data to our User interface
            const userData = response.data.user
            const user: User = {
              id: userData.id,
              email: userData.email,
              firstName: userData.name?.split(' ')[0] || '',
              lastName: userData.name?.split(' ')[1] || '',
              role: userData.organization?.role || 'user',
              tenantId: userData.organization?.id || '',
              lastActiveAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
            
            set({ 
              user, 
              isAuthenticated: true,
              isLoading: false 
            })
          } else {
            set({ 
              user: null, 
              isAuthenticated: false,
              isLoading: false 
            })
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        }
      },

      logout: async () => {
        try {
          await authAPI.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          localStorage.removeItem('authToken')
          set({ 
            user: null, 
            isAuthenticated: false 
          })
          // Redirect to login
          window.location.href = '/login'
        }
      },

      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
) 