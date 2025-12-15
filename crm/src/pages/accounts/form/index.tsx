import React from "react";
import Page, { PageHeader } from "@/components/Page";
import AccountForm from "./Form.tsx";
import { EntityFormWithTemplate } from "@/components/common/EntityFormWithTemplate";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH, ACTION } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";
import { useAccount } from "@/queries/AccountQueries";
import { useParams } from "react-router-dom";
import { accountService } from "@/services/api/accountService";
import { useToast } from "@/hooks/useToast";
import { useSelectedOrg } from "@/store/org-store";
import { useNavigate } from "react-router-dom";

const rootPath = ROUTE_PATH.ACCOUNT;
const AccountFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const { accountId } = useParams();
  const entity = ENTITY.ACCOUNT;
  const action = formMode as ActionType;
  const redirect = useRedirect();
  const { data: account } = useAccount(accountId || "");
  const { toast } = useToast();
  const selectedOrg = useSelectedOrg();
  const navigate = useNavigate();

  const goBack = () => redirect.to(rootPath);

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      // Debug: Log the data being sent to backend
      if (process.env.NODE_ENV === 'development') {
        console.log('[AccountFormPage] Data being sent to backend:', data);
        console.log('[AccountFormPage] CompanyName:', data.companyName);
        console.log('[AccountFormPage] Zone in data:', data.zone);
        console.log('[AccountFormPage] All keys:', Object.keys(data));
        console.log('[AccountFormPage] Zone-related keys:', Object.keys(data).filter(k => k.toLowerCase().includes('zone')));
        console.log('[AccountFormPage] Required fields check:', {
          companyName: data.companyName,
          companyNameExists: 'companyName' in data,
          companyNameValue: data.companyName,
          companyNameType: typeof data.companyName,
        });
      }
      
      // Validate required fields
      if (!data.companyName || (typeof data.companyName === 'string' && data.companyName.trim() === '')) {
        console.error('[AccountFormPage] Missing companyName:', data);
        toast({
          title: "Validation Error",
          description: "Company Name is required. Please check your form template includes a Company Name field.",
          variant: "destructive",
        });
        throw new Error('Company Name is required');
      }
      
      // Final fallback: ensure zone is included if it exists anywhere in the data
      if (!data.zone) {
        const zoneKeys = Object.keys(data).filter(k => k.toLowerCase().includes('zone'));
        for (const key of zoneKeys) {
          const zoneValue = data[key];
          if (zoneValue !== undefined && zoneValue !== null && zoneValue !== '') {
            data.zone = zoneValue;
            if (process.env.NODE_ENV === 'development') {
              console.log('[AccountFormPage] Added zone from data:', { key, value: zoneValue });
            }
            break;
          }
        }
      }
      
      // Normalize enum fields to match backend schema
      // ownershipType: ["public", "private", "government", "non_profit"]
      if (data.ownershipType && typeof data.ownershipType === 'string') {
        const originalValue = data.ownershipType;
        const lowerValue = originalValue.toLowerCase().trim();
        const enumMap: Record<string, string> = {
          'public': 'public',
          'private': 'private',
          'government': 'government',
          'non-profit': 'non_profit',
          'nonprofit': 'non_profit',
          'non_profit': 'non_profit',
        };
        data.ownershipType = enumMap[lowerValue] || lowerValue;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AccountFormPage] Normalized ownershipType:', { 
            original: originalValue, 
            normalized: data.ownershipType 
          });
        }
      }
      
      // invoicing: ["email", "hard_copy", "online_portal"]
      if (data.invoicing && typeof data.invoicing === 'string') {
        const originalValue = data.invoicing;
        const lowerValue = originalValue.toLowerCase().trim().replace(/\s+/g, '_');
        const enumMap: Record<string, string> = {
          'email': 'email',
          'hard_copy': 'hard_copy',
          'hard copy': 'hard_copy',
          'online_portal': 'online_portal',
          'online portal': 'online_portal',
        };
        data.invoicing = enumMap[lowerValue] || lowerValue;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AccountFormPage] Normalized invoicing:', { 
            original: originalValue, 
            normalized: data.invoicing 
          });
        }
      }
      
      // creditTerm: ["21_days", "30_days", "45_days", "60_days", "90_days", "120_days", "100%_advance", " on_delivery", "pdc_cheque"]
      if (data.creditTerm && typeof data.creditTerm === 'string') {
        const originalValue = data.creditTerm;
        const normalized = originalValue.toLowerCase().trim().replace(/\s+/g, '_').replace(/%/g, '%');
        // Keep as-is if it matches expected format, otherwise try to normalize
        data.creditTerm = normalized;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AccountFormPage] Normalized creditTerm:', { 
            original: originalValue, 
            normalized: data.creditTerm 
          });
        }
      }
      
      const isEditMode = formMode === ACTION.MODIFY;
      
      if (isEditMode && accountId) {
        await accountService.updateAccount(accountId, data);
        toast({
          title: "Success",
          description: "Account updated successfully",
        });
      } else {
        const createdAccount = await accountService.createAccount(data, {
          entityId: selectedOrg?.id,
        });
        toast({
          title: "Success",
          description: "Account created successfully",
        });
        navigate(`/accounts/${createdAccount._id || createdAccount.id}/view`);
      }
      
      goBack();
    } catch (error: any) {
      console.error('[AccountFormPage] Error submitting form:', error);
      console.error('[AccountFormPage] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save account",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <Page
      header={
        <PageHeader
          title={CONTENT?.FORM?.[entity]?.[action]?.title}
        />
      }
    >
      <EntityFormWithTemplate
        entityType="account"
        entityData={account || undefined}
        onSubmit={handleSubmit}
        standardForm={<AccountForm onClose={goBack} onSuccess={goBack} />}
        submitButtonText={formMode === ACTION.MODIFY ? "Update Account" : "Create Account"}
        autoUseTemplate={true}
        showTemplateToggle={false}
      />
    </Page>
  );
};

export default AccountFormPage;
