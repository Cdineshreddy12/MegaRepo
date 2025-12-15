import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { DownloadIcon, FilterIcon } from 'lucide-react';
import ActivityService, { ActivityLog, AuditLog, ActivityFilters } from '../services/activityService';
import ActivityList from '../components/ActivityList';
import ActivityFilter from '../components/ActivityFilter';
import { useUserContext } from '../contexts/UserContextProvider';

interface ActivityLogsProps {
  isAdmin?: boolean;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ isAdmin: propIsAdmin = false }) => {
  const { user } = useUserContext();
  const isAdmin = propIsAdmin || user?.isTenantAdmin || false;

  const [activeTab, setActiveTab] = useState<'user' | 'audit'>('user');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState<ActivityFilters>({
    limit: 50,
    offset: 0,
    startDate: '', // Will be set to 7 days ago by default in service
    endDate: '',
    action: '',
    app: '',
    userId: '',
    resourceType: '',
    includeDetails: true
  });

  const [showFilters, setShowFilters] = useState(false);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'user') {
        console.log('Loading user activities with filters:', filters);
        try {
          const result = await ActivityService.getUserActivity(filters);
          console.log('User activities result:', result);
          setActivities(result.activities || []);
        } catch (error) {
          console.error('Error loading user activities:', error);
          setActivities([]);
          setError('Failed to load user activities');
        }
      } else if (isAdmin) {
        console.log('Loading audit logs with filters:', filters);
        try {
          const result = await ActivityService.getAuditLogs(filters);
          console.log('Audit logs result:', result);
          setAuditLogs(result.logs || []);
        } catch (error) {
          console.error('Error loading audit logs:', error);
          setAuditLogs([]);
          setError('Failed to load audit logs');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load activity logs');
      console.error('Error loading activity logs:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = await ActivityService.exportActivityLogs(activeTab, format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${activeTab}-${format}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const clearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0,
      startDate: '',
      endDate: '',
      action: '',
      app: '',
      userId: '',
      resourceType: '',
      includeDetails: true
    });
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent Activity</h1>
          <p className="text-muted-foreground">
            Track meaningful operations and active sessions (last 7 days)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ActivityFilter
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />

      {/* Tabs for User Activities vs Audit Logs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'user' | 'audit')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="user">My Operations</TabsTrigger>
          {isAdmin && <TabsTrigger value="audit">System Changes</TabsTrigger>}
        </TabsList>

        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Recent Operations</CardTitle>
              <CardDescription>
                View your meaningful operations and data changes (last 7 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityList
                activities={activities || []}
                loading={loading}
                error={error}
                showDetails={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Changes</CardTitle>
                <CardDescription>
                  Important system modifications and user management activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityList
                  activities={[]}
                  auditLogs={auditLogs || []}
                  loading={loading}
                  error={error}
                  showDetails={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ActivityLogs;
