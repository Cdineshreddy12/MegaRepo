// React and React Hook Form
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";

// Axios
import { AxiosError } from "axios";

// Form Components
import {
  FormActions,
  FormGroup,
  FormSection,
  InputField,
  ReusableForm,
  SelectField,
  TextAreaField,
} from "@/components/common/form-elements";
import AddressForm from "@/components/common/AddressForm";
import CloseButton from "@/components/common/CloseButton";
import SubmitButton from "@/components/common/SubmitButton";
import ZoneSelectorField from "@/components/common/ZoneSelector";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import {UserCard} from "@/components/common/UserCard";
import PhoneInputField from "@/components/common/form-elements/PhoneInputField";
// Queries
import {
  useCreateLead,
  useLead,
  useUpdateLeadOptimistic,
} from "@/queries/LeadQueries";
import { useUsers } from "@/queries/UserQueries";

// Hooks
import { toast } from "@/hooks/useToast";
import { useFormMode } from "@/hooks/useFormMode";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";

// Constants
import { ACTION, ENTITY } from "@/constants";
import { countryOptions } from "@/pages/contacts/constants";

// Utilities
import { formatName } from "@/utils/format";

// Types
import { FormCallbacks } from "@/types/common";
import { LeadFormValues } from "../types";

// Schema and Default Data
import LeadFormSchema from "../zodSchema";
import { defaultValues } from "../testData";

// Router
import { useParams } from "react-router-dom";
import { useOrgStore } from "@/store/org-store";

function LeadFormFields({ isEditMode = false, leadData = null }) {
  const { control } = useFormContext();
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const { data: userData, isPending: isUserPending } = useUsers(selectedOrg || undefined);

  // Access createdBy from leadData
  // Access createdBy from leadData
  const createdBy = leadData?.createdBy;

  const contactOwnerOptions =
    userData?.map((contactOwner) => ({
      value: contactOwner._id,
      label: formatName(contactOwner, "FN-LN"),
    })) || [];

  return (
    <>
      <FormSection title="Personal Information">
        <FormGroup>
          <InputField
            control={control}
            name="firstName"
            label="First Name"
            required
          />
          <InputField
            control={control}
            name="lastName"
            label="Last Name"
            required
          />
        </FormGroup>
        <FormGroup>
          <InputField
            control={control}
            name="email"
            label="Email"
            type="email"
            required
          />
          <PhoneInputField control={control} name="phone" label="Phone" type="tel" />
        </FormGroup>
      </FormSection>

      <FormSection title="Company Information">
        <FormGroup className="lg:grid-cols-3">
          <InputField
            control={control}
            name="companyName"
            label="Company Name"
            required
          />
          <SysConfigDropdownField
            category="industries"
            control={control}
            name="industry"
            label="Industry"
            placeholder="Select Industry"
          />
          <InputField
            control={control}
            name="jobTitle"
            label="Job Title"
            required
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Lead Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SysConfigDropdownField
            control={control}
            name="source"
            label="Lead Source"
            placeholder="Select Lead Source"
            required
            category="lead_sources"
          />
          <SysConfigDropdownField
            control={control}
            name="status"
            label="Status"
            placeholder="Select Status"
            required
            category="lead_status"
          />
          <InputField
            control={control}
            name="score"
            label="Lead Score"
            type="number"
            min="0"
            max="100"
            required
          />
        </div>
      </FormSection>

      <FormSection>
        <TextAreaField
          control={control}
          name="notes"
          label="Notes"
          placeholder="Add any additional notes..."
        />
      </FormSection>

      <FormSection title="Product Information">
        <InputField control={control} name="product" label="Product" required />
      </FormSection>

      <FormSection title="Address Information">
        <AddressForm parentPath="address" countryOptions={countryOptions} />
      </FormSection>

      <FormSection title="Assignment">
        <FormGroup>
          <ZoneSelectorField name="zone" control={control} />
          <SelectField
            label="Owner"
            name="assignedTo"
            placeholder={isUserPending ? "Loading..." : "Select Owner"}
            control={control}
            options={contactOwnerOptions}
            getOptionLabel={(option) => option.label}
            getOptionValue={(option) => option.value}
            // Remove the value prop - React Hook Form will handle the value
            // The issue was trying to access prefillLead which isn't available here
          />
        </FormGroup>

        {/* Show Created By information in edit mode */}
        {isEditMode && createdBy && (
          <FormGroup title="Record Information" className="mt-4">
            <div className="col-span-2 md:col-span-1">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Created By
              </div>
              <UserCard user={createdBy} showEmail={false} />
            </div>
          </FormGroup>
        )}
      </FormSection>
    </>
  );
}

