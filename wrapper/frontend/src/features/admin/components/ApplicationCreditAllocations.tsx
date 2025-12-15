import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, TrendingUp, TrendingDown, AlertTriangle, Plus, Download, RefreshCw, Target, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ApplicationAllocation {
  allocationId: string;
  tenantId: string;
  sourceEntityId: string;
  targetApplication: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  allocationType: string;
  allocationPurpose?: string;
  allocatedAt: string;
  expiresAt?: string;
  autoReplenish: boolean;
  companyName?: string;
  entityName?: string;
}

interface AllocationSummary {
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
}

interface ApplicationBalance {
  tenantId: string;
  application: string;
  allocationId?: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  hasAllocation: boolean;
  allocationPurpose?: string;
  allocatedAt?: string;
  expiresAt?: string;
  autoReplenish: boolean;
}

const SUPPORTED_APPLICATIONS = [
  { code: 'crm', name: 'CRM', description: 'Customer Relationship Management' },
  { code: 'hr', name: 'HR', description: 'Human Resources Management' },
  { code: 'affiliate', name: 'Affiliate', description: 'Affiliate Management' },
  { code: 'system', name: 'System', description: 'System Administration' }
];

const ApplicationCreditAllocations: React.FC = () => {
  const queryClient = useQueryClient();

  const [allocations, setAllocations] = useState<ApplicationAllocation[]>([]);
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [applicationBalances, setApplicationBalances] = useState<ApplicationBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [allocationForm, setAllocationForm] = useState({
    targetApplication: '',
    creditAmount: 0,
    allocationPurpose: '',
    autoReplenish: false
  });
  const [transferForm, setTransferForm] = useState({
    fromApplication: '',
    toApplication: '',
    creditAmount: 0,
    transferReason: ''
  });

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/credits/application-allocations');
      if (response.data.success) {
        setAllocations(response.data.data.allocations || []);
        setSummary(response.data.data.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch application allocations:', error);
      toast.error('Failed to load application allocations');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationBalances = async (tenantId: string) => {
    try {
      const balances = [];
      for (const app of SUPPORTED_APPLICATIONS) {
        try {
          const response = await api.get(`/credits/balance/application/${app.code}`, {
            headers: { 'X-Tenant-ID': tenantId }
          });
          if (response.data.success) {
            balances.push({
              ...response.data.data,
              application: app.code
            });
          }
        } catch (error) {
          // Application doesn't have allocation, add empty balance
          balances.push({
            tenantId,
            application: app.code,
            allocatedCredits: 0,
            usedCredits: 0,
            availableCredits: 0,
            hasAllocation: false,
            autoReplenish: false
          });
        }
      }
      setApplicationBalances(balances);
    } catch (error) {
      console.error('Failed to fetch application balances:', error);
      toast.error('Failed to load application balances');
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchApplicationBalances(selectedTenant);
    }
  }, [selectedTenant]);

  const handleAllocateCredits = async () => {
    if (!allocationForm.targetApplication || !allocationForm.creditAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await api.post('/credits/allocate/application', {
        targetApplication: allocationForm.targetApplication,
        creditAmount: allocationForm.creditAmount,
        allocationPurpose: allocationForm.allocationPurpose,
        autoReplenish: allocationForm.autoReplenish
      }, {
        headers: { 'X-Tenant-ID': selectedTenant }
      });

      if (response.data.success) {
        toast.success(`Successfully allocated ${allocationForm.creditAmount} credits to ${allocationForm.targetApplication}`);

        // Invalidate credit queries to update the UI immediately
        try {
          queryClient.invalidateQueries({ queryKey: ['credit'] });
          queryClient.invalidateQueries({ queryKey: ['creditStatus'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['admin', 'entities'] });

          console.log('✅ Credit queries invalidated, UI should update automatically');
        } catch (invalidateError) {
          console.warn('Failed to invalidate queries:', invalidateError);
          // Don't show error to user as this is not critical
        }

        setAllocationForm({
          targetApplication: '',
          creditAmount: 0,
          allocationPurpose: '',
          autoReplenish: false
        });
        setShowAllocateDialog(false);
        fetchAllocations();
        if (selectedTenant) {
          fetchApplicationBalances(selectedTenant);
        }
      }
    } catch (error) {
      console.error('Failed to allocate credits:', error);
      toast.error('Failed to allocate credits');
    }
  };

  const handleTransferCredits = async () => {
    if (!transferForm.fromApplication || !transferForm.toApplication || !transferForm.creditAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (transferForm.fromApplication === transferForm.toApplication) {
      toast.error('Cannot transfer credits to the same application');
      return;
    }

    try {
      const response = await api.post('/credits/transfer/application', {
        fromApplication: transferForm.fromApplication,
        toApplication: transferForm.toApplication,
        creditAmount: transferForm.creditAmount,
        transferReason: transferForm.transferReason
      }, {
        headers: { 'X-Tenant-ID': selectedTenant }
      });

      if (response.data.success) {
        toast.success(`Successfully transferred ${transferForm.creditAmount} credits`);
        setTransferForm({
          fromApplication: '',
          toApplication: '',
          creditAmount: 0,
          transferReason: ''
        });
        setShowTransferDialog(false);
        fetchAllocations();
        if (selectedTenant) {
          fetchApplicationBalances(selectedTenant);
        }
      }
    } catch (error) {
      console.error('Failed to transfer credits:', error);
      toast.error('Failed to transfer credits');
    }
  };

  const getApplicationName = (appCode: string) => {
    const app = SUPPORTED_APPLICATIONS.find(a => a.code === appCode);
    return app ? app.name : appCode.toUpperCase();
  };

  const getApplicationDescription = (appCode: string) => {
    const app = SUPPORTED_APPLICATIONS.find(a => a.code === appCode);
    return app ? app.description : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading application credit allocations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Application Credit Allocations</h2>
          <p className="text-muted-foreground">Manage credit allocations to specific applications</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAllocateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Allocate Credits
          </Button>
          <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Transfer Credits
          </Button>
          <Button variant="outline" onClick={fetchAllocations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalAllocations}</div>
              <p className="text-xs text-muted-foreground">Active allocations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalAllocatedCredits.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Credits allocated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Used</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.totalUsedCredits.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Credits consumed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.totalAvailableCredits.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Credits remaining</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="allocations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="allocations">All Allocations</TabsTrigger>
          <TabsTrigger value="by-application">By Application</TabsTrigger>
          <TabsTrigger value="balances">Application Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-6">
          {/* Allocations Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Application Credit Allocations</CardTitle>
              <CardDescription>Complete list of credit allocations across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Auto-Replenish</TableHead>
                    <TableHead>Allocated At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.allocationId}>
                      <TableCell className="font-medium">
                        {allocation.companyName || allocation.tenantId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getApplicationName(allocation.targetApplication)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {allocation.allocatedCredits.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {allocation.usedCredits.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {allocation.availableCredits.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={allocation.autoReplenish ? "default" : "outline"}>
                          {allocation.autoReplenish ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(allocation.allocatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-application" className="space-y-6">
          {/* By Application Summary */}
          {summary?.allocationsByApplication.map((app) => (
            <Card key={app.application}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">{getApplicationName(app.application)}</Badge>
                  {getApplicationDescription(app.application)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{app.allocationCount}</div>
                    <div className="text-sm text-muted-foreground">Allocations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{app.totalAllocated.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Allocated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{app.totalUsed.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{app.totalAvailable.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          {/* Application Balances for Selected Tenant */}
          <Card>
            <CardHeader>
              <CardTitle>Application Credit Balances</CardTitle>
              <CardDescription>View credit balances for all applications in a specific tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="text-sm font-medium">Select Tenant</label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tenant to view application balances" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(allocations.map(a => a.tenantId))].map(tenantId => {
                      const allocation = allocations.find(a => a.tenantId === tenantId);
                      return (
                        <SelectItem key={tenantId} value={tenantId}>
                          {allocation?.companyName || tenantId}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedTenant && applicationBalances.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Allocated</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Auto-Replenish</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationBalances.map((balance) => (
                      <TableRow key={balance.application}>
                        <TableCell className="font-medium">
                          {getApplicationName(balance.application)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={balance.hasAllocation ? "default" : "outline"}>
                            {balance.hasAllocation ? "Allocated" : "No Allocation"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {balance.allocatedCredits.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {balance.usedCredits.toFixed(2)}
                        </TableCell>
                        <TableCell className={balance.availableCredits > 0 ? "text-green-600 font-medium" : "text-red-600"}>
                          {balance.availableCredits.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={balance.autoReplenish ? "default" : "outline"}>
                            {balance.autoReplenish ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Allocate Credits Dialog */}
      <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Credits to Application</DialogTitle>
            <DialogDescription>
              Allocate credits from organization pool to a specific application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Application</label>
              <Select
                value={allocationForm.targetApplication}
                onValueChange={(value) => setAllocationForm({...allocationForm, targetApplication: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_APPLICATIONS.map((app) => (
                    <SelectItem key={app.code} value={app.code}>
                      {app.name} - {app.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Credit Amount</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={allocationForm.creditAmount}
                onChange={(e) => setAllocationForm({...allocationForm, creditAmount: parseFloat(e.target.value) || 0})}
                placeholder="Enter credit amount"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Purpose (Optional)</label>
              <Input
                value={allocationForm.allocationPurpose}
                onChange={(e) => setAllocationForm({...allocationForm, allocationPurpose: e.target.value})}
                placeholder="Describe the purpose of this allocation"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAllocateCredits}>
                Allocate Credits
              </Button>
              <Button variant="outline" onClick={() => setShowAllocateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Credits Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Credits Between Applications</DialogTitle>
            <DialogDescription>
              Transfer credits from one application to another
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">From Application</label>
                <Select
                  value={transferForm.fromApplication}
                  onValueChange={(value) => setTransferForm({...transferForm, fromApplication: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source app" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationBalances
                      .filter(balance => balance.hasAllocation && balance.availableCredits > 0)
                      .map((balance) => (
                        <SelectItem key={balance.application} value={balance.application}>
                          {getApplicationName(balance.application)} ({balance.availableCredits.toFixed(2)} available)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">To Application</label>
                <Select
                  value={transferForm.toApplication}
                  onValueChange={(value) => setTransferForm({...transferForm, toApplication: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target app" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_APPLICATIONS.map((app) => (
                      <SelectItem key={app.code} value={app.code}>
                        {getApplicationName(app.code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Credit Amount</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={transferForm.creditAmount}
                onChange={(e) => setTransferForm({...transferForm, creditAmount: parseFloat(e.target.value) || 0})}
                placeholder="Enter credit amount to transfer"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Transfer Reason (Optional)</label>
              <Input
                value={transferForm.transferReason}
                onChange={(e) => setTransferForm({...transferForm, transferReason: e.target.value})}
                placeholder="Reason for the transfer"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTransferCredits}>
                Transfer Credits
              </Button>
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationCreditAllocations;
