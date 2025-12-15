import React from "react";
import Page, { PageHeader } from "@/components/Page";
import OpportunityForm from "./Form.tsx";
import { EntityFormWithTemplate } from "@/components/common/EntityFormWithTemplate";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH, ACTION } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";
import { useOpportunity } from "@/queries/OpportunityQueries";
import { useParams } from "react-router-dom";
import { opportunityService } from "@/services/api/opportunityService";
import { useToast } from "@/hooks/useToast";
import { useSelectedOrg } from "@/store/org-store";
import { useNavigate } from "react-router-dom";

const rootPath = ROUTE_PATH.OPPORTUNITY;

const OpportunityFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const { opportunityId } = useParams();
  const entity = ENTITY.OPPORTUNITY;
  const action = formMode as ActionType;
  const redirect = useRedirect();
  const { data: opportunity } = useOpportunity(opportunityId || "");
  const { toast } = useToast();
  const selectedOrg = useSelectedOrg();
  const navigate = useNavigate();

  const goBack = () => redirect.to(rootPath);

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const isEditMode = formMode === ACTION.MODIFY;
      
      if (isEditMode && opportunityId) {
        await opportunityService.updateOpportunity(opportunityId, data);
        toast({
          title: "Success",
          description: "Opportunity updated successfully",
        });
      } else {
        // Opportunities use hierarchical filtering through accounts, so we don't need entityId param
        const createdOpportunity = await opportunityService.createOpportunity(data);
        toast({
          title: "Success",
          description: "Opportunity created successfully",
        });
        navigate(`/opportunities/${createdOpportunity._id || createdOpportunity.id}/view`);
      }
      
      goBack();
    } catch (error: any) {
      console.error('[OpportunityFormPage] Error submitting form:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save opportunity",
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
        entityType="opportunity"
        entityData={opportunity || undefined}
        onSubmit={handleSubmit}
        standardForm={<OpportunityForm onClose={goBack} onSuccess={goBack} />}
        submitButtonText={formMode === ACTION.MODIFY ? "Update Opportunity" : "Create Opportunity"}
        autoUseTemplate={true}
        showTemplateToggle={false}
      />
    </Page>
  );
};

export default OpportunityFormPage;
