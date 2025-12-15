// Icons from lucide-react
import { Building, Upload, Download } from "lucide-react";

// Components
import AccountTable from "./table";
import BulkUploadForm from "@/components/BulkUploadForm";
import IconButton from "@/components/common/IconButton";
import { FormModal, useModal } from "@/components/common/Modal";

// Constants and utilities
import { ENTITY } from "@/constants";
import useRedirect from "@/hooks/useRedirect";
import { API_BASE_URL } from "@/services/api";
import Page, { PageHeader } from "@/components/Page";
import React from 'react';
import { usePermissions } from "@/hooks/usePermissions";
import { useCreditOperations } from "@/hooks/useCreditOperations";


function AccountPage() {
  const redirect = useRedirect();
  const { hasPermission } = usePermissions();
  const { isOperationPending } = useCreditOperations();
  
  // Check if account creation is pending
  const isCreatingAccount = isOperationPending('crm.accounts.create');

  // Check permissions
  const canRead = hasPermission('crm.accounts.read');
  const canCreate = hasPermission('crm.accounts.create');


  const {
    modalRef: accountBulkFormModalRef,
    open: handleAccountBulkFormModalOpen,
    close: handleAccountBulkFormModalClose,
  } = useModal();

  // Handle successful bulk upload
  const handleBulkUploadSuccess = () => {
    console.log("Bulk upload completed successfully");
    handleAccountBulkFormModalClose();
  };

  // Handle adding a new account
  const handleAddAccount = () => {
    // First update the route
    redirect.to("/accounts/new");
  };

  // Export accounts function
  const handleExportAccounts = async () => {
    try {
      const { getApiToken } = await import('@/services/api');
      const token = getApiToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      // Using the same endpoint pattern as in the backend code
      const response = await fetch(`${API_BASE_URL}/bulk/Account/export`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export accounts");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "accounts_export.xlsx";
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
          title="Accounts"
          actions={[
            canRead && (
              <IconButton
                key="export"
                variant="outline"
                onClick={handleExportAccounts}
                icon={Download}
              >
                Export
              </IconButton>
            ),
            canCreate && (
              <IconButton
                key="bulk-upload"
                variant="outline"
                onClick={handleAccountBulkFormModalOpen}
                icon={Upload}
              >
                Bulk Upload
              </IconButton>
            ),
            canCreate && (
              <IconButton 
                key="add-account" 
                onClick={handleAddAccount} 
                icon={Building}
                loading={isCreatingAccount}
              >
                Add Account
              </IconButton>
            ),
          ].filter(Boolean)}
        />
      }
    >
      <div className="space-y-5">
        <AccountTable
          // @ts-expect-error mongoose id
          onRowDoubleClick={(row) => redirect.to(`/accounts/${row._id}/view`)}
        />

        {/* Bulk Upload Modal */}
        <FormModal
          ref={accountBulkFormModalRef}
          entity={ENTITY.ACCOUNT}
          type="bulk"
          onClose={handleAccountBulkFormModalClose}
        >
          <BulkUploadForm
            entity={ENTITY.ACCOUNT}
            onUploadSuccess={handleBulkUploadSuccess}
            onClose={handleAccountBulkFormModalClose}
          />
        </FormModal>
      </div>
    </Page>
  );
}

export default AccountPage;
