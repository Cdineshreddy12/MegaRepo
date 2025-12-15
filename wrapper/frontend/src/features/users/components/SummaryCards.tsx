import React from 'react';
import { 
  Users, 
  Shield, 
  CheckCircle, 
  XCircle,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface AccessSummary {
  totalUsers: number;
  enabledApplications: number;
  usersWithAccess: number;
  usersWithoutAccess: number;
  applicationUsage: Array<{
    appId: string;
    appCode: string;
    appName: string;
    userCount: number;
  }>;
}

interface AnalyticsSummary {
  totalApiCalls: number;
  activeUsers: number;
  avgResponseTime: number;
  errorRate: number;
  peakUsage: number;
  successRate: number;
}

interface SummaryCard {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface SummaryCardsProps {
  summary?: AccessSummary;
  analytics?: AnalyticsSummary;
  isLoading?: boolean;
  variant?: 'access' | 'analytics';
}

export function SummaryCards({ 
  summary, 
  analytics, 
  isLoading = false, 
  variant = 'access' 
}: SummaryCardsProps) {
  // Generate cards based on variant
  const getCards = (): SummaryCard[] => {
    if (variant === 'analytics' && analytics) {
      return [
        {
          title: 'Total API Calls',
          value: analytics.totalApiCalls,
          icon: Activity,
          iconColor: 'text-blue-500',
        },
        {
          title: 'Active Users',
          value: analytics.activeUsers,
          icon: Users,
          iconColor: 'text-green-500',
        },
        {
          title: 'Avg Response Time',
          value: `${analytics.avgResponseTime}ms`,
          icon: Clock,
          iconColor: 'text-purple-500',
        },
        {
          title: 'Error Rate',
          value: `${analytics.errorRate}%`,
          icon: TrendingDown,
          iconColor: 'text-yellow-500',
        },
        {
          title: 'Peak Usage',
          value: analytics.peakUsage,
          icon: TrendingUp,
          iconColor: 'text-blue-500',
        },
        {
          title: 'Success Rate',
          value: `${analytics.successRate}%`,
          icon: Activity,
          iconColor: 'text-green-500',
        },
      ];
    }

    // Default access variant
    if (summary) {
      return [
        {
          title: 'Total Users',
          value: summary.totalUsers,
          icon: Users,
          iconColor: 'text-blue-500',
        },
        {
          title: 'Applications',
          value: summary.enabledApplications,
          icon: Shield,
          iconColor: 'text-green-500',
        },
        {
          title: 'Configured Apps',
          value: summary.enabledApplications,
          icon: CheckCircle,
          iconColor: 'text-green-500',
        },
        {
          title: 'Total Access Grants',
          value: summary.totalUsers,
          icon: XCircle,
          iconColor: 'text-red-500',
        },
      ];
    }

    return [];
  };

  const cards = getCards();
  const gridCols = variant === 'analytics' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'md:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={`${card.title}-${index}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '...' : card.value}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${card.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
