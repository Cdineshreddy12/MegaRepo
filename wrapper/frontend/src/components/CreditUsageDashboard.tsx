import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useCreditStats, useCreditTransactionHistory, useCreditUsageSummary } from '@/hooks/useSharedQueries';

interface CreditUsageDashboardProps {
  tenantId?: string;
  showExport?: boolean;
  compact?: boolean;
}

export function CreditUsageDashboard({
  tenantId,
  showExport = true,
  compact = false
}: CreditUsageDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch credit statistics using shared hook
  const {
    data: statsResponse,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useCreditStats();

  // Fetch transaction history using shared hook
  const {
    data: transactionsResponse,
    isLoading: transactionsLoading,
    refetch: refetchTransactions
  } = useCreditTransactionHistory({
    limit: 100,
    type: undefined, // Get all types
    startDate: selectedDateRange.startDate,
    endDate: selectedDateRange.endDate
  });

  // Fetch usage summary using shared hook
  const {
    data: usageResponse,
    isLoading: usageLoading,
    refetch: refetchUsage
  } = useCreditUsageSummary({
    period: selectedPeriod,
    startDate: selectedDateRange.startDate,
    endDate: selectedDateRange.endDate
  });

  const statsData = statsResponse?.data;
  const transactionsData = transactionsResponse?.data;
  const usageData = usageResponse?.data;

  const handleRefresh = async () => {
    await Promise.all([
      refetchStats(),
      refetchTransactions(),
      refetchUsage()
    ]);
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log('Export credit usage data');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Coins className="h-4 w-4 text-green-500" />;
      case 'consumption':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'expiry':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case 'transfer_in':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'transfer_out':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'text-green-600';
      case 'consumption':
        return 'text-red-600';
      case 'expiry':
        return 'text-orange-600';
      case 'transfer_in':
        return 'text-blue-600';
      case 'transfer_out':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Credit Usage
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {usageData?.totalPurchased || 0}
              </div>
              <div className="text-xs text-gray-500">Purchased</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {usageData?.totalConsumed || 0}
              </div>
              <div className="text-xs text-gray-500">Consumed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {usageData?.netCredits || 0}
              </div>
              <div className="text-xs text-gray-500">Net</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credit Usage Dashboard</h2>
          <p className="text-gray-600">Monitor your credit consumption and usage patterns</p>
        </div>
        <div className="flex gap-2">
          {showExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last 24 Hours</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={selectedDateRange.startDate}
                onChange={(e) => setSelectedDateRange(prev => ({
                  ...prev,
                  startDate: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={selectedDateRange.endDate}
                onChange={(e) => setSelectedDateRange(prev => ({
                  ...prev,
                  endDate: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Purchased</p>
                <p className="text-2xl font-bold text-green-600">
                  {usageData?.totalPurchased || 0}
                </p>
              </div>
              <Coins className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Consumed</p>
                <p className="text-2xl font-bold text-red-600">
                  {usageData?.totalConsumed || 0}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expired</p>
                <p className="text-2xl font-bold text-orange-600">
                  {usageData?.totalExpired || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Credits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {usageData?.netCredits || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="breakdown">Usage Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Usage Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest credit transactions and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : transactionsData?.transactions?.length > 0 ? (
                <div className="space-y-4">
                  {transactionsData.transactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium capitalize">
                            {transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.description || 'No description'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === 'consumption' || transaction.type === 'expiry' || transaction.type === 'transfer_out'
                            ? '-' : '+'}
                          {Math.abs(transaction.amount).toLocaleString()} credits
                        </p>
                        <p className="text-sm text-gray-600">
                          Balance: {transaction.newBalance?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Breakdown by Type</CardTitle>
              <CardDescription>
                Credit consumption categorized by transaction type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageData?.transactionsByType ? (
                <div className="space-y-4">
                  {Object.entries(usageData.transactionsByType).map(([type, amount]: [string, any]) => (
                    <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(type)}
                        <span className="font-medium capitalize">
                          {type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold ${getTransactionColor(type)}`}>
                          {Math.abs(amount).toLocaleString()} credits
                        </span>
                        <div className="text-xs text-gray-500">
                          {((Math.abs(amount) / (usageData.totalConsumed || 1)) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <CardDescription>
                Credit usage patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Usage trends chart will be implemented here</p>
                <p className="text-sm mt-2">
                  This will show daily/weekly/monthly usage patterns with interactive charts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
