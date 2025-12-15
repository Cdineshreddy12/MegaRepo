import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Grid3X3,
  Building2,
  Search,
  Plus,
  Users,
  Package,
  Eye,
  Trash,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { applicationAssignmentAPI } from '@/lib/api';

interface Application {
  appId: string;
  appCode: string;
  appName: string;
  description?: string;
  icon?: string;
  baseUrl?: string;
  isCore?: boolean;
  sortOrder?: number;
  subscriptionTier?: string;
  modules?: ApplicationModule[];
  customPermissions?: Record<string, Permission[]>;
}

interface Permission {
  code: string;
  name: string;
  description: string;
}

interface ApplicationModule {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  description?: string;
  isCore: boolean;
  permissions?: Permission[];
  customPermissions?: Permission[];
}

interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  assignmentCount: number;
  enabledCount: number;
  applications: TenantApplication[];
}

interface TenantApplication {
  id: string;
  appId: string;
  appCode: string;
  appName: string;
  isEnabled: boolean;
  subscriptionTier: string;
  enabledModules: string[];
  maxUsers?: number;
  createdAt: string;
}


interface AssignmentOverview {
  totalApplications: number;
  totalAssignments: number;
  tenantStats: {
    withApps: number;
    withoutApps: number;
  };
  applicationStats: Array<{
    appId: string;
    appCode: string;
    appName: string;
    assignmentCount: number;
    enabledCount: number;
  }>;
}

