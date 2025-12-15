import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, TrendingUp, TrendingDown, AlertTriangle, Plus, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface CreditOverview {
  totalStats: {
    totalCredits: number;
    totalReserved: number;
    totalEntities: number;
    totalTenants: number;
  };
  tenantDistribution: Array<{
    tenantId: string;
    companyName: string;
    totalCredits: number;
    reservedCredits: number;
    entityCount: number;
  }>;
  lowBalanceAlerts: Array<{
    tenantId: string;
    companyName: string;
    entityId: string;
    entityName: string;
    entityType: string;
    availableCredits: number;
    alertLevel: string;
    lastUpdatedAt: string;
  }>;
  recentTransactions: Array<{
    transactionId: string;
    tenantId: string;
    companyName: string;
    entityId?: string;
    entityName?: string;
    entityType?: string;
    transactionType: string;
    amount: number;
    previousBalance?: string;
    newBalance?: string;
    operationCode: string;
    createdAt: string;
    initiatedBy?: string;
  }>;
}

interface CreditAnalytics {
  usageByOperation: Array<{
    operationCode: string;
    totalUsed: number;
    transactionCount: number;
    avgPerTransaction: number;
  }>;
  usageByTenant: Array<{
    tenantId: string;
    companyName: string;
    totalUsed: number;
    transactionCount: number;
  }>;
  usageTrend: Array<{
    period: string;
    totalUsed: number;
    transactionCount: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

interface EntityBalance {
  entityId: string;
  tenantId: string;
  entityType: string;
  entityName: string;
  entityCode: string;
  companyName: string;
  availableCredits: number;
  reservedCredits: number;
  totalCredits: number;
  isActive: boolean;
  lastUpdatedAt: string;
  createdAt: string;
}

interface Transaction {
  transactionId: string;
  tenantId: string;
  companyName: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  transactionType: string;
  amount: number;
  previousBalance?: string;
  newBalance?: string;
  operationCode: string;
  createdAt: string;
}

interface CreditAlerts {
  critical: Array<any>;
  warning: Array<any>;
  inactive: Array<any>;
  summary: {
    criticalCount: number;
    warningCount: number;
    inactiveCount: number;
    totalAlerts: number;
  };
}

export const CreditManagement: React.FC = () => {
  const [overview, setOverview] = useState<CreditOverview | null>(null);
  const [analytics, setAnalytics] = useState<CreditAnalytics | null>(null);
  const [entityBalances, setEntityBalances] = useState<EntityBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<CreditAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [showBulkAllocation, setShowBulkAllocation] = useState(false);
  const [showEntityBalances, setShowEntityBalances] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [entityBalancesPage, setEntityBalancesPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [bulkAllocations, setBulkAllocations] = useState<Array<{
    entityId: string;
    amount: number;
    operationCode: string;
  }>>([]);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      const [overviewResponse, analyticsResponse, alertsResponse] = await Promise.all([
        api.get('/admin/credits/overview'),
        api.get('/admin/credits/analytics', { params: { period: analyticsPeriod } }),
        api.get('/admin/credits/alerts')
      ]);

      if (overviewResponse.data.success) {
        setOverview(overviewResponse.data.data);
      }

      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }

      if (alertsResponse.data.success) {
        setAlerts(alertsResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch credit data:', error);
      toast.error('Failed to load credit data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityBalances = async (page = 1) => {
    try {
      const response = await api.get('/admin/credits/entity-balances', {
        params: { page, limit: 20 }
      });

      if (response.data.success) {
        setEntityBalances(response.data.data.entityBalances);
        setEntityBalancesPage(page);
      }
    } catch (error) {
      console.error('Failed to fetch entity balances:', error);
      toast.error('Failed to load entity balances');
    }
  };

  const fetchTransactionHistory = async (page = 1) => {
    try {
      const response = await api.get('/admin/credits/transactions', {
        params: { page, limit: 50 }
      });

      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setTransactionsPage(page);
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      toast.error('Failed to load transaction history');
    }
  };

  useEffect(() => {
    fetchCreditData();
  }, [analyticsPeriod]);

  const handleBulkAllocation = async () => {
    try {
      if (bulkAllocations.length === 0) {
        toast.error('No allocations to process');
        return;
      }

      const response = await api.post('/admin/credits/bulk-allocate', {
        allocations: bulkAllocations,
        reason: 'Admin bulk credit allocation'
      });

      if (response.data.success) {
        toast.success(`Successfully allocated credits to ${response.data.data.summary.successful} entities`);
        setBulkAllocations([]);
        setShowBulkAllocation(false);
        fetchCreditData();
      }
    } catch (error) {
      console.error('Failed to bulk allocate credits:', error);
      toast.error('Failed to allocate credits');
    }
  };

  const addBulkAllocation = () => {
    setBulkAllocations([...bulkAllocations, {
      entityId: '',
      amount: 0,
      operationCode: 'admin.bulk_allocation'
    }]);
  };

  const updateBulkAllocation = (index: number, field: string, value: string | number) => {
    const updated = [...bulkAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setBulkAllocations(updated);
  };

  const removeBulkAllocation = (index: number) => {
    setBulkAllocations(bulkAllocations.filter((_, i) => i !== index));
  };

  const getAlertBadge = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{alertLevel}</Badge>;
    }
  };

  const getTransactionBadge = (transactionType: string) => {
    switch (transactionType) {
      case 'purchase':
        return <Badge variant="default">Purchase</Badge>;
      case 'consumption':
        return <Badge variant="secondary">Consumption</Badge>;
      case 'expiry':
        return <Badge variant="outline">Expiry</Badge>;
      case 'adjustment':
        return <Badge variant="outline">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{transactionType}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading credit data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Credit Management</h2>
          <p className="text-muted-foreground">Monitor and manage credit allocation across all tenants</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setShowEntityBalances(true);
            fetchEntityBalances();
          }}>
            <CreditCard className="h-4 w-4 mr-2" />
            Entity Balances
          </Button>
          <Button onClick={() => {
            setShowTransactionHistory(true);
            fetchTransactionHistory();
          }}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Transaction History
          </Button>
          <Button onClick={() => setShowBulkAllocation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Bulk Allocate
          </Button>
          <Button variant="outline" onClick={fetchCreditData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(parseFloat(overview.totalStats.totalCredits) || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {(parseFloat(overview.totalStats.totalReserved) || 0).toFixed(2)} reserved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Entities</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalStats.totalEntities}</div>
              <p className="text-xs text-muted-foreground">
                Across {overview.totalStats.totalTenants} tenants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Balance Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overview.lowBalanceAlerts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Entities need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Credits/Entity</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview.totalStats.totalEntities > 0
                  ? ((parseFloat(overview.totalStats.totalCredits) || 0) / overview.totalStats.totalEntities).toFixed(2)
                  : '0.00'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Per active entity
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Credit Alerts Summary */}
      {alerts && alerts.summary && alerts.summary.totalAlerts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Credit Alerts Summary
            </CardTitle>
            <CardDescription>Current credit alerts requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg bg-red-50 border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {alerts.summary.criticalCount}
                </div>
                <div className="text-sm text-red-700">Critical Alerts</div>
                <div className="text-xs text-red-600 mt-1">Credits below 10</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {alerts.summary.warningCount}
                </div>
                <div className="text-sm text-yellow-700">Warning Alerts</div>
                <div className="text-xs text-yellow-600 mt-1">Credits 10-99</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {alerts.summary.inactiveCount}
                </div>
                <div className="text-sm text-blue-700">Inactive Entities</div>
                <div className="text-xs text-blue-600 mt-1">No activity &gt;90 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Balance Alerts */}
      {overview && overview.lowBalanceAlerts && overview.lowBalanceAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Low Balance Alerts</CardTitle>
            <CardDescription>Entities with critically low or warning credit balances</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Alert Level</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.lowBalanceAlerts.slice(0, 10).map((alert) => alert && (
                  <TableRow key={`${alert.tenantId}-${alert.entityId}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{alert.entityName}</div>
                        <div className="text-sm text-muted-foreground">{alert.entityId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{alert.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{alert.entityType}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={(parseFloat(alert.availableCredits) || 0) < 10 ? 'text-red-600 font-bold' : 'text-yellow-600'}>
                        {(parseFloat(alert.availableCredits) || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{getAlertBadge(alert.alertLevel)}</TableCell>
                    <TableCell>
                      {new Date(alert.lastUpdatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top Credit Holders */}
      {overview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Credit Holders</CardTitle>
            <CardDescription>Tenants with the highest total credit balances</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Entities</TableHead>
                  <TableHead>Avg per Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.tenantDistribution.slice(0, 10).map((tenant) => tenant && (
                  <TableRow key={tenant.tenantId}>
                    <TableCell>
                      <div className="font-medium">{tenant.companyName}</div>
                      <div className="text-sm text-muted-foreground">{tenant.tenantId}</div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {(parseFloat(tenant.totalCredits) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{(parseFloat(tenant.reservedCredits) || 0).toFixed(2)}</TableCell>
                    <TableCell>{tenant.entityCount}</TableCell>
                    <TableCell>
                      {tenant.entityCount > 0 ? ((parseFloat(tenant.totalCredits) || 0) / tenant.entityCount).toFixed(2) : '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Usage Analytics */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Usage Analytics</CardTitle>
              <CardDescription>Credit consumption patterns and trends</CardDescription>
            </div>
            <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {analytics && (
            <div className="space-y-6">
              {/* Usage by Operation */}
              <div>
                <h4 className="font-medium mb-3">Usage by Operation Type</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Total Used</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Avg per Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.usageByOperation.slice(0, 5).map((op) => op && (
                      <TableRow key={op.operationCode}>
                        <TableCell className="font-medium">{op.operationCode}</TableCell>
                        <TableCell>{(parseFloat(op.totalUsed) || 0).toFixed(2)}</TableCell>
                        <TableCell>{op.transactionCount}</TableCell>
                        <TableCell>{(parseFloat(op.avgPerTransaction) || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Usage by Tenant */}
              <div>
                <h4 className="font-medium mb-3">Usage by Tenant</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Total Used</TableHead>
                      <TableHead>Transactions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.usageByTenant.slice(0, 5).map((tenant) => tenant && (
                      <TableRow key={tenant.tenantId}>
                        <TableCell className="font-medium">{tenant.companyName}</TableCell>
                        <TableCell>{(parseFloat(tenant.totalUsed) || 0).toFixed(2)}</TableCell>
                        <TableCell>{tenant.transactionCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Credit Activity */}
      {overview && overview.recentTransactions && overview.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recent Credit Activity
            </CardTitle>
            <CardDescription>Detailed view of recent credit transactions and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Activity Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {overview.recentTransactions.filter(t => (parseFloat(t.amount) || 0) > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Credits Added</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {overview.recentTransactions.filter(t => (parseFloat(t.amount) || 0) < 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Credits Used</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {overview.recentTransactions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Transactions</div>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Activity Timeline</h4>
                {overview.recentTransactions.slice(0, 5).map((transaction, index) => transaction && (
                  <div key={transaction.transactionId} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      (parseFloat(transaction.amount) || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{transaction.companyName}</div>
                          {transaction.entityName && (
                            <div className="text-xs text-muted-foreground">
                              {transaction.entityType}: {transaction.entityName}
                            </div>
                          )}
                        </div>
                        <div className={`text-right ${
                          (parseFloat(transaction.amount) || 0) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <div className="text-sm font-medium">
                            {(parseFloat(transaction.amount) || 0) > 0 ? '+' : ''}{(parseFloat(transaction.amount) || 0).toFixed(2)} credits
                          </div>
                          {transaction.newBalance && (
                            <div className="text-xs text-muted-foreground">
                              Balance: {(parseFloat(transaction.newBalance) || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getTransactionBadge(transaction.transactionType)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{transaction.operationCode}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Transactions Table */}
              <div className="mt-6">
                <h4 className="font-medium text-sm mb-3">All Recent Transactions</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.recentTransactions.map((transaction) => transaction && (
                      <TableRow key={transaction.transactionId}>
                        <TableCell className="font-medium">{transaction.companyName}</TableCell>
                        <TableCell>
                          {transaction.entityName ? (
                            <div>
                              <div className="font-medium text-sm">{transaction.entityName}</div>
                              <div className="text-xs text-muted-foreground">{transaction.entityType}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getTransactionBadge(transaction.transactionType)}</TableCell>
                        <TableCell className={`font-medium ${
                          (parseFloat(transaction.amount) || 0) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(parseFloat(transaction.amount) || 0) > 0 ? '+' : ''}{(parseFloat(transaction.amount) || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.newBalance ? (
                            <span className="font-medium">
                              {(parseFloat(transaction.newBalance) || 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {transaction.operationCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity Balances Dialog */}
      <Dialog open={showEntityBalances} onOpenChange={setShowEntityBalances}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Entity Credit Balances</DialogTitle>
            <DialogDescription>
              Complete list of all entities with their current credit balances
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {entityBalances.length} entities
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchEntityBalances(entityBalancesPage - 1)}
                  disabled={entityBalancesPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchEntityBalances(entityBalancesPage + 1)}
                  disabled={entityBalances.length < 20}
                >
                  Next
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Available Credits</TableHead>
                  <TableHead>Reserved Credits</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityBalances.map((entity) => (
                  <TableRow key={entity.entityId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entity.entityName}</div>
                        <div className="text-sm text-muted-foreground">{entity.entityCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>{entity.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entity.entityType}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      {(entity.availableCredits || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{(entity.reservedCredits || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-medium">
                      {(entity.totalCredits || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entity.lastUpdatedAt ? new Date(entity.lastUpdatedAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
        <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Transaction History</DialogTitle>
            <DialogDescription>
              Detailed history of all credit transactions across all entities
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {transactions.length} transactions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactionHistory(transactionsPage - 1)}
                  disabled={transactionsPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactionHistory(transactionsPage + 1)}
                  disabled={transactions.length < 50}
                >
                  Next
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Previous Balance</TableHead>
                  <TableHead>New Balance</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.transactionId}>
                    <TableCell className="font-medium">{transaction.companyName}</TableCell>
                    <TableCell>
                      {transaction.entityName ? (
                        <div>
                          <div className="font-medium text-sm">{transaction.entityName}</div>
                          <div className="text-xs text-muted-foreground">{transaction.entityType}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{getTransactionBadge(transaction.transactionType)}</TableCell>
                    <TableCell className={`font-medium ${
                      (transaction.amount || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(transaction.amount || 0) > 0 ? '+' : ''}{(transaction.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.previousBalance ? (
                        <span>{(parseFloat(transaction.previousBalance) || 0).toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {transaction.newBalance ? (
                        <span>{(parseFloat(transaction.newBalance) || 0).toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {transaction.operationCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Allocation Dialog */}
      <Dialog open={showBulkAllocation} onOpenChange={setShowBulkAllocation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Credit Allocation</DialogTitle>
            <DialogDescription>
              Allocate credits to multiple entities at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {bulkAllocations.map((allocation, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Entity ID"
                  value={allocation.entityId}
                  onChange={(e) => updateBulkAllocation(index, 'entityId', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={allocation.amount}
                  onChange={(e) => updateBulkAllocation(index, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeBulkAllocation(index)}
                >
                  Remove
                </Button>
              </div>
            ))}

            <Button onClick={addBulkAllocation} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Allocation
            </Button>

            {bulkAllocations.length > 0 && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleBulkAllocation} className="flex-1">
                  Allocate Credits
                </Button>
                <Button variant="outline" onClick={() => setBulkAllocations([])}>
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
