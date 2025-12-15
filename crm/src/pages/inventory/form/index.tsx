import React from "react";
import Page, { PageHeader } from "@/components/Page";
import LeadForm from "./Form.tsx";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";

const rootPath = ROUTE_PATH.LEAD;

const LeadFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const entity = ENTITY.LEAD;
  const action = formMode as Exclude<ActionType, "PREVIEW">;
  const redirect = useRedirect();

  const goBack = () => redirect.to(rootPath);

  return (
    <Page
      header={<PageHeader title={CONTENT?.FORM?.[entity]?.[action]?.title} />}
    >
      <LeadForm onClose={goBack} onSuccess={goBack} />
    </Page>
  );
};

export default LeadFormPage;
