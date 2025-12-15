import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserApplicationData, useSyncApplication } from '../../hooks/useUserApplicationQueries';
import { getApplications, getFilteredUsers, getSummaryStats } from '../../lib/utils/userApplication';
import { SummaryCards } from './SummaryCards';
import { SyncManagement } from './SyncManagement';
import { UserList } from './UserList';
import { UnifiedLoading } from '@/components/common/UnifiedLoading';

export function UserApplicationAccess() {
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [syncLoading, setSyncLoading] = useState<string | null>(null);

  // Data fetching
  const { classification, syncStatus, isLoading, isError, error, refetch } = useUserApplicationData();
  const syncAppMutation = useSyncApplication();

  // Handle sync app with loading state
  const handleSyncApp = (appCode: string) => {
    setSyncLoading(appCode);
    syncAppMutation.mutate(appCode, {
      onSettled: () => setSyncLoading(null),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <UnifiedLoading
        isLoading={true}
        loadingType="page"
        loadingMessage="Loading user application data..."
      >
        <div />
      </UnifiedLoading>
    );
  }

  // Error state
  if (isError) {
    return (
      <UnifiedLoading
        isLoading={false}
        error={error}
        loadingType="page"
        errorTitle="Failed to load user application data"
        errorDescription="There was an error loading the user application data. Please try again."
        onRetry={refetch}
        retryLabel="Retry"
      >
        <div />
      </UnifiedLoading>
    );
  }

  // Empty state
  if (!classification?.data) {
    return (
      <UnifiedLoading
        isLoading={false}
        isEmpty={true}
        loadingType="page"
        emptyTitle="No user application data available"
        emptyDescription="No user application data was found. This could be because no users exist or there's a configuration issue."
        emptyAction={
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading Data
          </Button>
        }
      >
        <div />
      </UnifiedLoading>
    );
  }

  // Get data
  const applications = getApplications(classification.data);
  const filteredUsers = getFilteredUsers(classification.data, selectedApp);
  const summaryStats = getSummaryStats(classification.data, syncStatus);
  
  // Transform summaryStats to match AccessSummary interface
  const accessSummary = {
    totalUsers: summaryStats.totalUsers || 0,
    enabledApplications: summaryStats.totalApplications || 0,
    usersWithAccess: summaryStats.totalUsers || 0,
    usersWithoutAccess: 0,
    applicationUsage: applications.map(app => ({
      appId: app.appCode,
      appCode: app.appCode,
      appName: app.appInfo?.appName || 'Unknown App',
      userCount: app.totalUsers || 0
    }))
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Application Access</h1>
          <p className="text-gray-600 mt-1">
            Manage user access to applications and synchronize users across systems
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards 
        summary={accessSummary}
        variant="access"
      />

      {/* Main Content */}
      <Tabs value={selectedApp} onValueChange={setSelectedApp}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="sync-management">Sync Management</TabsTrigger>
          {applications.slice(0, 4).map(app => (
            <TabsTrigger key={app.appCode} value={app.appCode}>
              {app.appInfo?.appName || 'Unknown App'} ({app.totalUsers || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Sync Management Tab */}
        <TabsContent value="sync-management" className="mt-6">
          <SyncManagement
            classificationData={classification.data}
            syncStatusData={syncStatus?.data}
            onSyncApp={handleSyncApp}
            syncLoading={syncLoading}
          />
        </TabsContent>

        {/* All Users Tab */}
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Access Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Application Access Summary</CardTitle>
                <CardDescription>
                  Users grouped by application access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app.appCode} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{app.appInfo?.appName || 'Unknown App'}</h4>
                        <p className="text-sm text-gray-600">{app.appInfo?.description || 'No description available'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{app.totalUsers || 0} users</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSyncApp(app.appCode || '')}
                          disabled={syncLoading === (app.appCode || '')}
                        >
                          {syncLoading === app.appCode ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
                <CardDescription>
                  Application connectivity and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(syncStatus?.data?.applicationStatus || {}).map(([appCode, status]: [string, any]) => (
                    <div key={appCode} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{appCode.toUpperCase()}</h4>
                        <p className="text-sm text-gray-600">{status.applicationUrl}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          status.isConfigured 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.isConfigured ? 'Configured' : 'Not Configured'}
                        </span>
                        <span className="text-sm text-gray-600">{status.userCount} users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Application-specific tabs */}
        {applications.map(app => (
          <TabsContent key={app.appCode} value={app.appCode} className="mt-6">
            <UserList
              users={app.users}
              title={`${app.appInfo?.appName || 'Unknown App'} Users`}
              description={`Users with access to ${app.appInfo?.appName || 'Unknown App'} (${app.totalUsers || 0} users)`}
              showIndividualSync={true}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* All Users Table */}
      {selectedApp === 'all' && (
        <UserList
          users={filteredUsers}
          title="All Users"
          description="Complete list of users and their application access"
          showIndividualSync={true}
          maxUsers={50}
        />
      )}
    </div>
  );
}
