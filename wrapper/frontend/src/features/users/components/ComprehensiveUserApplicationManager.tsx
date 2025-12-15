/**
 * 🔐 **COMPREHENSIVE USER APPLICATION ACCESS MANAGER** (Refactored)
 * Complete interface for managing user access to applications based on subscription tiers
 * with external sync capabilities
 */

import { useState } from "react";
import { RefreshCw, Users, Activity, BarChart3 } from "lucide-react";
  import { TabNavigation } from "@/components/common/TabNavigation";
  import { Section } from "@/components/common/Page";

// Import custom hooks
import { useUserApplicationData } from "@/hooks/useUserApplicationData";
import { useUserSync } from "@/hooks/useUserSync";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserFilters } from "@/hooks/useUserFilters";
import { useExpandedUsers } from "@/hooks/useExpandedUsers";

// Import reusable components
import { UserCard } from "./UserCard";
import { SummaryCards } from "./SummaryCards";
import { UserFilters } from "./UserFilters";
import { SyncDialog } from "./SyncDialog";
import { SyncResultsTab } from "./SyncResultsTab";
import { ApplicationStatsTab } from "./ApplicationStatsTab";
import { NoDataState } from "./NoDataState";
import { UnifiedLoading } from '@/components/common/UnifiedLoading';


export default function ComprehensiveUserApplicationManager() {
  // Custom hooks for state management
  const { orgCode, loading: orgLoading } = useOrganization();
  const { users, summary, loading, error, loadData } = useUserApplicationData();
  const { syncing, syncResults, handleSyncToApplication, handleBulkSync, handleSyncUser } = useUserSync();
  const { 
    searchTerm, 
    setSearchTerm, 
    filterApp, 
    setFilterApp, 
    showInactiveUsers, 
    setShowInactiveUsers, 
    uniqueApps, 
    filteredUsers,
    resetFilters
  } = useUserFilters(users);
  const { toggleUserExpansion, isExpanded } = useExpandedUsers();

  // Local state
  const [dryRun, setDryRun] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  // Show loading state
  if (loading || orgLoading) {
    return (
      <UnifiedLoading
        isLoading={true}
        loadingType="page"
        loadingMessage="Loading user application data..."
      >
        <div />
      </UnifiedLoading>
    );
  }

  // Show error state
  if (error) {
    return (
      <UnifiedLoading
        isLoading={false}
        error={error}
        loadingType="page"
        errorTitle="Failed to load data"
        errorDescription="There was an error loading the user application data."
        onRetry={loadData}
        retryLabel="Retry"
      >
        <div />
      </UnifiedLoading>
    );
  }

  // Show component structure even when no data
  const hasData = users.length > 0 || summary;
  const hasFilteredUsers = filteredUsers.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Section 
        title="User Application Access" 
        description="Manage user access to applications based on subscription tiers and sync to external systems"
        headerActions={[{
          label: "Refresh",
          onClick: loadData,
          variant: "outline",
          icon: RefreshCw,
          disabled: loading
        }, {
          label: "Sync All",
          onClick: () => setSyncDialogOpen(true),
          variant: "outline",
          icon: RefreshCw,
          disabled: loading
        }]}
      >
        <SyncDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          dryRun={dryRun}
          onDryRunChange={setDryRun}
          onConfirm={() => {
            handleBulkSync(orgCode, dryRun);
            setSyncDialogOpen(false);
          }}
          isSyncing={syncing['bulk']}
        />
        
        {/* Summary Cards */}
        {summary && <SummaryCards summary={summary} />}

        {/* Filters */}
        <UserFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterApp={filterApp}
          onFilterAppChange={setFilterApp}
          showInactiveUsers={showInactiveUsers}
          onShowInactiveUsersChange={setShowInactiveUsers}
          uniqueApps={uniqueApps}
        />
           {/* Main Content */}
      <TabNavigation
        tabs={[
          {
            id: 'users',
            label: 'Users & Access',
            icon: Users,
            content: !hasData ? (
              <NoDataState type="no-data" onRetry={loadData} loading={loading} />
            ) : !hasFilteredUsers ? (
              <NoDataState type="no-users" onClearFilters={resetFilters} />
            ) : (
              <div className="space-y-4">
                {filteredUsers.map(user => (
                  <UserCard
                    key={user.userId}
                    user={user}
                    isExpanded={isExpanded(user.userId)}
                    isSyncing={syncing['bulk']}
                    onToggleExpansion={toggleUserExpansion}
                    onSyncUser={(userId) => handleSyncUser(userId, orgCode)}
                    onSyncToApplication={(appCode) => handleSyncToApplication(appCode, orgCode)}
                  />
                ))}
              </div>
            )
          },
          {
            id: 'sync-results',
            label: 'Sync Results',
            icon: Activity,
            content: <SyncResultsTab syncResults={syncResults} hasData={!!hasData} />
          },
          {
            id: 'application-stats',
            label: 'Application Stats',
            icon: BarChart3,
            content: (
              <ApplicationStatsTab
                summary={summary}
                hasData={!!hasData}
                syncing={syncing}
                onSyncToApplication={(appCode) => handleSyncToApplication(appCode, orgCode)}
              />
            )
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        variant="pills"
        size="md"
        className="space-y-4"
      />
      </Section>

   
    </div>
  );
}
