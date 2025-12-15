import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'

import {
  Download,
  X,
  AlertTriangle,
  ExternalLink,
  Crown,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  Coins,
  Sparkles,
  Settings,
  UserCheck,
  TrendingUp,
  Calendar,
  RefreshCw,
  CheckCircle,
  CreditCard as CreditCardLucide
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreditCard,
  CreditCardFlipper,
  CreditCardFront,
  CreditCardBack,
  CreditCardChip,
  CreditCardLogo,
  CreditCardServiceProvider,
  CreditCardName,
  CreditCardNumber,
  CreditCardExpiry,
  CreditCardCvv,
  CreditCardMagStripe,
} from '@/components/ui/shadcn-io/credit-card'
import { subscriptionAPI, creditAPI, setKindeTokenGetter, api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { PaymentDetailsModal } from '@/components/PaymentDetailsModal'
import { PaymentUpgradeModal } from '@/components/PaymentUpgradeModal'
import PricingCard from '@/components/common/PricingCard'
import { ApplicationPlan, CreditTopup } from '@/types/pricing'
import {
  CreditBalanceIcon,
  UsageAnalyticsIcon,
  PaymentHistoryIcon,
  CreditPackagesIcon,
  SubscriptionIcon,
  BillingIcon,
  WalletIcon,
  ReceiptIcon,
  StatsIcon,
  SparklesIcon
} from '@/components/common/BillingIcons'

// Application Plans (Subscription-based)
const applicationPlans: ApplicationPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals and small teams',
    monthlyPrice: 12,
    annualPrice: 120,
    currency: 'USD',
    freeCredits: 60000,
    features: [
      'Basic CRM tools',
      'Up to 5 users',
      '60,000 annual credits',
      'Email support',
      'Basic integrations'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Ideal for growing businesses',
    monthlyPrice: 20,
    annualPrice: 240,
    currency: 'USD',
    freeCredits: 300000,
    features: [
      'All modules + Affiliate',
      '300,000 free credits/year',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 99,
    annualPrice: 1188,
    currency: 'USD',
    freeCredits: 10000,
    features: [
      'Unlimited modules',
      '10,000 free credits/month',
      'Dedicated support'
    ]
  }
];

// Credit Top-up Plans (One-time purchases)
const creditTopups: CreditTopup[] = [
  {
    id: 'credits_5000',
    name: '5,000 Credits',
    description: 'Perfect for light usage',
    credits: 5000,
    price: 5,
    currency: 'USD',
    features: [
      '5,000 credits',
      'Never expires',
      'Use anytime',
      'No monthly fees'
    ]
  },
  {
    id: 'credits_10000',
    name: '10,000 Credits',
    description: 'Ideal for regular operations',
    credits: 10000,
    price: 10,
    currency: 'USD',
    features: [
      '10,000 credits',
      'Never expires',
      'Best value',
      'Priority support'
    ],
    recommended: true
  },
  {
    id: 'credits_15000',
    name: '15,000 Credits',
    description: 'For high-volume operations',
    credits: 15000,
    price: 15,
    currency: 'USD',
    features: [
      '15,000 credits',
      'Never expires',
      'Maximum value',
      'Premium support'
    ]
  }
];

// Chase Logo Component
const ChaseLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 561.578 104.369"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Chase Logo</title>
    <path
      d="m494.525 0a3.69 3.69 0 0 0 -3.691 3.686v25.83h68.244l-31.078-29.508zm67.053 37.33a3.677 3.677 0 0 0 -3.688-3.68h-25.828v68.242l29.504-31.086zm-37.342 67.039a3.688 3.688 0 0 0 3.678-3.688v-25.827h-68.241l31.073 29.508zm-67.056-37.326a3.687 3.687 0 0 0 3.686 3.688h25.83v-68.247l-29.512 31.078z"
      fill="currentColor"
    />
    <path
      d="m144.379 12.453v31.514h-43.91v-31.514l-15.987-.006v79.461h15.987v-34.137h43.91v34.137h16.016v-79.455zm212.744 0v79.441l70.164-.004-8.891-13.98h-45.23v-20.139h43.797v-13.472h-43.797v-18.188h45.156l8.711-13.658zm-332.08-.01c-16.639 0-25.043 10.106-25.043 24.823v29.665c0 17.026 10.824 24.979 24.957 24.979l50.164-.01-9.293-14.521h-37.775c-8.021 0-11.515-2.899-11.515-11.881v-26.91c0-8.684 2.939-12.072 11.729-12.072h37.955l8.928-14.072zm261.904-.023c-9.613 0-19.451 5.771-19.451 20.625v3.816c0 15.475 9.476 21.389 18.949 21.432h33.275c3.455 0 6.264.572 6.264 6.416l-.004 6.754c-.086 5.236-2.711 6.447-6.379 6.447h-43.771l-8.967 13.979h53.762c12.972 0 21.773-6.447 21.773-21.353v-5.476c0-14.408-8.176-21.207-20.859-21.207h-31.77c-3.525 0-5.976-.967-5.976-6.184l-.004-5.492c0-4.443 1.688-6.066 5.791-6.066l41.683-.016 8.715-13.69-53.031.015m-80.084.045-37.679 79.435h17.811l7.338-16.405h40.941l7.315 16.405h17.882l-37.765-79.436zm7.896 16.488 14.479 33.021h-28.867z"
      fill="currentColor"
    />
  </svg>
);

