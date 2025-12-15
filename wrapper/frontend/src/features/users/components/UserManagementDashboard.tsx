import { UserManagementProvider } from './context/UserManagementContext';
import { UserManagementContent } from './components/UserManagementContent';
import { UserManagementModals } from './components/UserManagementModals';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Section } from '@/components/common/Page/Section';
import { UserPlus } from 'lucide-react';
import { useUserManagement } from './context/UserManagementContext';

/**
 * Main User Management Dashboard Component
 * 
 * This component serves as the main entry point for user management functionality.
 * It provides context to all child components and handles error boundaries.
 * 
 * Features:
 * - Centralized state management through context
 * - Error boundary for graceful error handling
 * - Loading states for better UX
 * - Modular component architecture
 */
export function UserManagementDashboard() {
  return (
    <ErrorBoundary fallback={<UserManagementErrorFallback />}>
      <UserManagementProvider>
        <UserManagementDashboardContent />
      </UserManagementProvider>
    </ErrorBoundary>
  );
}

/**
 * Internal component that uses the UserManagement context
 */
function UserManagementDashboardContent() {
  const { actions } = useUserManagement();
  
  const handleInviteUser = () => {
    actions.openModal('invite');
  };
  
  return (
      <Section
        title="User Management"
        description="Manage team members, roles, and permissions"
        headerActions={[
          {
            label: "Invite User",
            onClick: handleInviteUser,
            icon: UserPlus,
            variant: "default"
          }
        ]}
        variant="default"
        size="md"
        spacing="md"
        showDivider={true}
        

      >
        <UserManagementContent />
        <UserManagementModals />
      </Section>
  );
}

/**
 * Error fallback component for user management
 */
function UserManagementErrorFallback() {
  return (
    <div className="p-6">
      <Section 
        title="User Management Error"
        description="Something went wrong while loading the user management dashboard."
        variant="filled"
        size="md"
        spacing="md"
        showDivider={true}
        headerActions={[
          {
            label: "Reload Page",
            onClick: () => window.location.reload(),
            variant: "destructive"
          }
        ]}
      >
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Please try reloading the page or contact support if the issue persists.
          </p>
        </div>
      </Section>
    </div>
  );
}