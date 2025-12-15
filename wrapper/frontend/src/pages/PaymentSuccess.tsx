import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  CreditCard,
  Crown,
  Users,
  Building,
  ArrowRight,
  Home,
  Clock,
  FileText,
  Mail,
  Zap,
  Shield,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subscriptionAPI, creditAPI } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);
  const queryClient = useQueryClient();

  // Get payment details from URL parameters
  const sessionId = searchParams.get('session_id');
  const urlPaymentType = searchParams.get('type');

  // Determine payment type with better logic
  const determinePaymentType = () => {
    // If explicitly specified in URL, use that
    if (urlPaymentType && ['subscription', 'credit_purchase'].includes(urlPaymentType)) {
      return urlPaymentType;
    }

    // If sessionId exists, try to detect from session format or make API call
    if (sessionId) {
      // Check if it's a mock session (development)
      if (sessionId.startsWith('mock_session_')) {
        return searchParams.get('plan') ? 'subscription' : 'credit_purchase';
      }

      // For real Stripe sessions, we need to determine type
      // Default to subscription for now, API will clarify
      return 'subscription';
    }

    return 'subscription'; // fallback
  };

  const paymentType = determinePaymentType();

  // Debug logging
  console.log('PaymentSuccess component rendered', {
    paymentType,
    sessionId,
    urlPaymentType,
    url: window.location.href,
    allParams: Object.fromEntries(searchParams.entries())
  });

  // Fetch payment details with better error handling
  const { data: paymentData, isLoading: paymentLoading, error: paymentError } = useQuery({
    queryKey: ['payment', sessionId, paymentType],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      try {
        if (paymentType === 'subscription') {
          console.log('Fetching subscription payment details for session:', sessionId);
          const result = await subscriptionAPI.getPaymentDetailsBySession(sessionId);
          console.log('Subscription payment details result:', result);
          return result;
        } else {
          console.log('Fetching credit payment details for session:', sessionId);
          const result = await creditAPI.getPaymentDetails(sessionId);
          console.log('Credit payment details result:', result);
          return result;
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);

        // If subscription API fails, try credit API as fallback
        if (paymentType === 'subscription') {
          try {
            console.log('Trying credit API as fallback for session:', sessionId);
            const result = await creditAPI.getPaymentDetails(sessionId);
            console.log('Credit API fallback result:', result);
            return result;
          } catch (fallbackError) {
            console.error('Credit API fallback also failed:', fallbackError);
            throw apiError; // Throw original error
          }
        }

        throw apiError;
      }
    },
    enabled: !!sessionId,
    retry: (failureCount, error) => {
      // Retry up to 3 times, but not for 404 errors
      if (error?.message?.includes('404') || error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch current subscription and credit data for context
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionAPI.getCurrent(),
    enabled: paymentType === 'subscription'
  });

  const { data: creditData, isLoading: creditLoading } = useQuery({
    queryKey: ['credit'],
    queryFn: () => creditAPI.getCurrentBalance(),
    enabled: !!sessionId // Enable for all payment types since we want to show current balance
  });

  // Store previous state for comparison (simulate what it was before payment)
  const getPreviousState = () => {
    if (!creditData?.data || !paymentInfo) return null;

    const currentCredits = creditData.data.availableCredits || 0;
    const currentPaidCredits = creditData.data.paidCredits || 0;
    const currentFreeCredits = creditData.data.freeCredits || 0;

    // For credit purchases, estimate previous credits
    if (paymentType === 'credit_purchase' && paymentInfo.amount) {
      // Assume credits were added based on payment amount
      // This is a rough estimate - in real implementation, you'd want to track this better
      const creditsAdded = Math.floor(paymentInfo.amount * 100); // Assuming $1 = 100 credits
      return {
        credits: Math.max(0, currentCredits - creditsAdded),
        paidCredits: Math.max(0, currentPaidCredits - creditsAdded),
        freeCredits: currentFreeCredits,
        plan: subscriptionData?.data?.plan || 'free'
      };
    }

    // For plan upgrades, show previous plan
    if (paymentType === 'subscription') {
      // Try to determine previous plan from payment info or current data
      let previousPlan = 'free';
      const currentPlan = subscriptionData?.data?.plan || 'free';

      // Logic to determine previous plan based on current plan
      const planHierarchy = ['free', 'trial', 'starter', 'professional', 'enterprise'];
      const currentIndex = planHierarchy.indexOf(currentPlan);
      if (currentIndex > 0) {
        previousPlan = planHierarchy[currentIndex - 1];
      }

      return {
        credits: currentCredits,
        paidCredits: currentPaidCredits,
        freeCredits: currentFreeCredits,
        plan: previousPlan
      };
    }

    return null;
  };

  const previousState = getPreviousState();
  const currentState = creditData?.data ? {
    credits: creditData.data.availableCredits || 0,
    paidCredits: creditData.data.paidCredits || 0,
    freeCredits: creditData.data.freeCredits || 0,
    plan: subscriptionData?.data?.plan || 'free'
  } : null;

  const paymentDetails = paymentData?.data;
  const subscription = subscriptionData?.data;
  const creditBalance = creditData?.data;

  // Enhanced data extraction with fallbacks
  const getPaymentInfo = () => {
    if (!paymentDetails) return null;

    // Handle different response structures
    if (paymentDetails.sessionId || paymentDetails.transactionId) {
      return {
        sessionId: paymentDetails.sessionId || paymentDetails.transactionId,
        transactionId: paymentDetails.transactionId || paymentDetails.sessionId,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency || 'USD',
        planId: paymentDetails.planId,
        planName: paymentDetails.planName || paymentDetails.planId,
        billingCycle: paymentDetails.billingCycle,
        paymentMethod: paymentDetails.paymentMethod,
        status: paymentDetails.status,
        createdAt: paymentDetails.createdAt,
        processedAt: paymentDetails.processedAt,
        description: paymentDetails.description,
        subscription: paymentDetails.subscription,
        features: paymentDetails.features,
        credits: paymentDetails.credits,
        // Additional fields that might be present
        ...paymentDetails
      };
    }

    return paymentDetails;
  };

  const paymentInfo = getPaymentInfo();

  useEffect(() => {
    setShowSuccessCheck(true);
    localStorage.removeItem('trialExpired');
  }, []);

  const getPlanIcon = (planId: string) => {
    switch (planId?.toLowerCase()) {
      case 'starter':
        return <Building className="h-5 w-5" />;
      case 'professional':
        return <Users className="h-5 w-5" />;
      case 'enterprise':
        return <Crown className="h-5 w-5" />;
      default:
        return <Building className="h-5 w-5" />;
    }
  };

  const getCreditDetails = () => {
    // For credit purchases, use the current balance data instead of payment details
    if (creditData?.data) {
      return {
        freeCredits: creditData.data.freeCredits || 0,
        paidCredits: creditData.data.paidCredits || 0,
        freeCreditsExpiry: creditData.data.freeCreditsExpiry ? new Date(creditData.data.freeCreditsExpiry) : null,
        paidCreditsExpiry: creditData.data.paidCreditsExpiry ? new Date(creditData.data.paidCreditsExpiry) : null,
        totalCredits: creditData.data.availableCredits || creditData.data.totalCredits || 0
      };
    }

    // Fallback to payment details if current balance not available
    if (paymentInfo) {
      return {
        freeCredits: paymentInfo.freeCredits || 0,
        paidCredits: paymentInfo.paidCredits || 0,
        freeCreditsExpiry: paymentInfo.freeCreditsExpiry ? new Date(paymentInfo.freeCreditsExpiry) : null,
        paidCreditsExpiry: paymentInfo.paidCreditsExpiry ? new Date(paymentInfo.paidCreditsExpiry) : null,
        totalCredits: paymentInfo.credits || 0
      };
    }

    return null;
  };

  const planDetails = paymentInfo && paymentType === 'subscription' ? {
    name: paymentInfo.planName || paymentInfo.planId,
    price: paymentInfo.amount,
    billingCycle: paymentInfo.billingCycle,
    features: paymentInfo.features || [],
    icon: getPlanIcon(paymentInfo.planId),
    subscription: paymentInfo.subscription
  } : null;

  const creditDetails = getCreditDetails();

  // Debug logging
  console.log('PaymentSuccess Debug:', {
    paymentType,
    sessionId,
    paymentData,
    paymentDetails,
    paymentInfo,
    creditData,
    creditBalance,
    creditDetails
  });

  if (paymentLoading || subscriptionLoading || (paymentType === 'credit_purchase' && creditLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600"></div>
          </div>
          <p className="text-slate-600 font-medium">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  // Handle errors
  if (paymentError) {
    console.error('Payment details error:', paymentError);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-lg mb-4">
            <div className="text-red-600 text-2xl">⚠️</div>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Payment Details</h1>
          <p className="text-slate-600 mb-4">
            We couldn't retrieve your payment information. Please check your payment was processed successfully.
          </p>
          <div className="text-sm text-slate-500 bg-slate-100 p-3 rounded-lg mb-4">
            Session ID: {sessionId || 'Not found'}<br />
            Type: {paymentType}<br />
            Payment Info: {paymentInfo ? 'Available' : 'Not available'}<br />
            Error: {paymentError?.message || 'Unknown error'}
          </div>
          <Button onClick={() => navigate('/billing')} className="w-full">
            Return to Billing
          </Button>
        </div>
      </div>
    );
  }

  // Handle missing session ID
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg mb-4">
            <div className="text-yellow-600 text-2xl">?</div>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Missing Payment Information</h1>
          <p className="text-slate-600 mb-4">
            We couldn't find your payment session. Please check your payment was processed successfully.
          </p>
          <Button onClick={() => navigate('/billing')} className="w-full">
            Return to Billing
          </Button>
        </div>
      </div>
    );
  }

  // Handle missing payment details (API returned success but no data)
  if (!paymentLoading && !paymentError && (!paymentData || !paymentInfo)) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold text-slate-900">Payment Confirmed</div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-emerald-700 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Success Section */}
            <div className="mb-12">
              <div className="flex flex-col items-center text-center">
                {/* Checkmark Animation */}
                <div className={`relative mb-6 transition-all duration-700 ${showSuccessCheck ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                  <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-emerald-600" strokeWidth={1.5} />
                  </div>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-3">
                  {paymentType === 'credit_purchase'
                    ? 'Credits Successfully Added'
                    : 'Plan Activated Successfully'}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl">
                  {paymentType === 'credit_purchase'
                    ? 'Your credits are now available and ready to use across all your projects.'
                    : 'Your subscription is now active. All premium features and benefits are unlocked.'}
                </p>
              </div>
            </div>

            {/* Payment Details Card */}
            <Card className="mb-8 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Session ID</p>
                  <p className="font-mono text-sm text-slate-900 break-all">{sessionId || 'N/A'}</p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Payment Processing
                  </Badge>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-1">Details</p>
                  <p className="text-sm text-slate-600">
                    Payment details are being processed. Check back in a few minutes or contact support if this persists.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
              <Button
                onClick={() => {
                  // Invalidate billing-related queries to ensure fresh data
                  queryClient.invalidateQueries({ queryKey: ['subscription'] });
                  queryClient.invalidateQueries({ queryKey: ['credit'] });
                  navigate('/billing');
                }}
                variant="outline"
                className="px-8 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                View Billing
              </Button>
            </div>

            {/* Support Footer */}
            <div className="text-center pt-8 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Payment processed successfully. <a href="mailto:support@yourcompany.com" className="text-blue-600 hover:text-blue-700 font-medium">Contact support</a> if you need assistance.
              </p>
              <p className="text-xs text-slate-500 mt-3">
                Reference: <span className="font-mono">{sessionId?.substring(0, 32)}...</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold text-slate-900">Payment Confirmed</div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-emerald-700 font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Success Section */}
          <div className="mb-12">
            <div className="flex flex-col items-center text-center">
              {/* Checkmark Animation */}
              <div className={`relative mb-6 transition-all duration-700 ${showSuccessCheck ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-600" strokeWidth={1.5} />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                {paymentType === 'credit_purchase'
                  ? 'Credits Successfully Added to Your Account'
                  : `Successfully Upgraded to ${planDetails?.name || 'Premium Plan'}`}
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                {paymentType === 'credit_purchase'
                  ? 'Your additional credits have been added and are immediately available for use.'
                  : 'Your subscription has been upgraded. All new features and benefits are now active.'}
              </p>

              {/* What Changed Summary */}
              {(previousState && currentState) && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    What Changed
                  </h3>
                  <div className="space-y-2 text-sm">
                    {paymentType === 'credit_purchase' ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800">Previous Credits:</span>
                          <span className="font-semibold text-blue-900">{previousState.credits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800">Credits Added:</span>
                          <span className="font-semibold text-green-600">+{(currentState.credits - previousState.credits).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                          <span className="text-blue-800 font-medium">New Total:</span>
                          <span className="font-bold text-blue-900">{currentState.credits.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800">Previous Plan:</span>
                          <span className="font-semibold text-blue-900 capitalize">{previousState.plan}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800">New Plan:</span>
                          <span className="font-semibold text-green-600 capitalize">{currentState.plan}</span>
                        </div>
                        {currentState.credits !== previousState.credits && (
                          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                            <span className="text-blue-800 font-medium">Credits Updated:</span>
                            <span className="font-bold text-blue-900">
                              {previousState.credits.toLocaleString()} → {currentState.credits.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Before vs After Comparison - Only show if we have both states */}
          {(previousState && currentState && (
            paymentType === 'subscription' ||
            (paymentType === 'credit_purchase' && (currentState.credits - previousState.credits) > 0)
          )) && (
            <div className="mb-12">
              <Card className="border-slate-200 shadow-lg bg-gradient-to-r from-slate-50 to-blue-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                    <ArrowRight className="w-6 h-6 text-blue-600" />
                    {paymentType === 'subscription' ? 'Plan Upgrade Summary' : 'Credit Addition Summary'}
                  </CardTitle>
                  <CardDescription>
                    {paymentType === 'subscription'
                      ? 'See exactly what changed with your plan upgrade'
                      : 'See how your credit balance was updated'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Before State */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-slate-700">Before</h3>
                      </div>

                      {paymentType === 'subscription' ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                            <span className="text-sm text-slate-600">Plan</span>
                            <Badge variant="outline" className="capitalize">{previousState.plan}</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                            <span className="text-sm text-slate-600">Credits</span>
                            <span className="font-semibold">{previousState.credits.toLocaleString()}</span>
                          </div>
                          <div className="p-3 bg-slate-100 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Available Applications</p>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const prevPlanApps = {
                                  free: ['crm'],
                                  trial: ['crm'],
                                  starter: ['crm', 'hr'],
                                  professional: ['crm', 'hr'],
                                  enterprise: ['crm', 'hr', 'affiliateConnect']
                                };
                                return (prevPlanApps[previousState.plan as keyof typeof prevPlanApps] || ['crm'])
                                  .map(app => (
                                    <Badge key={app} variant="secondary" className="text-xs capitalize">
                                      {app === 'affiliateConnect' ? 'Affiliate' : app}
                                    </Badge>
                                  ));
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                            <span className="text-sm text-slate-600">Total Credits</span>
                            <span className="font-semibold">{previousState.credits.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                            <span className="text-sm text-slate-600">Paid Credits</span>
                            <span className="font-semibold">{previousState.paidCredits.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* After State */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <h3 className="text-lg font-semibold text-blue-700">After</h3>
                      </div>

                      {paymentType === 'subscription' ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <span className="text-sm text-green-700">Plan</span>
                            <Badge className="bg-green-100 text-green-800 capitalize">{currentState.plan}</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="text-sm text-blue-700">Credits</span>
                            <span className="font-semibold text-blue-900">
                              {currentState.credits > previousState.credits && (
                                <span className="text-green-600 font-bold mr-1">
                                  +{(currentState.credits - previousState.credits).toLocaleString()}
                                </span>
                              )}
                              {currentState.credits.toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700 mb-1">Available Applications</p>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const currPlanApps = {
                                  free: ['crm'],
                                  trial: ['crm'],
                                  starter: ['crm', 'hr'],
                                  professional: ['crm', 'hr'],
                                  enterprise: ['crm', 'hr', 'affiliateConnect']
                                };
                                return (currPlanApps[currentState.plan as keyof typeof currPlanApps] || ['crm'])
                                  .map(app => (
                                    <Badge key={app} className="bg-blue-100 text-blue-800 text-xs capitalize">
                                      {app === 'affiliateConnect' ? 'Affiliate' : app}
                                    </Badge>
                                  ));
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <span className="text-sm text-green-700">Total Credits</span>
                            <span className="font-semibold text-green-900">
                              <span className="text-green-600 font-bold mr-1">
                                +{(currentState.credits - previousState.credits).toLocaleString()}
                              </span>
                              {currentState.credits.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <span className="text-sm text-amber-700">Paid Credits</span>
                            <span className="font-semibold text-amber-900">
                              <span className="text-green-600 font-bold mr-1">
                                +{(currentState.paidCredits - previousState.paidCredits).toLocaleString()}
                              </span>
                              {currentState.paidCredits.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Message */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {paymentType === 'subscription'
                            ? `Successfully upgraded from ${previousState.plan} to ${currentState.plan} plan!`
                            : `Successfully added ${((currentState.credits || 0) - (previousState.credits || 0)).toLocaleString()} credits to your account!`
                          }
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {paymentType === 'subscription'
                            ? 'All new features and increased limits are immediately available.'
                            : 'Your credits are ready to use and never expire.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            {/* Payment Details Card */}
            <Card className="lg:col-span-1 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Transaction ID</p>
                  <p className="font-mono text-sm text-slate-900 break-all">{paymentInfo?.transactionId || sessionId || 'N/A'}</p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-1">Amount Paid</p>
                  <p className="text-xl font-bold text-slate-900">
                    {paymentInfo && paymentInfo.amount !== undefined && paymentInfo.amount !== null
                      ? formatCurrency(paymentInfo.amount)
                      : 'Processing...'}
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-1">Date & Time</p>
                  <p className="text-sm text-slate-900">
                    {paymentInfo?.processedAt ? formatDate(new Date(paymentInfo.processedAt)) : new Date().toLocaleString()}
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    {paymentInfo?.status || 'Completed'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Plan/Credit Details */}
            {paymentType === 'subscription' && planDetails && (
              <Card className="lg:col-span-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900 mb-1 flex items-center gap-2">
                        {planDetails.icon}
                        {planDetails.name}
                      </CardTitle>
                      <CardDescription>
                        {planDetails.billingCycle === 'yearly' ? 'Annual subscription with auto-renewal' : 'Monthly subscription'}
                      </CardDescription>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(planDetails.price)}
                      <span className="text-xs text-slate-500 font-normal">
                        /{planDetails.billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-2">
                        {planDetails.billingCycle === 'yearly' ? 'Monthly Equivalent' : 'Yearly Equivalent'}
                      </p>
                      <p className="text-xl font-semibold text-slate-900">
                        {planDetails.billingCycle === 'yearly'
                          ? formatCurrency(planDetails.price / 12)
                          : formatCurrency(planDetails.price * 12)
                        }
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-2">Next Renewal</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {planDetails.subscription?.nextBillingDate
                          ? formatDate(new Date(planDetails.subscription.nextBillingDate))
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentType === 'credit_purchase' && creditDetails && (
              <Card className="lg:col-span-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Credit Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <p className="text-xs text-emerald-600 font-medium">Free Credits</p>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {(creditDetails.freeCredits || 0).toLocaleString()}
                      </p>
                      <div className="mt-2 p-2 bg-emerald-100/50 rounded-md">
                        <p className="text-xs text-emerald-700">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {creditDetails.freeCreditsExpiry
                            ? `Expires ${formatDate(creditDetails.freeCreditsExpiry)}`
                            : 'No expiry set'
                          }
                        </p>
                        <p className="text-xs text-emerald-600 mt-1">
                          Tied to subscription plan
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-amber-600" />
                        <p className="text-xs text-amber-700 font-semibold">Paid Credits</p>
                        <Badge className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5">Premium</Badge>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {(creditDetails.paidCredits || 0).toLocaleString()}
                      </p>
                      <div className="mt-2 p-2 bg-amber-100/70 rounded-md border border-amber-200">
                        <p className="text-xs text-amber-800 font-medium">
                          <Shield className="w-3 h-3 inline mr-1" />
                          Never expires
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Permanent access • No time limits
                        </p>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <p className="text-xs text-purple-600 font-medium">Total Available</p>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {creditDetails.totalCredits.toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        Combined free + paid credits
                      </p>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Shield className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Credit Types Explained</h4>
                        <div className="text-xs text-blue-800 space-y-1">
                          <p><strong>Free Credits:</strong> Provided with your subscription plan, expire based on your plan's renewal cycle.</p>
                          <p><strong>Paid Credits:</strong> Purchased credits that never expire and provide permanent access to our services.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Features & What Was Added */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* What's Included / What Was Added */}
            <Card className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${
              paymentType === 'subscription' ? 'ring-2 ring-blue-100 bg-blue-50/30' : ''
            }`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  {paymentType === 'subscription' ? (
                    <>
                      <Crown className="w-5 h-5 text-blue-500" />
                      New Plan Features
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-amber-500" />
                      Credits Added
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {paymentType === 'subscription'
                    ? 'Everything now available with your upgraded plan'
                    : 'Your credit balance has been increased'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentType === 'subscription' ? (
                    // Plan-specific features
                    planDetails?.features && planDetails.features.length > 0 ? (
                      planDetails.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <CheckCircle className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-sm text-slate-700 font-medium">{feature}</span>
                        </div>
                      ))
                    ) : (
                      // Default plan features based on plan type
                      (() => {
                        const planFeatures = {
                          starter: [
                            'CRM Module (Leads, Contacts, Accounts, Opportunities)',
                            'HR Module (Employees, Leave Management)',
                            '60,000 Annual Credits',
                            'Up to 10 Users',
                            'Basic Support'
                          ],
                          professional: [
                            'All Starter Features',
                            'Additional CRM Modules (Quotations, Invoices, Inventory)',
                            '300,000 Annual Credits',
                            'Up to 50 Users',
                            'Priority Support',
                            'Advanced Analytics'
                          ],
                          enterprise: [
                            'All Professional Features',
                            'Affiliate Connect Platform',
                            '1,200,000 Annual Credits',
                            'Up to 500 Users',
                            'Dedicated Support',
                            'Custom Integrations',
                            'Advanced Security Features'
                          ]
                        };

                        const currentPlan = planDetails?.planId?.toLowerCase() || 'starter';
                        return (planFeatures[currentPlan as keyof typeof planFeatures] || planFeatures.starter)
                          .map((feature: string, index: number) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                <CheckCircle className="w-3 h-3 text-blue-600" />
                              </div>
                              <span className="text-sm text-slate-700 font-medium">{feature}</span>
                            </div>
                          ));
                      })()
                    )
                  ) : (
                    // Credit-specific features
                    [
                      `${((currentState?.credits || 0) - (previousState?.credits || 0)).toLocaleString()} credits added to your account`,
                      'Credits never expire',
                      'Use across all applications',
                      'No usage interruptions',
                      'Automatic balance updates'
                    ].map((feature: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircle className="w-3 h-3 text-amber-600" />
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{feature}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${
              paymentType === 'credit_purchase' ? 'ring-2 ring-amber-100 bg-amber-50/30' : ''
            }`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                  {paymentType === 'subscription' ? 'Start Using Your Upgrade' : 'Start Using Your Credits'}
                </CardTitle>
                <CardDescription>
                  {paymentType === 'subscription'
                    ? 'Your plan upgrade is complete. Here\'s what to do next.'
                    : 'Your credits are ready. Here\'s how to make the most of them.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentType === 'subscription' ? (
                    <>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">1</div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Explore New Features</p>
                          <p className="text-xs text-slate-500 mt-1">Check out the new modules and capabilities now available</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">2</div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Configure New Applications</p>
                          <p className="text-xs text-slate-500 mt-1">Set up the newly unlocked applications for your team</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">3</div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Monitor Usage & Benefits</p>
                          <p className="text-xs text-slate-500 mt-1">Track your increased limits and new capabilities</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-semibold">1</div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Credits Available Immediately</p>
                          <p className="text-xs text-slate-500 mt-1">Start using your new credits right away across all applications</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-semibold">2</div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Monitor Credit Usage</p>
                          <p className="text-xs text-slate-500 mt-1">Track consumption in your dashboard to plan future purchases</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-semibold">3</div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">Set Up Auto-Recharge (Optional)</p>
                          <p className="text-xs text-slate-500 mt-1">Configure automatic credit purchases when balance gets low</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">Confirmation Email</p>
                <p className="text-xs text-slate-500 mt-1">Sent to your registered email</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">Secure Payment</p>
                <p className="text-xs text-slate-500 mt-1">PCI DSS compliant</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
              <Settings className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">Manage Anytime</p>
                <p className="text-xs text-slate-500 mt-1">Update in account settings</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
            <Button
              onClick={() => {
                // Invalidate billing-related queries to ensure fresh data
                queryClient.invalidateQueries({ queryKey: ['subscription'] });
                queryClient.invalidateQueries({ queryKey: ['credit'] });
                navigate('/billing');
              }}
              variant="outline"
              className="px-8 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Billing Details
            </Button>
          </div>

          {/* Support Footer */}
          <div className="text-center pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Need assistance? <a href="mailto:support@yourcompany.com" className="text-blue-600 hover:text-blue-700 font-medium">Contact support</a>
            </p>
            <p className="text-xs text-slate-500 mt-3">
              Reference: <span className="font-mono">{sessionId?.substring(0, 32)}...</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;