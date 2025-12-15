import Page, { PageHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { Users, UserCheck, UserX, Clock, RefreshCw } from 'lucide-react'
import UserTable from './table'
import useRedirect from '@/hooks/useRedirect'
import { ROUTE_PATH } from '@/constants'
import { useUsers } from '@/queries/UserQueries'
import { api } from '@/services/api'
import { toast } from '@/hooks/useToast'
import { useOrgStore } from '@/store/org-store'

function UserManagement() {
  const redirect = useRedirect()
  const [userFilter, setUserFilter] = useState<string>('all')
  const selectedOrg = useOrgStore((state) => state.selectedOrg)

  const filterOptions = [
    { value: 'all', label: 'All Users', count: 'All' },
    { value: 'wrapper', label: 'Wrapper Synced', count: 'Wrapper' },
    { value: 'kinde', label: 'Kinde Users', count: 'Kinde' },
    { value: 'local', label: 'Local Users', count: 'Local' }
  ]

  return (
    <Page header={
      <PageHeader 
        title='User Management' 
        actions={[
          <div key="filter" className="flex items-center gap-4 mr-4">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter users" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {option.count}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>,
          <Button key="add" onClick={() => redirect.to('new')}>Add User</Button>,
          <BulkRefreshPermissions key="bulk-refresh" />
        ]}
      />
    }>
      <SyncStatistics />
      <UserTable 
        userFilter={userFilter}
        onRowDoubleClick={(row) => redirect.to(`/admin${ROUTE_PATH.USER}/${row._id || row.id}/view`)}
      />
    </Page>
  )
}

// Component to display sync statistics
function SyncStatistics() {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const { data: users } = useUsers(selectedOrg || undefined);
  
  if (!users) return null;
  
  const stats = {
    total: users.length,
    wrapper: users.filter(u => u.authSource === 'wrapper').length,
    kinde: users.filter(u => u.authSource === 'kinde').length,
    local: users.filter(u => !u.authSource || u.authSource === 'local').length,
    synced: users.filter(u => (u.authSource === 'wrapper' || u.authSource === 'kinde') && u.lastSyncedAt).length,
    pending: users.filter(u => (u.authSource === 'wrapper' || u.authSource === 'kinde') && !u.lastSyncedAt).length
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.local} local, {stats.wrapper + stats.kinde} external
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Synced Users</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pending} pending sync
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wrapper Users</CardTitle>
          <Badge variant="outline" className="text-xs">Wrapper</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.wrapper}</div>
          <p className="text-xs text-muted-foreground">
            From wrapper application
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kinde Users</CardTitle>
          <Badge variant="outline" className="text-xs">Kinde</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.kinde}</div>
          <p className="text-xs text-muted-foreground">
            From Kinde authentication
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Component to refresh permissions for all external users
function BulkRefreshPermissions() {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const { data: users } = useUsers(selectedOrg || undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const externalUsers = users?.filter(u => 
    u.authSource === 'wrapper' || u.authSource === 'kinde'
  ) || [];

  const handleBulkRefresh = async () => {
    if (externalUsers.length === 0) {
      toast({
        title: "No External Users",
        description: "No external users found to refresh",
        variant: "destructive"
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const userIds = externalUsers.map(u => u._id || u.id).filter(Boolean);
      const orgCode = externalUsers[0]?.orgCode; // Use first user's orgCode

      if (!orgCode) {
        toast({
          title: "Missing Org Code",
          description: "Cannot refresh users without organization code",
          variant: "destructive"
        });
        return;
      }

      const response = await api.post('/admin/users/refresh-permissions', {
        userIds,
        orgCode
      });

      toast({
        title: "Bulk Refresh Complete",
        description: `Successfully refreshed permissions for ${externalUsers.length} users`,
      });

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error during bulk refresh:', error);
      toast({
        title: "Bulk Refresh Failed",
        description: "Failed to refresh user permissions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (externalUsers.length === 0) return null;

  return (
    <Button
      variant="outline"
      onClick={handleBulkRefresh}
      disabled={isRefreshing}
      title={`Refresh permissions for ${externalUsers.length} external users`}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh All ({externalUsers.length})
    </Button>
  );
}

export default UserManagement