import { Users, Activity, Clock, Crown } from 'lucide-react';
import { User } from '@/types/user-management';
import { MetricCard } from '@/components/common/MetricCard';

interface UserStatsProps {
  users: User[];
  isLoading?: boolean;
}

export function UserStats({ users, isLoading = false }: UserStatsProps) {
  const activeUsers = users.filter(u => u.isActive && u.onboardingCompleted).length;
  const pendingInvites = users.filter(u => !u.isActive).length;
  const admins = users.filter(u => u.isTenantAdmin).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard
        title="Total Users"
        value={users.length}
        icon={Users}
        trend=""
        color="blue"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Active Users"
        value={activeUsers}
        icon={Activity}
        trend=""
        color="green"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Pending Invites"
        value={pendingInvites}
        icon={Clock}
        trend=""
        color="yellow"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Admins"
        value={admins}
        icon={Crown}
        trend=""
        color="purple"
        isLoading={isLoading}
      />
    </div>
  );
}
