import { UserPlus, Upload, Download } from "lucide-react";
// Constants
import { ENTITY } from "@/constants";

// Hooks
import useRedirect from "@/hooks/useRedirect";
import { usePermissions } from "@/hooks/usePermissions";
import { useCreditOperations } from "@/hooks/useCreditOperations";

// Common Components
import IconButton from "@/components/common/IconButton";
import { FormModal, useModal } from "@/components/common/Modal";

// Feature-Specific Components
import BulkUploadForm from "@/components/BulkUploadForm";

import LeadsTable from "./table";
import Page, { PageHeader } from "@/components/Page";
import { useQueryState, parseAsInteger } from "nuqs";
import { ViewModeSwitch } from "@/components/common/ViewModeSwitch";
import KanbanBoardPage from "./kanban-dashboard";

function LeadsView() {
  const redirect = useRedirect();
  const { hasPermission } = usePermissions();
  const { isOperationPending } = useCreditOperations();
  const [activeMode, setActiveMode] = useQueryState(
    "activeMode",
    parseAsInteger.withDefault(2)
  );

  // Check permissions
  const canRead = hasPermission('crm.leads.read');
  const canCreate = hasPermission('crm.leads.create');
  
  // Check if lead creation is pending
  const isCreatingLead = isOperationPending('crm.leads.create');

  const {
    modalRef: leadBulkFormModalRef,
    open: handleOpenLeadBulkFormModal,
    close: handleCloseLeadBulkFormModal,
  } = useModal();

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Leads"
          actions={[
            <ViewModeSwitch
              activeMode={activeMode}
              onModeChange={setActiveMode}
            />,

            canRead && (
              <IconButton key="export" variant="outline" onClick={() => {}} icon={Download}>
                Export
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="bulk-upload"
                variant="outline"
                onClick={handleOpenLeadBulkFormModal}
                icon={Upload}
              >
                Bulk Upload
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="add-lead"
                onClick={() => {
                  redirect.to("new");
                }}
                icon={UserPlus}
                loading={isCreatingLead}
              >
                Add Lead
              </IconButton>
            ),
          ].filter(Boolean)}
        />
      }
    >
      <div className="space-y-5 flex-1">
        {activeMode === 1 ? (
          <KanbanBoardPage />
        ) : (
          <LeadsTable
            onRowDoubleClick={(row) => redirect.to(`/leads/${row?._id}/view`)}
          />
        )}
        {/* Bulk Upload Modal */}
        <FormModal ref={leadBulkFormModalRef} entity={ENTITY.LEAD} type="bulk">
          <BulkUploadForm
            entity={ENTITY.LEAD}
            onUploadSuccess={handleCloseLeadBulkFormModal}
            onClose={handleCloseLeadBulkFormModal}
          />
        </FormModal>
      </div>
    </Page>
  );
}

export default LeadsView;
