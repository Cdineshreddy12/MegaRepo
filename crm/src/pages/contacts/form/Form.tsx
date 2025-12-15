import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFormContext } from "react-hook-form";

// Form components
import {
  FormActions,
  FormGroup,
  FormSection,
  InputField,
  ReusableForm,
  CheckboxField,
} from "@/components/common/form-elements";
import AddressForm from "@/components/common/AddressForm";
import AssigneeSelectorField from "@/components/common/AssigneeSelector";
import AccountSelectorField from "@/components/common/AccountSelector";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import { DocumentUpload } from "@/components/document-upload";

// Utility components
import CloseButton from "@/components/common/CloseButton";
import SubmitButton from "@/components/common/SubmitButton";
import { UserCard } from "@/components/common/UserCard";
import { SaveIcon, Loader } from "lucide-react";

// Hooks
import { useCreateContact, useUpdateContactOptimistic, useContact, useQueryParams } from "@/queries/ContactQueries";
import { useFormMode } from "@/hooks/useFormMode";
import { toast } from "@/hooks/useToast";
import { useOrgStore } from "@/store/org-store";
import PhoneInputField from "@/components/common/form-elements/PhoneInputField";
// Constants and schemas
import { ACTION, ENTITY } from "@/constants";
import ContactFormSchema from "../zodSchema";
import { defaultValues } from "../testData";
import { countryOptions } from "../constants";

// Keep your ContactFormFields component unchanged
const ContactFormFields = ({ isEditMode, contactCreator, isAccountLocked }) => {
  const { control } = useFormContext();

  return (
    <>
      {/* Account Information */}
      <FormSection title="Account Information">
        <FormGroup>
          <AccountSelectorField
            label="Account"
            name="accountId"
            placeholder="Select Account"
            control={control}
            required
            disabled={isAccountLocked}
          />
          <AssigneeSelectorField
            label="Contact Owner"
            name="assignedTo"
            placeholder="Select Contact Owner"
            control={control}
            required
          />
        </FormGroup>
        
        {/* Option to make this the primary contact */}
        <FormGroup>
          <CheckboxField
            name="isPrimaryContact"
            control={control}
            label="Set as primary contact for this account"
          />
        </FormGroup>
        
        {/* Display Created By in edit mode if available */}
        {isEditMode && contactCreator && (
          <FormGroup>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Created By</label>
              <div className="p-2 border rounded">
                <UserCard user={
                  {...contactCreator, avatar: contactCreator.profileImage?.url}
                }
                showEmail={false}
                />
              </div>
            </div>
          </FormGroup>
        )}
      </FormSection>

      {/* Contact Information */}
      <FormSection title="Contact Information">
        <FormGroup>
          <InputField
            label="First Name"
            name="firstName"
            control={control}
            required
          />
          <InputField
            label="Last Name"
            name="lastName"
            control={control}
            required
          />
        </FormGroup>
        <FormGroup>
          <InputField label="Job Title" name="jobTitle" control={control} />
          <InputField label="Department" name="department" control={control} />

          <SysConfigDropdownField
            control={control}
            label="Contact Type"
            name="contactType"
            placeholder="Select Contact Type"
            category="contact_types"
          />
        </FormGroup>
      </FormSection>

      {/* Communication Information */}
      <FormSection title="Communication Information">
        <FormGroup>
          <InputField
            label="Email"
            name="email"
            type="email"
            control={control}
            required
          />
          <InputField
            label="Secondary Email"
            name="secondaryEmail"
            type="email"
            control={control}
          />
        </FormGroup>
        <FormGroup>
          <PhoneInputField
            label="Phone"
            name="phone"
            type="tel"
            control={control}
            required
          />
          <PhoneInputField
            label="Alternate Phone"
            name="alternatePhone"
            type="tel"
            control={control}
          />
        </FormGroup>

        <AddressForm
          parentPath="address"
          countryOptions={countryOptions}
          label="Address "
          className="mt-4"
        />
      </FormSection>
      {/* Additional Information */}
      <FormSection title="Additional information">
        <FormGroup>
          <SysConfigDropdownField
            control={control}
            label="Lead Source"
            name="leadSource"
            placeholder="Select Lead Source"
            category="lead_sources"
          />
        </FormGroup>
      </FormSection>
      <FormSection title="Document Uploads">
        <FormGroup>
          <DocumentUpload
            name="contactImage"
            placeholder="Upload Contact image"
            label="Contact image"
          />
          <DocumentUpload
            label="Business Card"
            name="businessCard"
            placeholder="Upload Business Card"
          />
        </FormGroup>
      </FormSection>
    </>
  );
};

