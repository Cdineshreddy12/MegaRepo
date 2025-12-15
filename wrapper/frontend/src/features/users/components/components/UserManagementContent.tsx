import { UserStats } from '../UserStats';
import { UserFilters } from '../UserFilters';
import { BulkActions } from '../BulkActions';
import { UserTable } from './UserTable';
import { useUserManagement } from '../context/UserManagementContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Section } from '@/components/common/Page/Section';

/**
 * Main content component for User Management Dashboard
 * 
 * Features:
 * - Statistics cards
 * - Filters and search
 * - Bulk actions
 * - Users table
 * - Loading and error states
 */
export function UserManagementContent() {
  const { 
    users, 
    roles, 
    filteredUsers, 
    isLoading, 
    error, 
    state, 
    actions,
    dispatch
  } = useUserManagement();
  
  // Error state
  if (error) {
    return (
      <ErrorMessage 
        title="Failed to load users"
        message="There was an error loading the user data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }
  
  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading users..." />;
  }
  
  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Statistics Cards */}
      <Section 
        title="Overview"
        description="User statistics and metrics"
        variant="default"
        size="md"
        spacing="md"
        showDivider={true}
      >
        <UserStats users={users} isLoading={isLoading} />
      </Section>
      
      {/* Filters and Search */}
      <Section 
        title="Filters & Search"
        description="Filter and search users by various criteria"
        variant="outlined"
        size="md"
        spacing="md"
        showDivider={true}
      >
        <UserFilters
          searchQuery={state.searchQuery}
          setSearchQuery={(query) => actions.setFilters({ searchQuery: query })}
          statusFilter={state.statusFilter}
          setStatusFilter={(filter) => actions.setFilters({ statusFilter: filter })}
          roleFilter={state.roleFilter}
          setRoleFilter={(filter) => actions.setFilters({ roleFilter: filter })}
          sortBy={state.sortBy}
          setSortBy={(sort) => actions.setFilters({ sortBy: sort })}
          sortOrder={state.sortOrder}
          setSortOrder={(order) => actions.setFilters({ sortOrder: order })}
          roles={roles}
          onRefresh={() => window.location.reload()}
        />
      </Section>
      
      {/* Bulk Actions */}
      {state.selectedUsers.size > 0 && (
        <Section 
          title="Bulk Actions"
          description={`${state.selectedUsers.size} user(s) selected`}
          variant="filled"
          size="sm"
          spacing="sm"
          showDivider={true}
        >
          <BulkActions
            selectedCount={state.selectedUsers.size}
            onClearSelection={actions.clearSelection}
          />
        </Section>
      )}
      
      {/* Users Table */}
      <Section 
        title="Users"
        description={`${filteredUsers.length} user(s) found`}
        variant="default"
        size="lg"
        spacing="md"
        scrollable={true}
        maxHeight="70vh"
        contentClassName=""
        showDivider={true}
      >
        <div className="min-w-0 w-full max-w-full">
          <UserTable
            users={filteredUsers}
            selectedUsers={state.selectedUsers}
            onSelectionChange={(selection) => dispatch({ type: 'SET_SELECTED_USERS', payload: selection })}
            onUserAction={(action, user) => {
              switch (action) {
                case 'view':
                  actions.openModal('user', user);
                  break;
                case 'edit':
                  actions.openModal('edit', user);
                  break;
                case 'delete':
                  actions.openModal('delete', user);
                  break;
                case 'assignRoles':
                  actions.openModal('roleAssign', user);
                  break;
                case 'manageAccess':
                  actions.openModal('access', user);
                  break;
                default:
                  console.warn('Unknown user action:', action);
              }
            }}
            loading={isLoading}
          />
        </div>
      </Section>
    </div>
  );
}
