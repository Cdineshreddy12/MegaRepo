import { Plus, Upload, Download } from "lucide-react";
import IconButton from "@/components/common/IconButton";
import Page, { PageHeader } from "@/components/Page";
import useRedirect from "@/hooks/useRedirect";
import { useCreditOperations } from "@/hooks/useCreditOperations";
import { FormModal, useModal } from "@/components/common/Modal";
import { ENTITY, ROUTE_PATH } from "@/constants";
import BulkUploadForm from "@/components/BulkUploadForm";
import SalesOrderTable from "./table";

function SalesOrdersView() {
  const redirect = useRedirect();
  const { isOperationPending } = useCreditOperations();

  // Check if sales order operations are pending
  const isCreatingSalesOrder = isOperationPending('crm.sales-orders.create');

  const {
    modalRef: salesBulkFormModalRef,
    open: handleOpenSalesBulkFormModal,
    close: handleCloseSalesBulkFormModal,
  } = useModal();

  return (
    <Page removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Sales Orders"
          actions={[
            <IconButton variant="outline" onClick={() => {}} icon={Download}>
              Export
            </IconButton>,
            <IconButton
              variant="outline"
              onClick={handleOpenSalesBulkFormModal}
              icon={Upload}
            >
              Bulk Upload
            </IconButton>,
            <IconButton
              onClick={() => {
                redirect.to("new");
              }}
              icon={Plus}
              loading={isCreatingSalesOrder}
            >
              Create Order
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-6">

        <SalesOrderTable onRowDoubleClick={(row) => redirect.to(`${ROUTE_PATH.SALES_ORDER}/${row._id}/view`)}/>
        {/* Bulk Upload Modal */}
        <FormModal
          ref={salesBulkFormModalRef}
          entity={ENTITY.SALES_ORDER}
          type="bulk"
        >
          <BulkUploadForm
            entity={ENTITY.SALES_ORDER}
            onUploadSuccess={handleCloseSalesBulkFormModal}
            onClose={handleCloseSalesBulkFormModal}
          />
        </FormModal>
        {/* Bulk Upload Modal */}
      </div>
    </Page>
  );
}

export default SalesOrdersView;
