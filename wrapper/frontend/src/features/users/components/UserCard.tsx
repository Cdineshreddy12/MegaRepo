import React from 'react';
import { 
  User, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';
import { Card, CardContent, Button, Badge, Separator } from '@/components/ui';
import { ApplicationAccessCard } from './ApplicationAccessCard';

interface User {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  title?: string;
  department?: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  lastActiveAt?: string;
  lastLoginAt?: string;
  onboardingCompleted: boolean;
  applicationAccess: ApplicationAccess[];
  totalApplications: number;
  hasAnyAccess: boolean;
}

interface ApplicationAccess {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  icon: string;
  baseUrl: string;
  status: string;
  isCore: boolean;
  modules: ModuleAccess[];
  permissions: Permission[];
}

interface ModuleAccess {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface Permission {
  permissionId: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface UserCardProps {
  user: User;
  isExpanded: boolean;
  isSyncing: boolean;
  onToggleExpansion: (userId: string) => void;
  onSyncUser: (userId: string) => void;
  onSyncToApplication: (appCode: string, userIds?: string[]) => void;
}

export function UserCard({
  user,
  isExpanded,
  isSyncing,
  onToggleExpansion,
  onSyncUser,
  onSyncToApplication
}: UserCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* User Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onToggleExpansion(user.userId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">{user.name}</h3>
                  {user.isTenantAdmin && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                  {!user.isActive && (
                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.title && (
                  <p className="text-xs text-muted-foreground">{user.title}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user.totalApplications} apps
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.hasAnyAccess ? 'Has access' : 'No access'}
                </p>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSyncUser(user.userId);
                }}
                disabled={isSyncing || !user.hasAnyAccess}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
              
              {isExpanded ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded User Details */}
        {isExpanded && (
          <div className="border-t bg-muted/30 p-4">
            <div className="space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Department</p>
                  <p>{user.department || 'Not specified'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Last Active</p>
                  <p>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Last Login</p>
                  <p>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Onboarding</p>
                  <p>{user.onboardingCompleted ? 'Completed' : 'Pending'}</p>
                </div>
              </div>

              <Separator />

              {/* Application Access */}
              <div>
                <h4 className="font-medium mb-3">Application Access</h4>
                {user.applicationAccess.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No application access granted</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {user.applicationAccess.map(app => (
                      <ApplicationAccessCard
                        key={app.appId}
                        app={app}
                        onSync={() => onSyncToApplication(app.appCode, [user.userId])}
                        isSyncing={isSyncing}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
