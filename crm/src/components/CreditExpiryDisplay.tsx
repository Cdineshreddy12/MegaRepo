import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertTriangle } from 'lucide-react';
import { api } from '@/services/api';
import { useOrgStore } from '@/store/org-store';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditBalanceResponse {
  entityId: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  lastUpdated: string;
  creditExpiry?: string;
}

export function CreditExpiryDisplay() {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);

  const { data: creditData, isLoading } = useQuery<CreditBalanceResponse>({
    queryKey: ['creditBalance', selectedOrg],
    queryFn: async () => {
      const entityId = selectedOrg;
      const params = entityId ? { entityId } : {};
      const response = await api.get<CreditBalanceResponse>('/credits/balance', { params });
      return response.data;
    },
    enabled: !!selectedOrg,
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });

  if (!selectedOrg || isLoading || !creditData?.creditExpiry) {
    return null;
  }

  const expiryDate = new Date(creditData.creditExpiry);
  const now = new Date();
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;
  const isExpiringVerySoon = daysRemaining <= 3 && daysRemaining >= 0;

  const getExpiryColor = () => {
    if (isExpired) return 'text-red-600 dark:text-red-400';
    if (isExpiringVerySoon) return 'text-red-600 dark:text-red-400';
    if (isExpiringSoon) return 'text-orange-600 dark:text-orange-400';
    return 'text-muted-foreground';
  };

  const getExpiryBgColor = () => {
    if (isExpired) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (isExpiringVerySoon) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (isExpiringSoon) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-background border-border/40';
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors",
              getExpiryBgColor(),
              getExpiryColor()
            )}
          >
            {isExpired || isExpiringVerySoon ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">
              {isExpired
                ? 'Expired'
                : isExpiringVerySoon
                ? `${daysRemaining}d`
                : isExpiringSoon
                ? `${daysRemaining}d`
                : expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="p-3">
          <div className="space-y-1">
            <div className="font-semibold text-sm">
              {isExpired ? 'Credits Expired' : 'Credits Expire'}
            </div>
            <div className="text-xs text-muted-foreground">
              {expiryDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {expiryDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            {!isExpired && (
              <div className="text-xs pt-1 border-t border-border/50 mt-1">
                {daysRemaining === 0
                  ? 'Expires today'
                  : daysRemaining === 1
                  ? 'Expires tomorrow'
                  : `${daysRemaining} days remaining`}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}








