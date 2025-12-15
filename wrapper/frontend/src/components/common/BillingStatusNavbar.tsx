import React from 'react';
import { Coins, Calendar, Crown, AlertTriangle, Clock, Shield } from 'lucide-react';
import { useCreditStatusQuery } from '@/hooks/useSharedQueries';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BillingStatusNavbarProps {
  className?: string;
}

export function BillingStatusNavbar({ className }: BillingStatusNavbarProps) {
  const { isAuthenticated } = useKindeAuth();

  // Fetch credit status
  const { data: creditResponse, isLoading: creditLoading } = useCreditStatusQuery();

  // Fetch subscription status
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      try {
        console.log('🔍 BillingStatusNavbar: Fetching subscription data...');
        const response = await subscriptionAPI.getCurrent();
        console.log('✅ BillingStatusNavbar: Subscription data received:', response.data.data);
        return response.data.data;
      } catch (error: any) {
        console.error('❌ BillingStatusNavbar: Error fetching subscription:', error);
        if (error.response?.status === 404) {
          console.log('⚠️ BillingStatusNavbar: No subscription found, using free plan fallback');
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
    enabled: isAuthenticated,
    retry: 1
  });

  const creditData = creditResponse?.data;
  const isLoading = creditLoading || subscriptionLoading;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-3 px-3 py-2", className)}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="w-16 h-3 bg-gray-300 rounded"></div>
        </div>
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="w-12 h-3 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!creditData || !subscription) {
    return null;
  }

  const {
    availableCredits = 0,
    freeCredits = 0,
    paidCredits = 0,
    creditExpiry,
    lowBalanceThreshold = 100,
    criticalBalanceThreshold = 10
  } = creditData;

  // Calculate expiry status early
  const isExpiringSoon = creditExpiry ? new Date(creditExpiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false;

  const isLowBalance = availableCredits <= lowBalanceThreshold;
  const isCriticalBalance = availableCredits <= criticalBalanceThreshold;


  // Determine status color based on credit balance
  const getStatusColor = () => {
    if (isCriticalBalance) return 'text-red-600 dark:text-red-400';
    if (isLowBalance) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getExpiryColor = () => {
    if (isExpiringSoon) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className={cn("flex items-center gap-4 px-3 py-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50", className)}>
      {/* Credits Section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Coins className={cn("w-4 h-4", getStatusColor())} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {availableCredits.toLocaleString()} credits
            </span>
          </div>
        </div>

        {/* Free Credits */}
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
          <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {freeCredits} free
          </span>
        </div>

        {/* Paid Credits */}
        {paidCredits > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-md border border-amber-200/70 dark:border-amber-800/50">
            <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {paidCredits} paid
            </span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

      {/* Subscription Plan */}
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 capitalize">
            {subscription.plan} Plan
          </span>
          {subscription.status === 'trial' && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Trial
            </span>
          )}
        </div>
      </div>

      {/* Subscription Plan Expiry */}
      {subscription?.currentPeriodEnd && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2">
            <Crown className={cn("w-4 h-4", "text-purple-600 dark:text-purple-400")} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {subscription.plan === 'free' ? 'Plan Expires' : 'Plan Renews'}
              </span>
              <span className={cn("text-xs", getExpiryColor())}>
                {(() => {
                  const periodEnd = new Date(subscription.currentPeriodEnd);
                  return periodEnd.toLocaleDateString() + ' ' + periodEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Credit Expiry Date */}
      {creditExpiry && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2">
            <Calendar className={cn("w-4 h-4", getExpiryColor())} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                Credits Expire
              </span>
              <span className={cn("text-xs", getExpiryColor())}>
                {(() => {
                  const expiryDate = new Date(creditExpiry);
                  return expiryDate.toLocaleDateString() + ' ' + expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Low Balance Warning */}
      {(isLowBalance || isExpiringSoon) && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
          <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        </>
      )}
    </div>
  );
}
