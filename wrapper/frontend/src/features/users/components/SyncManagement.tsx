import { RefreshCw, Eye, Activity, RotateCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSyncAllUsers, useSyncApplication, useTestConnectivity } from '../../hooks/useUserApplicationQueries';
import { getApplications } from '../../lib/utils/userApplication';
import type { ClassificationData, SyncStatusData } from '../../types/userApplication';

interface SyncManagementProps {
  classificationData?: ClassificationData;
  syncStatusData?: SyncStatusData;
  onSyncApp: (appCode: string) => void;
  syncLoading: string | null;
}

export function SyncManagement({
  classificationData,
  syncStatusData,
  onSyncApp,
  syncLoading,
}: SyncManagementProps) {
  const syncAllMutation = useSyncAllUsers();
  const testConnectivityMutation = useTestConnectivity();

  const handleSyncAll = (dryRun = false) => {
    syncAllMutation.mutate({ dryRun });
  };

  const handleTestConnectivity = () => {
    testConnectivityMutation.mutate();
  };

  const applications = getApplications(classificationData?.data);

  return (
    <div className="space-y-6">
      {/* Enhanced Sync Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Sync Operations</CardTitle>
            <CardDescription>
              Synchronize users to all their accessible applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button 
                onClick={() => handleSyncAll(true)}
                disabled={syncAllMutation.isPending}
                className="w-full"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                {syncAllMutation.isPending ? 'Running Preview...' : 'Preview Sync (Dry Run)'}
              </Button>
              
              <Button 
                onClick={() => handleSyncAll(false)}
                disabled={syncAllMutation.isPending}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {syncAllMutation.isPending ? 'Syncing All Users...' : 'Sync All Users'}
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Users:</span>
                  <span className="ml-2 font-medium">{classificationData?.data?.summary?.totalUsers || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Applications:</span>
                  <span className="ml-2 font-medium">{applications.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Connectivity</CardTitle>
            <CardDescription>
              Test and monitor external application connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTestConnectivity}
              disabled={testConnectivityMutation.isPending}
              className="w-full"
              variant="outline"
            >
              <Activity className="h-4 w-4 mr-2" />
              {testConnectivityMutation.isPending ? 'Testing...' : 'Test All Connections'}
            </Button>
            
            <div className="space-y-2">
              {Object.entries(syncStatusData?.applicationStatus || {}).map(([appCode, status]) => (
                <div key={appCode} className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm font-medium">{appCode.toUpperCase()}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-gray-600">{status.userCount} users</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application-Specific Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Application-Specific Sync</CardTitle>
          <CardDescription>
            Sync users to individual applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map(app => (
              <div key={app.appCode || 'unknown'} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{app.appInfo?.appName || 'Unknown App'}</h4>
                  <Badge variant="secondary">{app.totalUsers || 0} users</Badge>
                </div>
                
                <p className="text-sm text-gray-600">{app.appInfo?.description || 'No description available'}</p>
                
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onSyncApp(app.appCode || '')}
                    disabled={syncLoading === (app.appCode || '')}
                    className="w-full"
                  >
                    {syncLoading === app.appCode ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCw className="h-4 w-4 mr-2" />
                    )}
                    Sync {(app.appCode || '').toUpperCase()}
                  </Button>
                  
                  <div className="text-xs text-gray-500 text-center">
                    Status: {syncStatusData?.applicationStatus[app.appCode || '']?.isConfigured ? 
                      <span className="text-green-600">Configured</span> : 
                      <span className="text-red-600">Not Configured</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
