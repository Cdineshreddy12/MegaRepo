import React from "react";
import Page, { PageHeader } from "@/components/Page";
import SalesOrderForm from "./Form.tsx";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";

const rootPath = ROUTE_PATH.PRODUCT_ORDER;

const ProductOrderFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const entity = ENTITY.PRODUCT_ORDER;
  const action = formMode as Exclude<ActionType, 'PREVIEW'>;

  const redirect = useRedirect();

  const goBack = () => {
    const base = rootPath.replace(/^\//, "");
    redirect.to(`/${base}`);
  };

  return (
    <Page
      header={
        <PageHeader
          title={CONTENT?.FORM?.[entity]?.[action]?.title}
        />
      }
    >
      <SalesOrderForm onClose={goBack} onSuccess={goBack} />
    </Page>
  );
};

export default ProductOrderFormPage;
