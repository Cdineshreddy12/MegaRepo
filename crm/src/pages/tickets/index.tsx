import BulkUploadForm from "@/components/BulkUploadForm";
import IconButton from "@/components/common/IconButton";
import { useModal, FormModal } from "@/components/common/Modal";
import { ENTITY, ROUTE_PATH } from "@/constants";
import useRedirect from "@/hooks/useRedirect";
import { useCreditOperations } from "@/hooks/useCreditOperations";
import { Download, Upload, Ticket } from "lucide-react";
import TicketTable from "./table";
import Page, { PageHeader } from "@/components/Page";

const rootPath = ROUTE_PATH.TICKET;
function TicketsPage() {
  const redirect = useRedirect();
  const { isOperationPending } = useCreditOperations();

  // Check if ticket operations are pending
  const isCreatingTicket = isOperationPending('crm.tickets.create');

  const {
    modalRef: ticketBulkFormModalRef,
    open: handleTicketBulkFormModalOpen,
    close: handleTicketBulkFormModalClose,
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

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          title="Tickets"
          actions={[
            <IconButton icon={Download} variant="outline" onClick={() => {}}>
              Export
            </IconButton>,
            <IconButton
              icon={Upload}
              variant="outline"
              onClick={handleTicketBulkFormModalOpen}
            >
              Bulk Upload
            </IconButton>,
            <IconButton
              onClick={() => redirect.to(`${rootPath}/new`)}
              icon={Ticket}
              loading={isCreatingTicket}
            >
              Create Ticket
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-5">
        {/* Tasks Table */}
        <TicketTable
          onRowDoubleClick={(row) =>
            redirect.to(`${rootPath}/${row?._id}/view`)
          }
        />

        {/* Bulk Upload Modal */}
        <FormModal
          ref={ticketBulkFormModalRef}
          entity={ENTITY.TICKET}
          type="bulk"
        >
          <BulkUploadForm
          // @ts-expect-error bulk upload
            onUpload={handleBulkUpload}
            onClose={handleTicketBulkFormModalClose}
            onUploadSuccess={handleTicketBulkFormModalClose}
          />
        </FormModal>
      </div>
    </Page>
  );
}

export default TicketsPage;
