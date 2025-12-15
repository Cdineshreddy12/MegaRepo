import { useMemo } from 'react';
import { 
  Mail, 
  Edit,
  Trash2,
  Eye,
  Crown,
  UserX,
  UserCheck,
  Building2,
  Shield,
  Copy,
  UserCog
} from 'lucide-react';
import { ReusableTable, TableColumn, TableAction } from '@/components/table/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User } from '@/types/user-management';
import { useUserManagement } from '../context/UserManagementContext';
import { useUserActions } from '../hooks/useUserActions';

interface UserTableProps {
  users: User[];
  selectedUsers: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
  onUserAction: (action: string, user: User) => void;
  loading: boolean;
}

/**
 * Enhanced User Table Component
 * 
 * Features:
 * - User information display
 * - Organizations and roles display
 * - Invitation URL display
 * - Quick actions for managing user access
 */
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
  
  // Table columns configuration
  const userTableColumns: TableColumn<User>[] = useMemo(() => [
    {
      key: 'user',
      label: 'User',
      width: '280px',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-sm"
            style={{ 
              background: user.avatar ? `url(${user.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {!user.avatar && (user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate flex items-center gap-2">
              {user.name || 'Unnamed User'}
              {user.isTenantAdmin && (
                <Crown className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>
            {user.department && (
              <div className="text-xs text-gray-400 truncate">{user.department}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'organizations',
      label: 'Organizations',
      width: '250px',
      render: (user) => {
        const orgs = user.organizations || [];
        if (orgs.length === 0) {
          return <div className="text-sm text-gray-400 italic">No organizations</div>;
        }
        const primaryOrg = orgs.find(org => org.isPrimary);
        const otherOrgs = orgs.filter(org => !org.isPrimary);
        
        return (
          <div className="flex flex-col gap-1">
            {primaryOrg && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span className="text-sm font-medium text-gray-900 truncate" title={primaryOrg.organizationName}>
                  {primaryOrg.organizationName}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                  Primary
                </Badge>
              </div>
            )}
            {otherOrgs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {otherOrgs.slice(0, 2).map(org => (
                  <Badge key={org.membershipId} variant="outline" className="text-xs truncate max-w-[200px]" title={org.organizationName}>
                    {org.organizationName}
                  </Badge>
                ))}
                {otherOrgs.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{otherOrgs.length - 2} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'roles',
      label: 'Roles',
      width: '200px',
      render: (user) => (
        <div className="flex flex-wrap gap-1.5">
          {user.roles?.map(role => (
            <Badge key={role.roleId} variant="outline" className="text-xs flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-600" />
              {role.roleName}
            </Badge>
          ))}
          {(!user.roles || user.roles.length === 0) && (
            <div className="text-sm text-gray-400 italic">No roles</div>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '120px', 
      render: (user) => (
        <Badge className={getStatusColor(user)}>
          {getUserStatus(user)}
        </Badge>
      )
    },
    {
      key: 'invitationUrl',
      label: 'Invitation URL',
      width: '300px',
      render: (user) => {
        if (user.invitationStatus === 'pending') {
          const invitationUrl = generateInvitationUrl(user);
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 font-medium">Pending Invitation</div>
              {invitationUrl ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invitationUrl}
                    readOnly
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-gray-50 flex-1 font-mono"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => copyInvitationUrl(user)}
                    title="Copy invitation URL"
                  >
                    <Copy className="w-4 h-4 text-blue-600" />
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-red-600">No URL available</div>
              )}
            </div>
          );
        }
        return <div className="text-xs text-gray-400">-</div>;
      }
    },
    {
      key: 'activity',
      label: 'Last Activity',
      width: '140px',
      render: (user) => (
        <div className="text-sm">
          <div className="text-gray-900 font-medium">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
          </div>
          <div className="text-xs text-gray-500">
            {user.lastLoginAt ? 'Last login' : 'No login'}
          </div>
        </div>
      )
    }
  ], [getUserStatus, getStatusColor, generateInvitationUrl, copyInvitationUrl]);
  
  // Table actions configuration
  const userTableActions: TableAction<User>[] = useMemo(() => [
    {
      key: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (user) => onUserAction('view', user)
    },
    {
      key: 'manageAccess',
      label: 'Manage Access',
      icon: UserCog,
      onClick: (user) => onUserAction('manageAccess', user)
    },
    {
      key: 'edit',
      label: 'Edit User',
      icon: Edit,
      onClick: (user) => onUserAction('edit', user)
    },
    {
      key: 'promote',
      label: 'Promote to Admin',
      icon: Crown,
      onClick: (user) => {
        if (confirm(`Promote ${user.name || user.email} to organization admin?`)) {
          userMutations.promoteUser.mutate(user.userId);
        }
      },
      disabled: (user) => user.isTenantAdmin
    },
    {
      key: 'reactivate',
      label: 'Reactivate User',
      icon: UserCheck,
      onClick: (user) => {
        if (confirm(`Reactivate ${user.name || user.email}?`)) {
          userMutations.reactivateUser.mutate(user.userId);
        }
      },
      disabled: (user) => user.isActive,
      separator: true
    },
    {
      key: 'deactivate',
      label: 'Deactivate User',
      icon: UserX,
      onClick: (user) => {
        if (confirm(`Deactivate ${user.name || user.email}?`)) {
          userMutations.deactivateUser.mutate(user.userId);
        }
      },
      disabled: (user) => !user.isActive
    },
    {
      key: 'delete',
      label: 'Delete User',
      icon: Trash2,
      onClick: (user) => onUserAction('delete', user),
      destructive: true,
      separator: true
    },
    {
      key: 'resendInvite',
      label: 'Resend Invite',
      icon: Mail,
      onClick: (user) => userMutations.resendInvite.mutate(user.userId),
      disabled: (user) => user.isActive && user.onboardingCompleted
    }
  ], [onUserAction, userMutations]);
  
  return (
    <ReusableTable<User>
      data={users}
      columns={userTableColumns}
      actions={userTableActions}
      selectable={true}
      selectedItems={selectedUsers}
      onSelectionChange={onSelectionChange}
      getItemId={(user) => user.userId}
      loading={loading}
      emptyMessage="No users found matching your filters"
    />
  );
}
