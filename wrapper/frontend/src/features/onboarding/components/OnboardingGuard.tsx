import React, { useEffect, useState } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStatus, useOnboardingStatus } from '@/hooks/useSharedQueries'
import AnimatedLoader from '@/components/common/AnimatedLoader'

interface OnboardingGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

interface OnboardingStatus {
  needsOnboarding: boolean
  onboardingCompleted: boolean
  hasUser: boolean
  hasTenant: boolean
}

export const OnboardingGuard = React.memo(({ children, redirectTo = '/login' }: OnboardingGuardProps) => {
  const { isAuthenticated, isLoading: kindeLoading, user } = useKindeAuth()
  const { data: authData, isLoading: authLoading } = useAuthStatus()
  const { data: onboardingResponse, isLoading: onboardingLoading } = useOnboardingStatus()

  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const location = useLocation()

  const onboardingData = onboardingResponse?.data
  const backendAuthStatus = authData?.authStatus

  useEffect(() => {
    // Only run onboarding check when component mounts or when critical auth data changes
    // Don't re-run on every pathname change within dashboard
    const isDashboardPath = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/org/')

    // Check if we just completed onboarding (URL parameter)
    const urlParams = new URLSearchParams(location.search)
    const justCompletedOnboarding = urlParams.get('onboarding') === 'complete'

    // If onboarding was just completed, force a delay to allow auth state to sync
    if (justCompletedOnboarding) {
      console.log('🎯 OnboardingGuard: Onboarding just completed, adding delay for auth sync')
      const timer = setTimeout(() => {
        // After delay, determine status based on auth data
        if (backendAuthStatus) {
          const status: OnboardingStatus = {
            needsOnboarding: backendAuthStatus.needsOnboarding ?? !backendAuthStatus.onboardingCompleted,
            onboardingCompleted: backendAuthStatus.onboardingCompleted || false,
            hasUser: !!backendAuthStatus.userId,
            hasTenant: !!backendAuthStatus.tenantId
          }

          // Check if this is an invited user (they should never need onboarding)
          const isInvitedUser = backendAuthStatus.userType === 'INVITED_USER' ||
                                backendAuthStatus.isInvitedUser === true ||
                                backendAuthStatus.onboardingCompleted === true

          // INVITED USERS: Always skip onboarding
          if (isInvitedUser) {
            console.log('✅ OnboardingGuard - Invited user detected, skipping onboarding')
            status.needsOnboarding = false
            status.onboardingCompleted = true
          }

          console.log('✅ OnboardingGuard - Final computed status:', status)
          setOnboardingStatus(status)
        }
      }, 2000)
      return () => clearTimeout(timer)
    } else if (onboardingData && backendAuthStatus && !isDashboardPath) {
      // Only check onboarding status when NOT in dashboard (to avoid repeated checks)
      // Use data from shared hooks to determine status
      const status: OnboardingStatus = {
        needsOnboarding: onboardingData.needsOnboarding ?? !onboardingData.isOnboarded,
        onboardingCompleted: onboardingData.isOnboarded || false,
        hasUser: !!onboardingData.user,
        hasTenant: !!onboardingData.organization
      }

      // Check if this is an invited user (they should never need onboarding)
      const isInvitedUser = backendAuthStatus.userType === 'INVITED_USER' ||
                            backendAuthStatus.isInvitedUser === true ||
                            backendAuthStatus.onboardingCompleted === true ||
                            onboardingData.user?.userType === 'INVITED_USER'

      // INVITED USERS: Always skip onboarding
      if (isInvitedUser) {
        console.log('✅ OnboardingGuard - Invited user detected, skipping onboarding')
        status.needsOnboarding = false
        status.onboardingCompleted = true
      }

      console.log('✅ OnboardingGuard - Final computed status:', status)
      setOnboardingStatus(status)
    } else if (onboardingData && backendAuthStatus && isDashboardPath && !onboardingStatus) {
      // Only set onboarding status for dashboard if we don't already have it
      const status: OnboardingStatus = {
        needsOnboarding: false, // Assume onboarded if in dashboard
        onboardingCompleted: true,
        hasUser: !!backendAuthStatus.userId,
        hasTenant: !!backendAuthStatus.tenantId
      }

      console.log('✅ OnboardingGuard - Dashboard path, assuming onboarded:', status)
      setOnboardingStatus(status)
    }
  }, [isAuthenticated, kindeLoading, user?.email, onboardingData, backendAuthStatus])

  // Show loading while checking authentication and onboarding status
  if (kindeLoading || (isAuthenticated && (authLoading || onboardingLoading))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AnimatedLoader size="lg" className="mb-6" />
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Checking access...</p>
        </div>
      </div>
    )
  }

  // If not authenticated AND Kinde is not loading, redirect to login
  // This prevents redirect loops while Kinde is still initializing
  if (!isAuthenticated && !kindeLoading) {
    console.log('🔄 OnboardingGuard - Not authenticated (Kinde loaded), redirecting to:', redirectTo)
    return <Navigate to={redirectTo} replace />
  }

  // If we have onboarding status and user needs onboarding, redirect to onboarding
  if (onboardingStatus?.needsOnboarding) {
    console.log('🔄 OnboardingGuard - User needs onboarding, redirecting to /onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // If onboarding is completed, allow access to children
  if (onboardingStatus?.onboardingCompleted) {
    console.log('✅ OnboardingGuard - Onboarding completed, allowing access')
    return <>{children}</>
  }

  // Fallback: show loading if we don't have clear status yet
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <AnimatedLoader size="lg" className="mb-6" />
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Loading workspace...</p>
      </div>
    </div>
  )
})

OnboardingGuard.displayName = 'OnboardingGuard' 