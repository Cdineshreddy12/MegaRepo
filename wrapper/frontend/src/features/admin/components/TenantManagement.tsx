import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, Users, Building2, CreditCard, Eye, Power, PowerOff, Download, Plus, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain: string;
  adminEmail: string;
  isActive: boolean;
  isVerified: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
  entityCount: number;
  totalCredits: number;
  reservedCredits: number;
  lastActivity: string | null;
}

interface TenantDetails {
  tenant: Tenant;
  users: any[];
  entitySummary: {
    total: number;
    organizations: number;
    locations: number;
    departments: number;
    teams: number;
    active: number;
  };
  creditSummary: {
    totalCredits: number;
    reservedCredits: number;
    activeEntities: number;
    averageCredits: number;
  };
  recentActivity: any[];
  recentCreditActivity?: Array<{
    transactionId: string;
    tenantId: string;
    entityId?: string;
    entityName?: string;
    entityType?: string;
    transactionType: string;
    amount: string;
    operationCode: string;
    createdAt: string;
  }>;
  entityHierarchy?: Array<{
    entityId: string;
    entityType: string;
    entityName: string;
    entityCode: string;
    isActive: boolean;
    availableCredits: string;
    reservedCredits: string;
    children?: Array<any>;
  }>;
}

export const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<TenantDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/tenants/comprehensive', {
        params: {
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: pagination.page,
          limit: pagination.limit
        }
      });

      if (response.data.success) {
        setTenants(response.data.data.tenants);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [searchTerm, statusFilter, pagination.page]);

  const handleViewDetails = async (tenant: Tenant) => {
    try {
      // Fetch tenant details, entity hierarchy, and recent credit activity in parallel
      const [detailsResponse, hierarchyResponse, creditActivityResponse] = await Promise.all([
        api.get(`/admin/tenants/${tenant.tenantId}/details`),
        api.get(`/admin/entities/hierarchy/${tenant.tenantId}`),
        api.get('/admin/credits/transactions', {
          params: {
            tenantId: tenant.tenantId,
            limit: 10
          }
        })
      ]);

      if (detailsResponse.data.success && hierarchyResponse.data.success) {
        setSelectedTenant({
          ...detailsResponse.data.data,
          entityHierarchy: hierarchyResponse.data.data.hierarchy,
          recentCreditActivity: creditActivityResponse.data.success ? creditActivityResponse.data.data.transactions : []
        });
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch tenant details:', error);
      toast.error('Failed to load tenant details');
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      const response = await api.patch(`/admin/tenants/${tenant.tenantId}/status`, {
        isActive: !tenant.isActive,
        reason: 'Admin action'
      });

      if (response.data.success) {
        toast.success(`Tenant ${!tenant.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchTenants();
      }
    } catch (error) {
      console.error('Failed to toggle tenant status:', error);
      toast.error('Failed to update tenant status');
    }
  };

  const handleDebugCredits = async (tenantId: string) => {
    try {
      const response = await api.get(`/admin/tenants/${tenantId}/credit-debug`);
      if (response.data.success) {
        console.log('Credit Debug Info:', response.data.data);
        toast.success('Credit debug information logged to console');
      }
    } catch (error) {
      console.error('Failed to debug credits:', error);
      toast.error('Failed to debug credits');
    }
  };

  const handleCleanOrphanedCredits = async (tenantId: string) => {
    if (!confirm('This will permanently delete orphaned credit records. Are you sure?')) {
      return;
    }

    try {
      const response = await api.post(`/admin/tenants/${tenantId}/clean-orphaned-credits`);
      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh tenant data
        fetchTenants();
        if (selectedTenant?.tenant.tenantId === tenantId) {
          // Find the tenant in the current list to get the correct Tenant type
          const tenant = tenants.find(t => t.tenantId === tenantId);
          if (tenant) {
            handleViewDetails(tenant);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean orphaned credits:', error);
      toast.error('Failed to clean orphaned credits');
    }
  };

  const handleAllocateCredits = async (entityId: string, amount: number, operationCode: string) => {
    try {
      const response = await api.post('/admin/credits/bulk-allocate', {
        allocations: [{
          entityId,
          amount: amount.toString(),
          operationCode
        }],
        reason: 'Admin manual allocation'
      });

      if (response.data.success) {
        toast.success(`Allocated ${amount} credits successfully`);

        // Refresh tenant details to show updated credit information
        if (selectedTenant) {
          const tenant = tenants.find(t => t.tenantId === selectedTenant.tenant.tenantId);
          if (tenant) {
            await handleViewDetails(tenant);
          }
        }

        return response.data;
      }
    } catch (error) {
      console.error('Failed to allocate credits:', error);
      toast.error('Failed to allocate credits');
      throw error;
    }
  };

  const handleExportTenant = async (tenant: Tenant) => {
    try {
      const response = await api.get(`/admin/tenants/${tenant.tenantId}/export`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tenant-${tenant.tenantId}-export.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Tenant data exported successfully');
    } catch (error) {
      console.error('Failed to export tenant:', error);
      toast.error('Failed to export tenant data');
    }
  };

  const getStatusBadge = (tenant: Tenant) => {
    if (!tenant.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date()) {
      return <Badge variant="outline">Trial</Badge>;
    }

    if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
      return <Badge variant="default">Paid</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Management</CardTitle>
          <CardDescription>Manage all tenants and their configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{pagination.total}</div>
              <div className="text-sm text-muted-foreground">Total Tenants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tenants.filter(t => t.isActive).length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {tenants.filter(t => t.trialEndsAt && new Date(t.trialEndsAt) > new Date()).length}
              </div>
              <div className="text-sm text-muted-foreground">On Trial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {tenants.reduce((sum, t) => {
                  const credits = typeof t.totalCredits === 'number' ? t.totalCredits : parseFloat(t.totalCredits || 0);
                  return sum + credits;
                }, 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Credits</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading tenants...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Subdomain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Entities</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.tenantId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tenant.companyName}</div>
                        <div className="text-sm text-muted-foreground">{tenant.adminEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.subdomain}</TableCell>
                    <TableCell>{getStatusBadge(tenant)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        {tenant.userCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        {tenant.entityCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className={(Number(tenant.totalCredits) || 0) < 100 ? 'text-red-600' : ''}>
                          {(Number(tenant.totalCredits) || 0).toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(tenant)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(tenant)}
                        >
                          {tenant.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportTenant(tenant)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDebugCredits(tenant.tenantId)}
                          title="Debug Credit Discrepancies"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCleanOrphanedCredits(tenant.tenantId)}
                          title="Clean Orphaned Credits"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTenant?.tenant.companyName} Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about this tenant
            </DialogDescription>
          </DialogHeader>

          {selectedTenant && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Company:</span>
                      <span>{selectedTenant.tenant?.companyName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Subdomain:</span>
                      <span>{selectedTenant.tenant?.subdomain || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      {selectedTenant.tenant ? getStatusBadge(selectedTenant.tenant) : <Badge variant="secondary">Unknown</Badge>}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Created:</span>
                      <span>{selectedTenant.tenant?.createdAt ? new Date(selectedTenant.tenant.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Entity Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Entities:</span>
                      <span>{selectedTenant.entitySummary?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Organizations:</span>
                      <span>{selectedTenant.entitySummary?.organizations || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Locations:</span>
                      <span>{selectedTenant.entitySummary?.locations || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Active:</span>
                      <span>{selectedTenant.entitySummary?.active || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Credit Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Credit Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{(Number(selectedTenant.creditSummary?.totalCredits) || 0).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Credits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{(Number(selectedTenant.creditSummary?.reservedCredits) || 0).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Reserved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedTenant.creditSummary?.activeEntities || 0}</div>
                      <div className="text-sm text-muted-foreground">Active Entities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{(Number(selectedTenant.creditSummary?.averageCredits) || 0).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Avg per Entity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entity Hierarchy with Credits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entities & Credits</CardTitle>
                  <CardDescription>
                    All entities in this tenant with their credit information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTenant.entityHierarchy ? (
                    <EntityHierarchyWithCredits
                      hierarchy={selectedTenant.entityHierarchy}
                      onAllocateCredits={handleAllocateCredits}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading entity hierarchy...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Credit Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Credit Activity</CardTitle>
                  <CardDescription>Credit transactions for this tenant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(!selectedTenant.recentCreditActivity || selectedTenant.recentCreditActivity.length === 0) ? (
                      <p className="text-sm text-muted-foreground">No recent credit activity</p>
                    ) : (
                      selectedTenant.recentCreditActivity.slice(0, 5).map((transaction: any, index: number) => (
                        <div key={transaction.transactionId || index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              (parseFloat(transaction.amount) || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <div className="font-medium text-sm">
                                {transaction.entityName ? `${transaction.entityType}: ${transaction.entityName}` : 'General Transaction'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {transaction.operationCode} • {new Date(transaction.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className={`text-sm font-medium ${
                            (parseFloat(transaction.amount) || 0) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(parseFloat(transaction.amount) || 0) > 0 ? '+' : ''}{(parseFloat(transaction.amount) || 0).toFixed(2)} credits
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(!selectedTenant.recentActivity || selectedTenant.recentActivity.length === 0) ? (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                      selectedTenant.recentActivity.map((activity: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <div>
                            <div className="font-medium">{activity?.description || 'Unknown activity'}</div>
                            <div className="text-sm text-muted-foreground">
                              {activity?.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                            </div>
                          </div>
                          <Badge variant="outline">{activity?.type || 'unknown'}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Component to display entity hierarchy with credit information
interface EntityNode {
  entityId: string;
  entityType: string;
  entityName: string;
  entityCode: string;
  isActive: boolean;
  availableCredits: string;
  reservedCredits: string;
  children?: EntityNode[];
}

interface EntityHierarchyWithCreditsProps {
  hierarchy: EntityNode[];
  onAllocateCredits: (entityId: string, amount: number, operationCode: string) => void;
}

const EntityHierarchyWithCredits: React.FC<EntityHierarchyWithCreditsProps> = ({
  hierarchy,
  onAllocateCredits
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [allocatingEntity, setAllocatingEntity] = useState<string | null>(null);
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, string>>({});

  const toggleNode = (entityId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(entityId)) {
      newExpanded.delete(entityId);
    } else {
      newExpanded.add(entityId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleAllocation = async (entityId: string) => {
    const amount = parseFloat(allocationAmounts[entityId] || '0');
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setAllocatingEntity(entityId);
    try {
      await onAllocateCredits(entityId, amount, 'admin.manual_allocation');
      // Clear the allocation amount for this entity after successful allocation
      setAllocationAmounts(prev => ({
        ...prev,
        [entityId]: ''
      }));
      setAllocatingEntity(null);
      toast.success('Credits allocated successfully');
    } catch (error) {
      console.error('Allocation error:', error);
      toast.error('Failed to allocate credits');
    } finally {
      setAllocatingEntity(null);
    }
  };

  const handleAmountChange = (entityId: string, value: string) => {
    setAllocationAmounts(prev => ({
      ...prev,
      [entityId]: value
    }));
  };

  const renderEntityNode = (node: EntityNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.entityId);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.entityId}>
        <div className="flex items-center justify-between py-2 px-2 border-l-2 border-l-gray-200"
             style={{ marginLeft: `${level * 20}px` }}>
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleNode(node.entityId)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <div className="w-6" />
            )}

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">{node.entityName}</div>
                <div className="text-xs text-muted-foreground">
                  {node.entityType} • {node.entityCode}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">
                {(parseFloat(node.availableCredits) || 0).toFixed(2)} credits
              </div>
              <div className="text-xs text-muted-foreground">
                Reserved: {(parseFloat(node.reservedCredits) || 0).toFixed(2)}
              </div>
            </div>

            <Badge variant={node.isActive ? "default" : "secondary"}>
              {node.isActive ? "Active" : "Inactive"}
            </Badge>

            <div className="flex gap-1">
              <Input
                type="number"
                placeholder="Amount"
                value={allocationAmounts[node.entityId] || ''}
                onChange={(e) => handleAmountChange(node.entityId, e.target.value)}
                className="w-20 h-8 text-xs"
                disabled={allocatingEntity === node.entityId}
                min="0"
                step="0.01"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAllocation(node.entityId)}
                disabled={allocatingEntity === node.entityId || !allocationAmounts[node.entityId] || allocationAmounts[node.entityId] === '0'}
                className="h-8"
              >
                {allocatingEntity === node.entityId ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderEntityNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {hierarchy.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No entities found</p>
        </div>
      ) : (
        hierarchy.map(node => renderEntityNode(node))
      )}
    </div>
  );
};
