// React and routing imports
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryState } from 'nuqs'
import { useNavigation } from '@/hooks/useNavigation'

// Third-party libraries
import { BarChart3, Coins, TrendingUp, DollarSign, Package, Users, Shield, User, Activity, Crown, CheckCircle, AlertTriangle, Database, RefreshCw, ExternalLink, Settings, PieChart, Eye } from 'lucide-react'
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Line, LineChart } from 'recharts'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import toast from 'react-hot-toast'

// Internal hooks and utilities
import useOrganizationAuth from '@/hooks/useOrganizationAuth'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useTenantApplications } from '@/hooks/useSharedQueries'
import api, { applicationAssignmentAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// Page components
import { AdminDashboardComponent as AdminDashboard } from '@/features/admin'

// UI components
import { Badge, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle, DialogDescription } from './ui'
import { TabNavigation } from '@/components/common/TabNavigation'
import { MetricCard } from '@/components/common/MetricCard'
import { Typography } from '@/components/common/Typography'
import LoadingButton, { IconButton } from '@/components/common/LoadingButton'
import { AccessDenied } from '@/components/common/AccessDenied'
import { ThemeBadge } from './common/ThemeBadge'

// Feature components
import { ActivityDashboard } from './activity/ActivityDashboard'
import { CreditBalance } from './CreditBalance'
import { RoleManagementDashboard } from '@/features/roles'
import { UserApplicationAccess } from './users/UserApplicationAccess'
import { UserManagementDashboard } from '@/features/users/components/UserManagementDashboard'
import { Grid } from './common/Page/Grid'

// Mock data for charts
const mockRevenueData = [
    { month: 'Jan', revenue: 4200 },
    { month: 'Feb', revenue: 5100 },
    { month: 'Mar', revenue: 6800 },
    { month: 'Apr', revenue: 7200 },
    { month: 'May', revenue: 8900 },
    { month: 'Jun', revenue: 9800 }
]

/**
 * Wrapper component for tab content with consistent spacing
 */
const TabContentWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="space-y-6">
            {children}
        </div>
    )
}

/**
 * Main Dashboard Menu Component
 * Provides tabbed navigation for different dashboard sections
 * 
 * @param isAdmin - Whether the current user has admin privileges
 */
