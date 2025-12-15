import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/components/ui';

interface UserFiltersProps {
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
  statusFilter?: 'all' | 'active' | 'pending' | 'inactive';
  setStatusFilter?: (value: 'all' | 'active' | 'pending' | 'inactive') => void;
  roleFilter?: string;
  setRoleFilter?: (value: string) => void;
  sortBy?: 'name' | 'email' | 'created' | 'lastLogin';
  setSortBy?: (value: 'name' | 'email' | 'created' | 'lastLogin') => void;
  sortOrder?: 'asc' | 'desc';
  setSortOrder?: (value: 'asc' | 'desc') => void;
  roles?: Array<{ roleId: string; roleName: string }>;
  onRefresh?: () => void;
  // Legacy props for backward compatibility
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  filterApp?: string;
  onFilterAppChange?: (value: string) => void;
  showInactiveUsers?: boolean;
  onShowInactiveUsersChange?: (value: boolean) => void;
  uniqueApps?: string[];
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
  roles = [],
  onRefresh,
  // Legacy props
  searchTerm,
  onSearchChange,
  filterApp,
  onFilterAppChange,
  showInactiveUsers,
  onShowInactiveUsersChange,
  uniqueApps = []
}: UserFiltersProps) {
  // Use new props if available, fallback to legacy props
  const effectiveSearchTerm = searchQuery ?? searchTerm ?? '';
  const effectiveOnSearchChange = setSearchQuery ?? onSearchChange ?? (() => {});
  const effectiveFilterApp = filterApp ?? 'all';
  const effectiveOnFilterAppChange = onFilterAppChange ?? (() => {});
  const effectiveShowInactiveUsers = showInactiveUsers ?? (statusFilter === 'inactive');
  const effectiveOnShowInactiveUsersChange = onShowInactiveUsersChange ?? ((value: boolean) => {
    if (setStatusFilter) {
      setStatusFilter(value ? 'inactive' : 'all');
    }
  });
  
  // Extract unique apps from roles if not provided
  const effectiveUniqueApps = useMemo(() => {
    // Ensure uniqueApps is an array (handle undefined/null)
    const appsArray = Array.isArray(uniqueApps) ? uniqueApps : [];
    if (appsArray.length > 0) {
      return appsArray;
    }
    // Extract unique apps from roles if available
    if (roles && roles.length > 0) {
      const apps = new Set<string>();
      roles.forEach(role => {
        // Try to extract app from role name or permissions
        // This is a fallback - ideally uniqueApps should be passed
      });
      return Array.from(apps);
    }
    return [];
  }, [uniqueApps, roles]);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={effectiveSearchTerm}
                onChange={(e) => effectiveOnSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {effectiveUniqueApps.length > 0 && (
            <Select value={effectiveFilterApp} onValueChange={effectiveOnFilterAppChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by application" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                {effectiveUniqueApps.map(app => (
                  <SelectItem key={app} value={app}>
                    {app.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {setStatusFilter && (
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'pending' | 'inactive')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {setRoleFilter && roles && roles.length > 0 && (
            <Select value={roleFilter || 'all'} onValueChange={(value) => setRoleFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.roleId} value={role.roleId}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={effectiveShowInactiveUsers}
              onCheckedChange={effectiveOnShowInactiveUsersChange}
            />
            <label htmlFor="show-inactive" className="text-sm">
              Show inactive users
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}