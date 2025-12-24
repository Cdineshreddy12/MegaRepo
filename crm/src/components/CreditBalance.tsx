import { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Coins, RefreshCw, AlertCircle, Info, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrgStore } from '@/store/org-store';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useCreditOperations } from '@/hooks/useCreditOperations';
import { useCreditStore } from '@/store/credit-store';
import { QUERY_KEY } from '@/queries/constants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditBalance {
  entityId: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  lastUpdated: string;
  creditExpiry?: string;
}

// Map operation codes to user-friendly labels
const operationLabels: Record<string, string> = {
  'crm.accounts.create': 'Account',
  'crm.accounts.update': 'Account',
  'crm.contacts.create': 'Contact',
  'crm.contacts.update': 'Contact',
  'crm.leads.create': 'Lead',
  'crm.leads.update': 'Lead',
  'crm.opportunities.create': 'Opportunity',
  'crm.opportunities.update': 'Opportunity',
  'crm.quotations.create': 'Quotation',
  'crm.quotations.update': 'Quotation',
  'crm.quotations.delete': 'Quotation',
  'crm.tasks.create': 'Task',
  'crm.tasks.update': 'Task',
  'crm.events.create': 'Event',
  'crm.events.update': 'Event',
  'crm.tickets.create': 'Ticket',
  'crm.tickets.update': 'Ticket',
  'crm.invoices.create': 'Invoice',
  'crm.invoices.update': 'Invoice',
  'crm.sales-orders.create': 'Sales Order',
  'crm.sales-orders.update': 'Sales Order',
  'crm.product-orders.create': 'Product Order',
  'crm.product-orders.update': 'Product Order',
};

// Helper function to get operation label
const getOperationLabel = (operationCode: string): string => {
  if (operationLabels[operationCode]) {
    return operationLabels[operationCode];
  }
  
  // Fallback: extract operation name from code and format it
  const parts = operationCode.split('.');
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    // Convert "create", "update", "delete" to capitalized form
    const formatted = lastPart
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return formatted;
  }
  
  return 'Operation';
};

