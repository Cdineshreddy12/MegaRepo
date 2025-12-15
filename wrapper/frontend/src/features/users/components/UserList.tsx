import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSyncUser } from '../../hooks/useUserApplicationQueries';
import { getAccessMethodColor } from '../../lib/utils/userApplication';
import type { UserClassification } from '../../types/userApplication';

interface UserListProps {
  users: UserClassification[];
  title: string;
  description: string;
  showIndividualSync?: boolean;
  maxUsers?: number;
}

export function UserList({ 
  users, 
  title, 
  description, 
  showIndividualSync = false,
  maxUsers = 10 
}: UserListProps) {
  const syncUserMutation = useSyncUser();

  const handleSyncUser = (userId: string) => {
    syncUserMutation.mutate({ userId });
  };

  const displayUsers = users.slice(0, maxUsers);
  const hasMore = users.length > maxUsers;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayUsers.map(user => (
            <div key={user.userId} className="flex justify-between items-center p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-800">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium">{user.name}</h4>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.classificationReason?.primary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getAccessMethodColor(user.classificationReason?.accessMethod)}>
                  {user.classificationReason?.accessMethod?.replace('_', ' ')}
                </Badge>
                {user?.allowedApplications?.map(app => (
                  <Badge key={app} variant="outline" className="text-xs">
                    {app.toUpperCase()}
                  </Badge>
                ))}
                {user?.roles?.map(role => (
                  <Badge key={role.roleId} variant="secondary" className="text-xs">
                    {role.roleName}
                  </Badge>
                ))}
                {showIndividualSync && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleSyncUser(user.userId)}
                    disabled={syncUserMutation.isPending}
                    title={`Sync ${user.name} to ${user?.allowedApplications?.length} applications`}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncUserMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="text-center pt-2">
              <span className="text-sm text-gray-500">
                Showing {maxUsers} of {users.length} users
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
