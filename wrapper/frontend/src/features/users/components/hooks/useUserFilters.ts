import { useMemo } from 'react';
import { User } from '@/types/user-management';

interface UseUserFiltersProps {
  users: User[];
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'pending' | 'inactive';
  roleFilter: string;
  sortBy: 'name' | 'email' | 'created' | 'lastLogin';
  sortOrder: 'asc' | 'desc';
}

export const useUserFilters = ({
  users,
  searchQuery,
  statusFilter,
  roleFilter,
  sortBy,
  sortOrder
}: UseUserFiltersProps) => {
  const filteredUsers = useMemo(() => {
    return users
      .filter(user => user && user.userId && user.email) // Filter out invalid user objects
      .filter(user => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesName = user.name?.toLowerCase().includes(query);
          const matchesEmail = user.email.toLowerCase().includes(query);
          
          if (!matchesName && !matchesEmail) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'active' && user.invitationStatus !== 'active') return false;
          if (statusFilter === 'pending' && user.invitationStatus !== 'pending') return false;
          if (statusFilter === 'inactive' && user.invitationStatus !== 'setup_required') return false;
        }

        // Role filter
        if (roleFilter !== 'all') {
          const userRoles = user.roles || [];
          if (roleFilter === 'admin' && !user.isTenantAdmin) return false;
          if (roleFilter !== 'admin' && !userRoles.some(role => role.roleId === roleFilter)) return false;
        }

        return true;
      }).sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name?.toLowerCase() || '';
            bValue = b.name?.toLowerCase() || '';
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'created':
            aValue = new Date(a.invitedAt || 0);
            bValue = new Date(b.invitedAt || 0);
            break;
          case 'lastLogin':
            aValue = new Date(a.lastLoginAt || 0);
            bValue = new Date(b.lastLoginAt || 0);
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [users, searchQuery, statusFilter, roleFilter, sortBy, sortOrder]);

  return filteredUsers;
};
