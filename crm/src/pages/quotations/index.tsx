// React and React Router imports
import { useParams } from "react-router-dom";

// Components
import IconButton from "@/components/common/IconButton";
import { useModal, FormModal } from "@/components/common/Modal";
import QuotationDetailView from "./view";
import QuotationPreview from "./QuotationPreview";
import QuotationTable from "./table";
import SimpleBulkUploadForm from "@/components/SimpleBulkUploadForm";

// Constants
import { ACTION, ENTITY } from "@/constants";

// Hooks
import useRedirect from "@/hooks/useRedirect";
import useFormMode from "@/hooks/useFormMode";
import { useCreditOperations } from "@/hooks/useCreditOperations";

// Icons
import { Download, Upload, FileCheck } from "lucide-react";
import Page, { PageHeader } from "@/components/Page";

function QuotationsView() {
  const params = useParams();
  const redirect = useRedirect();
  const { isOperationPending } = useCreditOperations();

  const { formMode } = useFormMode();
  // Check if we're in view mode
  const isViewMode = formMode === ACTION.VIEW;
  // Check if we're in preview mode
  const isPreviewMode = formMode === ACTION.PREVIEW;
  
  // Check if quotation creation is pending
  const isCreatingQuotation = isOperationPending('crm.quotations.create');

  const {
    modalRef: quotationModalBulkFormRef,
    open: handleQuotationBulkFormOpen,
    close: handleQuotationBulkFormClose,
  } = useModal();

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        console.log("Uploaded file content:", text);
      };
      reader.readAsText(file);
    }
  };

  // If we're in view mode, render the detail view
  if (isViewMode && params.quotationId) {
    return <QuotationDetailView />;
  }

  // If we're in preview mode, render the preview
  if (isPreviewMode && params.quotationId) {
    return (
      <QuotationPreview
        onClose={() => redirect.to("/quotations")}
        onGenerate={() => console.log("Generated")}
        isPreview={true}
      />
    );
  }

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Quotations"
          actions={[
            <IconButton variant="outline" onClick={() => {}} icon={Download}>
              Export
            </IconButton>,
            <IconButton
              variant="outline"
              onClick={handleQuotationBulkFormOpen}
              icon={Upload}
            >
              Bulk Upload
            </IconButton>,
            <IconButton
              onClick={() => {
                redirect.to("new");
              }}
              icon={FileCheck}
              loading={isCreatingQuotation}
            >
              New Quotation
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-5">
        <QuotationTable
          onRowDoubleClick={(row) => {
            // @ts-expect-error mongo id
            return redirect.to(`/quotations/${row?._id}/view`);
          }}
        />

        {/* Bulk Upload Modal */}
        <FormModal
          ref={quotationModalBulkFormRef}
          entity={ENTITY.QUOTATION}
          type="bulk"
        >
          <SimpleBulkUploadForm
            onUpload={handleBulkUpload}
            onClose={handleQuotationBulkFormClose}
            onUploadSuccess={handleQuotationBulkFormClose}
          />
        </FormModal>
      </div>
    </Page>
  );
}

export default QuotationsView;