export const DashboardMenu = ({
    isAdmin = false
}: {
    isAdmin?: boolean
}) => {
    // Authentication and user data
    const { user } = useKindeAuth()
    const { tenantId } = useOrganizationAuth()
    
    // Navigation hook
    const navigation = useNavigation()
    
    // Dashboard data and state
    const {
        applications,
        users: employees,
        paymentStats,
        metrics,
        isLoading,
        refreshDashboard,
    } = useDashboardData()

    // Tab navigation state
    const [_selectedTab, setSelectedTab] = useQueryState('tab', { defaultValue: 'applications' })

    /**
     * Handle tab navigation changes
     */
    const handleTabChange = useCallback((tab: string) => {
        setSelectedTab(tab)
    }, [setSelectedTab])

    /**
     * Legacy compatibility - convert new data format to old format for existing components
     */
    const dashboardData = {
        applications: applications || [],
        employees: employees || [],
        paymentStats: paymentStats || {},
        metrics: metrics || { totalUsers: 0, apiCalls: 0, revenue: 0, growth: 0 }
    }

    /**
     * Configuration for dashboard tabs
     * Returns array of tab objects with their content and metadata
     */
    const getTabsConfig = () => [
        {
            id: 'overview',
            label: 'Overview',
            icon: BarChart3,
            content: <OverviewTab
                data={dashboardData}
                isLoading={isLoading}
                onRefresh={refreshDashboard}
            />
        },
        {
            id: 'credits',
            label: 'Credits',
            icon: Coins,
            content: <TabContentWrapper>
                <div className="flex items-center justify-between">
                    <div className='flex flex-col'>
                        <Typography variant="h3">Credit Management</Typography>
                        <Typography variant="muted">Monitor your credit balance, usage, and purchase history</Typography>
                    </div>
                    <IconButton
                        variant="outline"
                        className="border-border/50 hover:bg-accent hover:text-accent-foreground dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground"
                        onClick={() => window.location.href = '/billing?purchase=true'}
                        startIcon={Coins}
                    >
                        Purchase Credits
                    </IconButton>
                </div>

                <CreditBalance
                    showPurchaseButton={true}
                    showUsageStats={false}
                    compact={false}
                    onPurchaseClick={() => {
                        navigation.goToBillingPurchase();
                    }}
                />

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common credit-related tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col items-center justify-center space-y-2 border-border/50 hover:bg-accent hover:text-accent-foreground dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground"
                                onClick={() => window.location.href = '/billing?purchase=true'}
                            >
                                <Coins className="h-6 w-6" />
                                <span>Purchase Credits</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col items-center justify-center space-y-2 border-border/50 hover:bg-accent hover:text-accent-foreground dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground"
                                onClick={() => window.location.href = '/billing'}
                            >
                                <DollarSign className="h-6 w-6" />
                                <span>Billing & Plans</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabContentWrapper>
        },
        {
            id: 'applications',
            label: 'Applications',
            icon: Package,
            content: <ApplicationsTab />
        },
        {
            id: 'users',
            label: 'Users',
            icon: Users,
            content: <TabContentWrapper>
                {isAdmin || user?.email ? (
                    <UserManagementDashboard />
                ) : (
                    <AccessDenied description='You need admin permissions to view user management.' />
                )}
            </TabContentWrapper>
        },
        {
            id: 'roles',
            label: 'Roles',
            icon: Shield,
            content: <TabContentWrapper>
                {isAdmin || user?.email ? (
                    <RoleManagementDashboard />
                ) : (
                    <AccessDenied description='You need admin permissions to view role management.' />
                )}
            </TabContentWrapper>
        },
        {
            id: 'user-apps',
            label: 'User Apps',
            icon: User,
            content:
                <TabContentWrapper>
                    {isAdmin || user?.email ? (
                        <UserApplicationAccess />
                    ) : (
                        <AccessDenied description='You need admin permissions to view user application access.' />
                    )}
                </TabContentWrapper>
        },
        {
            id: 'activity',
            label: 'Activity',
            icon: Activity,
            content: <TabContentWrapper>
                <ActivityDashboard />
            </TabContentWrapper>
        },
        ...(isAdmin ? [
            {
                id: 'admin',
                label: 'Admin',
                icon: Crown,
                content: <AdminDashboard />
            }] : [])
    ]
    return (
        <TabNavigation
            tabs={getTabsConfig()}
            defaultValue="applications"
            onValueChange={handleTabChange}
            variant='underline'
            size="md"
        />
    )
}


/**
 * Overview Tab Component
 * Displays key metrics, charts, and quick access to main features
 */
