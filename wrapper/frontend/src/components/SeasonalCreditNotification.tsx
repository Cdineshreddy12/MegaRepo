import React, { useState, useEffect } from 'react';
import { Gift, X, Sparkles, Calendar, Coins } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface SeasonalCreditAllocation {
  campaignId: string;
  campaignName: string;
  creditType: string;
  allocatedCredits: number;
  expiresAt: string;
  allocatedAt: string;
  applications: string[];
}

interface SeasonalCreditNotificationProps {
  className?: string;
  onDismiss?: () => void;
}

export const SeasonalCreditNotification: React.FC<SeasonalCreditNotificationProps> = ({
  className,
  onDismiss
}) => {
  const [recentAllocations, setRecentAllocations] = useState<SeasonalCreditAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Load recent credit allocations
  useEffect(() => {
    const loadRecentAllocations = async () => {
      try {
        // Check for recent seasonal credit allocations (last 7 days)
        const response = await api.get('/api/seasonal-credits/recent-allocations', {
          params: { days: 7 }
        });

        if (response.data.success && response.data.data.length > 0) {
          // Filter out already dismissed notifications
          const newAllocations = response.data.data.filter(
            (allocation: SeasonalCreditAllocation) =>
              !dismissedNotifications.has(allocation.campaignId)
          );

          setRecentAllocations(newAllocations);
        }
      } catch (error) {
        console.error('Failed to load recent credit allocations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load dismissed notifications from localStorage
    const stored = localStorage.getItem('dismissed_credit_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedNotifications(new Set(parsed));
      } catch (error) {
        console.error('Failed to parse dismissed notifications:', error);
      }
    }

    loadRecentAllocations();
  }, [dismissedNotifications]);

  const handleDismiss = (campaignId: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(campaignId);
    setDismissedNotifications(newDismissed);

    // Save to localStorage
    localStorage.setItem(
      'dismissed_credit_notifications',
      JSON.stringify(Array.from(newDismissed))
    );

    // Move to next notification or call onDismiss
    if (currentIndex < recentAllocations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onDismiss) {
      onDismiss();
    }
  };

  const handleViewCredits = () => {
    // Navigate to credits page or open credits modal
    window.location.href = '/dashboard?tab=credits';
  };

  const getCreditTypeEmoji = (type: string) => {
    switch (type) {
      case 'seasonal': return '🎄';
      case 'bonus': return '🎁';
      case 'promotional': return '📢';
      case 'event': return '🎉';
      case 'partnership': return '🤝';
      case 'trial_extension': return '⏰';
      default: return '💰';
    }
  };

  const getCreditTypeColor = (type: string) => {
    switch (type) {
      case 'seasonal': return 'bg-green-100 text-green-800 border-green-200';
      case 'bonus': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'promotional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'event': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'partnership': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'trial_extension': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;
    return `Expires ${date.toLocaleDateString()}`;
  };

  // Don't render if loading or no allocations
  if (isLoading || recentAllocations.length === 0) {
    return null;
  }

  const currentAllocation = recentAllocations[currentIndex];
  if (!currentAllocation) return null;

  return (
    <div className={cn("fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-right-2", className)}>
      <Card className="border-2 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <h3 className="font-semibold text-sm">Congratulations!</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={() => handleDismiss(currentAllocation.campaignId)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Credits have been added to your account!
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCreditTypeEmoji(currentAllocation.creditType)}</span>
                    <span className="font-medium text-sm">{currentAllocation.campaignName}</span>
                  </div>
                  <Badge className={cn("text-xs", getCreditTypeColor(currentAllocation.creditType))}>
                    {currentAllocation.creditType}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-lg text-green-600">
                      +{currentAllocation.allocatedCredits.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600">credits</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatExpiryDate(currentAllocation.expiresAt)}
                  </div>
                </div>

                {currentAllocation.applications && currentAllocation.applications.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Available for:</p>
                    <div className="flex flex-wrap gap-1">
                      {currentAllocation.applications.slice(0, 3).map((app) => (
                        <Badge key={app} variant="outline" className="text-xs px-1 py-0">
                          {app}
                        </Badge>
                      ))}
                      {currentAllocation.applications.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{currentAllocation.applications.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleViewCredits}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  View Credits
                </Button>
                {recentAllocations.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentIndex((currentIndex + 1) % recentAllocations.length)}
                  >
                    Next ({currentIndex + 1}/{recentAllocations.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook to check for new credit allocations and show toast notifications
export const useSeasonalCreditNotifications = () => {
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  useEffect(() => {
    const checkForNewCredits = async () => {
      try {
        const response = await api.get('/api/seasonal-credits/recent-allocations', {
          params: { days: 1, limit: 5 }
        });

        if (response.data.success && response.data.data.length > 0) {
          const newAllocations = response.data.data.filter((allocation: SeasonalCreditAllocation) => {
            const allocationTime = new Date(allocation.allocatedAt);
            return !lastCheckTime || allocationTime > lastCheckTime;
          });

          // Show toast notifications for new allocations
          newAllocations.forEach((allocation: SeasonalCreditAllocation) => {
            toast.success(
              `${getCreditTypeEmoji(allocation.creditType)} ${allocation.allocatedCredits} credits added - ${allocation.campaignName}`,
              {
                duration: 6000,
                icon: '🎉'
              }
            );
          });

          if (newAllocations.length > 0) {
            setLastCheckTime(new Date());
          }
        }
      } catch (error) {
        console.error('Failed to check for new credit allocations:', error);
      }
    };

    // Check immediately on mount, then every 5 minutes
    checkForNewCredits();
    const interval = setInterval(checkForNewCredits, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lastCheckTime]);

  return { lastCheckTime };
};

// Helper function for emoji
const getCreditTypeEmoji = (type: string) => {
  switch (type) {
    case 'seasonal': return '🎄';
    case 'bonus': return '🎁';
    case 'promotional': return '📢';
    case 'event': return '🎉';
    case 'partnership': return '🤝';
    case 'trial_extension': return '⏰';
    default: return '💰';
  }
};
