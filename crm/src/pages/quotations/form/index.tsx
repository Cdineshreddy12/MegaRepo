import React from "react";
import Page, { PageHeader } from "@/components/Page";
import QuotationForm from "./Form.tsx";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";

const rootPath = ROUTE_PATH.QUOTATION;

const QuotationFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const entity = ENTITY.QUOTATION;
  const action = formMode as ActionType;

  const redirect = useRedirect();

  const goBack = () => redirect.to(rootPath);

  return (
    <Page
      header={
        <PageHeader
          title={CONTENT?.FORM?.[entity]?.[action]?.title}
        />
      }
    >
      <QuotationForm onClose={goBack} onSuccess={goBack} />
    </Page>
  );
};

export default QuotationFormPage;
