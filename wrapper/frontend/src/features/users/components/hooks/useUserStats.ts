import { useMemo } from 'react';
import { User } from '@/types/user-management';

export const useUserStats = (users: User[]) => {
  return useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive && u.onboardingCompleted).length;
    const pendingInvites = users.filter(u => !u.isActive).length;
    const admins = users.filter(u => u.isTenantAdmin).length;

    return {
      totalUsers,
      activeUsers,
      pendingInvites,
      admins
    };
  }, [users]);
};
