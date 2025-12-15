import { Plus, Upload, Download } from "lucide-react";
import IconButton from "@/components/common/IconButton";
import Page, { PageHeader } from "@/components/Page";
import useRedirect from "@/hooks/useRedirect";
import { useCreditOperations } from "@/hooks/useCreditOperations";
import { FormModal, useModal } from "@/components/common/Modal";
import { ENTITY, ROUTE_PATH } from "@/constants";
import BulkUploadForm from "@/components/BulkUploadForm";
import ProductOrderTable from "./table";

function ProductOrdersView() {
  const redirect = useRedirect();
  const { isOperationPending } = useCreditOperations();

  // Check if product order operations are pending
  const isCreatingProductOrder = isOperationPending('crm.product-orders.create');

  const {
    modalRef: productOrdersBulkFormModalRef,
    open: handleOpenProductOrdersBulkFormModal,
    close: handleCloseProductOrdersBulkFormModal,
  } = useModal();

  return (
    <Page removeBackground
      header={
        <PageHeader
          title="Product Orders"
          actions={[
            <IconButton variant="outline" onClick={() => {}} icon={Download}>
              Export
            </IconButton>,
            <IconButton
              variant="outline"
              onClick={handleOpenProductOrdersBulkFormModal}
              icon={Upload}
            >
              Bulk Upload
            </IconButton>,
            <IconButton
              onClick={() => {
                redirect.to("new");
              }}
              icon={Plus}
              loading={isCreatingProductOrder}
            >
              Create Order
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-6">

        <ProductOrderTable onRowDoubleClick={(row) => {
          const base = ROUTE_PATH.PRODUCT_ORDER.replace(/^\//, "");
          redirect.to(`/${base}/${row._id}/view`);
        }}/>
        {/* Bulk Upload Modal */}
        <FormModal
          ref={productOrdersBulkFormModalRef}
          entity={ENTITY.PRODUCT_ORDER}
          type="bulk"
        >
          <BulkUploadForm
            entity={ENTITY.PRODUCT_ORDER}
            onUploadSuccess={handleCloseProductOrdersBulkFormModal}
            onClose={handleCloseProductOrdersBulkFormModal}
          />
        </FormModal>
        {/* Bulk Upload Modal */}
      </div>
    </Page>
  );
}

export default ProductOrdersView;
