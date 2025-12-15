import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { GlareCard } from '@/components/ui/glare-card';
import { PearlButton } from '@/components/ui/pearl-button';
import { useTheme } from '@/components/theme/ThemeProvider';

interface Role {
  roleId: string;
  roleName: string;
  description: string;
  color: string;
  icon: string;
  permissions: Record<string, any>;
}

interface UserFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: 'all' | 'active' | 'pending' | 'inactive';
  setStatusFilter: (filter: 'all' | 'active' | 'pending' | 'inactive') => void;
  roleFilter: string;
  setRoleFilter: (filter: string) => void;
  sortBy: 'name' | 'email' | 'created' | 'lastLogin';
  setSortBy: (sort: 'name' | 'email' | 'created' | 'lastLogin') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  roles: Role[];
  onClearAll: () => void;
  onRefresh: () => void;
}

export function UserFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  roles,
  onClearAll,
  onRefresh
}: UserFiltersProps) {
  const { actualTheme } = useTheme();

  return (
    <GlareCard className="p-5">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                actualTheme === 'dark'
                  ? 'text-purple-400'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-400'
                  : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 transition-colors ${
                  actualTheme === 'dark'
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500'
                    : actualTheme === 'monochrome'
                    ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          <PearlButton
            onClick={onClearAll}
            className="text-xs px-3 py-2"
          >
            Clear All
          </PearlButton>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={`block text-xs font-medium mb-2 ${
              actualTheme === 'dark'
                ? 'text-purple-200'
                : actualTheme === 'monochrome'
                ? 'text-gray-200'
                : 'text-gray-700'
            }`}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 transition-colors ${
                actualTheme === 'dark'
                  ? 'bg-slate-800/50 border-purple-500/30 text-white focus:ring-purple-500'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 focus:ring-gray-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${
              actualTheme === 'dark'
                ? 'text-purple-200'
                : actualTheme === 'monochrome'
                ? 'text-gray-200'
                : 'text-gray-700'
            }`}>
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 transition-colors ${
                actualTheme === 'dark'
                  ? 'bg-slate-800/50 border-purple-500/30 text-white focus:ring-purple-500'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 focus:ring-gray-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="all">All Roles</option>
              <option value="admin">Organization Admin</option>
              {roles.map(role => (
                <option key={role.roleId} value={role.roleId}>{role.roleName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-2 ${
              actualTheme === 'dark'
                ? 'text-purple-200'
                : actualTheme === 'monochrome'
                ? 'text-gray-200'
                : 'text-gray-700'
            }`}>
              Sort By
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 transition-colors ${
                actualTheme === 'dark'
                  ? 'bg-slate-800/50 border-purple-500/30 text-white focus:ring-purple-500'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 focus:ring-gray-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
              <option value="created-desc">Newest First</option>
              <option value="created-asc">Oldest First</option>
              <option value="lastLogin-desc">Recent Login</option>
            </select>
          </div>

          <div className="flex items-end">
            <PearlButton
              onClick={onRefresh}
              className="w-full text-xs px-3 py-2 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </PearlButton>
          </div>
        </div>
      </div>
    </GlareCard>
  );
}
