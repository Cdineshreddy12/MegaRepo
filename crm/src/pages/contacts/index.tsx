// Icons
import { Users, Upload, Download } from "lucide-react";

// Components
import ContactsTable from "./table";
import BulkUploadForm from "@/components/BulkUploadForm";
import IconButton from "@/components/common/IconButton";
import { FormModal, useModal } from "@/components/common/Modal";

// Constants
import { ENTITY } from "@/constants";

// Hooks
import useRedirect from "@/hooks/useRedirect";

// Services
import { API_BASE_URL } from "@/services/api";
import Page, { PageHeader } from "@/components/Page";

// Hooks
import { usePermissions } from "@/hooks/usePermissions";
import { useCreditOperations } from "@/hooks/useCreditOperations";

function ContactsView() {
  const redirect = useRedirect();
  const { hasPermission } = usePermissions();
  const { isOperationPending } = useCreditOperations();

  // Check permissions
  const canRead = hasPermission('crm.contacts.read');
  const canCreate = hasPermission('crm.contacts.create');

  // Check if contact operations are pending
  const isCreatingContact = isOperationPending('crm.contacts.create');
  const isUpdatingContact = isOperationPending('crm.contacts.update');

  const {
    modalRef: contactBulkFormModalRef,
    open: handleContactBulkFormModalOpen,
    close: handleContactBulkFormModalClose,
  } = useModal();

  // Handle successful bulk upload

  const handleBulkUploadSuccess = (result: unknown): void => {
    console.log("Bulk upload completed successfully:", result);
    handleContactBulkFormModalClose();
    // Refresh the contacts table or show a success notification
    // You could implement this with a state update or context
  };

  // Export contacts - this would be implemented based on your API
  const handleExportContacts = async () => {
    try {
      const { getApiToken } = await import('@/services/api');
      const token = getApiToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      // Using the same endpoint pattern as in the backend code
      const response = await fetch(`${API_BASE_URL}/bulk/Contact/export`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export contacts");
      }

      // Create a blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "contacts_export.xlsx";
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      // Show error notification
    }
  };

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Contacts"
          actions={[
            canRead && (
              <IconButton
                key="export"
                variant="outline"
                onClick={handleExportContacts}
                icon={Download}
              >
                Export
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="bulk-upload"
                variant="outline"
                onClick={handleContactBulkFormModalOpen}
                icon={Upload}
              >
                Bulk Upload
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="add-contact"
                onClick={() => {
                  redirect.to("/contacts/new");
                }}
                icon={Users}
                loading={isCreatingContact}
              >
                Add Contact
              </IconButton>
            ),
          ].filter(Boolean)}
        />
      }
    >
      <div className="space-y-5 flex-1">
        <ContactsTable
          // @ts-expect-error mongo id
          onRowDoubleClick={(row) => redirect.to(`/contacts/${row?._id}/view`)}
        />

        {/* Bulk Upload Modal */}
        <FormModal
          ref={contactBulkFormModalRef}
          entity={ENTITY.CONTACT}
          type="bulk"
        >
          <BulkUploadForm
            entity={ENTITY.CONTACT}
            onUploadSuccess={handleBulkUploadSuccess}
            onClose={handleContactBulkFormModalClose}
          />
        </FormModal>
      </div>
    </Page>
  );
}

export default ContactsView;
