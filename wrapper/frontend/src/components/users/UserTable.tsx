import React from 'react';
import { ReusableTable, TableColumn, TableAction } from '@/components/table/ReusableTable';
import { useTheme } from '@/components/theme/ThemeProvider';

interface User {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  department?: string;
  title?: string;
  invitedBy?: string;
  invitedAt?: string;
  invitationAcceptedAt?: string;
  lastLoginAt?: string;
  roles?: any[];
  avatar?: string;
  invitationStatus?: string;
  userType?: string;
  originalData?: any;
  invitationId?: string;
}

interface UserTableProps {
  users: User[];
  columns: TableColumn<User>[];
  loading: boolean;
  selectedUsers: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export function UserTable({
  users,
  columns,
  loading,
  selectedUsers,
  onSelectionChange
}: UserTableProps) {
  const { glassmorphismEnabled } = useTheme();

  const tableClassName = glassmorphismEnabled
    ? 'backdrop-blur-3xl dark:bg-black/95 dark:border-purple-500/30 bg-white/95 border-gray-300/60'
    : '';

  return (
    <ReusableTable<User>
      data={users}
      columns={columns}
      selectable={true}
      selectedItems={selectedUsers}
      onSelectionChange={onSelectionChange}
      getItemId={(user) => user.userId}
      loading={loading}
      emptyMessage="No users found matching your filters"
      className={tableClassName}
    />
  );
}
