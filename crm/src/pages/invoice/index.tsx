import { Plus, Upload, Download } from "lucide-react";
import IconButton from "@/components/common/IconButton";
import Page, { PageHeader } from "@/components/Page";
import useRedirect from "@/hooks/useRedirect";
import { useCreditOperations } from "@/hooks/useCreditOperations";
import { FormModal, useModal } from "@/components/common/Modal";
import { ENTITY, ROUTE_PATH } from "@/constants";
import BulkUploadForm from "@/components/BulkUploadForm";
import InvoiceTable from "./table";
import { usePermissions } from "@/hooks/usePermissions";

function InvoicesView() {
  const redirect = useRedirect();
  const { hasPermission } = usePermissions();
  const { isOperationPending } = useCreditOperations();

  // Check permissions
  const canRead = hasPermission('crm.invoices.read');
  const canCreate = hasPermission('crm.invoices.create');

  // Check if invoice operations are pending
  const isCreatingInvoice = isOperationPending('crm.invoices.create');

  const {
    modalRef: invoiceBulkFormModalRef,
    open: handleOpenInvoiceBulkFormModal,
    close: handleCloseInvoiceBulkFormModal,
  } = useModal();

  return (
    <Page removeBackground
      header={
        <PageHeader
          title="Invoice Orders"
          actions={[
            canRead && (
              <IconButton
                key="export"
                variant="outline"
                onClick={() => {}}
                icon={Download}
              >
                Export
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="bulk-upload"
                variant="outline"
                onClick={handleOpenInvoiceBulkFormModal}
                icon={Upload}
              >
                Bulk Upload
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="create-order"
                onClick={() => {
                  redirect.to("new");
                }}
                icon={Plus}
                loading={isCreatingInvoice}
              >
                Create Order
              </IconButton>
            ),
          ].filter(Boolean)}
        />
      }
    >
      <div className="space-y-6">

        <InvoiceTable onRowDoubleClick={(row) => redirect.to(`${ROUTE_PATH.INVOICE}/${row._id}/edit`)}/>
        {/* Bulk Upload Modal */}
        <FormModal
          ref={invoiceBulkFormModalRef}
          entity={ENTITY.INVOICE}
          type="bulk"
        >
          <BulkUploadForm
            entity={ENTITY.INVOICE}
            onUploadSuccess={handleCloseInvoiceBulkFormModal}
            onClose={handleCloseInvoiceBulkFormModal}
          />
        </FormModal>
        {/* Bulk Upload Modal */}
      </div>
    </Page>
  );
}

export default InvoicesView;
