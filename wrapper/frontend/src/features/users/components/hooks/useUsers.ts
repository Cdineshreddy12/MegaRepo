import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types/user-management';
import { UserService } from '../services/UserService';
import { LoggingService } from '../services/LoggingService';
import toast from 'react-hot-toast';

// Query key factory
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch users using service layer
const fetchUsers = async (): Promise<User[]> => {
  const startTime = Date.now();
  try {
    const users = await UserService.fetchUsers();
    const duration = Date.now() - startTime;
    LoggingService.logPerformance('fetchUsers', duration, { userCount: users.length });
    return users;
  } catch (error) {
    LoggingService.logError(error as Error, 'fetchUsers');
    throw error;
  }
};

// Custom hook for fetching users
export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Custom hook for user mutations
export const useUserMutations = () => {
  const queryClient = useQueryClient();

  const inviteUser = useMutation({
    mutationFn: async (userData: {
      email: string;
      name: string;
      roleIds?: string[];
      message?: string;
      entities?: Array<{
        entityId: string;
        roleId: string;
        entityType: string;
        membershipType: string;
      }>;
      primaryEntityId?: string;
    }) => {
      LoggingService.logUserAction('inviteUser', userData.email, { roleIds: userData.roleIds });
      return await UserService.inviteUser(userData);
    },
    onSuccess: (data, variables) => {
      toast.success(`Invitation sent to ${variables.email}!`);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'inviteUser', { email: error.variables?.email });
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      LoggingService.logUserAction('updateUser', userId, { userData });
      return await UserService.updateUser(userId, userData);
    },
    onSuccess: (data, variables) => {
      toast.success('User updated successfully!');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'updateUser', { userId: error.variables?.userId });
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      LoggingService.logUserAction('deleteUser', userId);
      return await UserService.deleteUser(userId);
    },
    onSuccess: (data, variables) => {
      toast.success('User permanently deleted!');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'deleteUser', { userId: error.variables });
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  const promoteUser = useMutation({
    mutationFn: async (userId: string) => {
      LoggingService.logUserAction('promoteUser', userId);
      return await UserService.promoteUser(userId);
    },
    onSuccess: (data, variables) => {
      toast.success('User promoted to admin!');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'promoteUser', { userId: error.variables });
      toast.error('Failed to promote user');
    },
  });

  const deactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      LoggingService.logUserAction('deactivateUser', userId);
      return await UserService.deactivateUser(userId);
    },
    onSuccess: (data, variables) => {
      toast.success('User deactivated!');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'deactivateUser', { userId: error.variables });
      toast.error('Failed to deactivate user');
    },
  });

  const reactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      LoggingService.logUserAction('reactivateUser', userId);
      return await UserService.reactivateUser(userId);
    },
    onSuccess: (data, variables) => {
      toast.success('User reactivated!');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'reactivateUser', { userId: error.variables });
      toast.error('Failed to reactivate user');
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (userId: string) => {
      LoggingService.logUserAction('resendInvite', userId);
      return await UserService.resendInvite(userId);
    },
    onSuccess: (data, variables) => {
      toast.success('Invitation resent!');
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'resendInvite', { userId: error.variables });
      toast.error('Failed to resend invitation');
    },
  });

  const assignRoles = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      LoggingService.logUserAction('assignRoles', userId, { roleIds });
      return await UserService.assignRoles(userId, roleIds);
    },
    onSuccess: (data, variables) => {
      toast.success('Roles updated successfully!');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'assignRoles', { userId: error.variables?.userId, roleIds: error.variables?.roleIds });
      toast.error(error.response?.data?.message || 'Failed to assign roles');
    },
  });

  const deassignRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      LoggingService.logUserAction('deassignRole', userId, { roleId });
      return await UserService.deassignRole(userId, roleId);
    },
    onSuccess: (data, variables) => {
      const role = data.roleName || variables.roleId;
      toast.success(`Role "${role}" removed successfully!`);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // Also invalidate user detail queries
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      // Trigger permission refresh notification
      localStorage.setItem('user_permissions_changed', Date.now().toString());
    },
    onError: (error: any) => {
      LoggingService.logError(error, 'deassignRole', { userId: error.variables?.userId, roleId: error.variables?.roleId });
      toast.error(error.response?.data?.message || 'Failed to remove role');
    },
  });

  return {
    inviteUser,
    updateUser,
    deleteUser,
    promoteUser,
    deactivateUser,
    reactivateUser,
    resendInvite,
    assignRoles,
    deassignRole,
  };
};