function OverviewTab({
    data,
    isLoading,
    onRefresh
}: {
    data: any;
    isLoading: boolean;
    onRefresh: () => void;
}) {
    const { metrics, applications } = data
    const navigate = useNavigate()

    return (
        <div className="space-y-8">
            {/* Key Metrics */}
            <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
                <MetricCard
                    title="Total Users"
                    value={metrics.totalUsers}
                    icon={Users}
                    trend="+12%"
                    color="blue"
                    isLoading={isLoading}
                />
                <MetricCard
                    title="Active Apps"
                    value={applications.filter((app: any) => app.status === 'active').length}
                    icon={Package}
                    trend="+3"
                    color="green"
                    isLoading={isLoading}
                />
                <MetricCard
                    title="Revenue"
                    value={formatCurrency(metrics.revenue)}
                    icon={DollarSign}
                    trend={`+${metrics.growth}%`}
                    color="purple"
                    isLoading={isLoading}
                />
                <MetricCard
                    title="System Health"
                    value={metrics.systemHealth === 'good' ? 'Excellent' : 'Warning'}
                    icon={metrics.systemHealth === 'good' ? CheckCircle : AlertTriangle}
                    trend="99.9%"
                    color={metrics.systemHealth === 'good' ? 'green' : 'yellow'}
                    isLoading={isLoading}
                />
            </Grid>


            {/* Charts and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Monthly revenue growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={mockRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8B5CF6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Access</CardTitle>
                    <CardDescription>Access key features and management tools</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <IconButton
                            variant="outline"
                            onClick={() => navigate('/dashboard?tab=credits')}
                            startIcon={Coins}
                        >
                            Credit Management
                        </IconButton>
                        <IconButton
                            variant="outline"
                            className="border-border/50 hover:bg-accent hover:text-accent-foreground dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground"
                            onClick={() => navigate('/dashboard?tab=user-apps')}
                            startIcon={Database}
                        >
                            User Application Access
                        </IconButton>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Connected Applications</CardTitle>
                        <CardDescription>Your integrated applications and their status</CardDescription>
                    </div>
                    <LoadingButton variant="outline" size="sm" onClick={onRefresh} isLoading={isLoading}>
                        Refresh
                    </LoadingButton>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {applications.map((app: any) => (
                            <div
                                key={app.appId}
                                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Typography variant="h4">{app.appName}</Typography>
                                    <Badge
                                        variant={app.status === 'active' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {app.status}
                                    </Badge>
                                </div>
                                <Typography variant="muted">{app.description}</Typography>
                                <div className="flex items-center justify-between text-sm">
                                    <Typography variant="muted">Users: {app.userCount || 0}</Typography>
                                    <IconButton variant="ghost" size="sm" startIcon={ExternalLink} />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

/**
 * Applications Tab Component
 * Displays and manages organization applications
 */
function ApplicationsTab() {
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [showAppDetails, setShowAppDetails] = useState(false);

    // Get tenant information
    const { tenantId } = useOrganizationAuth();

    // Use shared hook with caching instead of direct API calls
    const { data: applications = [], isLoading, refetch } = useTenantApplications(tenantId);

    /**
     * Refresh applications data
     */
    const handleRefresh = useCallback(async () => {
        await refetch();
        toast.success('Applications refreshed successfully');
    }, [refetch]);

    /**
     * Get appropriate icon for application based on app code
     */
    const getApplicationIcon = (appCode: string) => {
        const icons: Record<string, React.ReactNode> = {
            'crm': <Users className="w-6 h-6" />,
            'hr': <Building className="w-6 h-6" />,
            'affiliate': <TrendingUp className="w-6 h-6" />,
            'system': <Settings className="w-6 h-6" />,
            'finance': <PieChart className="w-6 h-6" />,
            'inventory': <Package className="w-6 h-6" />,
            'analytics': <Activity className="w-6 h-6" />
        };
        return icons[appCode] || <Package className="w-6 h-6" />;
    };

    /**
     * Get status color classes for application status badges
     */
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Handle viewing application details in modal
     */
    const handleViewApp = (app: any) => {
        setSelectedApp(app);
        setShowAppDetails(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <Typography variant="h3">Applications</Typography>
                        <Typography variant="muted">Manage your organization's applications and modules</Typography>
                    </div>
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-6 border border-gray-200 rounded-lg animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Typography variant="h3">Applications</Typography>
                    <Typography variant="muted">
                        Your organization has access to {applications.length} applications
                    </Typography>
                </div>
                <LoadingButton isLoading={isLoading} variant="outline" size="sm" onClick={handleRefresh} startIcon={RefreshCw}>
                    Refresh
                </LoadingButton>
            </div>

            {applications.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <Typography variant="h4">No Applications Available</Typography>
                        <Typography variant="muted">
                            Contact your administrator to enable applications for your organization.
                        </Typography>
                        <LoadingButton className="mt-4" isLoading={isLoading} variant="outline" onClick={handleRefresh}>
                            Check Again
                        </LoadingButton>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {applications.map((app) => (
                            <Card key={app.appId} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewApp(app)}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                {getApplicationIcon(app.appCode)}
                                            </div>
                                            <div>
                                                <Typography variant="h4">{app.appName || 'Unknown App'}</Typography>
                                                <Typography variant="muted">{app.appCode || 'N/A'}</Typography>
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(app.isEnabled ? 'active' : 'inactive')}>
                                            {app.isEnabled ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <Typography variant="muted">
                                        {app.description || 'No description available'}
                                    </Typography>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <Typography variant="muted">Subscription Tier:</Typography>
                                            <Badge variant="outline" className="capitalize">
                                                {typeof app.subscriptionTier === 'object' ? 'Basic' : (app.subscriptionTier || 'Basic')}
                                            </Badge>
                                        </div>

                                        {app.modules && app.modules.length > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <Typography variant="muted">Modules:</Typography>
                                                <Typography variant="muted">
                                                    {app.enabledModules?.length || 0} enabled / {app.modules.length} available
                                                </Typography>
                                            </div>
                                        )}

                                    </div>

                                    <IconButton variant="ghost" size="sm" className="w-full" startIcon={Eye}>
                                        View Details
                                    </IconButton>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Application Details Modal */}
                    <Dialog open={showAppDetails} onOpenChange={setShowAppDetails}>
                        <DialogContent className="max-w-2xl max-h-[80vh] min-h-[400px] flex flex-col">
                            <DialogHeader className="flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        {selectedApp && getApplicationIcon(selectedApp.appCode)}
                                    </div>
                                    <div>
                                        <DialogTitle>{selectedApp?.appName || 'Unknown Application'}</DialogTitle>
                                        <DialogDescription>{selectedApp?.description || 'No description available'}</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            {selectedApp && (
                                <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                    {/* Application Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div>
                                                <Typography variant="label" >Application Code</Typography>
                                                <Typography variant="overline">{selectedApp.appCode}</Typography>
                                            </div>
                                            <div>
                                                <Typography variant="label">Status</Typography>
                                                <Badge className={getStatusColor(typeof selectedApp.status === 'object' ? 'active' : selectedApp.status || 'active')}>
                                                    {typeof selectedApp.status === 'object' ? 'Active' : (selectedApp.status || 'Active')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <Typography variant="label">Subscription Tier</Typography>
                                                <Typography variant="overline">{typeof selectedApp.subscriptionTier === 'object' ? 'Basic' : (selectedApp.subscriptionTier || 'Basic')}</Typography>
                                            </div>
                                            <div>
                                                <Typography variant="label">Access</Typography>
                                                <Typography variant="overline">
                                                    {selectedApp.isEnabled ? 'Enabled' : 'Disabled'}
                                                </Typography>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modules Section */}
                                    {selectedApp.modules && selectedApp.modules.length > 0 && (
                                        <div>
                                            <Typography variant="h4">Available Modules</Typography>
                                            <div className="space-y-4">
                                                {selectedApp.modules.map((module: any) => {
                                                    const isModuleEnabled = selectedApp.enabledModules?.includes(module.moduleCode);
                                                    const modulePermissions = selectedApp.enabledModulesPermissions?.[module.moduleCode] || [];
                                                    const customPermissions = selectedApp.customPermissions?.[module.moduleCode] || [];

                                                    return (
                                                        <div key={module.moduleId} className="p-4 border border-gray-200 rounded-lg">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Typography variant="large">{module.moduleName || 'Unknown Module'}</Typography>
                                                                    {isModuleEnabled && (
                                                                        <ThemeBadge variant="success">
                                                                            Enabled
                                                                        </ThemeBadge>
                                                                    )}
                                                                </div>
                                                                <Badge variant={module.isCore ? "default" : "outline"}>
                                                                    {module.isCore ? 'Core' : 'Optional'}
                                                                </Badge>
                                                            </div>

                                                            <Typography variant="muted">{module.description || 'No description available'}</Typography>

                                                            {/* Module Permissions */}
                                                            {module.permissions && module.permissions.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <h6 className="text-sm font-medium text-gray-700">Available Permissions</h6>
                                                                        <span className="text-xs text-gray-500">{module.permissions.length} total</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {module.permissions.map((permission: any, index: number) => {
                                                                            const permissionText = typeof permission === 'string' ? permission : permission.code || permission.name || 'Unknown';
                                                                            const isEnabled = isModuleEnabled && (modulePermissions.includes(permissionText) || customPermissions.includes(permissionText));
                                                                            return (
                                                                                <ThemeBadge
                                                                                    key={index}
                                                                                    variant={isEnabled ? "success" : "inactive"}
                                                                                >
                                                                                    {permissionText}
                                                                                </ThemeBadge>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Custom Permissions for this module */}
                                                            {customPermissions && customPermissions.length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Shield className="w-4 h-4 text-blue-600" />
                                                                        <Typography variant="large">Custom Permissions</Typography>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {customPermissions.map((permission: any, index: number) => {
                                                                            const permissionText = typeof permission === 'string' ? permission : permission.code || permission.name || 'Unknown';
                                                                            return (
                                                                                <ThemeBadge
                                                                                    key={index}
                                                                                    variant="info"
                                                                                >
                                                                                    {permissionText}
                                                                                </ThemeBadge>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Enabled Modules */}
                                    {selectedApp.enabledModules && Array.isArray(selectedApp.enabledModules) && selectedApp.enabledModules.length > 0 && (
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Enabled Modules</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedApp.enabledModules.map((moduleCode: string) => (
                                                    <ThemeBadge key={moduleCode} variant="success" >
                                                        {moduleCode}
                                                    </ThemeBadge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
                                <Button variant="outline" onClick={() => setShowAppDetails(false)}>
                                    Close
                                </Button>
                                {selectedApp?.baseUrl && (
                                    <IconButton onClick={() => window.open(selectedApp.baseUrl, '_blank')} startIcon={ExternalLink}>
                                        Open Application
                                    </IconButton>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
} 