import { EmptyState } from '@/components/common/EmptyState';
import { Users, Plus } from 'lucide-react';

interface EmptyUsersStateProps {
  onInviteUser: () => void;
}

export function EmptyUsersState({ onInviteUser }: EmptyUsersStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="No team members yet"
      description="Start building your team by inviting users"
      action={{
        label: "Invite First User",
        onClick: onInviteUser,
        icon: Plus,
        variant: "default"
      }}
      showCard={false}
    />
  );
}
