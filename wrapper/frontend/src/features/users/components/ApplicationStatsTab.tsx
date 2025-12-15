import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button, Progress } from '@/components/ui';

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

interface ApplicationStatsTabProps {
  summary: AccessSummary | null;
  hasData: boolean;
  syncing: { [appCode: string]: boolean };
  onSyncToApplication: (appCode: string) => void;
}

export function ApplicationStatsTab({ 
  summary, 
  hasData, 
  syncing, 
  onSyncToApplication 
}: ApplicationStatsTabProps) {
  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-muted-foreground">No data available. Load user data first to see application statistics.</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !summary.applicationUsage) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No application usage data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {summary.applicationUsage.map(app => (
        <Card key={app.appId}>
          <CardHeader>
            <CardTitle className="text-lg">{app.appName}</CardTitle>
            <CardDescription>{app.appCode}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{app.userCount}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage Rate</span>
                  <span>{Math.round((app.userCount / (summary.totalUsers || 1)) * 100)}%</span>
                </div>
                <Progress 
                  value={(app.userCount / (summary.totalUsers || 1)) * 100} 
                  className="w-full"
                />
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => onSyncToApplication(app.appCode)}
                disabled={syncing[app.appCode]}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing[app.appCode] ? 'animate-spin' : ''}`} />
                Sync to {app.appCode.toUpperCase()}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
