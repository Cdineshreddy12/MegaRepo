import { useMemo } from 'react';
import {
  Mail,
  MoreHorizontal,
  Copy,
  MapPin,
  UserCog
} from 'lucide-react';
import { ReusableTable, TableColumn } from '@/components/table/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { PearlButton } from '@/components/ui/pearl-button';
import { User } from '@/types/user-management';
import { useUserManagement } from '../context/UserManagementContext';
import { useUserActions } from '../hooks/useUserActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserTableProps {
  users: User[];
  selectedUsers: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
  onUserAction: (action: string, user: User) => void;
  loading: boolean;
}

export function UserTable({
  users,
  selectedUsers,
  onSelectionChange,
  onUserAction,
  loading
}: UserTableProps) {
  const { userMutations } = useUserManagement();
  const {
    getUserStatus,
    getStatusColor,
    generateInvitationUrl,
    copyInvitationUrl
  } = useUserActions();

  const userTableColumns: TableColumn<User>[] = useMemo(() => [
    {
      key: 'name',
      label: 'User',
      width: '240px',
      render: (user) => (
        <div className="flex items-center gap-3.5">
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-sky-100">
            <AvatarImage src={user.avatar} alt={user.name || 'User'} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-sky-600 text-white font-black text-xs">
              {(user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate text-foreground/90">
              {user.name || 'Unnamed User'}
            </span>
            <span className="text-xs text-muted-foreground truncate font-normal">
              {user.email}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'primaryLocation',
      label: 'Location',
      width: '180px',
      render: (user) => {
        const primaryOrg = user.organizations?.find(org => org.isPrimary);
        if (!primaryOrg) return <span className="text-xs text-muted-foreground/50 italic">Unassigned</span>;

        return (
          <div className="flex items-center gap-2 text-sm text-foreground/80 group">
            <div className="p-1 rounded-md bg-slate-50 text-slate-500 group-hover:bg-slate-100 transition-colors">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="truncate font-medium" title={primaryOrg.organizationName}>
              {primaryOrg.organizationName}
            </span>
          </div>
        );
      }
    },
    {
      key: 'role',
      label: 'Role',
      width: '160px',
      render: (user) => {
        if (!user.roles || user.roles.length === 0) return <span className="text-xs text-muted-foreground/50 italic">No roles</span>;

        const firstRole = user.roles[0];
        const extraCount = user.roles.length - 1;

        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-bold bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 px-2 py-0.5 rounded-md">
              {firstRole.roleName}
            </Badge>
            {extraCount > 0 && (
              <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded-md">
                +{extraCount}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'invitation',
      label: 'Invite Link',
      width: '200px',
      render: (user) => {
        if (user.invitationStatus !== 'pending') return null;

        const url = generateInvitationUrl(user);
        if (!url) return null;

        return (
          <div className="flex items-center gap-2">
            <div className="max-w-[140px] truncate text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded select-all border border-transparent hover:border-border transition-colors">
              {url}
            </div>
            <PearlButton
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 flex items-center justify-center rounded-lg"
              onClick={() => copyInvitationUrl(user)}
            >
              <Copy className="h-3 w-3" />
            </PearlButton>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (user) => {
        if (user.invitationStatus === 'pending') {
          return (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-sm font-medium text-amber-700">Pending</span>
            </div>
          );
        }
        if (user.isActive) {
          return (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_-2px_rgba(59,130,246,0.5)]"></span>
              <span className="text-sm font-black text-blue-700">Active</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            <span className="text-sm font-medium text-slate-600">Inactive</span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <PearlButton variant="outline" size="sm" className="h-8 w-8 p-0 flex items-center justify-center rounded-lg">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </PearlButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onUserAction('view', user)}>
              <UserCog className="mr-2 h-4 w-4" />
              Manage User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onUserAction('edit', user)}>
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => userMutations.resendInvite.mutate(user.userId)} disabled={user.isActive || !user.email}>
              <Mail className="mr-2 h-4 w-4" />
              Resend Invite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onUserAction('delete', user)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [getUserStatus, getStatusColor, generateInvitationUrl, copyInvitationUrl, userMutations]);

  return (
    <ReusableTable<User>
      data={users}
      columns={userTableColumns}
      selectable={true}
      selectedItems={selectedUsers}
      onSelectionChange={onSelectionChange}
      getItemId={(user) => user.userId}
      loading={loading}
      emptyMessage="No users found matching your filters"
      className="border-none"
    />
  );
}