// Animated Number Component
function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export function CreditBalance({ compact = false }: { compact?: boolean }) {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pendingOperations, recentDeduction: recentDeductionFromHook } = useCreditOperations();
  const creditStore = useCreditStore();

  const [displayedCredits, setDisplayedCredits] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastSyncedCreditsRef = useRef<number | null>(null);

  // Fetch logic
  const { data: creditData, isLoading, isFetching, refetch, error } = useQuery<CreditBalance>({
    queryKey: ['creditBalance', selectedOrg],
    queryFn: async () => {
      try {
        const entityId = selectedOrg;
        const params = entityId ? { entityId } : {};
        const response = await api.get<CreditBalance>('/credits/balance', { params });
        
        if (entityId && response.data) {
          creditStore.setBalance(selectedOrg, response.data);
        }
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.message === 'No credit allocation found for this entity') {
          toast({
            title: "Credit Allocation Required",
            description: "Please allocate credits from the wrapper application.",
            variant: "destructive",
          });
        }
        throw error;
      }
    },
    enabled: !!selectedOrg,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    notifyOnChangeProps: ['data', 'error'],
  });

  const storeBalance = useMemo(() => {
    return selectedOrg ? creditStore.getBalance(selectedOrg) : null;
  }, [selectedOrg, creditStore]);

  // Event Listeners for Credit Logic
  useEffect(() => {
    const handleOptimisticDeduction = (event: CustomEvent) => {
      const { availableCredits } = event.detail;
      if (selectedOrg && availableCredits !== undefined) {
        const storeBalance = creditStore.getBalance(selectedOrg);
        if (storeBalance) {
          setDisplayedCredits(storeBalance.availableCredits);
          setIsTransitioning(true);
          queryClient.setQueryData(['creditBalance', selectedOrg], storeBalance);
        }
      }
    };

    window.addEventListener('creditDeductedOptimistically', handleOptimisticDeduction as EventListener);
    return () => window.removeEventListener('creditDeductedOptimistically', handleOptimisticDeduction as EventListener);
  }, [selectedOrg, creditStore, queryClient]);

  useEffect(() => {
    const handleCreditDeduction = (event: CustomEvent) => {
      const { availableCredits: serverCredits } = event.detail;
      
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
      
      if (selectedOrg && serverCredits !== undefined && serverCredits >= 0) {
        const currentBalance = creditStore.getBalance(selectedOrg);
        if (currentBalance) {
          creditStore.setBalance(selectedOrg, {
            ...currentBalance,
            availableCredits: serverCredits,
            usedCredits: currentBalance.allocatedCredits - serverCredits,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['creditBalance', selectedOrg] });
      queryClient.invalidateQueries({ queryKey: ['creditBalance'], exact: false });

      refetch().then((result) => {
        if (result.data && result.data.availableCredits >= 0) {
          setDisplayedCredits(result.data.availableCredits);
          lastSyncedCreditsRef.current = result.data.availableCredits;
        }
        setIsTransitioning(false);
      }).catch(() => setIsTransitioning(false));
    };

    window.addEventListener('creditDeducted', handleCreditDeduction as EventListener);
    return () => window.removeEventListener('creditDeducted', handleCreditDeduction as EventListener);
  }, [selectedOrg, queryClient, refetch, creditStore]);

  useEffect(() => {
    if (creditData && !hasInitializedRef.current && !isTransitioning) {
      setDisplayedCredits(creditData.availableCredits);
      hasInitializedRef.current = true;
      lastSyncedCreditsRef.current = creditData.availableCredits;
    }
  }, [creditData, isTransitioning]);

  useEffect(() => {
    if (!isTransitioning && displayedCredits !== null && creditData?.availableCredits !== undefined) {
      const difference = Math.abs(displayedCredits - creditData.availableCredits);
      if (lastSyncedCreditsRef.current !== creditData.availableCredits && difference < 1) {
        setDisplayedCredits(null);
        lastSyncedCreditsRef.current = creditData.availableCredits;
      }
    }
  }, [creditData, displayedCredits, isTransitioning]);

  // View Calculation
  const allocated = creditData?.allocatedCredits ?? 0;
  const current = useMemo(() => {
    if (storeBalance && storeBalance.availableCredits >= 0) return storeBalance.availableCredits;
    if (displayedCredits !== null && displayedCredits >= 0) return displayedCredits;
    if (creditData?.availableCredits !== undefined && creditData.availableCredits >= 0) return creditData.availableCredits;
    return 0;
  }, [storeBalance, displayedCredits, creditData]);

  if (!selectedOrg) return null;

  if (isLoading && !creditData) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 bg-muted/20 rounded-full border border-border/40 animate-pulse">
        <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
        <div className="w-16 h-4 rounded bg-muted-foreground/10" />
      </div>
    );
  }

  const hasError = error && (error as any)?.response?.status === 404;
  if (!creditData || hasError) return null;

  // Visual States
  const percentage = allocated > 0 ? (current / allocated) * 100 : 0;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;
  const latestPendingOp = pendingOperations[pendingOperations.length - 1];

  // Colors
  const statusColor = isCritical 
    ? 'text-red-500' 
    : isLow 
      ? 'text-amber-500' 
      : 'text-emerald-500';

  const ringColor = isCritical 
    ? 'stroke-red-500' 
    : isLow 
      ? 'stroke-amber-500' 
      : 'stroke-emerald-500';

  const bgStyles = isCritical
    ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
    : isLow
    ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
    : "bg-background border-border/40 hover:bg-muted/40 shadow-sm";

  return (
    <div className="flex items-center gap-3">
      {/* Activity Indicators (Floating) */}
      <AnimatePresence>
        {recentDeductionFromHook && (
           <motion.div
             initial={{ opacity: 0, y: 10, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: -10, scale: 0.9 }}
             className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20"
           >
             <TrendingDown className="w-3 h-3" />
             <span className="font-semibold">-{recentDeductionFromHook.creditsDeducted}</span>
             <span className="text-red-600/80">for {getOperationLabel(recentDeductionFromHook.operationCode)}</span>
           </motion.div>
        )}
      </AnimatePresence>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                "group relative flex items-center gap-2 h-9 pl-2 pr-3 rounded-full border transition-all duration-300",
                bgStyles,
                compact ? "text-xs h-8" : "text-sm"
              )}
            >
              {/* Icon Container with Progress Ring */}
              <div className="relative flex items-center justify-center w-5 h-5">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  {/* Background Ring */}
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-muted-foreground/10"
                    strokeWidth="3"
                  />
                  {/* Progress Ring */}
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className={cn(ringColor, "transition-colors duration-500")}
                    strokeWidth="3"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - Math.min(percentage, 100) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isFetching || latestPendingOp ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Coins className={cn("w-2.5 h-2.5", statusColor)} />
                  )}
                </div>
              </div>

              {/* Balance Text */}
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="font-semibold text-foreground/90">
                  <AnimatedNumber value={current} />
                </span>
                {!compact && (
                  <span className="text-xs text-muted-foreground/70 font-normal hidden sm:inline-block">
                    credits
                  </span>
                )}
              </div>

              {/* Status Dot */}
              {isCritical && (
                 <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse ml-1" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="p-4 w-64 glass-panel">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-semibold">Credit Balance</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", 
                  isCritical ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
                )}>
                  {percentage < 1 ? '< 1' : Math.round(percentage)}% Left
                </span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-foreground">{current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium text-foreground">{((creditData?.usedCredits ?? 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/50 mt-1">
                  <span className="text-muted-foreground">Total Allocated</span>
                  <span className="font-medium text-foreground">{allocated.toLocaleString()}</span>
                </div>
              </div>

              {latestPendingOp && (
                <div className="flex items-center gap-2 pt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md mt-2">
                   <RefreshCw className="w-3 h-3 animate-spin" />
                   <span>Processing {getOperationLabel(latestPendingOp.operationCode)}...</span>
                </div>
              )}
              
              {recentDeductionFromHook && (
                <div className="flex items-center gap-2 pt-2 text-xs text-red-600 bg-red-50 p-2 rounded-md mt-2 border border-red-200">
                   <TrendingDown className="w-3 h-3" />
                   <span>
                     <span className="font-semibold">-{recentDeductionFromHook.creditsDeducted} credits</span>
                     {' '}deducted for {getOperationLabel(recentDeductionFromHook.operationCode)}
                   </span>
                </div>
              )}

              {creditData?.creditExpiry && (
                <div className="flex items-center gap-2 pt-2 text-xs border-t border-border/50 mt-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Credits Expire</span>
                    <span className="font-medium text-foreground">
                      {new Date(creditData.creditExpiry).toLocaleDateString()} {new Date(creditData.creditExpiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
