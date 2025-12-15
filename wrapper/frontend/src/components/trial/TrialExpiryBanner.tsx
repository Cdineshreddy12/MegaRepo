import React, { useState, useEffect } from 'react'
import { AlertTriangle, Clock, Crown, X, CreditCard, RefreshCw, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { subscriptionAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function TrialExpiryBanner() {
  const { trialStatus, expiredData, isExpired, daysRemaining, checkTrialStatus } = useTrialStatus()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [localExpiredData, setLocalExpiredData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Listen for immediate trial expiry events
  useEffect(() => {
    const handleTrialExpired = (event) => {
      console.log('🚨 Immediate trial expiry event received:', event.detail)
      setLocalExpiredData(event.detail)
      setIsDismissed(false) // Always show banner immediately
    }

    const handleApiTrialExpiry = (event) => {
      console.log('🚨 API trial expiry intercepted:', event.detail)
      if (event.detail?.code === 'TRIAL_EXPIRED' || event.detail?.code === 'SUBSCRIPTION_EXPIRED') {
        setLocalExpiredData({
          expired: true,
          isTrialExpired: event.detail.isTrialExpired,
          isSubscriptionExpired: event.detail.isSubscriptionExpired,
          message: event.detail.message,
          plan: event.detail.data?.plan,
          expiredDuration: event.detail.data?.expiredDuration,
          immediate: event.detail.immediate
        })
        setIsDismissed(false) // Show immediately
      }
    }

    window.addEventListener('trialExpired', handleTrialExpired)
    window.addEventListener('apiTrialExpired', handleApiTrialExpiry)

    return () => {
      window.removeEventListener('trialExpired', handleTrialExpired)
      window.removeEventListener('apiTrialExpired', handleApiTrialExpiry)
    }
  }, [])

  // Don't show banner during onboarding - user hasn't set up organization yet
  const isOnboardingPage = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/')
  if (isOnboardingPage) {
    console.log('🚫 TrialExpiryBanner: Not showing during onboarding')
    return null
  }

  // Use local expired data if available, otherwise fall back to hook data
  const currentExpiredData = localExpiredData || expiredData
  const shouldShow = (isExpired && expiredData) || (localExpiredData?.expired)

  // Don't show if dismissed or no expired data
  if (!shouldShow || isDismissed) {
    return null
  }

  const handleUpgrade = () => {
    const isSubscriptionExpired = currentExpiredData?.isSubscriptionExpired
    const isTrialExpired = currentExpiredData?.isTrialExpired !== false // Default to trial if not specified
    
    if (isSubscriptionExpired) {
      navigate('/billing?renew=true&source=trial_banner')
    } else {
      navigate('/billing?upgrade=true&source=trial_banner')
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setLocalExpiredData(null)
  }

  // Debug helper to manually check subscription and clear trial data
  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    try {
      console.log('🔄 Manually refreshing trial status...')
      
      // First check subscription
      try {
        const subscriptionResponse = await subscriptionAPI.getCurrent()
        const subscription = subscriptionResponse.data?.data
        
        console.log('💳 Current subscription:', subscription)
        
        // First check if subscription is actually expired
        const now = new Date()
        const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null
        const currentPeriodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
        
        const isTrialExpired = (
          subscription.plan === 'trial' && 
          subscription.status === 'past_due' &&
          trialEnd && 
          trialEnd < now
        )
        
        const isPaidSubscriptionExpired = (
          subscription.plan !== 'trial' &&
          subscription.plan !== 'free' &&
          subscription.status !== 'active' &&
          currentPeriodEnd &&
          currentPeriodEnd < now
        )
        
        // If expired, don't clear banner
        if (isTrialExpired || isPaidSubscriptionExpired) {
          console.log('⚠️ Subscription is expired, not clearing banner')
          toast.error(`Your ${subscription.plan} is expired. Please ${isTrialExpired ? 'upgrade' : 'renew'} to continue.`, {
            duration: 4000
          })
          return
        }
        
        const isActivePaidUser = (
          // Currently active paid plan
          (subscription.status === 'active' && 
           subscription.stripeSubscriptionId &&
           subscription.plan !== 'trial' && 
           subscription.plan !== 'free') ||
          // Has upgraded before (upgrade tracking)
          subscription.hasEverUpgraded === true ||
          // Trial manually disabled
          subscription.trialToggledOff === true
        );
        
        if (isActivePaidUser) {
          console.log('✅ Active/upgraded user found! Clearing trial data...')
          
          // Toggle off trial restrictions if not already done
          if (!subscription.trialToggledOff) {
            try {
              await subscriptionAPI.toggleTrialRestrictions(true)
              console.log('✅ Trial restrictions disabled via API')
            } catch (error) {
              console.warn('⚠️ Could not disable trial restrictions:', error)
            }
          }
          
          localStorage.removeItem('trialExpired')
          
          // Dispatch cleanup events
          window.dispatchEvent(new CustomEvent('paymentSuccess'))
          window.dispatchEvent(new CustomEvent('subscriptionUpgraded'))
          
          toast.success('✅ Active subscription verified! Banner cleared.', {
            duration: 3000
          })
          
          setIsDismissed(true)
          setLocalExpiredData(null)
          return
        } else {
          console.log('⚠️ No active paid subscription found')
          toast.error('No active paid subscription found. Please complete payment first.', {
            duration: 4000
          })
        }
      } catch (error) {
        console.error('❌ Error checking subscription:', error)
        toast.error('Could not verify subscription status', {
          duration: 4000
        })
      }
      
      // If no active subscription, refresh trial status
      await checkTrialStatus()
      
    } finally {
      setIsRefreshing(false)
    }
  }

  // Banner style for expired trial/subscription
  const getBannerStyle = () => {
    const isSubscriptionExpired = currentExpiredData?.isSubscriptionExpired
    
    if (isSubscriptionExpired) {
      return {
        bgClass: 'bg-orange-600',
        textClass: 'text-white',
        iconColor: 'text-orange-100',
        buttonClass: 'bg-white text-orange-600 hover:bg-gray-100 font-semibold'
      }
    } else {
      return {
        bgClass: 'bg-red-600',
        textClass: 'text-white',
        iconColor: 'text-red-100',
        buttonClass: 'bg-white text-red-600 hover:bg-gray-100 font-semibold'
      }
    }
  }

  const style = getBannerStyle()

  const getMessage = () => {
    const isSubscriptionExpired = currentExpiredData?.isSubscriptionExpired
    const isTrialExpired = currentExpiredData?.isTrialExpired !== false
    
    if (isSubscriptionExpired) {
      return {
        title: 'Subscription Expired',
        subtitle: 'Your subscription has ended. Renew now to restore full access to your dashboard and data.',
        actionText: 'Renew Now',
        icon: Calendar
      }
    } else {
      return {
        title: 'Trial Expired',
        subtitle: 'Your trial has ended. Upgrade now to continue using all features without interruption.',
        actionText: 'Upgrade Now',
        icon: AlertTriangle
      }
    }
  }

  const { title, subtitle, actionText, icon: StatusIcon } = getMessage()

  return (
    <div className={`sticky top-0 z-50 ${style.bgClass} border-b-4 border-white/20`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className={`flex-shrink-0 ${style.iconColor}`}>
              <StatusIcon className="h-8 w-8" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 font-medium">
                  {title}
                </Badge>
                {currentExpiredData?.expiredDuration && (
                  <span className={`text-sm ${style.textClass} opacity-90`}>
                    Expired {currentExpiredData.expiredDuration}
                  </span>
                )}
              </div>
              
              <p className={`mt-1 text-sm ${style.textClass} opacity-95 max-w-3xl`}>
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 ml-4">
            <Button
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              variant="ghost"
              size="sm"
              className={`${style.textClass} hover:bg-white/10 border border-white/30`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Verify Payment'}
            </Button>
            
            <Button
              onClick={handleUpgrade}
              className={`${style.buttonClass} shadow-lg hover:shadow-xl transition-all duration-200 px-6`}
              size="sm"
            >
              <Crown className="h-4 w-4 mr-2" />
              {actionText}
            </Button>
            
            <Button 
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className={`${style.textClass} hover:bg-white/10 p-1`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add padding to body when banner is shown - updated for sticky banner
export function TrialBannerSpacer() {
  const { isExpired } = useTrialStatus()
  
  // No padding needed for sticky banner
  return null
} 