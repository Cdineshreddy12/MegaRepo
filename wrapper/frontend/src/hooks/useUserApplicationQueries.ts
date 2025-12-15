import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApplicationKeys, userApplicationAPI } from '../lib/queries/userApplication';
import toast from 'react-hot-toast';

// Types
interface UserClassification {
  userId: string;
  name: string;
  email: string;
  allowedApplications: string[];
  roles: Array<{ roleId: string; roleName: string }>;
  classificationReason: {
    primary: string;
    accessMethod: string;
    allowedAppCount: number;
  };
}

interface ApplicationGroup {
  appCode: string;
  appInfo: {
    appCode: string;
    appName: string;
    description: string;
  };
  users: UserClassification[];
  totalUsers: number;
  userCount?: number;
  icon?: string;
  baseUrl?: string;
}

interface ClassificationData {
  summary: {
    totalUsers: number;
    applicationBreakdown: Record<string, number>;
    subscriptionBreakdown: Record<string, number>;
  };
  byApplication: Record<string, ApplicationGroup>;
  byUser: Record<string, UserClassification>;
}

interface SyncStatusData {
  tenantId: string;
  summary: { totalUsers: number };
  applicationStatus: Record<string, {
    userCount: number;
    applicationUrl: string;
    isConfigured: boolean;
    status: string;
  }>;
}

// Custom Hooks
export function useUserClassification() {
  return useQuery({
    queryKey: userApplicationKeys.classification(),
    queryFn: userApplicationAPI.getClassification,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: userApplicationKeys.syncStatus(),
    queryFn: userApplicationAPI.getSyncStatus,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useConnectivityTest() {
  return useQuery({
    queryKey: userApplicationKeys.connectivity(),
    queryFn: userApplicationAPI.testConnectivity,
    enabled: false, // Only run when manually triggered
    retry: 1,
  });
}

// Mutation Hooks
export function useSyncAllUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApplicationAPI.syncAllUsers,
    onSuccess: (response) => {
      toast.success(response.data.message || 'Users synced successfully');
      queryClient.invalidateQueries({ queryKey: userApplicationKeys.classification() });
      queryClient.invalidateQueries({ queryKey: userApplicationKeys.syncStatus() });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync users');
    },
  });
}

export function useSyncApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApplicationAPI.syncUsersForApplication,
    onSuccess: (response, appCode) => {
      toast.success(`${appCode.toUpperCase()} users synced successfully`);
      queryClient.invalidateQueries({ queryKey: userApplicationKeys.classification() });
    },
    onError: (error: any, appCode) => {
      toast.error(`Failed to sync ${appCode.toUpperCase()} users`);
    },
  });
}

export function useSyncUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApplicationAPI.syncUser,
    onSuccess: (response, userId) => {
      toast.success('User synced successfully');
      queryClient.invalidateQueries({ queryKey: userApplicationKeys.classification() });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync user');
    },
  });
}

export function useTestConnectivity() {
  return useMutation({
    mutationFn: userApplicationAPI.testConnectivity,
    onSuccess: (response) => {
      const results = response.data.data;
      const available = results.summary.available;
      const total = results.summary.total;
      toast.success(`Connectivity test: ${available}/${total} applications available`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Connectivity test failed');
    },
  });
}

// Utility Hooks
export function useUserApplicationData() {
  const classification = useUserClassification();
  const syncStatus = useSyncStatus();

  const isLoading = classification.isLoading || syncStatus.isLoading;
  const isError = classification.isError || syncStatus.isError;
  const error = classification.error || syncStatus.error;

  return {
    classification: classification.data,
    syncStatus: syncStatus.data,
    isLoading,
    isError,
    error,
    refetch: () => {
      classification.refetch();
      syncStatus.refetch();
    },
  };
}
