import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertTriangle, TrendingUp, Calendar, RefreshCw, Clock, Crown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ThemeBadge, ThemeBadgeProps } from './common/ThemeBadge';
import { useCreditStatusQuery, useCreditUsageSummary } from '@/hooks/useSharedQueries';
import { useQuery } from '@tanstack/react-query';
import { subscriptionAPI } from '@/lib/api';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Section } from '@/components/common/Page/Section';
import { Typography } from '@/components/common/Typography';
import { Flex } from '@/components/common/Page';

interface CreditBalanceProps {
  showPurchaseButton?: boolean;
  showUsageStats?: boolean;
  compact?: boolean;
  onPurchaseClick?: () => void;
  className?: string;
}

interface CreditAllocation {
  allocationId: string;
  tenantId: string;
  sourceEntityId: string;
  targetApplication: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  allocationType: string;
  allocationPurpose?: string;
  allocatedAt: string;
  expiresAt?: string;
  autoReplenish: boolean;
}

export function CreditBalance({
  showPurchaseButton = true,
  showUsageStats = true,
  compact = false,
  onPurchaseClick,
  className
}: CreditBalanceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isAuthenticated } = useKindeAuth();

  // Fetch credit balance using shared hook
  const {
    data: creditResponse,
    isLoading,
    error,
    refetch
  } = useCreditStatusQuery();

  // Fetch usage summary using shared hook
  const {
    data: usageResponse
  } = useCreditUsageSummary(showUsageStats ? {
    period: 'month'
  } : undefined);

  // Fetch subscription data for expiry information
  const { data: subscription } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      try {
        console.log('🔍 CreditBalance: Fetching subscription data...');
        const response = await subscriptionAPI.getCurrent();
        console.log('✅ CreditBalance: Subscription data received:', {
          plan: response.data.data?.plan,
          status: response.data.data?.status,
          currentPeriodEnd: response.data.data?.currentPeriodEnd,
          stripeSubscriptionId: response.data.data?.stripeSubscriptionId
        });
        return response.data.data;
      } catch (error: any) {
        console.error('❌ CreditBalance: Error fetching subscription:', error);
        if (error.response?.status === 404) {
          console.log('⚠️ CreditBalance: No subscription found, using free plan fallback');
          return {
            plan: 'free',
            status: 'active',
            currentPeriodEnd: null,
            trialEnd: null
          };
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 1
  });

  const creditData = creditResponse?.data;
  const usageData = usageResponse?.data;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Credit balance refreshed');
    } catch (error) {
      toast.error('Failed to refresh credit balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusVariant = (availableCredits: number, lowBalanceThreshold: number): ThemeBadgeProps['variant'] => {
    if (availableCredits <= lowBalanceThreshold * 0.1) return 'critical';
    if (availableCredits <= lowBalanceThreshold) return 'low';
    return 'success';
  };


  const getStatusText = (availableCredits: number, lowBalanceThreshold: number) => {
    if (availableCredits <= lowBalanceThreshold * 0.1) return 'Critical';
    if (availableCredits <= lowBalanceThreshold) return 'Low';
    return 'Good';
  };

  if (isLoading) {
    return (
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        variant="card"
        loading={true}
        className={className}
      >
        <div />
      </Section>
    );
  }

  if (error || !creditData) {
    return (
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        variant="minimal"
        error="Failed to load credit balance"
        headerActions={[
          {
            label: "Retry",
            onClick: handleRefresh,
            loading: isRefreshing,
            variant: "outline",
            icon: RefreshCw
          }
        ]}
        className={className}
      >
        <div />
      </Section>
    );
  }

  const {
    availableCredits = 0,
    totalCredits = 0,
    freeCredits = 0,
    paidCredits = 0,
    lowBalanceThreshold = 100,
    criticalBalanceThreshold = 10,
    creditExpiry,
    alerts = [],
    usageThisPeriod = 0,
    periodType = 'month',
    allocations = [] // New field for credit allocations
  } = creditData;

  const usagePercentage = totalCredits > 0 ? (usageThisPeriod / totalCredits) * 100 : 0;
  const isLowBalance = availableCredits <= lowBalanceThreshold;
  const isCriticalBalance = availableCredits <= criticalBalanceThreshold;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border gap-4">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {availableCredits.toLocaleString()} credits available
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500">
                {totalCredits.toLocaleString()} total
              </p>
              {paidCredits > 0 && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                  {paidCredits} paid
                </span>
              )}
              {allocations.length > 0 && (
                <span className="text-xs text-blue-600">
                  ({allocations.length} allocation{allocations.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>
        <ThemeBadge variant={getStatusVariant(availableCredits, lowBalanceThreshold)}>
          {getStatusText(availableCredits, lowBalanceThreshold)}
        </ThemeBadge>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
      {/* Main Credit Balance Section */}
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        showDivider={true}
        variant="minimal"
        headerActions={[
          {
            label: "Refresh",
            onClick: handleRefresh,
            loading: isRefreshing,
            variant: "outline",
            icon: RefreshCw
          }
        ]}
        className={className}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Available Credits */}
          <div className="text-center space-y-2">
            <Typography variant="h2" >
              {availableCredits.toLocaleString()}
            </Typography>
            <Typography variant="label" className='block'>Available Credits</Typography>
            <ThemeBadge variant={getStatusVariant(availableCredits, lowBalanceThreshold)}>
              {getStatusText(availableCredits, lowBalanceThreshold)}
            </ThemeBadge>
          </div>

            {/* Total Credits */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {totalCredits.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Credits</div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">
                  {freeCredits} free
                </div>
                {paidCredits > 0 && (
                  <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200 inline-block">
                    <Coins className="h-3 w-3 inline mr-1" />
                    {paidCredits} paid
                  </div>
                )}
              </div>
            </div>

          {/* Usage This Period */}
          <div className="text-center space-y-2">
            <Typography variant="h2" >
              {usageThisPeriod.toLocaleString()}
            </Typography>
            <Typography variant="label" className='block'>Used This {periodType}</Typography>
            <Typography variant="caption" >
              {usagePercentage.toFixed(1)}% of total
            </Typography>
          </div>
        </div>

        {/* Usage Progress Bar */}
        {showUsageStats && (
          <div className="space-y-2">
            <Flex justify='between' align='center' gap={2}>
              <Typography variant="label">
                {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Usage
              </Typography>
              <Typography variant="small" >
                {usageThisPeriod}/{totalCredits} credits
              </Typography>
            </Flex>
            <Progress value={usagePercentage} className="h-2" />
          </div>
        )}

          {/* Credit Expiry Details - Comprehensive & Transparent View */}
          {(subscription || creditExpiry || allocations.length > 0) && (
            <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-bold text-gray-900">
                      Credit Expiry Overview
                    </span>
                    <span className="text-xs text-gray-500">
                      {allocations.filter((a: any) => a.expiresAt).length} with expiry dates
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Subscription Plan Expiry - Always Show */}
                    {subscription && (
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-2 border-purple-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-purple-600" />
                            <div>
                              <div className="text-sm font-bold text-purple-900">Subscription Plan</div>
                              <div className="text-xs text-purple-700 capitalize">
                                {subscription.plan || 'free'} Plan
                                {subscription.plan !== 'free' && subscription.plan !== 'trial' && (
                                  <span className="ml-2 px-2 py-0.5 bg-purple-200 rounded text-purple-800 font-semibold">PAID</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {subscription.currentPeriodEnd ? (
                              <>
                                <div className="text-xs font-medium text-purple-600 mb-1">Renewal Date</div>
                                <div className="text-sm font-bold text-purple-900">
                                  {(() => {
                                    const periodEnd = new Date(subscription.currentPeriodEnd);
                                    return periodEnd.toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    });
                                  })()}
                                </div>
                                <div className="text-xs text-purple-600 mt-1">
                                  {(() => {
                                    const periodEnd = new Date(subscription.currentPeriodEnd);
                                    return periodEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  })()}
                                </div>
                                {(() => {
                                  const periodEnd = new Date(subscription.currentPeriodEnd);
                                  const now = new Date();
                                  const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                  return (
                                    <div className={`text-xs font-semibold mt-2 px-2 py-1 rounded ${
                                      daysRemaining <= 7 ? 'bg-red-100 text-red-700' :
                                      daysRemaining <= 30 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                                    </div>
                                  );
                                })()}
                              </>
                            ) : (
                              <div className="text-xs text-purple-600">No expiry date set</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Categorized Credit Expiries */}
                    {allocations && allocations.length > 0 && (() => {
                      // Categorize all allocations
                      const paidCredits = allocations.filter((a: any) => a.creditType === 'paid');
                      const onboardingCredits = allocations.filter((a: any) => 
                        a.creditType === 'free' && (a.allocationType === 'subscription' || a.allocationType === 'trial' || 
                         a.allocationPurpose?.toLowerCase().includes('trial') || 
                         a.allocationPurpose?.toLowerCase().includes('onboarding'))
                      );
                      const seasonalCredits = allocations.filter((a: any) => 
                        ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'].includes(a.creditType)
                      );
                      const freeCredits = allocations.filter((a: any) => 
                        a.creditType === 'free' && !onboardingCredits.includes(a) && !seasonalCredits.includes(a)
                      );
                      const otherCredits = allocations.filter((a: any) => 
                        !paidCredits.includes(a) && !onboardingCredits.includes(a) && 
                        !seasonalCredits.includes(a) && !freeCredits.includes(a)
                      );

                      return (
                        <div className="space-y-3">
                          {/* Paid Credits Expiry */}
                          {paidCredits.length > 0 && (
                            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-sm font-bold text-amber-900">
                                  Paid Credits ({paidCredits.length} {paidCredits.length === 1 ? 'allocation' : 'allocations'})
                                </span>
                              </div>
                              <div className="space-y-2 ml-5">
                                {paidCredits
                                  .sort((a: any, b: any) => {
                                    const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
                                    const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
                                    return aDate - bDate;
                                  })
                                  .map((alloc: any) => {
                                    const expiryDate = alloc.expiresAt ? new Date(alloc.expiresAt) : null;
                                    const now = new Date();
                                    const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                    const isExpired = expiryDate && expiryDate < now;
                                    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

                                    return (
                                      <div key={alloc.allocationId} className="flex justify-between items-center text-xs bg-white/60 p-2 rounded border border-amber-200">
                                        <div className="flex items-center gap-2">
                                          <Coins className="h-3 w-3 text-amber-600" />
                                          <span className="font-medium text-gray-900">
                                            {alloc.availableCredits.toLocaleString()} credits
                                          </span>
                                          {alloc.allocationPurpose && (
                                            <span className="text-gray-600">({alloc.allocationPurpose})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {expiryDate ? (
                                            <>
                                              <div className="text-right">
                                                <div className="font-medium text-gray-900">
                                                  {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                  {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              </div>
                                              <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                                isExpired ? 'bg-red-100 text-red-700' :
                                                isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                                {isExpired ? 'Expired' : `${daysRemaining}d`}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 text-[10px]">No expiry</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Onboarding/Trial Credits Expiry */}
                          {onboardingCredits.length > 0 && (
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-bold text-blue-900">
                                  Onboarding/Trial Credits ({onboardingCredits.length} {onboardingCredits.length === 1 ? 'allocation' : 'allocations'})
                                </span>
                              </div>
                              <div className="space-y-2 ml-5">
                                {onboardingCredits
                                  .sort((a: any, b: any) => {
                                    const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
                                    const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
                                    return aDate - bDate;
                                  })
                                  .map((alloc: any) => {
                                    const expiryDate = alloc.expiresAt ? new Date(alloc.expiresAt) : null;
                                    const now = new Date();
                                    const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                    const isExpired = expiryDate && expiryDate < now;
                                    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

                                    return (
                                      <div key={alloc.allocationId} className="flex justify-between items-center text-xs bg-white/60 p-2 rounded border border-blue-200">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3 text-blue-600" />
                                          <span className="font-medium text-gray-900">
                                            {alloc.availableCredits.toLocaleString()} credits
                                          </span>
                                          {alloc.allocationPurpose && (
                                            <span className="text-gray-600">({alloc.allocationPurpose})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {expiryDate ? (
                                            <>
                                              <div className="text-right">
                                                <div className="font-medium text-gray-900">
                                                  {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                  {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              </div>
                                              <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                                isExpired ? 'bg-red-100 text-red-700' :
                                                isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                                {isExpired ? 'Expired' : `${daysRemaining}d`}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 text-[10px]">No expiry</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Seasonal/Promotional Credits Expiry */}
                          {seasonalCredits.length > 0 && (
                            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm font-bold text-green-900">
                                  Seasonal/Promotional Credits ({seasonalCredits.length} {seasonalCredits.length === 1 ? 'allocation' : 'allocations'})
                                </span>
                              </div>
                              <div className="space-y-2 ml-5">
                                {seasonalCredits
                                  .sort((a: any, b: any) => {
                                    const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
                                    const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
                                    return aDate - bDate;
                                  })
                                  .map((alloc: any) => {
                                    const expiryDate = alloc.expiresAt ? new Date(alloc.expiresAt) : null;
                                    const now = new Date();
                                    const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                    const isExpired = expiryDate && expiryDate < now;
                                    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

                                    return (
                                      <div key={alloc.allocationId} className="flex justify-between items-center text-xs bg-white/60 p-2 rounded border border-green-200">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3 w-3 text-green-600" />
                                          <span className="font-medium text-gray-900 capitalize">
                                            {alloc.creditType}
                                          </span>
                                          {alloc.campaignName && (
                                            <span className="text-gray-600">({alloc.campaignName})</span>
                                          )}
                                          <span className="text-gray-500">- {alloc.availableCredits.toLocaleString()} credits</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {expiryDate ? (
                                            <>
                                              <div className="text-right">
                                                <div className="font-medium text-gray-900">
                                                  {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                  {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              </div>
                                              <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                                isExpired ? 'bg-red-100 text-red-700' :
                                                isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                                {isExpired ? 'Expired' : `${daysRemaining}d`}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 text-[10px]">No expiry</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Free Credits Expiry */}
                          {freeCredits.length > 0 && (
                            <div className="p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border-2 border-gray-300">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                <span className="text-sm font-bold text-gray-900">
                                  Free Credits ({freeCredits.length} {freeCredits.length === 1 ? 'allocation' : 'allocations'})
                                </span>
                              </div>
                              <div className="space-y-2 ml-5">
                                {freeCredits
                                  .sort((a: any, b: any) => {
                                    const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
                                    const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
                                    return aDate - bDate;
                                  })
                                  .map((alloc: any) => {
                                    const expiryDate = alloc.expiresAt ? new Date(alloc.expiresAt) : null;
                                    const now = new Date();
                                    const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                    const isExpired = expiryDate && expiryDate < now;
                                    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

                                    return (
                                      <div key={alloc.allocationId} className="flex justify-between items-center text-xs bg-white/60 p-2 rounded border border-gray-200">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900">
                                            {alloc.availableCredits.toLocaleString()} credits
                                          </span>
                                          {alloc.allocationPurpose && (
                                            <span className="text-gray-600">({alloc.allocationPurpose})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {expiryDate ? (
                                            <>
                                              <div className="text-right">
                                                <div className="font-medium text-gray-900">
                                                  {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                  {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              </div>
                                              <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                                isExpired ? 'bg-red-100 text-red-700' :
                                                isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                                {isExpired ? 'Expired' : `${daysRemaining}d`}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 text-[10px]">No expiry</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Other Credits Expiry */}
                          {otherCredits.length > 0 && (
                            <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-300">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                <span className="text-sm font-bold text-indigo-900">
                                  Other Credits ({otherCredits.length} {otherCredits.length === 1 ? 'allocation' : 'allocations'})
                                </span>
                              </div>
                              <div className="space-y-2 ml-5">
                                {otherCredits
                                  .sort((a: any, b: any) => {
                                    const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
                                    const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
                                    return aDate - bDate;
                                  })
                                  .map((alloc: any) => {
                                    const expiryDate = alloc.expiresAt ? new Date(alloc.expiresAt) : null;
                                    const now = new Date();
                                    const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                    const isExpired = expiryDate && expiryDate < now;
                                    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

                                    return (
                                      <div key={alloc.allocationId} className="flex justify-between items-center text-xs bg-white/60 p-2 rounded border border-indigo-200">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900 capitalize">
                                            {alloc.creditType || 'Credits'}
                                          </span>
                                          {alloc.allocationPurpose && (
                                            <span className="text-gray-600">({alloc.allocationPurpose})</span>
                                          )}
                                          <span className="text-gray-500">- {alloc.availableCredits.toLocaleString()} credits</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {expiryDate ? (
                                            <>
                                              <div className="text-right">
                                                <div className="font-medium text-gray-900">
                                                  {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                  {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                              </div>
                                              <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                                isExpired ? 'bg-red-100 text-red-700' :
                                                isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                                {isExpired ? 'Expired' : `${daysRemaining}d`}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 text-[10px]">No expiry</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Expiry Warning Alert */}
                    {creditExpiry && (() => {
                      const expiryDate = new Date(creditExpiry);
                      const now = new Date();
                      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = daysRemaining < 0;
                      const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;

                      if (isExpired || isExpiringSoon) {
                        return (
                          <div className={`mt-4 p-3 rounded-lg border-2 ${
                            isExpired ? 'bg-red-50 border-red-300' :
                            'bg-yellow-50 border-yellow-300'
                          }`}>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={`h-5 w-5 ${
                                isExpired ? 'text-red-600' : 'text-yellow-600'
                              }`} />
                              <div className="flex-1">
                                <div className={`text-sm font-bold ${
                                  isExpired ? 'text-red-900' : 'text-yellow-900'
                                }`}>
                                  {isExpired ? '⚠️ Credits Have Expired' : '⚠️ Credits Expiring Soon'}
                                </div>
                                <div className={`text-xs mt-1 ${
                                  isExpired ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                  {isExpired 
                                    ? `Your earliest credit expiry was ${Math.abs(daysRemaining)} days ago on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please check allocations above.`
                                    : `Your earliest credit expires in ${daysRemaining} days on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          {showPurchaseButton && (isLowBalance || availableCredits === 0) && (
            <div className="mt-6">
              <Button
                onClick={onPurchaseClick}
                className="w-full"
                variant={isCriticalBalance ? "default" : "outline"}
              >
                <Coins className="h-4 w-4 mr-2" />
                {isCriticalBalance ? 'Purchase Credits Now' : 'Purchase More Credits'}
              </Button>
            </div>
          )}
      </Section>

      {/* Paid Credits Highlight */}
      {paidCredits > 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Coins className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-900">
                    Paid Credits Active
                  </h3>
                  <p className="text-xs text-green-700">
                    {paidCredits.toLocaleString()} premium credits available
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {paidCredits.toLocaleString()}
                </div>
                <div className="text-xs text-green-600">
                  Paid
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any, index: number) => (
            <Alert key={index} className={
              alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
              alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className={
                alert.severity === 'critical' ? 'text-red-800' :
                alert.severity === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }>
                <Typography variant="small" className="font-semibold">
                  {alert.title}:
                </Typography>
                <Typography variant="small" className="ml-1">
                  {alert.message}
                </Typography>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Usage Statistics */}
      {showUsageStats && usageData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Your credit consumption patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {usageData.totalPurchased || 0}
                </div>
                <div className="text-sm text-gray-600">Purchased</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {usageData.totalConsumed || 0}
                </div>
                <div className="text-sm text-gray-600">Consumed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {usageData.totalExpired || 0}
                </div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {usageData.netCredits || 0}
                </div>
                <div className="text-sm text-gray-600">Net Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Allocations with Expiry Details */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Credit Allocations & Expiry Details
            </CardTitle>
            <CardDescription>
              Detailed breakdown of your credit allocations with expiry dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Group allocations by type */}
              {(() => {
                const onboardingCredits = allocations.filter((a: any) => 
                  a.creditType === 'free' && (a.allocationType === 'subscription' || a.allocationType === 'trial' || a.allocationPurpose?.toLowerCase().includes('trial') || a.allocationPurpose?.toLowerCase().includes('onboarding'))
                );
                const seasonalCredits = allocations.filter((a: any) => 
                  ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'].includes(a.creditType)
                );
                const otherCredits = allocations.filter((a: any) => 
                  !onboardingCredits.includes(a) && !seasonalCredits.includes(a)
                );

                return (
                  <>
                    {/* Onboarding/Trial Credits */}
                    {onboardingCredits.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-6 bg-blue-500 rounded"></div>
                          <h4 className="text-sm font-semibold text-gray-900">Onboarding/Trial Credits</h4>
                        </div>
                        {onboardingCredits.map((allocation: any) => {
                          const expiryDate = allocation.expiresAt ? new Date(allocation.expiresAt) : null;
                          const now = new Date();
                          const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          const isExpired = expiryDate && expiryDate < now;
                          const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

                          return (
                            <div key={allocation.allocationId} className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {allocation.availableCredits.toLocaleString()} / {allocation.allocatedCredits.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">Available / Allocated</div>
                                  <div className="text-xs text-blue-600 mt-1 font-medium">Onboarding Credits</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {allocation.allocatedAt ? formatDate(allocation.allocatedAt) : 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">Allocated On</div>
                                </div>
                                <div className="text-center">
                                  {expiryDate ? (
                                    <>
                                      <div className="text-sm font-medium text-gray-900">
                                        {expiryDate.toLocaleDateString()}
                                      </div>
                                      <div className="text-xs text-gray-500">Expires On</div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {isExpired ? (
                                        <div className="text-xs text-red-600 mt-1 font-medium">Expired</div>
                                      ) : isExpiringSoon ? (
                                        <div className="text-xs text-orange-600 mt-1 font-medium">
                                          {daysRemaining} days left
                                        </div>
                                      ) : daysRemaining !== null ? (
                                        <div className="text-xs text-green-600 mt-1">
                                          {daysRemaining} days remaining
                                        </div>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm font-medium text-gray-400">No expiry</div>
                                      <div className="text-xs text-gray-500">Never expires</div>
                                    </>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {allocation.allocationPurpose || allocation.allocationType}
                                  </div>
                                  <div className="text-xs text-gray-500">Purpose</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Seasonal Credits */}
                    {seasonalCredits.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-6 bg-green-500 rounded"></div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Seasonal/Promotional Credits ({seasonalCredits.length})
                          </h4>
                        </div>
                        {seasonalCredits.map((allocation: any) => {
                          console.log('🎨 Rendering seasonal credit:', {
                            allocationId: allocation.allocationId,
                            creditType: allocation.creditType,
                            campaignName: allocation.campaignName,
                            expiresAt: allocation.expiresAt,
                            availableCredits: allocation.availableCredits
                          });
                          
                          const expiryDate = allocation.expiresAt ? new Date(allocation.expiresAt) : null;
                          const now = new Date();
                          const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          const isExpired = expiryDate && expiryDate < now;
                          const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

                          return (
                            <div key={allocation.allocationId} className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {allocation.availableCredits.toLocaleString()} / {allocation.allocatedCredits.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">Available / Allocated</div>
                                  <div className="text-xs text-green-600 mt-1 font-medium capitalize">
                                    {allocation.creditType} Credits
                                    {allocation.campaignName && ` - ${allocation.campaignName}`}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {allocation.allocatedAt ? formatDate(allocation.allocatedAt) : 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">Allocated On</div>
                                </div>
                                <div className="text-center">
                                  {expiryDate ? (
                                    <>
                                      <div className="text-sm font-medium text-gray-900">
                                        {expiryDate.toLocaleDateString()}
                                      </div>
                                      <div className="text-xs text-gray-500">Expires On</div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {isExpired ? (
                                        <div className="text-xs text-red-600 mt-1 font-medium">Expired</div>
                                      ) : isExpiringSoon ? (
                                        <div className="text-xs text-orange-600 mt-1 font-medium">
                                          {daysRemaining} days left
                                        </div>
                                      ) : daysRemaining !== null ? (
                                        <div className="text-xs text-green-600 mt-1">
                                          {daysRemaining} days remaining
                                        </div>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm font-medium text-gray-400">No expiry</div>
                                      <div className="text-xs text-gray-500">Never expires</div>
                                    </>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {allocation.allocationPurpose || allocation.allocationType}
                                  </div>
                                  <div className="text-xs text-gray-500">Purpose</div>
                                  {allocation.campaignName && (
                                    <div className="text-xs text-gray-400 mt-1">{allocation.campaignName}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Other Credits */}
                    {otherCredits.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-6 bg-gray-400 rounded"></div>
                          <h4 className="text-sm font-semibold text-gray-900">Other Credits</h4>
                        </div>
                        {otherCredits.map((allocation: any) => {
                          const expiryDate = allocation.expiresAt ? new Date(allocation.expiresAt) : null;
                          const now = new Date();
                          const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          const isExpired = expiryDate && expiryDate < now;
                          const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

                          return (
                            <div key={allocation.allocationId} className="border rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {allocation.availableCredits.toLocaleString()} / {allocation.allocatedCredits.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">Available / Allocated</div>
                                  <div className="text-xs text-gray-400 mt-1 capitalize">
                                    {allocation.creditType === 'free' ? 'Free Credits' : allocation.creditType === 'paid' ? 'Paid Credits' : `${allocation.creditType} Credits`}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {allocation.allocatedAt ? formatDate(allocation.allocatedAt) : 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">Allocated On</div>
                                </div>
                                <div className="text-center">
                                  {expiryDate ? (
                                    <>
                                      <div className="text-sm font-medium text-gray-900">
                                        {expiryDate.toLocaleDateString()}
                                      </div>
                                      <div className="text-xs text-gray-500">Expires On</div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {isExpired ? (
                                        <div className="text-xs text-red-600 mt-1">Expired</div>
                                      ) : isExpiringSoon ? (
                                        <div className="text-xs text-orange-600 mt-1">
                                          {daysRemaining} days left
                                        </div>
                                      ) : daysRemaining !== null ? (
                                        <div className="text-xs text-green-600 mt-1">
                                          {daysRemaining} days remaining
                                        </div>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm font-medium text-gray-400">No expiry</div>
                                      <div className="text-xs text-gray-500">Never expires</div>
                                    </>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {allocation.allocationPurpose || allocation.allocationType}
                                  </div>
                                  <div className="text-xs text-gray-500">Purpose</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
