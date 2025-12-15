import React from "react";
import Page, { PageHeader } from "@/components/Page";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";
import UserForm from "./Form.tsx";

const AccountFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const entity = ENTITY.USER;
  const action = formMode as ActionType;

   const redirect = useRedirect();
    
  
  const goBack = () => redirect.back()
  
 
  
  return (
    <Page
      header={
        <PageHeader
          title={CONTENT?.FORM?.[entity]?.[action]?.title}
        />
      }
    >
      <UserForm onClose={goBack} onSuccess={goBack} />
    </Page>
  );
};

export default AccountFormPage;