function LeadForm({ onSuccess, onClose }: FormCallbacks) {
  const { id: leadId } = useParams();
  const { formMode, isEditAction } = useFormMode();
  
  // Safety check: if leadId is invalid and we're in edit mode, show loading
  if (leadId && (leadId === '' || leadId === 'undefined' || leadId === 'null')) {
    return <Loader />;
  }

  const createLeadMutation = useCreateLead();
  const updateLeadMutation = useUpdateLeadOptimistic();

  const { data: lead, isLoading } = useLead(leadId);

  // Transform lead data to ensure assignedTo is in the correct format
  const prefillLead = useMemo(() => {
    // If loading, or no lead data, or in create mode, return empty object
    if (isLoading || !lead || formMode === ACTION.CREATE) return {};

    // Create a new object with the transformed data
    return {
      ...lead,
      // Convert assignedTo from object to string ID if needed
      // Use optional chaining to avoid errors if assignedTo is undefined
      assignedTo: lead.assignedTo?._id || lead.assignedTo || null,
    };
  }, [lead, isLoading, formMode]);

  const titleMode = isEditAction ? "Update" : "Create";

  const logDetails = {
    action: isEditAction ? ACTION.MODIFY : ACTION.CREATE,
    entityType: ENTITY.LEAD,
    oldData: lead
  };

  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: LeadFormValues) => {
      if (isEditAction) {
        return updateLeadMutation.mutateAsync({
          id: lead._id,
          ...data,
          email: data?.email?.toLowerCase(),
        });
      }
      return createLeadMutation.mutateAsync({
        data: {
          ...data,
          email: data?.email?.toLowerCase(),
        },
        params: {} // Leads use direct orgCode filtering
      });
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `${titleMode} Lead`,
        description: `Lead has been ${titleMode}d successfully`,
      });
      onSuccess();
    },
    onError: (err: unknown) => {
      console.log(err);
      const errorMessage =
        (err as AxiosError)?.response?.data?.message ||
        (err as Error)?.message ||
        `Failed to ${titleMode} lead`;

      toast({
        title: `${titleMode} Lead`,
        description: errorMessage,
      });
    },
  });

  const createLead = async (formValues: LeadFormValues) => {
    try {
      await mutateWithActivityLog(formValues);
    } catch (error) {
      console.error("Error in mutation:", error);
      throw error;
    }
  };

  return (
    <ReusableForm
      zodSchema={LeadFormSchema}
      defaultValues={defaultValues}
      prefillData={prefillLead} // This now contains the properly formatted data
      onSubmit={createLead}
      renderActions={(form) => (
        <FormActions>
          <CloseButton onClose={onClose} entity={ENTITY.LEAD} />
          <SubmitButton
            entity={ENTITY.LEAD}
            action={formMode}
            isLoading={isLoading || form.formState.isSubmitting}
          />
        </FormActions>
      )}
    >
      <LeadFormFields
        loading={isLoading}
        isEditMode={isEditAction}
        leadData={lead} // Pass the original lead data for display purposes
      />
    </ReusableForm>
  );
}

export default LeadForm;
