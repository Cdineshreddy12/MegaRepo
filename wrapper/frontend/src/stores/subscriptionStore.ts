import { create } from 'zustand'
import { Subscription, Plan, UsageMetrics } from '@/lib/api'

interface SubscriptionState {
  subscription: Subscription | null
  plans: Plan[]
  usage: UsageMetrics | null
  billingHistory: any[]
  loading: boolean
  error: string | null
  
  // Actions
  setSubscription: (subscription: Subscription) => void
  setPlans: (plans: Plan[]) => void
  setUsage: (usage: UsageMetrics) => void
  setBillingHistory: (history: any[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscription: null,
  plans: [],
  usage: null,
  billingHistory: [],
  loading: false,
  error: null,

  setSubscription: (subscription) => set({ subscription }),
  setPlans: (plans) => set({ plans }),
  setUsage: (usage) => set({ usage }),
  setBillingHistory: (history) => set({ billingHistory: history }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
})) 