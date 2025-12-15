import React from 'react';
import { Users, UserCheck, UserPlus, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface User {
  isActive: boolean;
  invitationStatus?: string;
  isTenantAdmin: boolean;
  lastLoginAt?: string;
}

interface UserStatsCardsProps {
  users: User[];
  selectedEntityId: string | null;
}

export function UserStatsCards({ users, selectedEntityId }: UserStatsCardsProps) {
  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive && u.invitationStatus === 'active').length;
  const pendingUsers = users.filter(u => u.invitationStatus === 'pending').length;
  const admins = users.filter(u => u.isTenantAdmin).length;

  // Calculate percentages (mock trend data for visual demo)
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const cards = [
    {
      label: 'Total Users',
      value: totalUsers,
      subValue: '+12% from last month',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-800',
    },
    {
      label: 'Active Users',
      value: activeUsers,
      subValue: `${activeRate}% engagement rate`,
      trend: 'up',
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-100 dark:border-emerald-800',
    },
    {
      label: 'Pending Invites',
      value: pendingUsers,
      subValue: 'Requires attention',
      trend: 'down',
      icon: UserPlus,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-100 dark:border-amber-800',
    },
    {
      label: 'Administrators',
      value: admins,
      subValue: 'Full access control',
      trend: 'neutral',
      icon: ShieldAlert,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      border: 'border-violet-100 dark:border-violet-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg border ${card.border} bg-white dark:bg-slate-900/50 backdrop-blur-sm`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
              <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {card.value}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
             {card.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
             {card.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-amber-500" />}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {card.subValue}
            </span>
          </div>
          
          {/* Decorative background blob */}
          <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 ${card.color.replace('text-', 'bg-')}`} />
        </div>
      ))}
    </div>
  );
}