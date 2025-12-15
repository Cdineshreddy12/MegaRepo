import React from 'react';
import { UserPlus } from 'lucide-react';
import { PearlButton } from '@/components/ui/pearl-button';

interface UserManagementHeaderProps {
  onInviteClick: () => void;
}

export function UserManagementHeader({ onInviteClick }: UserManagementHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <p className="text-sm text-gray-600 dark:text-purple-200">
          Manage team members, roles, and permissions
        </p>
      </div>

      <div className="flex items-center gap-3">
        <PearlButton onClick={onInviteClick}>
          <UserPlus className="w-4 h-4" />
          Invite User
        </PearlButton>
      </div>
    </div>
  );
}
