/**
 * Account Form using Form Template
 * 
 * This component demonstrates how to use a form template for Account creation/editing.
 * 
 * Usage:
 * 1. Create a template in Form Builder for "account" entity type
 * 2. Copy the template ID
 * 3. Update ACCOUNT_FORM_TEMPLATE_ID below with your template ID
 * 4. Use this component instead of the standard AccountForm
 */

import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { accountService } from "@/services/api/accountService";
import { useToast } from "@/hooks/useToast";
import { useNavigate, useParams } from "react-router-dom";
import { useSelectedOrg } from "@/store/org-store";
import { useAccount } from "@/queries/AccountQueries";
import { Loader2 } from "lucide-react";
import { getTemplateId } from "@/constants/formTemplates";

// TODO: Replace with your actual template ID from Form Builder
// Or use: const templateId = getTemplateId("account");
const ACCOUNT_FORM_TEMPLATE_ID = ""; // Add your template ID here

interface AccountTemplateFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AccountTemplateForm({
  onClose,
  onSuccess,
}: AccountTemplateFormProps) {
  const { accountId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const selectedOrg = useSelectedOrg();
  const { data: account, isLoading } = useAccount(accountId || "");

  const isEditMode = !!accountId;
  const templateId = ACCOUNT_FORM_TEMPLATE_ID || getTemplateId("account");

  if (!templateId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">
          No template configured. Please set ACCOUNT_FORM_TEMPLATE_ID or create a template in Form Builder.
        </p>
      </div>
    );
  }

  // Map account data to form field IDs for edit mode
  const initialData = isEditMode && account
    ? {
        "field-companyName": account.companyName,
        "field-email": account.email,
        "field-phone": account.phone,
        "field-description": account.description,
        "field-industry": account.industry,
        "field-status": account.status,
        "field-accountType": account.accountType,
        "field-segment": account.segment,
        "field-employeesCount": account.employeesCount,
        "field-annualRevenue": account.annualRevenue,
        "field-ownershipType": account.ownershipType,
        "field-invoicing": account.invoicing,
        "field-creditTerm": account.creditTerm,
        "field-gstNo": account.gstNo,
        "field-zone": account.zone,
        "field-assignedTo": account.assignedTo?._id || account.assignedTo || null,
        // Handle nested address fields if your template has them
        ...(account.billingAddress && {
          "field-billingAddress": account.billingAddress,
        }),
        ...(account.shippingAddress && {
          "field-shippingAddress": account.shippingAddress,
        }),
      }
    : {};

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      // Map form data to account structure
      // Adjust field IDs based on your template's field IDs
      const accountData: any = {
        companyName: data["field-companyName"],
        email: data["field-email"],
        phone: data["field-phone"],
        description: data["field-description"],
        industry: data["field-industry"],
        status: data["field-status"],
        accountType: data["field-accountType"],
        segment: data["field-segment"],
        employeesCount: data["field-employeesCount"]
          ? Number(data["field-employeesCount"])
          : undefined,
        annualRevenue: data["field-annualRevenue"]
          ? Number(data["field-annualRevenue"])
          : undefined,
        ownershipType: data["field-ownershipType"],
        invoicing: data["field-invoicing"],
        creditTerm: data["field-creditTerm"],
        gstNo: data["field-gstNo"],
        zone: data["field-zone"],
        assignedTo: data["field-assignedTo"] || null,
      };

      // Handle nested address fields if present
      if (data["field-billingAddress"]) {
        accountData.billingAddress = data["field-billingAddress"];
      }
      if (data["field-shippingAddress"]) {
        accountData.shippingAddress = data["field-shippingAddress"];
      }

      if (isEditMode && accountId) {
        // Update existing account
        await accountService.updateAccount(accountId, accountData);
        toast({
          title: "Success",
          description: "Account updated successfully",
        });
      } else {
        // Create new account
        const createdAccount = await accountService.createAccount(accountData, {
          entityId: selectedOrg?.id,
        });
        toast({
          title: "Success",
          description: "Account created successfully",
        });
        navigate(`/accounts/${createdAccount._id || createdAccount.id}/view`);
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? "update" : "create"} account`,
        variant: "destructive",
      });
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <DynamicFormRenderer
        templateId={templateId}
        initialData={initialData}
        onSubmit={handleSubmit}
        submitButtonText={isEditMode ? "Update Account" : "Create Account"}
        showDraftButton={true}
        readOnly={false}
      />
    </div>
  );
}

