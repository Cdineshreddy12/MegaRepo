import { useQuery } from '@tanstack/react-query';
import { Role } from '@/types/user-management';
import { UserService } from '../services/UserService';
import { LoggingService } from '../services/LoggingService';

// Query key factory for roles
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
};

// Fetch roles using service layer
const fetchRoles = async (): Promise<Role[]> => {
  const startTime = Date.now();
  try {
    const roles = await UserService.fetchRoles();
    const duration = Date.now() - startTime;
    LoggingService.logPerformance('fetchRoles', duration, { roleCount: roles.length });
    return roles;
  } catch (error) {
    LoggingService.logError(error as Error, 'fetchRoles');
    throw error;
  }
};

// Custom hook for fetching roles
export const useRoles = () => {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: fetchRoles,
    staleTime: 10 * 60 * 1000, // 10 minutes (roles change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
