import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/common/Typography';
import { Employee } from '@/types/organization';
import { UserActions } from './UserActions';

interface UserCardProps {
  employee: Employee;
  isAdmin: boolean;
  onPromoteUser: (userId: string, userName: string) => void;
  onDeactivateUser: (userId: string, userName: string) => void;
  onResendInvite: (userId: string, userEmail: string) => void;
}

export function UserCard({ 
  employee, 
  isAdmin, 
  onPromoteUser, 
  onDeactivateUser, 
  onResendInvite 
}: UserCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
          {employee.name?.charAt(0) || employee.email?.charAt(0)}
        </div>
        <div>
          <Typography variant="body" className="font-medium">
            {employee.name || 'Unnamed User'}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            {employee.email}
          </Typography>
          {employee.department && (
            <Typography variant="small" className="text-muted-foreground">
              {employee.department} • {employee.title}
            </Typography>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Role Badge */}
        <Badge 
          variant={employee.isTenantAdmin ? "default" : "secondary"}
          className={employee.isTenantAdmin ? "bg-purple-100 text-purple-800 border-purple-300" : ""}
        >
          {employee.isTenantAdmin ? 'Organization Admin' : 'Standard User'}
        </Badge>
        
        {/* Status Badge */}
        <Badge 
          variant={employee.isActive ? "default" : "destructive"}
          className={employee.isActive ? "bg-green-100 text-green-800 border-green-300" : ""}
        >
          {employee.isActive ? 'Active' : 'Inactive'}
        </Badge>
        
        {/* Onboarding Status */}
        {!employee.onboardingCompleted && (
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            Pending Setup
          </Badge>
        )}
        
        {/* Actions */}
        <UserActions
          employee={employee}
          isAdmin={isAdmin}
          onPromoteUser={onPromoteUser}
          onDeactivateUser={onDeactivateUser}
          onResendInvite={onResendInvite}
        />
      </div>
    </div>
  );
}
