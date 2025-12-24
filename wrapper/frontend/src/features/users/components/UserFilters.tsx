import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PearlButton } from '@/components/ui/pearl-button';

interface UserFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: 'all' | 'active' | 'pending' | 'inactive';
  setStatusFilter: (value: 'all' | 'active' | 'pending' | 'inactive') => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  sortBy: 'name' | 'email' | 'created' | 'lastLogin';
  setSortBy: (value: 'name' | 'email' | 'created' | 'lastLogin') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  roles: Array<{ roleId: string; roleName: string }>;
  onRefresh?: () => void;
}

export function UserFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
  roles = []
}: UserFiltersProps) {
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || roleFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoleFilter('all');
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 w-full bg-background/50 p-1 rounded-lg">
      <div className="relative flex-1 w-full md:w-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search users by name, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background border-muted-foreground/20 focus:border-primary/50 transition-colors h-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-[140px] bg-background border-muted-foreground/20 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px] bg-background border-muted-foreground/20 h-10">
            <SelectValue placeholder="Role" />
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

        {hasActiveFilters && (
          <PearlButton
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-10 px-4"
          >
            Reset
          </PearlButton>
        )}
      </div>
    </div>
  );
}