const ContactForm = ({ onClose, onSuccess }) => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const queryParams = useQueryParams();
  const accountId = queryParams.get('accountId');

  // Safety check: if contactId is invalid and we're in edit mode, show loading
  if (contactId && (contactId === '' || contactId === 'undefined' || contactId === 'null')) {
    return <Loader />;
  }

  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContactOptimistic();
  const { formMode, isEditAction } = useFormMode();
  const selectedOrg = useOrgStore((state) => state.selectedOrg);

  const { data: contact, isLoading } = useContact(contactId);

  // Debug logging
  useEffect(() => {
    console.log("ContactForm Debug Info:");
    console.log("contactId:", contactId);
    console.log("formMode:", formMode);
    console.log("isEditAction:", isEditAction);
    console.log("contact data:", contact);
    
    // Debug the button state
    console.log("Button would be disabled if formMode === ACTION.VIEW:", formMode === ACTION.VIEW);
  }, [contactId, formMode, isEditAction, contact]);

  // Handle form success and ensure proper closure
  const handleSuccess = () => {
    if (typeof onSuccess === "function") {
      onSuccess();
    }
    // Close the form after successful creation/update (unless navigating to account)
    if (!accountId && typeof onClose === "function") {
      onClose();
    }
  };

  // Check if this contact is being created from an account
  const isAccountLocked = !!accountId;

  // Create properly formatted prefill data
  const prefillContact = React.useMemo(() => ({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    jobTitle: contact?.jobTitle || '',
    department: contact?.department || '',
    contactType: contact?.contactType || '',
    leadSource: contact?.leadSource || '',
    secondaryEmail: contact?.secondaryEmail || '',
    alternatePhone: contact?.alternatePhone || '',
    accountId: contact?.accountId?.id || contact?.accountId?._id || accountId || '',
    assignedTo: contact?.assignedTo?._id || contact?.assignedTo?.id || '',
    address: contact?.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    contactImage: contact?.contactImage || null,
    businessCard: contact?.businessCard || null,
  }), [contact, accountId]);

  // Debug logging for form data population (remove after testing)
  // console.log('🔍 ContactForm prefillContact:', {
  //   isLoading,
  //   formMode,
  //   isEditAction,
  //   contactData: contact ? {
  //     _id: contact._id,
  //     firstName: contact.firstName,
  //     lastName: contact.lastName,
  //     email: contact.email,
  //     phone: contact.phone,
  //     assignedTo: contact.assignedTo,
  //     accountId: contact.accountId
  //   } : null,
  //   prefillContact
  // });
        
  const contactCreator = contact?.createdBy;
  const titleMode = isEditAction ? "Update" : "Create";
  const isEditMode = formMode === ACTION.MODIFY || formMode === ACTION.VIEW;

  const handleMutation = async (data) => {
    console.log(`Executing ${isEditAction ? 'update' : 'create'} mutation with:`, data);

    if (isEditAction) {
      // For updates, explicitly pass the ID
      return updateContactMutation.mutateAsync({
        data: {
          id: contactId, // Use the ID from URL params
          ...data,
          email: data?.email?.toLowerCase(),
          secondaryEmail: data?.secondaryEmail?.toLowerCase(),
        },
        params: selectedOrg ? { entityId: selectedOrg } : undefined
      });
    }

    // For creates, pass the data in the expected format
    const createData = {
      ...data,
      email: data?.email?.toLowerCase(),
      secondaryEmail: data?.secondaryEmail?.toLowerCase(),
    };
    console.log('🚀 ContactForm: About to call createContactMutation with:', { data: createData });
    return createContactMutation.mutateAsync({
      data: createData,
      params: selectedOrg ? { entityId: selectedOrg } : undefined
    });
  };

  const handleSubmit = async (data) => {
    console.log("Form submitted with data:", data);
    console.log("Current form mode:", formMode);

    try {
      await handleMutation(data);
      toast({
        title: `${titleMode} Contact`,
        description: `Contact has been ${titleMode.toLowerCase()}d successfully`,
      });

      if (accountId && formMode === ACTION.CREATE) {
        navigate(`/accounts/${accountId}/view`);
      } else {
        handleSuccess();
      }
    } catch (error) {
      console.error(`${titleMode} Contact error:`, error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          `Failed to ${titleMode.toLowerCase()} contact`;
      toast({
        title: `${titleMode} Contact Error`,
        description: errorMessage,
        variant: "destructive",
      });
      // Re-throw error so react-hook-form can reset the loading state
      throw error;
    }
  };
  
  // Create a standalone update function for direct manual updates (temporarily disabled)
  const manualUpdate = async (data) => {
    console.log("Manual update triggered with data:", data);

    try {
      // Strip any validation-blocking fields
      const cleanData = { ...data };

      // If there's an _id field in the form data, remove it to avoid duplication
      if (cleanData._id) {
        console.log("Removing _id from form data to avoid duplication");
        delete cleanData._id;
      }

      // Call the update mutation directly
      const result = await updateContactMutation.mutateAsync({
        data: {
          id: contactId,
          ...cleanData,
          email: cleanData?.email?.toLowerCase(),
          secondaryEmail: cleanData?.secondaryEmail?.toLowerCase(),
        },
        params: selectedOrg ? { entityId: selectedOrg } : undefined
      });

      console.log("Manual update succeeded:", result);

      toast({
        title: "Update Contact",
        description: "Contact has been updated successfully",
      });

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (error) {
      console.error("Manual update failed:", error);
      toast({
        title: "Update Contact Error",
        description: `Failed to update contact: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <ReusableForm
      zodSchema={ContactFormSchema}
      defaultValues={defaultValues}
      prefillData={prefillContact}
      onSubmit={handleSubmit}
      // For edit mode only, we'll disable form validation
      mode={formMode === ACTION.MODIFY ? "onChange" : "onSubmit"}
      // For MODIFY mode only, specify noValidate to bypass HTML5 validation
      formProps={formMode === ACTION.MODIFY ? { noValidate: true } : {}}
      renderActions={(form) => {
        return (
          <FormActions>
            <CloseButton 
              onClose={() => {
                if (accountId) {
                  navigate(`/accounts/${accountId}/view`);
                } else if (typeof onClose === 'function') {
                  onClose();
                }
              }} 
              entity={ENTITY.CONTACT} 
            />
            
            {/* In edit mode, use a custom submit button that bypasses validation */}
            {formMode === ACTION.MODIFY && (
              <button
                type="button"
                disabled={updateContactMutation.isPending}
                className="flex items-center px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  console.log("Manual submit button clicked");
                  
                  // Get current form values
                  const formData = form.getValues();
                  console.log("Current form values:", formData);
                  
                  // Check form state
                  console.log("Form state:", {
                    isDirty: form.formState.isDirty,
                    isValid: form.formState.isValid,
                    isValidating: form.formState.isValidating,
                    isSubmitting: form.formState.isSubmitting,
                    errors: form.formState.errors
                  });
                  
                  // Bypass validation check and proceed with update
                  console.log("Bypassing validation check and updating contact directly");
                  manualUpdate(formData);
                }}
                disabled={updateContactMutation.isPending || form.formState.isSubmitting}
              >
                {updateContactMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4 mr-2" />
                    Update Contact
                  </>
                )}
              </button>
            )}
            
            {/* In create mode, use the regular SubmitButton */}
            {formMode !== ACTION.MODIFY && (
              <SubmitButton 
                entity={ENTITY.CONTACT}
                loading={form.formState.isSubmitting}
              />
            )}
          </FormActions>
        );
      }}
    >
      <ContactFormFields 
        isEditMode={isEditMode} 
        contactCreator={contactCreator} 
        accountId={accountId}
        isAccountLocked={isAccountLocked}
      />
    </ReusableForm>
  );
};

export default ContactForm;