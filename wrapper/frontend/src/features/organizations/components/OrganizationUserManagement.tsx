import { useState } from 'react';
import { Section } from '@/components/common/Page/Section';
import { Typography } from '@/components/common/Typography';
import { Settings, ShareIcon, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Employee } from '@/types/organization';
import { IconButton } from '@/components/common/LoadingButton';
import { 
  UserStatsGrid, 
  UserCard, 
  EmptyUsersState,  
} from './';
import ActivityFeed from '@/components/common/ActivityFeed';

interface OrganizationUserManagementProps {
  employees: Employee[];
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadDashboardData: () => void;
  inviteEmployee: () => void;
}

export function OrganizationUserManagement({ 
  employees, 
  isAdmin, 
  makeRequest, 
  loadDashboardData, 
  inviteEmployee 
}: OrganizationUserManagementProps) {
  const [selectedUsers] = useState<string[]>([]) // Keep selectedUsers for bulk actions logic

  const promoteUser = async (userId: string, userName: string) => {
    if (confirm(`Promote ${userName} to organization admin?`)) {
      try {
        await makeRequest(`/tenants/current/users/${userId}/promote`, {
          method: 'POST'
        })
        toast.success('User promoted to admin!')
        loadDashboardData()
      } catch (error) {
        toast.error('Failed to promote user')
      }
    }
  }

  const deactivateUser = async (userId: string, userName: string) => {
    if (confirm(`Deactivate ${userName}? They will lose access to all applications.`)) {
      try {
        await makeRequest(`/tenants/current/users/${userId}/deactivate`, {
          method: 'POST'
        })
        toast.success('User deactivated!')
        loadDashboardData()
      } catch (error) {
        toast.error('Failed to deactivate user')
      }
    }
  }

  const resendInvite = async (userId: string, userEmail: string) => {
    try {
      await makeRequest(`/tenants/current/users/${userId}/resend-invite`, {
        method: 'POST'
      })
      toast.success(`Invitation resent to ${userEmail}`)
    } catch (error) {
      toast.error('Failed to resend invitation')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Team Management Header */}
      <div className="bg-card text-card-foreground rounded-xl border shadow-sm">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-start justify-between space-y-3 lg:space-y-0 lg:gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">
                Organization Users
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage team members, roles, and access across your organization
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap lg:ml-4">
              <IconButton
                onClick={() => window.open('/tenants/current/users/export', '_blank')}
                startIcon={ShareIcon}
                variant="outline"
                size="sm"
              >
                Export Users
              </IconButton>
              <IconButton
                onClick={inviteEmployee}
                startIcon={UserPlus}
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Invite User
              </IconButton>
            </div>
          </div>
        </div>
        <div className="border-t"></div>
        <div className="p-6">
          <Typography variant="body" className="text-muted-foreground">
            Overview of your organization's team members and their roles
          </Typography>
          <UserStatsGrid employees={employees} />
        </div>
      </div>

      {/* Users Management Table */}
      <div className="bg-card text-card-foreground rounded-xl border shadow-sm mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-start justify-between space-y-3 lg:space-y-0 lg:gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">
                Team Members ({employees.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage individual team members and their roles
              </p>
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap lg:ml-4">
                <IconButton
                  onClick={() => console.log('Bulk actions clicked')}
                  startIcon={Settings}
                  variant="outline"
                  size="sm"
                >
                  Bulk Actions ({selectedUsers.length})
                </IconButton>
              </div>
            )}
          </div>
        </div>
        <div className="border-t"></div>
        <div className="p-6">
          <div className="space-y-4">
            {employees.map((employee) => (
              <UserCard
                key={employee.userId}
                employee={employee}
                isAdmin={isAdmin}
                onPromoteUser={promoteUser}
                onDeactivateUser={deactivateUser}
                onResendInvite={resendInvite}
              />
            ))}
            
            {employees.length === 0 && (
              <EmptyUsersState onInviteUser={inviteEmployee} />
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <Section
        title="Recent User Activity"
        description="Latest changes and activities in your organization"
      >
        <ActivityFeed />
      </Section>
    </div>
  )
}
