import React from "react";
import Page, { PageHeader } from "@/components/Page";
import LeadForm from "./Form.tsx";
import { EntityFormWithTemplate } from "@/components/common/EntityFormWithTemplate";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH, ACTION } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";
import { useLead } from "@/queries/LeadQueries";
import { useParams } from "react-router-dom";
import { leadService } from "@/services/api/leadService";
import { useToast } from "@/hooks/useToast";
import { useSelectedOrg } from "@/store/org-store";
import { useNavigate } from "react-router-dom";

const rootPath = ROUTE_PATH.LEAD;

const LeadFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const { leadId } = useParams();
  const entity = ENTITY.LEAD;
  const action = formMode as ActionType;
  const redirect = useRedirect();
  const { data: lead } = useLead(leadId || "");
  const { toast } = useToast();
  const selectedOrg = useSelectedOrg();
  const navigate = useNavigate();

  const goBack = () => redirect.to(rootPath);

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const isEditMode = formMode === ACTION.MODIFY;
      
      if (isEditMode && leadId) {
        await leadService.updateLead(leadId, {
          ...data,
          email: data.email?.toLowerCase(),
        });
        toast({
          title: "Success",
          description: "Lead updated successfully",
        });
      } else {
        const createdLead = await leadService.createLead(
          {
            ...data,
            email: data.email?.toLowerCase(),
          },
          selectedOrg ? { entityId: selectedOrg } : undefined
        );
        toast({
          title: "Success",
          description: "Lead created successfully",
        });
        navigate(`/leads/${createdLead._id || createdLead.id}/view`);
      }
      
      goBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save lead",
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
        entityType="lead"
        entityData={lead || undefined}
        onSubmit={handleSubmit}
        standardForm={<LeadForm onClose={goBack} onSuccess={goBack} />}
        submitButtonText={formMode === ACTION.MODIFY ? "Update Lead" : "Create Lead"}
        autoUseTemplate={true}
        showTemplateToggle={false}
      />
    </Page>
  );
};

export default LeadFormPage;
