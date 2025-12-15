import AccountSelectorField from "@/components/common/AccountSelector";
import AssigneeSelectorField from "@/components/common/AssigneeSelector";
import CloseButton from "@/components/common/CloseButton";
import ContactSelectorField from "@/components/common/ContactSelector";
import {
  FormSection,
  FormGroup,
  InputField,
  SelectField,
  TextAreaField,
  ReusableForm,
  FormActions,
} from "@/components/common/form-elements";
import SubmitButton from "@/components/common/SubmitButton";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import { ACTION, ENTITY } from "@/constants";
import useFormMode from "@/hooks/useFormMode";
import {
  useCreateTicket,
  useUpdateTicketOptimistic,
  useTicket,
} from "@/queries/TicketQueries";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";
import { toast } from "@/hooks/useToast";
import {
  typeOptions,
  typeOfSupportOptions,
  supportLevelOptions,
  statusOptions,
} from "../constants";
import { ticketsFormDefaultValues } from "../data";
import TicketsFormSchema from "../zodSchema";
import { FormCallbacks } from "@/types/common";
import { TicketsFormValues } from "../types";
import UserCard from "@/components/common/UserCard";
import { User } from "@/services/api/userService";



function TicketsFormFields({ isEditMode, ticketCreator }: {
  isEditMode: boolean
  ticketCreator: User
}) {
  const { control, watch } = useFormContext();

  const selectedAccountId = watch("accountId");

  return (
    <>
      {/* **Account & Assignment Details** */}
      <FormSection title="Account & Assignment Details">
        <FormGroup>
          <AccountSelectorField
            label="Account"
            name="accountId"
            control={control}
            required
          />
          <SysConfigDropdownField
            label="OEM"
            name="oem"
            control={control}
            category="oem_vendors"
            placeholder="Select OEM"
            required
          />
        </FormGroup>

        <FormGroup>
          <AssigneeSelectorField
            name="assignedTo"
            control={control}
            label="Assign To"
            placeholder="Select Assignee"
            required
          />
          <ContactSelectorField
            label="Region Owner"
            name="regionOwner"
            control={control}
            filter={(contact) => {
              // @ts-expect-error mongo id
              return contact?.accountId?._id === selectedAccountId;
            }}
          />
          <SysConfigDropdownField
            name="zone"
            control={control}
            required
            placeholder="Select Zone"
            category="zones"
            label="Zone"
          />
        </FormGroup>

        {/* Display Created By in edit mode if available */}
        {isEditMode && ticketCreator && (
          <FormGroup>
                <UserCard user={ticketCreator} label="Created By"/>
          </FormGroup>
        )}
      </FormSection>

      {/* **Product & Sales Information** */}
      <FormSection title="Product & Sales Information">
        <FormGroup>
          <InputField
            label="Product name"
            name="productName"
            control={control}
            placeholder="Enter the product name"
            required
          />
          <SelectField
            label="Type"
            name="type"
            placeholder="Select type"
            control={control}
            options={typeOptions}
            required
          />
        </FormGroup>
        <TextAreaField
          control={control}
          name="salesDescription"
          label="Sales Description"
          placeholder="Add any additional sales info"
        />
      </FormSection>

      {/* Effort & Technical Details */}
      <FormSection title="Effort & Technical Details">
        <FormGroup>
          <InputField
            label="Effort Estimated Man Days"
            name="effortEstimatedManDays"
            type="number"
            control={control}
          />
          <TextAreaField
            control={control}
            name="technicalTeamDescription"
            label="Technical Team Description"
            placeholder="Notes for the technical team"
          />
        </FormGroup>
      </FormSection>

      {/* **Support Information ** */}
      <FormSection title="Support Information">
        <FormGroup>
          <SelectField
            label="Support Type"
            name="typeOfSupport"
            control={control}
            placeholder="Select Support type"
            options={typeOfSupportOptions}
            required
          />
          <SelectField
            label="Support Level"
            name="supportLevel"
            control={control}
            placeholder="Select Support Level"
            options={supportLevelOptions}
            required
          />
          <SelectField
            label="Status"
            name="status"
            control={control}
            placeholder="Select status"
            options={statusOptions}
          />
        </FormGroup>
      </FormSection>
    </>
  );
}

function TicketSForm({ onSuccess, onClose }: FormCallbacks) {
  const { ticketId } = useParams();
  
  // Safety check: if ticketId is invalid and we're in edit mode, show loading
  if (ticketId && (ticketId === '' || ticketId === 'undefined' || ticketId === 'null')) {
    return <Loader />;
  }

  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicketOptimistic();

  const { formMode, isEditAction } = useFormMode();
  const { data: ticket, isLoading } = useTicket(ticketId);

  const prefillTicketData =
    isLoading || formMode === ACTION.CREATE ? {} : {
      ...ticket,
      // @ts-expect-error mongo id
      accountId: ticket?.accountId?._id,
      // @ts-expect-error mongo id
      assignedTo: ticket?.assignedTo?._id,
      
    };
  const mutationFn =
    formMode === ACTION.MODIFY ? updateTicketMutation : createTicketMutation;
  const titleMode = formMode === ACTION.MODIFY ? "Edit" : "Create";
  const isEditMode = formMode === ACTION.MODIFY;

  // Extract creator data for display
  const ticketCreator = ticket?.createdBy as User;

  // update log action
  const handleMutation = async (data: TicketsFormValues) => {
    if (isEditAction) {
      return mutationFn.mutateAsync({
        id: ticket._id,
        ...data,
        regionOwner: data.regionOwner ?? undefined,
      });
    }

    const { id, ...restData } = data;
    const payload = {
      ...restData,
      regionOwner: data.regionOwner ?? undefined,
    };
    return mutationFn.mutateAsync({
      data: payload,
      params: {} // Tickets use hierarchical filtering through accounts
    });
  };

  const createTicket = async (data: TicketsFormValues) => {
    try {
      await handleMutation(data);
      toast({
        title: `${titleMode} Ticket`,
        description: `Ticket has been ${titleMode}d successfully`,
      });
      onSuccess();
    } catch (error) {
      console.log(error);
      toast({
        title: `${titleMode} Ticket`,
        description: `An error occurred while ${titleMode}ing the ticket`,
      });
    }
  };

  return (
    <ReusableForm
      zodSchema={TicketsFormSchema}
      defaultValues={ticketsFormDefaultValues}
      prefillData={prefillTicketData}
      onSubmit={createTicket}
      renderActions={() => {
        return (
          <FormActions>
            <CloseButton onClose={onClose} entity={ENTITY.TICKET} />
            <SubmitButton entity={ENTITY.TICKET} />
          </FormActions>
        );
      }}
    >
      <TicketsFormFields
        isEditMode={isEditMode}
        ticketCreator={ticketCreator}
      />
    </ReusableForm>
  );
}

export default TicketSForm;