// Chase Mark Component
const ChaseMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 465 465"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Chase Mark</title>
    <path
      d="M166.497 0.188111C162.143 0.186928 157.966 1.91465 154.885 4.99158C151.804 8.0685 150.071 12.2429 150.066 16.5972V131.586H453.871L315.519 0.223725L166.497 0.188111ZM465 166.372C465.002 164.217 464.578 162.083 463.753 160.092C462.928 158.101 461.718 156.293 460.193 154.771C458.668 153.249 456.857 152.043 454.864 151.222C452.872 150.402 450.737 149.983 448.582 149.989H333.602V453.785L464.946 315.398L465 166.372ZM298.763 464.812C303.11 464.8 307.274 463.065 310.344 459.987C313.413 456.91 315.137 452.74 315.137 448.394V333.419H11.3453L149.674 464.781L298.763 464.812ZM0.247071 298.646C0.246486 300.802 0.670457 302.936 1.49478 304.928C2.31909 306.919 3.52763 308.729 5.05136 310.254C6.57509 311.778 8.38414 312.988 10.3753 313.813C12.3665 314.639 14.5007 315.064 16.6562 315.064H131.645V11.2462L0.264868 149.597L0.247071 298.646Z"
      fill="currentColor"
    />
  </svg>
);

export function Billing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('subscription')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: '1',
      type: 'visa' as const,
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2025,
      brand: 'Visa',
      isDefault: true
    },
    {
      id: '2',
      type: 'mastercard' as const,
      last4: '8888',
      expiryMonth: 6,
      expiryYear: 2026,
      brand: 'Mastercard',
      isDefault: false
    }
  ])
  const [authTestResult, setAuthTestResult] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  // showDowngradeDialog removed - immediate downgrades not allowed
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<string | null>(null)
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<any>(null)
  const [refundRequested, setRefundRequested] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [planLimits, setPlanLimits] = useState<any>(null)

  // Add state for manual cleanup
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  // Add state for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalPlan, setUpgradeModalPlan] = useState<string>('')

  // Add state for profile completion status
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null)
  const [isCheckingProfile, setIsCheckingProfile] = useState(false)

  // Get Kinde authentication state
  const { isAuthenticated, isLoading, user, getToken, login } = useKindeAuth()

  // Check if we're in upgrade mode
  const upgradeMode = searchParams.get('upgrade') === 'true'
  const paymentCancelled = searchParams.get('payment') === 'cancelled'
  const paymentSuccess = searchParams.get('payment') === 'success'

  // Invalidate queries on component mount to ensure fresh data
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['credit'] });
    }
  }, [isAuthenticated, isLoading, queryClient]);
  const paymentType = searchParams.get('type') // 'subscription' or 'credit_purchase'
  const sessionId = searchParams.get('session_id')
  const upgradedPlan = searchParams.get('plan')
  const mockMode = searchParams.get('mock') === 'true' // For testing without backend

  useEffect(() => {
    if (paymentCancelled) {
      // Navigate to cancelled page with all parameters
      const params = new URLSearchParams(window.location.search);
      navigate(`/payment-cancelled?${params.toString()}`)
    }
  }, [paymentCancelled, navigate])

  // Check authentication status and provide helpful feedback
  useEffect(() => {
    if (!isLoading) {
      console.log('🔍 Billing Page - Auth Status:', {
        isAuthenticated,
        user: user?.email,
        hasUser: !!user,
        mockMode
      });

      if (!isAuthenticated && !mockMode) {
        console.log('⚠️ User not authenticated, auth test will likely fail');
        setAuthTestResult('❌ Not authenticated');
        toast.error('Not authenticated with Kinde. Please log in first.');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, mockMode])

  // Register Kinde token getter with API
  useEffect(() => {
    if (getToken) {
      console.log('🔧 Registering Kinde token getter with API');
      setKindeTokenGetter(async () => {
        try {
          const token = await getToken();
          console.log('🎯 Kinde token getter called, result:', token ? 'Token provided' : 'No token');
          return token || null;
        } catch (error) {
          console.error('❌ Kinde token getter error:', error);
          return null;
        }
      });
    }
  }, [getToken, isAuthenticated])

  // Fetch real subscription data
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription
  } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getCurrent();
        return response.data.data; // Extract the actual subscription object from the wrapper
      } catch (error: any) {
        if (error.response?.status === 404) {
          // No subscription found, user might be on free plan
          return {
            plan: 'free',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 0,
            currency: 'USD'
          };
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch available credit packages (currently using static data)
  const {
    data: packagesData,
    isLoading: packagesLoading
  } = useQuery({
    queryKey: ['credit', 'packages'],
    queryFn: async () => {
      // For now, always use static credit top-ups to ensure consistent IDs
      // TODO: Integrate with backend credit packages when needed
      return creditTopups;
    },
    enabled: !mockMode,
    retry: 1
  });


  // Fetch current credit balance
  const {
    data: creditBalance,
    isLoading: creditBalanceLoading,
    error: creditBalanceError,
    refetch: refetchCreditBalance
  } = useQuery({
    queryKey: ['credit', 'current'],
    queryFn: async () => {
      try {
        const response = await creditAPI.getCurrentBalance();
        return response.data.data;
      } catch (error: any) {
        console.warn('Failed to fetch credit balance:', error);
        return {
          availableCredits: 0,
          freeCredits: 0,
          paidCredits: 0,
          totalCredits: 0
        };
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch billing history
  const {
    data: billingHistory,
    isLoading: billingHistoryLoading
  } = useQuery({
    queryKey: ['subscription', 'billing-history'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getBillingHistory();
        return response.data.data; // Extract the actual billing history array from the wrapper
      } catch (error) {
        console.warn('Failed to fetch billing history:', error);
        // Return empty array instead of throwing to prevent component crash
        return [];
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch usage data
  const {
    data: usageData,
    isLoading: usageLoading
  } = useQuery({
    queryKey: ['subscription', 'usage'],
    queryFn: async () => {
      const response = await subscriptionAPI.getUsage();
      return response.data.data; // Extract the actual usage data from the wrapper
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch plan limits
  const {
    data: planLimitsData,
    isLoading: planLimitsLoading
  } = useQuery({
    queryKey: ['subscription', 'plan-limits'],
    queryFn: async () => {
      const response = await subscriptionAPI.getPlanLimits();
      return response.data.data; // Extract the actual plan limits data from the wrapper
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Use the usage data (removing linter warning)
  console.log('Usage data loaded:', usageData, usageLoading);
  console.log('Plan limits loaded:', planLimitsData, planLimitsLoading);

  // Use API data or fallback to mock data for credit top-ups
  const displayCreditTopups = packagesData || creditTopups;
  
  // Ensure subscription data has valid date
  const ensureValidSubscription = (sub: any) => {
    if (!sub) return null;
    
    // Ensure currentPeriodEnd is a valid date
    let validCurrentPeriodEnd = sub.currentPeriodEnd;
    if (!validCurrentPeriodEnd || isNaN(new Date(validCurrentPeriodEnd).getTime())) {
      // If no valid date, default to 1 year from now for free plans, or current date for others
      validCurrentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    return {
      ...sub,
      currentPeriodEnd: validCurrentPeriodEnd
    };
  };
  
  const displaySubscription = ensureValidSubscription(subscription) || {
    plan: 'free',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 0,
    currency: 'USD'
  };
  const displayBillingHistory = billingHistory || [];

  // Handle payment success - redirect to success page
  useEffect(() => {
    if (paymentSuccess) {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries()

      // Clear trial expiry data from localStorage
      localStorage.removeItem('trialExpired')

      // Dispatch custom events to clear trial state
      window.dispatchEvent(new CustomEvent('paymentSuccess'))
      window.dispatchEvent(new CustomEvent('subscriptionUpgraded'))
      window.dispatchEvent(new CustomEvent('profileCompleted'))

      // Navigate to success page with all parameters
      const params = new URLSearchParams(window.location.search);
      navigate(`/payment-success?${params.toString()}`)
    }
  }, [paymentSuccess, paymentType, queryClient, navigate])

  // Create Stripe checkout session mutation with better error handling
  const createCheckoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      console.log('🔄 Creating checkout session for:', { planId, billingCycle });
      
      // If in mock mode, simulate the process
      if (mockMode) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        return {
          checkoutUrl: `https://checkout.stripe.com/pay/mock-${planId}-${billingCycle}#test`
        };
      }
      
      try {
        const response = await subscriptionAPI.createCheckout({
          planId,
          billingCycle,
          successUrl: `${window.location.origin}/payment-success?type=credit_purchase&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/billing?payment=cancelled`
        });
        
        console.log('✅ Checkout session created - Full response:', response);
        console.log('✅ Response data:', response.data);
        console.log('✅ Actual checkout data:', response.data.data);
        
        // Return the actual data (response.data.data) not the wrapper (response.data)
        return response.data.data;
      } catch (error: any) {
        console.error('❌ Checkout creation failed:', error);
        
        // Handle different error types
        if (error.response?.status === 401) {
          throw new Error('Authentication required. Please log in again or use mock mode by adding "?mock=true" to the URL.');
        } else if (error.response?.status === 403) {
          throw new Error('You don\'t have permission to create subscriptions.');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error('Failed to create checkout session. Please try mock mode or check your authentication.');
        }
      }
    },
    onSuccess: (data) => {
      console.log('✅ Checkout mutation successful!');
      console.log('🔍 Full data object received:', data);
      console.log('🔍 data.checkoutUrl:', data.checkoutUrl);
      console.log('🔍 data type:', typeof data);
      console.log('🔍 data keys:', Object.keys(data));
      console.log('🔍 Stringified data:', JSON.stringify(data, null, 2));
      
      if (data.checkoutUrl) {
        console.log('✅ Checkout URL found, redirecting to:', data.checkoutUrl);
        // Show success message before redirecting
        toast.success('Redirecting to secure payment page...', {
          duration: 2000,
        });
        
        // Small delay to show the message
        setTimeout(() => {
          if (mockMode) {
            toast.success('Mock mode: Simulated successful upgrade!', {
              duration: 3000,
            });
            // In mock mode, just show success and stay on page
            setIsUpgrading(false);
          } else {
            window.location.href = data.checkoutUrl;
          }
        }, 1000);
      } else {
        console.error('❌ No checkout URL found in data');
        console.error('❌ Data structure analysis:');
        console.error('   - data.checkoutUrl:', data.checkoutUrl);
        console.error('   - data.data?.checkoutUrl:', data.data?.checkoutUrl);
        console.error('   - data.url:', data.url);
        console.error('   - data.checkoutUrl (typeof):', typeof data.checkoutUrl);
        toast.error('No checkout URL received from server');
        setIsUpgrading(false);
      }
    },
    onError: (error: any) => {
      console.error('❌ Checkout mutation failed:', error);
      
      const errorMessage = error.message || 'Failed to create checkout session';
      
      // Check if user needs onboarding
      if (error.response?.data?.action === 'redirect_to_onboarding') {
        setNeedsOnboarding(true);
        toast.error('Please complete onboarding first to create a subscription.', {
          duration: 5000,
        });
        return;
      }
      
      toast.error(errorMessage, {
        duration: 8000,
      });
      
      setIsUpgrading(false);
    }
  });

  // Plan change mutation for upgrades/downgrades
  const changePlanMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      console.log('🔄 Changing plan to:', { planId, billingCycle });
      
      const response = await subscriptionAPI.changePlan({
        planId,
        billingCycle
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Plan change successful:', data);
      
      if (data.checkoutUrl) {
        // For paid plans, redirect to checkout
        toast.success('Redirecting to secure payment page...', {
          duration: 2000,
        });
        
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1000);
      } else {
        // For free plan downgrade, refresh data
        toast.success(data.message || 'Plan changed successfully!', {
          duration: 3000,
        });
        
      // Refresh subscription data
        refetchSubscription();
        setIsUpgrading(false);
      }
    },
    onError: (error: any) => {
      console.error('❌ Plan change failed:', error);
      toast.error(error.response?.data?.message || 'Failed to change plan');
      setIsUpgrading(false);
    }
  });

  // Immediate downgrade functionality removed - all plan changes are scheduled

  // Refund processing mutation
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string }) => {
      const response = await subscriptionAPI.processRefund({
        paymentId,
        amount,
        reason
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Refund processed successfully!', {
        duration: 3000,
      });
      setSelectedPaymentForRefund(null);
      queryClient.invalidateQueries({ queryKey: ['subscription', 'billing-history'] });
    },
    onError: (error: any) => {
      console.error('❌ Refund processing failed:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  });

  // Check profile completion status
  const checkProfileStatus = async () => {
    try {
      setIsCheckingProfile(true);
      console.log('🔍 Checking profile completion status...');

      const response = await api.get('/api/payment-upgrade/profile-status');
      const status = response.data;

      console.log('📋 Profile status:', status);
      setProfileCompleted(status.profileCompleted);

      return status;
    } catch (error) {
      console.error('❌ Failed to check profile status:', error);
      // If we can't check status, assume profile is not completed
      setProfileCompleted(false);
      return { profileCompleted: false };
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const handleCreditPurchase = async (packageId: string) => {
    if (!isAuthenticated) {
      login();
      return;
    }

    setSelectedPlan(packageId);
    setIsUpgrading(true);

    try {
      // Find the selected credit top-up
      const selectedPackage = displayCreditTopups.find((pkg: any) => pkg.id === packageId);
      if (!selectedPackage) {
        throw new Error('Selected credit top-up not found');
      }

      console.log('Purchasing credit package:', selectedPackage);

      // Initiate credit purchase
      const response = await creditAPI.purchaseCredits({
        creditAmount: selectedPackage.credits,
        paymentMethod: 'stripe',
        currency: selectedPackage.currency,
        notes: `Purchase of ${selectedPackage.name} package`
      });

      if (response.data.data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = response.data.data.checkoutUrl;
      } else {
        // Handle direct credit addition (for non-Stripe payments)
        toast.success('Credits purchased successfully!');
        queryClient.invalidateQueries({ queryKey: ['credit'] });
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      }
    } catch (error: any) {
      console.error('Credit purchase error:', error);
      toast.error(error.response?.data?.message || 'Failed to purchase credits');
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const handlePlanPurchase = async (planId: string) => {
    if (!isAuthenticated) {
      login();
      return;
    }

    setSelectedPlan(planId);
    setIsUpgrading(true);

    try {
      // Find the selected application plan
      const selectedPlan = applicationPlans.find(plan => plan.id === planId);
      if (!selectedPlan) {
        throw new Error('Selected plan not found');
      }

      console.log('Purchasing application plan:', selectedPlan);

      // Check if user has existing subscription
      const currentSubscription = { data: displaySubscription };
      const hasActiveSubscription = currentSubscription?.data?.status === 'active';

      if (hasActiveSubscription && currentSubscription.data.plan !== 'free') {
        // User has active subscription - use changePlan for upgrades/downgrades
        try {
          const response = await subscriptionAPI.changePlan({
            planId: planId,
            billingCycle: 'yearly' // All plans are annual
          });

          if (response.data.data.checkoutUrl) {
            // Redirect to Stripe checkout for subscription
            window.location.href = response.data.data.checkoutUrl;
          } else {
            // Handle direct plan activation
            toast.success('Plan changed successfully!');
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            queryClient.invalidateQueries({ queryKey: ['credit'] });
          }
        } catch (changePlanError) {
          console.error('❌ changePlan failed, falling back to checkout:', changePlanError);
          // Fall back to checkout if changePlan fails
          const response = await subscriptionAPI.createCheckout({
            planId: planId,
            billingCycle: 'yearly',
            successUrl: `${window.location.origin}/payment-success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/billing?payment=cancelled&type=subscription`
          });

          if (response.data.data.checkoutUrl) {
            window.location.href = response.data.data.checkoutUrl;
          } else {
            toast.success('Plan activated successfully!');
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            queryClient.invalidateQueries({ queryKey: ['credit'] });
          }
        }
      } else {
        // No active subscription or free tier - create new subscription via checkout
        const response = await subscriptionAPI.createCheckout({
          planId: planId,
          billingCycle: 'yearly', // All plans are annual
          successUrl: `${window.location.origin}/payment-success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/billing?payment=cancelled&type=subscription`
        });

        if (response.data.data.checkoutUrl) {
          // Redirect to Stripe checkout for new subscription
          window.location.href = response.data.data.checkoutUrl;
        } else {
          // Handle direct plan activation (for non-Stripe payments)
          toast.success('Plan activated successfully!');
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['credit'] });
        }
      }
    } catch (error: any) {
      console.error('Plan purchase error:', error);
      toast.error(error.response?.data?.message || 'Failed to purchase plan');
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const handleUpgrade = async (planId: string) => {
    console.log('🎯 Upgrade button clicked for plan:', planId);

    if (planId === 'free') {
      toast.error('You are already on the free plan');
      return;
    }

    // Check if this is a downgrade to free (which should be handled differently)
    if (displaySubscription.plan !== 'free' && planId === 'free') {
      toast.error('To downgrade to free plan, please contact support or cancel your current subscription.');
      return;
    }

    // Check profile completion status first
    const profileStatus = await checkProfileStatus();

    if (profileStatus.profileCompleted) {
      console.log('✅ Profile already completed, proceeding directly to payment');

      // Profile is completed, skip form and go directly to payment
      setSelectedPlan(planId);
      setIsUpgrading(true);

      toast.loading(`Setting up your ${planId} plan upgrade...`, { duration: 2000 });

      try {
        console.log('🚀 Starting checkout process for completed profile...');
        await createCheckoutMutation.mutateAsync({
          planId: planId,
          billingCycle
        });
      } catch (error) {
        console.error('❌ Payment failed:', error);
        setIsUpgrading(false);
        toast.error('Payment failed. Please try again.');
      }
    } else {
      console.log('📝 Profile not completed, showing form');

      // Profile is not completed, show the form
      setUpgradeModalPlan(planId);
      setShowUpgradeModal(true);
    }
  };

  const handleUpgradeComplete = async (upgradeData: any) => {
    console.log('✅ Upgrade form completed, proceeding with two-step process:', upgradeData);

    // Step 1: Complete profile first
    try {
      console.log('📝 Step 1: Completing profile...');
      toast.loading('Completing your profile...', { duration: 2000 });

      // Include selected plan in the data for validation
      const profileData = {
        ...upgradeData,
        selectedPlan: upgradeModalPlan
      };

      const profileResponse = await api.post('/api/payment-upgrade/complete-profile', profileData);

      if (profileResponse.data.success) {
        console.log('✅ Profile completed successfully');

        // Update profile completion status
        setProfileCompleted(true);

        toast.success('Profile completed! Proceeding to payment...', { duration: 2000 });

        // Step 2: Now proceed to payment
        setSelectedPlan(upgradeModalPlan);
        setIsUpgrading(true);

        // Don't close modal yet - let the payment process complete
        console.log('🚀 Step 2: Starting checkout process...');

        try {
          await createCheckoutMutation.mutateAsync({
            planId: upgradeModalPlan,
            billingCycle
          });

          // Close modal after successful payment
          setShowUpgradeModal(false);
        } catch (paymentError) {
          console.error('❌ Payment failed:', paymentError);
          toast.error('Payment failed. Please try again.');
          setIsUpgrading(false);
          // Keep modal open so user can try again
        }
      } else {
        console.error('❌ Profile completion failed:', profileResponse.data.message);
        toast.error('Failed to complete profile. Please try again.');
        setShowUpgradeModal(false);
      }
    } catch (error) {
      console.error('❌ Profile completion or payment failed:', error);
      toast.error('Something went wrong. Please try again.');
      setShowUpgradeModal(false);
    }
  };

  // For testing: Add a button to test authentication
  const testAuth = async () => {
    try {
      setAuthTestResult('Testing...');
      console.log('🧪 === COMPREHENSIVE AUTH TEST ===');
      
      // Step 1: Check Kinde auth state
      console.log('🔍 Step 1: Kinde Auth State');
      console.log('  isAuthenticated:', isAuthenticated);
      console.log('  isLoading:', isLoading);
      console.log('  user email:', user?.email);
      console.log('  user id:', user?.id);
      console.log('  hasUser:', !!user);

      if (!isAuthenticated) {
        setAuthTestResult('❌ Not authenticated');
        toast.error('Not authenticated with Kinde. Please log in first.');
        return;
      }

      // Step 2: Try to get the current token from Kinde
      console.log('🔍 Step 2: Getting Kinde Token');
      let kindeToken = null;
      try {
        kindeToken = await getToken();
        console.log('  Kinde getToken() result:', kindeToken ? 'Token received' : 'No token');
        console.log('  Token preview:', kindeToken ? `${kindeToken.substring(0, 20)}...` : 'None');
      } catch (tokenError) {
        console.error('  ❌ Failed to get Kinde token:', tokenError);
      }

      // Step 3: Test the debug authentication endpoint
      console.log('🔍 Step 3: Testing Debug Auth Endpoint');
      const response = await subscriptionAPI.debugAuth();
      console.log('✅ Debug auth test successful:', response.data);
      
      // Check if user needs onboarding
      if (response.data.user && !response.data.tenantId) {
        setNeedsOnboarding(true);
        console.log('⚠️ User needs onboarding - no tenantId found');
      }
      
      setAuthTestResult('✅ Success');
      toast.success('Authentication is working!');
    } catch (error: any) {
      console.error('❌ Auth test failed:', error);
      console.log('🔍 Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        setAuthTestResult('❌ 401 Unauthorized');
        toast.error('Authentication failed. Try logging out and back in.');
      } else {
        setAuthTestResult('❌ Error');
        toast.error('API test failed: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Add a manual token override for testing
  const testWithManualToken = async () => {
    const manualToken = prompt('Enter a Kinde access token to test with:');
    if (!manualToken) return;

    try {
      console.log('🧪 Testing with manual token:', manualToken.substring(0, 20) + '...');
      
      // Create a custom axios instance with manual token for testing
      const testApi = api.create({
        baseURL: import.meta.env.VITE_API_URL || '/api',
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${manualToken}` // Manual token override
        }
      });

      const response = await testApi('/subscriptions/current');
      console.log('Manual token test result:', { status: response.status, data: response.data });

      toast.success('Manual token test successful!');
      setAuthTestResult('✅ Manual Success');
    } catch (error: any) {
      console.error('Manual token test error:', error);
      const status = error.response?.status || 'Network Error';
      const message = error.response?.data?.message || error.message || 'Unknown error';

      toast.error(`Token test failed: ${status}`);
      setAuthTestResult(`❌ Manual Failed: ${status}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trialing':
        return 'bg-blue-100 text-blue-800'
      case 'past_due':
        return 'bg-red-100 text-red-800'
      case 'canceled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Manual cleanup function for trial data
  const handleManualCleanup = async () => {
    setIsCleaningUp(true)
    try {
      console.log('🧹 Starting manual cleanup...')
      
      // 1. Clean up duplicate payments
      try {
        const cleanupResponse = await subscriptionAPI.cleanupDuplicatePayments()
        console.log('✅ Payment cleanup result:', cleanupResponse.data)
        toast.success(`Cleaned up ${cleanupResponse.data.data.duplicatesRemoved} duplicate payments`, {
          duration: 3000
        })
      } catch (error) {
        console.warn('⚠️ Payment cleanup failed:', error)
      }
      
      // 2. Toggle off trial restrictions
      try {
        const toggleResponse = await subscriptionAPI.toggleTrialRestrictions(true)
        console.log('✅ Trial restrictions disabled:', toggleResponse.data)
        toast.success('Trial restrictions disabled', {
          duration: 2000
        })
      } catch (error) {
        console.warn('⚠️ Trial toggle failed:', error)
      }
      
      // 3. Clear trial expiry data
      localStorage.removeItem('trialExpired')
      
      // 4. Dispatch cleanup events
      window.dispatchEvent(new CustomEvent('paymentSuccess'))
      window.dispatchEvent(new CustomEvent('subscriptionUpgraded'))
      
      // 5. Refresh all data
      queryClient.invalidateQueries()
      
      toast.success('✅ Manual cleanup completed! Please refresh the page.', {
        duration: 5000
      })
      
      // Refresh page after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error)
      toast.error('Manual cleanup failed. Please contact support.', {
        duration: 5000
      })
    } finally {
      setIsCleaningUp(false)
    }
  }

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
    


      <div className="flex items-center justify-end gap-2 mb-6">
       
        {upgradeMode && (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
            <Zap className="h-3 w-3 mr-1" />
            Upgrade Mode
          </Badge>
        )}
      </div>

      {/* Professional Alerts */}
      {needsOnboarding && !mockMode && isAuthenticated && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 dark:bg-orange-900/10 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/30">
              <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Setup Required</h3>
              <p className="text-orange-700 dark:text-orange-200 mt-1">Complete onboarding to access all subscription features</p>
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-500 dark:hover:bg-orange-600"
              onClick={() => navigate('/onboarding')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          </div>
        </div>
      )}

      {/* Professional Upgrade CTA */}
      {/* {(displaySubscription.plan === 'free' || upgradeMode) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6 dark:from-blue-900/10 dark:to-indigo-900/10 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900/30">
              <Crown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-base dark:text-gray-100">Ready to unlock more power?</h3>
              {authTestResult === '❌ 401 Unauthorized' && !mockMode && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">Authentication required for upgrades. Try mock mode to test the flow.</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {authTestResult === '❌ 401 Unauthorized' && !mockMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                  onClick={() => window.location.href = '/billing?mock=true'}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Mock Mode
                </Button>
              )}
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                onClick={() => setActiveTab('plans')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Plans
              </Button>
            </div>
          </div>
        </div>
      )} */}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 h-12 dark:bg-gray-800">
          <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all">
            <CreditBalanceIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Credit Balance</span>
            <span className="sm:hidden">Balance</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all">
            <CreditPackagesIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Credit Packages</span>
            <span className="sm:hidden">Packages</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all">
            <PaymentHistoryIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Purchase History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-8">
          {/* Current Subscription Plan Card */}
          {displaySubscription.plan !== 'free' && (
            <Card className="border-0 shadow-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500 rounded-xl text-white">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg dark:text-white">Current Plan</CardTitle>
                      <CardDescription className="dark:text-gray-300">
                        {applicationPlans.find(p => p.id === displaySubscription.plan)?.name || displaySubscription.plan} Plan
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${displaySubscription.yearlyPrice || displaySubscription.monthlyPrice || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      per {displaySubscription.billingCycle || 'year'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                      Status: {displaySubscription.status}
                    </span>
                  </div>
                  {displaySubscription.currentPeriodEnd && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Renews: {formatDate(displaySubscription.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modern Credit Balance Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-xl text-white">
                    <CreditBalanceIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg dark:text-white">Credit Balance</CardTitle>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column - Stats */}
                <div className="space-y-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:bg-gray-700/60 dark:border-gray-600">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                        <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Credits</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{creditBalance?.availableCredits || 0}</p>
                          <Badge className={
                            (creditBalance?.availableCredits || 0) > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                          }>
                            {(creditBalance?.availableCredits || 0) > 0 ? 'Active' : 'Insufficient'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:bg-gray-700/60 dark:border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <WalletIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Credits</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{displaySubscription.totalCredits || 0}</p>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:bg-gray-700/60 dark:border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Usage This Period</p>
                      </div>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{displaySubscription.usageThisPeriod || 0}</p>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:bg-gray-700/60 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Credit Expiry</p>
                    </div>
                    {creditBalance?.creditExpiry ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {(() => {
                            const expiryDate = new Date(creditBalance.creditExpiry);
                            return expiryDate.toLocaleDateString();
                          })()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(() => {
                            const expiryDate = new Date(creditBalance.creditExpiry);
                            return expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">No expiry</p>
                    )}
                  </div>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="space-y-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:bg-gray-700/60 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-4">
                      <StatsIcon className="h-5 w-5 text-green-500 dark:text-green-400" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Credit Status</p>
                    </div>
                    <div className="space-y-3">
                      {/* Free Credits */}
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Free Credits</span>
                          </div>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">{creditBalance?.freeCredits || 0}</span>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Expires with subscription plan
                        </p>
                      </div>

                      {/* Paid Credits */}
                      <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Paid Credits</span>
                          </div>
                          <span className="font-bold text-amber-800 dark:text-amber-300">{creditBalance?.paidCredits || 0}</span>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          <Shield className="w-3 h-3 inline mr-1" />
                          Never expires • Permanent access
                        </p>
                      </div>
                      {(displaySubscription.alerts || []).length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm text-amber-800 dark:text-amber-300">Alerts</span>
                          </div>
                          <span className="font-semibold text-amber-800 dark:text-amber-300">{displaySubscription.alerts.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(displaySubscription.availableCredits || 0) < 100 && (
                    <Button
                      onClick={() => setActiveTab('plans')}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 h-12 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600"
                    >
                      <Coins className="h-5 w-5 mr-2" />
                      Purchase More Credits
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-12">
          {/* Section 1: Credit Top-ups */}
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Credit Top-ups
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Need more credits? Purchase additional credits that never expire and use them anytime for your business operations.
              </p>
            </div>

            {/* Professional grid layout for credit top-ups */}
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                {creditTopups.map((topup, index) => (
                  <div
                    key={topup.id}
                    className="flex justify-center animate-slide-in-up"
                    style={{
                      animationDelay: `${index * 150}ms`
                    }}
                  >
                    <PricingCard
                      name={topup.name}
                      description={topup.description}
                      credits={topup.credits}
                      price={topup.price}
                      currency={topup.currency}
                      features={topup.features}
                      recommended={topup.recommended}
                      type="topup"
                      onPurchase={() => handleCreditPurchase(topup.id)}
                      isLoading={isUpgrading && selectedPlan === topup.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual separator */}
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            <div className="px-6">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
          </div>

          {/* Section 2: Application Plans */}
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Application Plans
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Choose a plan that fits your business needs with included free credits and access to premium features.
              </p>
            </div>

            {/* Professional grid layout for application plans */}
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                {applicationPlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="flex justify-center animate-slide-in-up"
                    style={{
                      animationDelay: `${index * 150}ms`
                    }}
                  >
                    <PricingCard
                      name={plan.name}
                      description={plan.description}
                      monthlyPrice={plan.monthlyPrice}
                      annualPrice={plan.annualPrice}
                      currency={plan.currency}
                      features={plan.features}
                      freeCredits={plan.freeCredits}
                      recommended={plan.popular}
                      type="application"
                      onPurchase={() => handlePlanPurchase(plan.id)}
                      isLoading={isUpgrading && selectedPlan === plan.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Modern Payment History Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-emerald-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 rounded-xl text-white">
                <PaymentHistoryIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment History</h3>
              </div>
            </div>
          </div>

          {billingHistoryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600 dark:text-gray-400">Loading payment history...</p>
              </div>
            </div>
          ) : !displayBillingHistory || displayBillingHistory.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ReceiptIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payment history yet</h4>
              <p className="text-gray-600 dark:text-gray-400">Your completed transactions will appear here</p>
            </div>
          ) : (
              <div className="space-y-4">
                {displayBillingHistory.map((payment: any) => (
                  <Card key={payment.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-xl p-3 ${
                            payment.status === 'succeeded' || payment.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {payment.status === 'succeeded' || payment.status === 'completed' ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : payment.status === 'failed' ? (
                              <X className="h-5 w-5" />
                            ) : (
                              <Clock className="h-5 w-5" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                                {payment.description || `${
                                  payment.type === 'subscription' ? 'Subscription' :
                                  payment.type === 'credit_purchase' ? 'Credit Purchase' :
                                  payment.type === 'credit_usage' ? 'Credit Usage' : 'Payment'
                                }`}
                              </h4>
                              <Badge className={
                                payment.status === 'succeeded' || payment.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' :
                                payment.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                              }>
                                {(payment.status === 'succeeded' || payment.status === 'completed') ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {payment.type === 'credit_purchase' ? 'Purchased' :
                                     payment.type === 'credit_usage' ? 'Used' : 'Paid'}
                                  </>
                                ) :
                                 payment.status === 'failed' ? (
                                  <>
                                    <X className="w-3 h-3 mr-1" />
                                    Failed
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </Badge>
                              {payment.type && (
                                <Badge variant="outline" className="text-xs">
                                  {payment.type === 'subscription' ? 'Subscription' :
                                   payment.type === 'credit_purchase' ? 'Credit Purchase' :
                                   payment.type === 'credit_usage' ? 'Credit Usage' : payment.type}
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(payment.paidAt || payment.createdAt)}
                                  {payment.billingReason && ` • ${payment.billingReason.replace(/_/g, ' ')}`}
                                </span>
                              </div>

                              {payment.paymentMethodDetails?.card && (
                                <div className="flex items-center gap-2">
                                  <CreditCardLucide className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    **** **** **** {payment.paymentMethodDetails.card.last4} • {payment.paymentMethodDetails.card.brand?.toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {payment.invoiceNumber && (
                              <div className="flex items-center gap-2 mb-3">
                                <ReceiptIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Invoice #{payment.invoiceNumber}
                                </span>
                              </div>
                            )}

                            {/* Stripe Payment Details */}
                            {payment.stripePaymentIntentId && (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <div>
                                    <span className="font-medium">Payment ID:</span>
                                    <div className="font-mono">{payment.stripePaymentIntentId}</div>
                                  </div>
                                  {payment.stripeChargeId && payment.stripeChargeId !== payment.stripePaymentIntentId && (
                                    <div>
                                      <span className="font-medium">Charge ID:</span>
                                      <div className="font-mono">{payment.stripeChargeId}</div>
                                    </div>
                                  )}
                                  {payment.stripeInvoiceId && (
                                    <div>
                                      <span className="font-medium">Invoice ID:</span>
                                      <div className="font-mono">{payment.stripeInvoiceId}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-3">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-4 py-3 border border-emerald-200 dark:border-emerald-800">
                            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                              {payment.type === 'credit_purchase' ? 'Purchase Amount' : 'Total Amount'}
                            </div>
                          </div>

                          {payment.creditsPurchased && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2 border border-blue-200 dark:border-blue-800">
                              <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                +{payment.creditsPurchased.toLocaleString()} credits
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-500">
                                Credits Added
                              </div>
                            </div>
                          )}

                          {(payment.taxAmount > 0 || payment.processingFees > 0) && (
                            <div className="text-xs text-gray-500 space-y-1">
                              {payment.taxAmount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span>Tax:</span>
                                  <span className="font-medium">{formatCurrency(payment.taxAmount)}</span>
                                </div>
                              )}
                              {payment.processingFees > 0 && (
                                <div className="flex items-center gap-1">
                                  <span>Fees:</span>
                                  <span className="font-medium">{formatCurrency(payment.processingFees)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPaymentForDetails(payment)}
                              className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(payment, null, 2))}`, '_blank')}
                              className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Receipt
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Modern Plan Management */}
            {displaySubscription.plan !== 'free' && (
            <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-500 rounded-xl text-white">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg dark:text-white">Plan Management</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
               

                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-red-200 hover:shadow-md transition-all dark:bg-gray-700/60 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-lg dark:bg-red-900/30">
                        <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Cancel Subscription</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          Cancel your subscription (effective at end of billing period)
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelDialog(true)}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
        </TabsContent>
      </Tabs>

      {/* Immediate Downgrade Dialog - Removed - all plan changes are scheduled */}

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-4">
              Your subscription will be canceled at the end of your current billing period ({formatDate(displaySubscription.currentPeriodEnd)}). 
              You'll retain access to all features until then.
            </p>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelDialog(false)}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              <Button 
                onClick={() => {
                  // Handle regular cancellation here
                  toast.success('Cancellation feature coming soon!');
                  setShowCancelDialog(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Dialog */}
      {selectedPaymentForRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Request Refund</h3>
            <p className="text-gray-600 mb-4">
              Request a refund for this payment. Refunds are typically processed within 5-10 business days.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason (optional)</label>
              <textarea 
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Please let us know why you're requesting a refund..."
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPaymentForRefund(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  refundMutation.mutate({
                    paymentId: selectedPaymentForRefund,
                    reason: refundReason || 'customer_request'
                  });
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? 'Processing...' : 'Request Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPaymentForDetails}
        isOpen={!!selectedPaymentForDetails}
        onClose={() => setSelectedPaymentForDetails(null)}
        onRefund={(paymentId) => {
          setSelectedPaymentForDetails(null)
          setSelectedPaymentForRefund(paymentId)
        }}
      />

      {/* Payment Upgrade Modal */}
      <PaymentUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        selectedPlan={upgradeModalPlan}
        onUpgradeComplete={handleUpgradeComplete}
        isProcessingPayment={isUpgrading}
      />
    </div>
  )
}

export default Billing 