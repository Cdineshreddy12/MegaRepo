import React from "react";
import Page, { PageHeader } from "@/components/Page";
import ContactForm from "./Form.tsx";
import { EntityFormWithTemplate } from "@/components/common/EntityFormWithTemplate";
import LinkButton from "@/components/LinkButton";
import { useFormMode } from "@/hooks/useFormMode";
import { CONTENT } from "@/constants/content";
import { ENTITY, ROUTE_PATH, ACTION } from "@/constants";
import { ActionType } from "@/types/common";
import useRedirect from "@/hooks/useRedirect";
import { useContact } from "@/queries/ContactQueries";
import { useParams } from "react-router-dom";
import { contactService } from "@/services/api/contactService";
import { useToast } from "@/hooks/useToast";
import { useNavigate } from "react-router-dom";

const rootPath = ROUTE_PATH.CONTACT;

const ContactFormPage: React.FC = () => {
  const { formMode } = useFormMode();
  const { contactId } = useParams();
  const entity = ENTITY.CONTACT;
  const action = formMode as ActionType;
  const redirect = useRedirect();
  const { data: contact } = useContact(contactId || "");
  const { toast } = useToast();
  const navigate = useNavigate();

  const goBack = () => redirect.to(rootPath);

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const isEditMode = formMode === ACTION.MODIFY;
      
      if (isEditMode && contactId) {
        await contactService.updateContact(contactId, data);
        toast({
          title: "Success",
          description: "Contact updated successfully",
        });
      } else {
        const createdContact = await contactService.createContact(data);
        toast({
          title: "Success",
          description: "Contact created successfully",
        });
        navigate(`/contacts/${createdContact._id || createdContact.id}/view`);
      }
      
      goBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
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
        entityType="contact"
        entityData={contact || undefined}
        onSubmit={handleSubmit}
        standardForm={<ContactForm onClose={goBack} onSuccess={goBack} />}
        submitButtonText={formMode === ACTION.MODIFY ? "Update Contact" : "Create Contact"}
        autoUseTemplate={true}
        showTemplateToggle={false}
      />
    </Page>
  );
};

export default ContactFormPage;
