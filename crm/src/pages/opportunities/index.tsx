// React and Hooks

// React Router

// Icons
import { Briefcase, Upload, Download } from "lucide-react";

// Components
import OpportunityTable from "./table";
import BulkUploadForm from "@/components/BulkUploadForm";
import IconButton from "@/components/common/IconButton";
import { FormModal, useModal } from "@/components/common/Modal";

// Constants and Services
import { ENTITY } from "@/constants";
import { API_BASE_URL } from "@/services/api";

// Hooks
import useRedirect from "@/hooks/useRedirect";
import Page, { PageHeader } from "@/components/Page";
import { ViewModeSwitch } from "@/components/common/ViewModeSwitch";
import KanbanBoardPage from "./kanban-dashboard";
import { useQueryState, parseAsInteger } from "nuqs";
import { useCreditOperations } from "@/hooks/useCreditOperations";

function OpportunitiesView() {
  const redirect = useRedirect();
  const { isOperationPending } = useCreditOperations();
  const [activeMode, setActiveMode] = useQueryState(
    "activeMode",
    parseAsInteger.withDefault(2)
  );

  // Check if opportunity operations are pending
  const isCreatingOpportunity = isOperationPending('crm.opportunities.create');

  const {
    modalRef: opportunityModalBulkFormRef,
    open: handleOpportunityBulkFormOpen,
    close: handleOpportunityBulkFormClose,
  } = useModal();

  // Handle successful bulk upload
  const handleBulkUploadSuccess = (result: unknown) => {
    console.log("Bulk upload completed successfully:", result);
    handleOpportunityBulkFormClose();
  };

  // Export opportunities
  const handleExportOpportunities = async () => {
    try {
      const { getApiToken } = await import('@/services/api');
      const token = getApiToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`${API_BASE_URL}/bulk/Opportunity/export`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export opportunities");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "opportunities_export.xlsx";
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Opportunities"
          actions={[
            <ViewModeSwitch
              activeMode={activeMode}
              onModeChange={setActiveMode}
            />,
            <IconButton
              icon={Download}
              variant="outline"
              onClick={handleExportOpportunities}
            >
              Export
            </IconButton>,
            <IconButton
              icon={Upload}
              variant="outline"
              onClick={handleOpportunityBulkFormOpen}
            >
              Bulk Upload
            </IconButton>,
            <IconButton
              icon={Briefcase}
              onClick={() => {
                redirect.to("new");
              }}
              loading={isCreatingOpportunity}
            >
              Add Opportunity
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-5">
        {activeMode === 1 ? (
          <KanbanBoardPage />
        ) : (
          <OpportunityTable
            onRowDoubleClick={(row) => {
              redirect.to(`/opportunities/${row?._id}/view`);
            }}
          />
        )}
        {/* Bulk Upload Modal */}
        <FormModal
          ref={opportunityModalBulkFormRef}
          entity={ENTITY.OPPORTUNITY}
          type="bulk"
        >
          <BulkUploadForm
            entity={ENTITY.OPPORTUNITY}
            onUploadSuccess={handleBulkUploadSuccess}
            onClose={handleOpportunityBulkFormClose}
          />
        </FormModal>
      </div>
    </Page>
  );
}

export default OpportunitiesView;
