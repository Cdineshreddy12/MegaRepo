import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Types
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
}

interface RecentActivity {
  type: string;
  tenantName: string;
  description: string;
  timestamp: string;
}

// Dashboard overview hook
export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'overview'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/overview');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch dashboard overview');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Recent activity hook
export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'recent-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/recent-activity');
      if (response.data.success) {
        return response.data.data.activities;
      }
      throw new Error('Failed to fetch recent activity');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

// Combined dashboard data hook
export const useDashboardData = () => {
  const overview = useDashboardOverview();
  const recentActivity = useRecentActivity();

  return {
    data: {
      overview: overview.data,
      recentActivity: recentActivity.data,
    },
    isLoading: overview.isLoading || recentActivity.isLoading,
    error: overview.error || recentActivity.error,
    refetch: () => {
      overview.refetch();
      recentActivity.refetch();
    },
  };
};
