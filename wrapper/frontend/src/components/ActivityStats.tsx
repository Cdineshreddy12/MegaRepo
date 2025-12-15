import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ActivityStats as ActivityStatsType } from '../services/activityService';
import ActivityService from '../services/activityService';
import { ActivityIcon } from 'lucide-react';

interface ActivityStatsProps {
  stats: ActivityStatsType | null;
  loading?: boolean;
}

const ActivityStatsComponent: React.FC<ActivityStatsProps> = ({ stats, loading = false }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatActivityAction = (action: string) => {
    return ActivityService.formatActivityAction(action);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users ({stats.period})</CardTitle>
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.uniqueActiveUsers}</div>
          <p className="text-xs text-muted-foreground">
            Unique users in the selected period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.activityBreakdown.reduce((sum, item) => sum + item.count, 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            All user activities logged
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.auditBreakdown.reduce((sum, item) => sum + item.count, 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            System changes and security events
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">
            {stats.activityBreakdown.length > 0
              ? formatActivityAction(stats.activityBreakdown[0].action)
              : 'No activities'
            }
          </div>
          <p className="text-xs text-muted-foreground">
            Most frequent activity type
          </p>
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.activityBreakdown.slice(0, 5).map((item) => (
              <div key={item.action} className="flex items-center justify-between">
                <span className="text-sm">{formatActivityAction(item.action)}</span>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Audit Events by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.auditBreakdown.slice(0, 5).map((item) => (
              <div key={`${item.resourceType}-${item.action}`} className="flex items-center justify-between">
                <span className="text-sm">
                  {item.resourceType} - {formatActivityAction(item.action)}
                </span>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityStatsComponent;
