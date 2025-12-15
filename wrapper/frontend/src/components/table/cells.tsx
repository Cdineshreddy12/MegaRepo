import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Building, Mail, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

// Status badge cell renderer
export const StatusBadge = ({ status, variant }: { status: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) => {
  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'enabled':
        return { variant: 'default' as const, icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' };
      case 'inactive':
      case 'disabled':
        return { variant: 'secondary' as const, icon: XCircle, className: 'bg-gray-100 text-gray-800 border-gray-200' };
      case 'pending':
        return { variant: 'outline' as const, icon: Clock, className: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
      case 'error':
      case 'failed':
        return { variant: 'destructive' as const, icon: AlertTriangle, className: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { variant: 'secondary' as const, icon: null, className: '' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={variant || config.variant} className={config.className}>
      {config.icon && <config.icon className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  );
};

// User cell renderer with avatar
export const UserCell = ({ user, showEmail = false }: { user: { name?: string; email?: string; avatar?: string }; showEmail?: boolean }) => {
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-8 h-8">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="font-medium truncate">{user.name || 'Unknown User'}</div>
        {showEmail && user.email && (
          <div className="text-xs text-gray-500 truncate">{user.email}</div>
        )}
      </div>
    </div>
  );
};

// Email cell renderer
export const EmailCell = ({ email }: { email: string }) => (
  <div className="flex items-center gap-2">
    <Mail className="w-4 h-4 text-gray-400" />
    <span className="truncate">{email}</span>
  </div>
);

// Organization cell renderer
export const OrganizationCell = ({ organization, showType = false }: {
  organization: { name?: string; type?: string };
  showType?: boolean
}) => (
  <div className="flex items-center gap-2">
    <Building className="w-4 h-4 text-purple-500" />
    <div>
      <div className="font-medium">{organization.name || 'Unknown Organization'}</div>
      {showType && organization.type && (
        <div className="text-xs text-gray-500">{organization.type}</div>
      )}
    </div>
  </div>
);

// Date cell renderer
export const DateCell = ({ date, format = 'short' }: { date: string | Date; format?: 'short' | 'long' }) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!date || isNaN(dateObj.getTime())) {
    return <span className="text-gray-400">-</span>;
  }

  const options: Intl.DateTimeFormatOptions = format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-400" />
      <span>{dateObj.toLocaleDateString(undefined, options)}</span>
    </div>
  );
};

// Boolean cell renderer
export const BooleanCell = ({ value, trueText = 'Yes', falseText = 'No' }: {
  value: boolean;
  trueText?: string;
  falseText?: string;
}) => (
  <Badge variant={value ? 'default' : 'secondary'}>
    {value ? trueText : falseText}
  </Badge>
);

// Role cell renderer
export const RoleCell = ({ role }: { role: { name?: string; color?: string } }) => (
  <div className="flex items-center gap-2">
    {role.color && (
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: role.color }}
      />
    )}
    <span>{role.name || 'No Role'}</span>
  </div>
);

// Actions cell renderer (for custom action rendering)
export const ActionsCell = ({ actions, item }: { actions: any[]; item: any }) => (
  <div className="flex gap-1">
    {actions.map((action, index) => (
      <button
        key={action.key}
        onClick={() => action.onClick(item)}
        className={`p-1 rounded hover:bg-gray-100 ${action.className || ''}`}
        title={typeof action.label === 'function' ? action.label(item) : action.label}
      >
        <action.icon className="w-4 h-4" />
      </button>
    ))}
  </div>
);

// Text with truncation
export const TruncatedText = ({ text, maxLength = 50 }: { text: string; maxLength?: number }) => {
  if (!text) return <span className="text-gray-400">-</span>;

  const truncated = text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  return (
    <span title={text.length > maxLength ? text : undefined} className="truncate block">
      {truncated}
    </span>
  );
};

// Priority cell renderer
export const PriorityCell = ({ priority }: { priority: 'low' | 'medium' | 'high' | 'urgent' }) => {
  const configs = {
    low: { color: 'bg-blue-100 text-blue-800', label: 'Low' },
    medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
    high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
    urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
  };

  const config = configs[priority] || configs.medium;

  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
};

// Progress cell renderer
export const ProgressCell = ({ progress, showPercentage = true }: { progress: number; showPercentage?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    {showPercentage && <span className="text-sm text-gray-600">{Math.round(progress)}%</span>}
  </div>
);
