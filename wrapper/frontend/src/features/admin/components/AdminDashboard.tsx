import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Building2, CreditCard, TrendingUp, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Sub-components
import { TenantManagement } from './TenantManagement';
import { EntityManagement } from './EntityManagement';
import { CreditManagement } from './CreditManagement';
import ApplicationAssignmentManager from './ApplicationAssignmentManager';
import CreditOperationCostManager from './credit-configuration/CreditOperationCostManager';
import SeasonalCreditsManagement from './SeasonalCreditsManagement';

// Import the new component we'll create
import ApplicationCreditAllocations from './ApplicationCreditAllocations';

interface DashboardStats {
  tenantStats: {
    total: number;
    active: number;
    trial: number;
    paid: number;
  };
  entityStats: {
    total: number;
    organizations: number;
    locations: number;
    departments: number;
  };
  creditStats: {
    totalCredits: number;
    totalReserved: number;
    lowBalanceAlerts: number;
  };
  applicationCreditStats?: {
    totalAllocations: number;
    totalAllocatedCredits: number;
    totalUsedCredits: number;
    totalAvailableCredits: number;
    allocationsByApplication: Array<{
      application: string;
      allocationCount: number;
      totalAllocated: number;
      totalUsed: number;
      totalAvailable: number;
    }>;
  };
}

interface RecentActivity {
  type: string;
  tenantName: string;
  description: string;
  timestamp: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewResponse, activityResponse, appCreditResponse] = await Promise.all([
        api.get('/admin/dashboard/overview'),
        api.get('/admin/dashboard/recent-activity'),
        api.get('/admin/credits/application-allocations')
      ]);

      if (overviewResponse.data.success) {
        setStats(overviewResponse.data.data);
      }

      if (activityResponse.data.success) {
        setRecentActivity(activityResponse.data.data.activities || []);
      }

      // Update stats with application credit data
      if (appCreditResponse.data.success && appCreditResponse.data.data) {
        setStats(prevStats => ({
          ...prevStats,
          applicationCreditStats: appCreditResponse.data.data.summary
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleExportData = async () => {
    try {
      toast.info('Exporting data...');
      // Implement export functionality
      toast.success('Data export completed');
    } catch (err) {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Admin Dashboard</span>
                </div>
              </nav>
              <h1 className="text-3xl font-bold tracking-tight">Company Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Comprehensive overview of all tenants, entities, and credits
              </p>
            </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="app-credits">App Credits</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="operation-costs">Operation Costs</TabsTrigger>
          <TabsTrigger value="seasonal-credits">Seasonal Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.tenantStats.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.tenantStats.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.entityStats.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.entityStats.organizations || 0} organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Org Credits</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.creditStats.totalCredits.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.creditStats.totalReserved.toFixed(2) || '0.00'} reserved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">App Credits</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.applicationCreditStats?.totalAllocatedCredits.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.applicationCreditStats?.totalAllocations || 0} allocations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Balance Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats?.creditStats.lowBalanceAlerts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Entities with low credits
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest changes across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.tenantName}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <TenantManagement />
        </TabsContent>

        <TabsContent value="entities">
          <EntityManagement />
        </TabsContent>

        <TabsContent value="credits">
          <CreditManagement />
        </TabsContent>

        <TabsContent value="app-credits">
          <ApplicationCreditAllocations />
        </TabsContent>

        <TabsContent value="applications">
          <ApplicationAssignmentManager />
        </TabsContent>

        <TabsContent value="operation-costs">
          <CreditOperationCostManager />
        </TabsContent>

        <TabsContent value="seasonal-credits">
          <SeasonalCreditsManagement />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
