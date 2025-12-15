import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOrgStore } from '@/store/org-store';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';

interface CreditBalance {
  entityId: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  lastUpdated: string;
}

export function CreditWarningBanner() {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const [dismissed, setDismissed] = useState(false);

  // Fetch credit balance
  const { data: creditData, error } = useQuery<CreditBalance>({
    queryKey: ['creditBalance', selectedOrg],
    queryFn: async () => {
      const params = selectedOrg ? { entityId: selectedOrg } : {};
      const response = await api.get<CreditBalance>('/credits/balance', { params });
      return response.data;
    },
    enabled: !!selectedOrg,
    refetchInterval: 30000,
    staleTime: 25000,
    retry: false, // Don't retry on 404 errors
  });

  // Don't show if dismissed or no org selected
  if (dismissed || !selectedOrg) {
    return null;
  }

  // Check for no credit assignment
  const noCreditAssignment = error && 
    (error as any)?.response?.status === 404 &&
    (error as any)?.response?.data?.message === 'No credit allocation found for this entity';

  // Check for low credits
  const isLowCredits = creditData && creditData.allocatedCredits > 0 && 
    creditData.availableCredits < creditData.allocatedCredits * 0.2; // Less than 20%

  const isCriticalCredits = creditData && creditData.allocatedCredits > 0 && 
    creditData.availableCredits < creditData.allocatedCredits * 0.1; // Less than 10%

  // Don't show if no warnings
  if (!noCreditAssignment && !isLowCredits && !isCriticalCredits) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "w-full px-4 py-3 border-b",
          noCreditAssignment
            ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
            : isCriticalCredits
            ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
            : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {noCreditAssignment ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                    No Credits Assigned
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    This organization does not have any credits allocated. Please allocate credits from the wrapper application to continue using CRM features.
                  </p>
                </div>
              </>
            ) : isCriticalCredits ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                    Critical: Credits Running Very Low
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Only {creditData.availableCredits.toLocaleString()} credits remaining out of {creditData.allocatedCredits.toLocaleString()} ({((creditData.availableCredits / creditData.allocatedCredits) * 100).toFixed(1)}%). Please allocate more credits soon.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    Warning: Credits Running Low
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                    Only {creditData.availableCredits.toLocaleString()} credits remaining out of {creditData.allocatedCredits.toLocaleString()} ({((creditData.availableCredits / creditData.allocatedCredits) * 100).toFixed(1)}%). Consider allocating more credits.
                  </p>
                </div>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className={cn(
              "h-8 w-8 p-0 flex-shrink-0",
              noCreditAssignment || isCriticalCredits
                ? "text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
                : "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

