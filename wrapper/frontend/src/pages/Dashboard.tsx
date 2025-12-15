import React, { useCallback } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Clock,
  AlertTriangle,
  Crown,
  Settings,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import GreetingCard from '@/components/common/GreetingCard'
import CacheRefreshButton from '@/components/common/RefreshButton'
import { IconButton } from '@/components/common/LoadingButton'
import { NotificationManager } from '@/components/notifications'
import { useQueryState } from 'nuqs'
import { DashboardMenu } from '@/components/dashboard-menu'
import AnimatedLoader from '@/components/common/AnimatedLoader'

export function Dashboard() {
    const {
    user,
    isLoading: kindeLoading
  } = useKindeAuth()

  const [selectedTab, setSelectedTab] = useQueryState('tab', { defaultValue: 'applications' })

  const navigate = useNavigate()
  const location = useLocation()

  // Use optimized dashboard data management
  const {
    isLoading,
    isError,
    isTrialExpired,
    forceRefresh,
    isCached,
    cacheAge
  } = useDashboardData()


  const { expiredData } = useTrialStatus()

  // Check if user is admin
  const isAdmin = user?.email && (
    user.email.includes('admin') 
  )

  // Handle tab navigation
  const handleTabChange = useCallback((tab: string) => {
    setSelectedTab(tab)
    navigate(`/dashboard?tab=${tab}`, { replace: true })
  }, [navigate, setSelectedTab])

  // Debug logging for tab selection
  console.log('Dashboard render:', {
    selectedTab,
    pathname: location.pathname
  })


  if (kindeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AnimatedLoader size="lg" className="mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
          {isCached && cacheAge && (
            <p className="text-sm text-muted-foreground mt-2">
              Using cached data ({Math.round((cacheAge || 0) / 1000)}s old)
            </p>
          )}
        </div>
      </div>
    )
  }

  // Show graceful trial expiry message instead of generic error
  if (isTrialExpired && expiredData) {
    return (
      <div className="min-h-screen bg-background">
        {/* Removed TrialExpiryBanner from here - it's handled at app level */}

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-2xl mx-auto px-4">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 mb-6">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Access Limited
            </h2>

            <p className="text-gray-600 mb-6 text-lg">
              Your {expiredData.plan || 'trial'} has expired, but don't worry!
              Your data is safe and you can restore full access by upgrading your plan.
            </p>

            <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">What's affected:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Dashboard and analytics
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  User management
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  API access
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Premium features
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.location.href = expiredData?.isSubscriptionExpired ? '/billing?renew=true' : '/billing?upgrade=true'}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                size="lg"
              >
                <Crown className="w-5 h-5" />
                {expiredData?.isSubscriptionExpired ? 'Renew Subscription' : 'Upgrade Now'}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                size="lg"
              >
                Go to Home
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Need help? <a href="mailto:support@example.com" className="text-amber-600 hover:underline">Contact our support team</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Dashboard</h2>
          <p className="text-muted-foreground mb-4">There was a temporary issue loading your dashboard data.</p>
          <Button onClick={forceRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header with Refresh Controls */}
          <div className="mb-8 flex items-center justify-between">
            <GreetingCard />
            <div className="flex items-center gap-3">
              <NotificationManager />
              <CacheRefreshButton />
            </div>
            {isAdmin && (
              <IconButton
                variant="outline"
                onClick={() => handleTabChange('admin')}
                startIcon={Settings}
              >
                Admin Panel
              </IconButton>
            )}
          </div>

          {/* Tab Navigation */}
          <DashboardMenu isAdmin={!!isAdmin} />

        </div>
      </div>
    </div>
  )
}