const ApplicationAssignmentManager: React.FC = () => {
  const [overview, setOverview] = useState<AssignmentOverview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantApplications, setTenantApplications] = useState<Application[]>([]);
  const [allAvailableApplications, setAllAvailableApplications] = useState<Application[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tenants');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [assignmentConfig, setAssignmentConfig] = useState({
    isEnabled: true,
    subscriptionTier: 'basic',
    enabledModules: [] as string[],
    selectedPermissions: {} as Record<string, string[]>, // moduleCode -> permissionCodes
    maxUsers: undefined as number | undefined
  });

  // Track original permissions to detect changes
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, string[]>>({});

  // Application details modal state
  const [showAppDetailsDialog, setShowAppDetailsDialog] = useState(false);
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<Application | null>(null);

  // Check if permissions have been modified for a specific module
  const hasPermissionChanges = useCallback((moduleCode: string) => {
    const current = assignmentConfig.selectedPermissions[moduleCode] || [];
    const original = originalPermissions[moduleCode] || [];

    if (current.length !== original.length) return true;

    const currentSet = new Set(current);
    const originalSet = new Set(original);

    // Check if all original permissions are still present
    for (const perm of original) {
      if (!currentSet.has(perm)) return true;
    }

    // Check if any new permissions were added
    for (const perm of current) {
      if (!originalSet.has(perm)) return true;
    }

    return false;
  }, [assignmentConfig.selectedPermissions, originalPermissions]);

  // Load overview data
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await applicationAssignmentAPI.getOverview();
      setOverview(response.data.data);
    } catch (error) {
      console.error('Error loading overview:', error);
      toast.error('Failed to load overview - using demo data');
      // Fallback demo data
      setOverview({
        totalApplications: 5,
        totalAssignments: 12,
        tenantStats: { withApps: 3, withoutApps: 2 },
        applicationStats: [
          { appId: '1', appCode: 'crm', appName: 'CRM', assignmentCount: 5, enabledCount: 4 },
          { appId: '2', appCode: 'hr', appName: 'HR', assignmentCount: 3, enabledCount: 3 },
          { appId: '3', appCode: 'accounting', appName: 'Accounting', assignmentCount: 2, enabledCount: 2 },
          { appId: '4', appCode: 'inventory', appName: 'Inventory', assignmentCount: 1, enabledCount: 1 },
          { appId: '5', appCode: 'affiliate', appName: 'Affiliate', assignmentCount: 1, enabledCount: 1 }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle showing application details
  const handleViewAppDetails = (app: Application) => {
    // For tenant-specific view, we need to get the full application details from allAvailableApplications
    const fullAppDetails = allAvailableApplications.find(aa => aa.appId === app.appId) || app;
    setSelectedAppForDetails(fullAppDetails);
    setShowAppDetailsDialog(true);
  };

  // Module assignment handlers
  const handleAssignModuleWithPermissions = async (tenantId: string, moduleId: string, moduleCode: string) => {
    try {
      // Get the selected permissions for this module using the module code as key
      const selectedPermissions = assignmentConfig.selectedPermissions[moduleCode] || [];
      console.log(`🔍 Assigning module ${moduleCode} with permissions:`, selectedPermissions);

      if (selectedPermissions.length === 0) {
        toast.error('Please select at least one permission before assigning the module');
        return;
      }

      // First assign the module (this will create the application assignment if it doesn't exist)
      await applicationAssignmentAPI.assignModule({ tenantId, moduleId });

      // Then update the permissions for this specific module
      await applicationAssignmentAPI.updateModulePermissions({
        tenantId,
        moduleId,
        permissions: selectedPermissions
      });

      toast.success(`Module assigned successfully with ${selectedPermissions.length} permissions`);
      loadTenants(); // Refresh tenant list
      loadOverview(); // Refresh overview
    } catch (error: any) {
      console.error('Error assigning module with permissions:', error);
      toast.error(error.response?.data?.error || 'Failed to assign module with permissions');
    }
  };

  const handleRemoveModule = async (tenantId: string, moduleId: string) => {
    try {
      await applicationAssignmentAPI.removeModule({ tenantId, moduleId });
      toast.success('Module removed successfully');
      loadTenants(); // Refresh tenant list
      loadOverview(); // Refresh overview
    } catch (error: any) {
      console.error('Error removing module:', error);
      toast.error(error.response?.data?.error || 'Failed to remove module');
    }
  };

  // Load tenants with applications
  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await applicationAssignmentAPI.getTenants({
        search: searchTerm, 
        limit: 100 
      });
      setTenants(response.data.data.tenants || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants - using demo data');
      // Fallback demo data
      setTenants([
        {
          tenantId: 'demo-tenant-1',
          companyName: 'Demo Company A',
          subdomain: 'demo-a',
          isActive: true,
          createdAt: new Date().toISOString(),
          assignmentCount: 3,
          enabledCount: 2,
          applications: [
            { id: '1', appId: '1', appCode: 'crm', appName: 'CRM', isEnabled: true, subscriptionTier: 'premium', enabledModules: ['contacts', 'deals'], maxUsers: 10, createdAt: new Date().toISOString() },
            { id: '2', appId: '2', appCode: 'hr', appName: 'HR', isEnabled: true, subscriptionTier: 'basic', enabledModules: ['employees'], maxUsers: 5, createdAt: new Date().toISOString() },
            { id: '3', appId: '3', appCode: 'accounting', appName: 'Accounting', isEnabled: false, subscriptionTier: 'standard', enabledModules: [], maxUsers: 3, createdAt: new Date().toISOString() }
          ]
        },
        {
          tenantId: 'demo-tenant-2',
          companyName: 'Demo Company B',
          subdomain: 'demo-b',
          isActive: true,
          createdAt: new Date().toISOString(),
          assignmentCount: 2,
          enabledCount: 2,
          applications: [
            { id: '4', appId: '1', appCode: 'crm', appName: 'CRM', isEnabled: true, subscriptionTier: 'basic', enabledModules: ['contacts'], maxUsers: 5, createdAt: new Date().toISOString() },
            { id: '5', appId: '4', appCode: 'inventory', appName: 'Inventory', isEnabled: true, subscriptionTier: 'premium', enabledModules: ['items', 'tracking'], maxUsers: 8, createdAt: new Date().toISOString() }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Load all available applications
  const loadAllAvailableApplications = useCallback(async () => {
    try {
      console.log('🔄 Loading all available applications');
      const response = await applicationAssignmentAPI.getApplications({
        includeModules: true
      });

      if (response.data.success) {
        const applications = response.data.data.applications || [];
        setAllAvailableApplications(applications);
        console.log(`✅ Loaded ${applications.length} available applications`);
      } else {
        throw new Error('Failed to load available applications');
      }
    } catch (error) {
      console.error('Error loading available applications:', error);
      toast.error('Failed to load available applications');
      setAllAvailableApplications([]);
    }
  }, []);

  // Load tenant-specific applications with modules and permissions
  const loadTenantApplications = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      console.log(`🔄 Loading tenant applications for ${tenantId}`);

      const response = await applicationAssignmentAPI.getTenantApplications(tenantId);

      if (response.data.success) {
        const { applications } = response.data.data;
        setTenantApplications(applications || []);
        console.log(`✅ Loaded ${applications.length} tenant-specific applications with modules and permissions`);

        // Initialize permission state from existing assignments
        const existingPermissions: Record<string, string[]> = {};
        applications.forEach((app: any) => {
          if (app.customPermissions) {
            Object.entries(app.customPermissions).forEach(([moduleCode, permissions]) => {
              existingPermissions[moduleCode] = permissions as string[];
            });
          }
        });

        // Update assignment config with existing permissions
        setAssignmentConfig(prev => ({
          ...prev,
          selectedPermissions: existingPermissions
        }));

        // Store original permissions to detect changes
        setOriginalPermissions({ ...existingPermissions });

        console.log('Loaded existing permissions:', existingPermissions);
      } else {
        throw new Error('Failed to load tenant applications');
      }
    } catch (error) {
      console.error('Error loading tenant applications:', error);
      toast.error('Failed to load tenant applications');
      setTenantApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tenant details
  const loadTenantDetails = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      const response = await applicationAssignmentAPI.getTenantAssignments(tenantId);
      const tenantData = response.data.data;

      // Update tenant in the list with detailed application info
      setTenants(prev => prev.map(t =>
        t.tenantId === tenantId
          ? { ...t, applications: tenantData.applications.filter((app: any) => app.isAssigned) }
          : t
      ));

      // Initialize permission state from existing assignments
      const existingPermissions: Record<string, string[]> = {};
      tenantData.applications.forEach((app: any) => {
        if (app.customPermissions) {
          Object.entries(app.customPermissions).forEach(([moduleCode, permissions]) => {
            existingPermissions[moduleCode] = permissions as string[];
          });
        }
      });

      // Update assignment config with existing permissions
      setAssignmentConfig(prev => ({
        ...prev,
        selectedPermissions: existingPermissions
      }));

      // Store original permissions to detect changes
      setOriginalPermissions({ ...existingPermissions });

      console.log('Loaded existing permissions:', existingPermissions);
    } catch (error) {
      console.error('Error loading tenant details:', error);
      toast.error('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Assign application to tenant
  const handleAssignApplication = async () => {
    if (!selectedTenant || !selectedApp) return;

    try {
      // Count selected permissions for success message
      let totalPermissions = 0;
      assignmentConfig.enabledModules.forEach(moduleCode => {
        const modulePermissions = assignmentConfig.selectedPermissions[moduleCode] || [];
        totalPermissions += modulePermissions.length;
      });

      // Prepare custom permissions - only include permissions for enabled modules
      const customPermissions: Record<string, string[]> = {};
      assignmentConfig.enabledModules.forEach(moduleCode => {
        const modulePermissions = assignmentConfig.selectedPermissions[moduleCode] || [];
        if (modulePermissions.length > 0) {
          customPermissions[moduleCode] = modulePermissions;
        }
      });

      await applicationAssignmentAPI.assignApplication({
        tenantId: selectedTenant.tenantId,
        appId: selectedApp.appId,
        isEnabled: assignmentConfig.isEnabled,
        subscriptionTier: assignmentConfig.subscriptionTier,
        enabledModules: assignmentConfig.enabledModules,
        customPermissions: Object.keys(customPermissions).length > 0 ? customPermissions : undefined,
        maxUsers: assignmentConfig.maxUsers
      });

      toast.success(`Successfully assigned ${selectedApp.appName} to ${selectedTenant.companyName} with ${assignmentConfig.enabledModules.length} modules and ${totalPermissions} permissions`);
      setShowAssignDialog(false);
      loadTenantDetails(selectedTenant.tenantId);
      loadOverview();
    } catch (error: any) {
      console.error('Error assigning application:', error);
      toast.error(error.response?.data?.error || 'Failed to assign application');
    }
  };

  // Bulk assign applications
  const handleBulkAssign = async () => {
    if (selectedTenants.length === 0 || selectedApps.length === 0) {
      toast.error('Please select at least one tenant and one application');
      return;
    }

    try {
      // Prepare custom permissions for bulk assignment
      const customPermissions: Record<string, string[]> = {};
      assignmentConfig.enabledModules.forEach(moduleCode => {
        const modulePermissions = assignmentConfig.selectedPermissions[moduleCode] || [];
        if (modulePermissions.length > 0) {
          customPermissions[moduleCode] = modulePermissions;
        }
      });

      await applicationAssignmentAPI.bulkAssign({
        tenantIds: selectedTenants,
        appIds: selectedApps,
        defaultConfig: {
          ...assignmentConfig,
          customPermissions: Object.keys(customPermissions).length > 0 ? customPermissions : undefined
        }
      });

      toast.success(`Successfully assigned applications to ${selectedTenants.length} tenants`);
      setShowBulkAssignDialog(false);
      setSelectedTenants([]);
      setSelectedApps([]);
      loadTenants();
      loadOverview();
    } catch (error: any) {
      console.error('Error bulk assigning applications:', error);
      toast.error(error.response?.data?.error || 'Failed to bulk assign applications');
    }
  };

  // Remove application assignment
  const handleRemoveAssignment = async (assignmentId: string, tenantName: string, appName: string) => {
    if (!confirm(`Are you sure you want to remove ${appName} from ${tenantName}?`)) return;

    try {
      await applicationAssignmentAPI.removeAssignment(assignmentId);
      toast.success(`Successfully removed ${appName} from ${tenantName}`);
      
      if (selectedTenant) {
        loadTenantDetails(selectedTenant.tenantId);
      }
      loadTenants();
      loadOverview();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error(error.response?.data?.error || 'Failed to remove assignment');
    }
  };

  // Filter tenants based on search
  const filteredTenants = tenants.filter(tenant =>
    tenant.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load initial data
  useEffect(() => {
    loadOverview();
    loadTenants();
    loadAllAvailableApplications();
  }, [loadOverview, loadTenants, loadAllAvailableApplications]);

  // Handle tenant selection
  const handleTenantSelect = async (tenant: Tenant) => {
    console.log('🏢 Selecting tenant:', tenant.companyName);
    setSelectedTenant(tenant);

    // Load tenant-specific applications, modules, and permissions
    await loadTenantApplications(tenant.tenantId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Tenant Application Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage applications and modules for tenants with full granularity
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBulkAssignDialog(true)} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => setShowAssignDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Assign Application
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Manage Tenants</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          {overview && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.totalApplications}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.totalAssignments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tenants with Apps</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.tenantStats.withApps}</div>
                  <p className="text-xs text-muted-foreground">
                    {overview.tenantStats.withoutApps} without apps
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average per Tenant</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview.tenantStats.withApps > 0 
                      ? (overview.totalAssignments / overview.tenantStats.withApps).toFixed(1)
                      : '0'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Application Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Application Usage Statistics</CardTitle>
              <CardDescription>
                Assignment and usage statistics for each application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.applicationStats.map((app) => (
                  <div key={app.appId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Grid3X3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{app.appName}</h4>
                        <p className="text-sm text-muted-foreground">{app.appCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{app.assignmentCount}</div>
                        <div className="text-xs text-muted-foreground">Assigned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{app.enabledCount}</div>
                        <div className="text-xs text-muted-foreground">Enabled</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">
                          {app.assignmentCount - app.enabledCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Disabled</div>
                      </div>
                    </div>
                  </div>
                ))}
                {overview?.applicationStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No application usage data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tenant List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Tenants ({filteredTenants.length})
                  </CardTitle>
                  <CardDescription>
                    Select a tenant to manage their applications and modules
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tenants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Tenant List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <div
                          key={tenant.tenantId}
                          onClick={() => handleTenantSelect(tenant)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedTenant?.tenantId === tenant.tenantId
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {tenant.companyName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {tenant.subdomain}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={tenant.isActive ? 'default' : 'secondary'} className="text-xs">
                                  {tenant.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {tenant.assignmentCount} apps
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application & Module Management */}
            <div className="lg:col-span-2">
              {!selectedTenant ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Grid3X3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Application Management</h3>
                    <p className="text-muted-foreground text-center">
                      Select a tenant from the sidebar to manage their applications and modules
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Management Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {selectedTenant.companyName}
                          </CardTitle>
                          <CardDescription>
                            {selectedTenant.subdomain} • Manage applications and modules
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {selectedTenant.applications?.length || 0} apps
                          </Badge>
                          <Badge variant="secondary">
                            {selectedTenant.applications?.reduce((total, app) => total + (app.enabledModules?.length || 0), 0) || 0} modules
                          </Badge>
                          <Button onClick={() => setShowAssignDialog(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Assign App
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Applications & Modules Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {tenantApplications.map((app) => {
                      const tenantApp = selectedTenant.applications?.find(
                        ta => ta.appId === app.appId
                      );
                      const assignedModuleCount = tenantApp?.enabledModules?.length || 0;
                      const totalModuleCount = app.modules?.length || 0;

                      return (
                        <Card key={app.appId} className={`transition-all ${tenantApp ? 'ring-2 ring-primary/20' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Grid3X3 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{app.appName}</h4>
                                  <p className="text-xs text-muted-foreground">{app.appCode}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAppDetails(app)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>

                            {tenantApp && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="default" className="text-xs">
                                  Assigned
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {assignedModuleCount}/{totalModuleCount} modules
                                </span>
                                {app.customPermissions && Object.keys(app.customPermissions).length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Custom Permissions
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardHeader>

                          <CardContent className="space-y-4">
                            {/* Application Level Action */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Full Application</span>
                              <Button
                                variant={tenantApp ? "destructive" : "default"}
                                size="sm"
                                onClick={() => {
                                  if (tenantApp) {
                                    // Remove entire application
                                    handleRemoveAssignment(tenantApp.id, selectedTenant.companyName, app.appName);
                  } else {
                  // Assign entire application with all modules and permissions
                  setSelectedApp(app);
                  const enabledModules = app.modules?.map(m => m.moduleCode) || [];
                  const selectedPermissions: Record<string, string[]> = {};

                  // Initialize all permissions for all modules
                  app.modules?.forEach(module => {
                    const modulePermissions = module.permissions?.map(p => p.code) || [];
                    selectedPermissions[module.moduleCode] = modulePermissions;
                  });

                  setAssignmentConfig({
                    isEnabled: true,
                    subscriptionTier: 'basic',
                    enabledModules,
                    selectedPermissions,
                    maxUsers: undefined
                  });
                  setShowAssignDialog(true);
                  }
                                }}
                              >
                                {tenantApp ? (
                                  <>
                                    <Trash className="h-3 w-3 mr-1" />
                                    Remove App
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add App
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Individual Modules */}
                            {app.modules && app.modules.length > 0 && (
                              <div className="border-t pt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-3">Individual Modules & Permissions:</p>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                  {app.modules.map((module) => {
                                    const isAssigned = tenantApp?.enabledModules?.includes(module.moduleCode) || false;

                                    return (
                                      <div key={module.moduleId} className="border rounded-lg p-3 bg-muted/30">
                                        {/* Module Header */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-sm font-medium truncate">{module.moduleName}</span>
                                            {module.isCore && (
                                              <Badge variant="outline" className="text-xs px-1 py-0">Core</Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant={isAssigned ? "destructive" : "outline"}
                                            size="sm"
                                            className="h-7 px-2"
                                          onClick={() => {
                                            if (isAssigned) {
                                              handleRemoveModule(selectedTenant.tenantId, module.moduleId);
                                            } else {
                                              // For unassigned modules, assign with selected permissions
                                              handleAssignModuleWithPermissions(selectedTenant.tenantId, module.moduleId, module.moduleCode);
                                            }
                                          }}
                                          >
                                            {isAssigned ? (
                                              <>
                                                <Trash className="h-3 w-3 mr-1" />
                                                Remove Module
                                              </>
                                            ) : (
                                              <>
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add Module
                                              </>
                                            )}
                                          </Button>
                                        </div>

                                        {/* Module Description */}
                                        {module.description && (
                                          <p className="text-xs text-muted-foreground mb-3">{module.description}</p>
                                        )}

                                        {/* Permissions */}
                                        {module.permissions && module.permissions.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                              Permissions ({module.permissions.length} available):
                                            </p>
                                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                                              {module.permissions.map((permission) => {
                                                // Get the actual permissions for this module
                                                const modulePermissions = module.permissions?.map(p => p.code) || [];
                                                const isPermissionAvailable = modulePermissions.includes(permission.code);

                                                // For assigned modules, check if permission is in the current config (default to true if module is assigned)
                                                // For unassigned modules, check if permission is explicitly selected
                                                const selectedPermissionsForModule = assignmentConfig.selectedPermissions[module.moduleCode];
                                                let isPermissionAssigned = false;

                                                if (isAssigned) {
                                                  // Module is assigned - permission should be checked unless explicitly removed
                                                  if (selectedPermissionsForModule) {
                                                    // If permissions are explicitly set, use that
                                                    isPermissionAssigned = selectedPermissionsForModule.includes(permission.code);
                                                  } else {
                                                    // If not explicitly set, assume all available permissions are assigned (default behavior)
                                                    isPermissionAssigned = isPermissionAvailable;
                                                  }
                                                } else {
                                                  // Module is not assigned - only check if explicitly selected
                                                  isPermissionAssigned = selectedPermissionsForModule?.includes(permission.code) || false;
                                                }

                                                return (
                                                  <div
                                                    key={permission.code}
                                                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                                      isPermissionAssigned
                                                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => {
                                                      // Toggle permission selection
                                                      let currentPermissions = assignmentConfig.selectedPermissions[module.moduleCode];

                                                      // If this is the first time modifying an assigned module, initialize with all permissions
                                                      if (isAssigned && !currentPermissions) {
                                                        currentPermissions = module.permissions?.map(p => p.code) || [];
                                                      } else if (!currentPermissions) {
                                                        currentPermissions = [];
                                                      }

                                                      if (isPermissionAssigned) {
                                                        // Remove permission
                                                        const newPermissions = currentPermissions.filter(p => p !== permission.code);
                                                        console.log(`❌ Removed permission ${permission.code} from ${module.moduleCode}, new permissions:`, newPermissions);
                                                        setAssignmentConfig(prev => ({
                                                          ...prev,
                                                          selectedPermissions: {
                                                            ...prev.selectedPermissions,
                                                            [module.moduleCode]: newPermissions
                                                          }
                                                        }));
                                                      } else {
                                                        // Add permission
                                                        const newPermissions = [...currentPermissions, permission.code];
                                                        console.log(`✅ Added permission ${permission.code} to ${module.moduleCode}, new permissions:`, newPermissions);
                                                        setAssignmentConfig(prev => ({
                                                          ...prev,
                                                          selectedPermissions: {
                                                            ...prev.selectedPermissions,
                                                            [module.moduleCode]: newPermissions
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isPermissionAssigned}
                                                      onChange={() => {}} // Handled by parent div click
                                                      className={`w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500`}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <span className={`text-xs font-medium ${
                                                        isPermissionAssigned ? 'text-green-800' : 'text-gray-700'
                                                      }`}>
                                                        {permission.name}
                                                      </span>
                                                      {permission.description && (
                                                        <p className={`text-xs mt-0.5 ${
                                                          isPermissionAssigned ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                          {permission.description}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Permission Actions */}
                                            <div className="flex gap-2 mt-3 pt-2 border-t">
                                              {isAssigned ? (
                                                // Actions for assigned modules
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-6 px-2"
                                                    onClick={() => {
                                                      // Select all available permissions for this module
                                                      const modulePermissions = module.permissions?.map(p => p.code) || [];
                                                      setAssignmentConfig(prev => ({
                                                        ...prev,
                                                        selectedPermissions: {
                                                          ...prev.selectedPermissions,
                                                          [module.moduleCode]: modulePermissions
                                                        }
                                                      }));
                                                      toast.success(`Selected all ${modulePermissions.length} permissions for ${module.moduleName}`);
                                                    }}
                                                  >
                                                    Select All
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-6 px-2"
                                                    onClick={() => {
                                                      // Deselect all permissions for this module
                                                      setAssignmentConfig(prev => ({
                                                        ...prev,
                                                        selectedPermissions: {
                                                          ...prev.selectedPermissions,
                                                          [module.moduleCode]: []
                                                        }
                                                      }));
                                                      toast.success(`Deselected all permissions for ${module.moduleName}`);
                                                    }}
                                                  >
                                                    Deselect All
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    className={`text-xs h-6 px-2 ${
                                                      hasPermissionChanges(module.moduleCode)
                                                        ? 'bg-orange-600 hover:bg-orange-700'
                                                        : 'bg-green-600 hover:bg-green-700'
                                                    }`}
                                                    onClick={async () => {
                                                      // Save permission changes for this module
                                                      const currentPermissions = assignmentConfig.selectedPermissions[module.moduleCode] || [];
                                                      try {
                                                        await applicationAssignmentAPI.updateModulePermissions({
                                                          tenantId: selectedTenant.tenantId,
                                                          moduleId: module.moduleId,
                                                          permissions: currentPermissions
                                                        });

                                                        // Update original permissions to reflect the saved state
                                                        setOriginalPermissions(prev => ({
                                                          ...prev,
                                                          [module.moduleCode]: [...currentPermissions]
                                                        }));

                                                        toast.success(`Saved ${currentPermissions.length} permissions for ${module.moduleName}`);
                                                      } catch (error: any) {
                                                        console.error('Error saving permissions:', error);
                                                        toast.error(error.response?.data?.error || 'Failed to save permissions');
                                                      }
                                                    }}
                                                  >
                                                    {hasPermissionChanges(module.moduleCode) ? 'Save Changes' : 'Saved'}
                                                  </Button>
                                                </>
                                              ) : (
                                                // Actions for unassigned modules
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-6 px-2"
                                                    onClick={() => {
                                                      // Select all available permissions for this module
                                                      const modulePermissions = module.permissions?.map(p => p.code) || [];
                                                      setAssignmentConfig(prev => ({
                                                        ...prev,
                                                        selectedPermissions: {
                                                          ...prev.selectedPermissions,
                                                          [module.moduleCode]: modulePermissions
                                                        }
                                                      }));
                                                      toast.success(`Selected all ${modulePermissions.length} permissions for ${module.moduleName}`);
                                                    }}
                                                  >
                                                    Select All
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-6 px-2"
                                                    onClick={() => {
                                                      // Clear all selected permissions for this module
                                                      setAssignmentConfig(prev => ({
                                                        ...prev,
                                                        selectedPermissions: {
                                                          ...prev.selectedPermissions,
                                                          [module.moduleCode]: []
                                                        }
                                                      }));
                                                      toast.success(`Cleared all selections for ${module.moduleName}`);
                                                    }}
                                                  >
                                                    Clear All
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    className="text-xs h-6 px-2 bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => {
                                                      // Assign module with selected permissions
                                                      const selectedPermissions = assignmentConfig.selectedPermissions[module.moduleCode] || [];
                                                      console.log(`🔍 Button clicked - Module ${module.moduleCode} selected permissions:`, selectedPermissions);

                                                      if (selectedPermissions.length === 0) {
                                                        toast.error('Please select at least one permission before assigning the module');
                                                        return;
                                                      }
                                                      handleAssignModuleWithPermissions(selectedTenant.tenantId, module.moduleId, module.moduleCode);
                                                    }}
                                                  >
                                                    Assign Module
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Module Status */}
                                        <div className="mt-3 pt-2 border-t flex items-center justify-between">
                                          <span className={`text-xs px-2 py-1 rounded-full ${
                                            isAssigned
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-gray-100 text-gray-600'
                                          }`}>
                                            {isAssigned ? 'Module Assigned' : 'Module Not Assigned'}
                                          </span>
                                          {module.permissions && (
                                            <span className="text-xs text-muted-foreground">
                                              {isAssigned
                                                ? `${(assignmentConfig.selectedPermissions[module.moduleCode] || module.permissions?.map(p => p.code) || []).length}/${module.permissions.length} permissions`
                                                : `${(assignmentConfig.selectedPermissions[module.moduleCode] || []).length}/${module.permissions.length} permissions selected`
                                              }
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {tenantApplications.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Applications Assigned</h3>
                        <p className="text-muted-foreground text-center">
                          This tenant doesn't have any applications assigned yet.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign Application Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Application</DialogTitle>
            <DialogDescription>
              Assign an application to {selectedTenant?.companyName || 'a tenant'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedTenant && (
              <div>
                <Label htmlFor="tenant">Select Tenant</Label>
                <Select onValueChange={(value) => {
                  const tenant = tenants.find(t => t.tenantId === value);
                  if (tenant) setSelectedTenant(tenant);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                        {tenant.companyName} ({tenant.subdomain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="application">Select Application</Label>
              <Select onValueChange={(value) => {
                const app = allAvailableApplications.find(a => a.appId === value);
                if (app) {
                  setSelectedApp(app);
                  // Reset module selection when app changes
                  setAssignmentConfig(prev => ({
                    ...prev,
                    enabledModules: app.modules?.map(m => m.moduleCode) || []
                  }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an application" />
                </SelectTrigger>
                <SelectContent>
                  {allAvailableApplications.map((app) => (
                    <SelectItem key={app.appId} value={app.appId}>
                      {app.appName} ({app.appCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Module Selection */}
            {selectedApp && selectedApp.modules && selectedApp.modules.length > 0 && (
              <div>
                <Label>Enabled Modules</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which modules to enable for this tenant
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {selectedApp.modules?.map((module) => (
                    <div key={module.moduleId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`module-${module.moduleId}`}
                        checked={assignmentConfig.enabledModules?.includes(module.moduleCode) || false}
                        onCheckedChange={(checked) => {
                          setAssignmentConfig(prev => {
                            const currentModules = prev.enabledModules || [];
                            const currentPermissions = { ...prev.selectedPermissions };

                            if (checked) {
                              // Add module and initialize all its permissions
                              const newModules = [...currentModules, module.moduleCode];
                              const modulePermissions = module.permissions?.map(p => p.code) || [];
                              currentPermissions[module.moduleCode] = modulePermissions;

                              return {
                                ...prev,
                                enabledModules: newModules,
                                selectedPermissions: currentPermissions
                              };
                            } else {
                              // Remove module and its permissions
                              const newModules = currentModules.filter(code => code !== module.moduleCode);
                              delete currentPermissions[module.moduleCode];

                              return {
                                ...prev,
                                enabledModules: newModules,
                                selectedPermissions: currentPermissions
                              };
                            }
                          });
                        }}
                      />
                      <Label
                        htmlFor={`module-${module.moduleId}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        <div>
                          <span className="font-medium">{module.moduleName}</span>
                          {module.description && (
                            <span className="text-muted-foreground ml-2">
                              - {module.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {module.isCore && (
                            <Badge variant="outline" className="text-xs">Core</Badge>
                          )}
                          {module.permissions && (
                            <span className="text-xs text-muted-foreground">
                              {module.permissions.length} permissions
                            </span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allModuleCodes = selectedApp.modules?.map(m => m.moduleCode) || [];
                      const allPermissions: Record<string, string[]> = {};

                      // Initialize all permissions for all modules
                      selectedApp.modules?.forEach(module => {
                        allPermissions[module.moduleCode] = module.permissions?.map(p => p.code) || [];
                      });

                      setAssignmentConfig(prev => ({
                        ...prev,
                        enabledModules: allModuleCodes,
                        selectedPermissions: allPermissions
                      }));
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignmentConfig(prev => ({
                        ...prev,
                        enabledModules: [],
                        selectedPermissions: {}
                      }));
                    }}
                  >
                    Deselect All
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {assignmentConfig.enabledModules?.length || 0} of {selectedApp.modules?.length || 0} selected
                  </span>
                </div>
              </div>
            )}

            {/* Subscription Tier - Hidden for admin assignments */}
            <input
              type="hidden"
              value={assignmentConfig.subscriptionTier}
            />

            <div>
              <Label htmlFor="maxUsers">Max Users (optional)</Label>
              <Input
                type="number"
                placeholder="Enter max users"
                value={assignmentConfig.maxUsers || ''}
                onChange={(e) => setAssignmentConfig(prev => ({ 
                  ...prev, 
                  maxUsers: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isEnabled"
                checked={assignmentConfig.isEnabled}
                onCheckedChange={(checked) => setAssignmentConfig(prev => ({ ...prev, isEnabled: !!checked }))}
              />
              <Label htmlFor="isEnabled">Enable application for this tenant</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignApplication} disabled={!selectedTenant || !selectedApp}>
              Assign Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Assign Applications</DialogTitle>
            <DialogDescription>
              Assign multiple applications to multiple tenants at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <Label>Select Tenants ({selectedTenants.length} selected)</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {tenants.map((tenant) => (
                  <div key={tenant.tenantId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tenant-${tenant.tenantId}`}
                      checked={selectedTenants.includes(tenant.tenantId)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTenants(prev => [...prev, tenant.tenantId]);
                        } else {
                          setSelectedTenants(prev => prev.filter(id => id !== tenant.tenantId));
                        }
                      }}
                    />
                    <Label htmlFor={`tenant-${tenant.tenantId}`} className="text-sm">
                      {tenant.companyName} ({tenant.subdomain})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Select Applications ({selectedApps.length} selected)</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {allAvailableApplications.map((app) => (
                  <div key={app.appId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`app-${app.appId}`}
                      checked={selectedApps.includes(app.appId)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedApps(prev => [...prev, app.appId]);
                        } else {
                          setSelectedApps(prev => prev.filter(id => id !== app.appId));
                        }
                      }}
                    />
                    <Label htmlFor={`app-${app.appId}`} className="text-sm">
                      {app.appName} ({app.appCode})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Tier - Hidden for bulk assignments */}
            <input
              type="hidden"
              value={assignmentConfig.subscriptionTier}
            />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulkIsEnabled"
                checked={assignmentConfig.isEnabled}
                onCheckedChange={(checked) => setAssignmentConfig(prev => ({ ...prev, isEnabled: !!checked }))}
              />
              <Label htmlFor="bulkIsEnabled">Enable applications for selected tenants</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={selectedTenants.length === 0 || selectedApps.length === 0}
            >
              Assign to {selectedTenants.length} Tenants
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Details Dialog */}
      <Dialog open={showAppDetailsDialog} onOpenChange={setShowAppDetailsDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Grid3X3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedAppForDetails?.appName}</h2>
                <p className="text-sm text-muted-foreground">{selectedAppForDetails?.appCode}</p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detailed information about this application and its modules
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Application Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium text-sm mb-2">Application Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span>{(selectedAppForDetails as any)?.version || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={(selectedAppForDetails as any)?.status === 'active' ? 'default' : 'secondary'}>
                      {(selectedAppForDetails as any)?.status || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base URL:</span>
                    <span className="text-xs font-mono">{(selectedAppForDetails as any)?.baseUrl || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sort Order:</span>
                    <span>{(selectedAppForDetails as any)?.sortOrder || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Configuration</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedAppForDetails?.isCore ? (
                      <Badge variant="default" className="text-xs">Core Application</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Optional Application</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Total Modules:</span>
                    <span className="font-medium">{selectedAppForDetails?.modules?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Core Modules:</span>
                    <span className="font-medium">
                      {selectedAppForDetails?.modules?.filter(m => m.isCore).length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedAppForDetails?.description && (
              <div>
                <h4 className="font-medium text-sm mb-2">Description</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  {selectedAppForDetails.description}
                </p>
              </div>
            )}

            {/* Modules Section */}
            {selectedAppForDetails?.modules && selectedAppForDetails.modules.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-3">Application Modules</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedAppForDetails.modules.map((module) => (
                    <Card key={module.moduleId} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-sm">{module.moduleName}</h5>
                            {module.isCore && (
                              <Badge variant="outline" className="text-xs">Core</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Code: <span className="font-mono">{module.moduleCode}</span>
                          </p>
                          {module.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {module.description}
                            </p>
                          )}

                          {/* Permissions */}
                          {(module.customPermissions || module.permissions) && Array.isArray(module.customPermissions || module.permissions) && (module.customPermissions || module.permissions || []).length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Permissions: {module.customPermissions ? '(Custom)' : '(Default)'}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {(module.customPermissions || module.permissions || []).map((permission, index) => {
                                  const perm = typeof permission === 'string' ? { code: permission, name: permission, description: permission } : permission as Permission;
                                  return (
                                    <Badge key={index} variant="secondary" className="text-xs" title={perm.description}>
                                      {perm.name}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No modules message */}
            {(!selectedAppForDetails?.modules || selectedAppForDetails.modules.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No modules available for this application</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationAssignmentManager;
