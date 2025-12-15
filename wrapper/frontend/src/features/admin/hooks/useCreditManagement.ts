import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Types
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
    transactionType: string;
    amount: number;
    operationCode: string;
    createdAt: string;
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
    totalAdded: number;
    transactionCount: number;
  }>;
}

// Credit overview hook
export const useCreditOverview = () => {
  return useQuery({
    queryKey: ['admin', 'credits', 'overview'],
    queryFn: async () => {
      const response = await api.get('/admin/credits/overview');
      if (response.data.success) {
        return response.data.data as CreditOverview;
      }
      throw new Error('Failed to fetch credit overview');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Credit analytics hook
export const useCreditAnalytics = (period: string = '30d') => {
  return useQuery({
    queryKey: ['admin', 'credits', 'analytics', period],
    queryFn: async () => {
      const response = await api.get('/admin/credits/analytics', {
        params: { period }
      });
      if (response.data.success) {
        return response.data.data as CreditAnalytics;
      }
      throw new Error('Failed to fetch credit analytics');
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Credit alerts hook
export const useCreditAlerts = () => {
  return useQuery({
    queryKey: ['admin', 'credits', 'alerts'],
    queryFn: async () => {
      const response = await api.get('/admin/credits/alerts');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch credit alerts');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Bulk credit allocation mutation
export const useBulkCreditAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      allocations,
      reason
    }: {
      allocations: Array<{
        entityId: string;
        amount: number;
        operationCode?: string;
      }>;
      reason?: string;
    }) => {
      const response = await api.post('/admin/credits/bulk-allocate', {
        allocations,
        reason
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to bulk allocate credits');
    },
    onSuccess: (data) => {
      toast.success(`Successfully allocated credits to ${data.summary.successful} entities`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'credits']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
      queryClient.invalidateQueries(['admin', 'entities']);
      queryClient.invalidateQueries(['admin', 'tenants']);
    },
    onError: (error) => {
      toast.error('Failed to allocate credits');
      console.error('Bulk credit allocation error:', error);
    },
  });
};

// Credit transactions hook
export const useCreditTransactions = (filters: {
  page?: number;
  limit?: number;
  tenantId?: string;
  entityId?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
} = {}) => {
  const {
    page = 1,
    limit = 50,
    tenantId,
    entityId,
    transactionType,
    startDate,
    endDate,
    minAmount,
    maxAmount
  } = filters;

  return useQuery({
    queryKey: ['admin', 'credits', 'transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (tenantId) params.append('tenantId', tenantId);
      if (entityId) params.append('entityId', entityId);
      if (transactionType) params.append('transactionType', transactionType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (minAmount !== undefined) params.append('minAmount', minAmount.toString());
      if (maxAmount !== undefined) params.append('maxAmount', maxAmount.toString());

      const response = await api.get(`/admin/credits/transactions?${params}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch credit transactions');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

// Combined credit management hook
export const useCreditManagement = (analyticsPeriod: string = '30d') => {
  const overview = useCreditOverview();
  const analytics = useCreditAnalytics(analyticsPeriod);
  const alerts = useCreditAlerts();

  return {
    data: {
      overview: overview.data,
      analytics: analytics.data,
      alerts: alerts.data,
    },
    isLoading: overview.isLoading || analytics.isLoading || alerts.isLoading,
    error: overview.error || analytics.error || alerts.error,
    refetch: () => {
      overview.refetch();
      analytics.refetch();
      alerts.refetch();
    },
  };
};
