import React from 'react';
import { useUserCredits } from '@/queries/CreditQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';

interface CreditDisplayCardProps {
  className?: string;
  showDetails?: boolean;
}

const CreditDisplayCard: React.FC<CreditDisplayCardProps> = ({
  className,
  showDetails = true
}) => {
  const { data: creditData, isLoading, error } = useUserCredits();

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Organization Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !creditData) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            Credits Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600">
            Unable to load credit information. Please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { organizationCredits } = creditData;
  const utilizationPercentage = organizationCredits.allocated > 0
    ? (organizationCredits.used / organizationCredits.allocated) * 100
    : 0;

  const getCreditStatusColor = () => {
    if (organizationCredits.available === 0) return 'destructive';
    if (utilizationPercentage >= 90) return 'destructive';
    if (utilizationPercentage >= 70) return 'secondary';
    return 'default';
  };

  const getCreditStatusIcon = () => {
    if (organizationCredits.available === 0) return <AlertTriangle className="w-4 h-4" />;
    if (utilizationPercentage >= 90) return <AlertTriangle className="w-4 h-4" />;
    if (utilizationPercentage >= 70) return <TrendingUp className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getCreditStatusMessage = () => {
    if (organizationCredits.available === 0) return 'No credits remaining';
    if (utilizationPercentage >= 90) return 'Credits running low';
    if (utilizationPercentage >= 70) return 'Moderate usage';
    return 'Good credit balance';
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-600" />
          Organization Credits
        </CardTitle>
        {/* Organization Name - Prominently displayed */}
        <div className="text-xs text-muted-foreground mt-1">
          {organizationCredits.organizationName || 'Organization'}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credit Balance */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {organizationCredits.available.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Available Credits</p>
          </div>
          <Badge variant={getCreditStatusColor()} className="flex items-center gap-1">
            {getCreditStatusIcon()}
            {getCreditStatusMessage()}
          </Badge>
        </div>

        {/* Progress Bar */}
        {showDetails && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used: {organizationCredits.used.toLocaleString()}</span>
                <span>Total: {organizationCredits.allocated.toLocaleString()}</span>
              </div>
              <Progress
                value={utilizationPercentage}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {utilizationPercentage.toFixed(1)}% utilized
              </p>
            </div>

            {/* Organization Info - Always visible */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Organization ID:</span>
                <span className="font-mono text-amber-600 truncate ml-2">
                  {organizationCredits.entityId}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="text-xs h-5">
                  {organizationCredits.status}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditDisplayCard;

