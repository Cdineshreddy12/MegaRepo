import { useFormContext } from "react-hook-form";
import {
  FormActions,
  FormGroup,
  FormSection,
  InputField,
  SelectField,
} from "@/components/common/form-elements";

import { toast } from "@/hooks/useToast";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { ACTION, ENTITY } from "@/constants";
import { useParams } from "react-router-dom";
import ReusableForm from "@/components/common/form-elements/ReusableForm";
import CloseButton from "@/components/common/CloseButton";
import SubmitButton from "@/components/common/SubmitButton";
import { ActionType, FormCallbacks } from "@/types/common";
import { useCreateInventoryMovement, useInventoryMovement, useUpdateInventoryMovement } from "@/queries/InventoryMovementQueries";
import { InventoryMovementFormValues } from "@/services/api/inventoryService";
import { movementDefaultValues } from "../../testData";
import { MovementSchema } from "../../zodSchema";
import InventoryProductSelectorField from "@/components/common/InventoryProductSelector";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import useFormMode from "@/hooks/useFormMode";

function InventoryMovementFormFields() {
  const { control, formState } = useFormContext();

  console.log("Inventory Movement Form Errors:", formState.errors);
  return (
    <>
      <FormSection title="Product Information">
        <FormGroup>
          <InventoryProductSelectorField
            control={control}
            name="productId"
            label="Product ID"
            placeholder="Select Product"
            required
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Movement Details">
        <FormGroup>
          <SelectField
            control={control}
            name="type"
            label="Movement Type"
            options={[
              { value: "inbound", label: "Inbound" },
              { value: "outbound", label: "Outbound" },
              { value: "transfer", label: "Transfer" },
              { value: "adjustment", label: "Adjustment" },
            ]}
            required
          />
          <InputField
            control={control}
            name="quantity"
            label="Quantity"
            type="number"
            required
          />
        </FormGroup>
        <FormGroup>
          <SysConfigDropdownField
            control={control}
            name="fromLocation"
            label="From Location"
            category="warehouse_names"
            placeholder="Select From Location"
            required
          />
          <SysConfigDropdownField
            control={control}
            name="toLocation"
            label="To Location"
            category="warehouse_names"
            placeholder="Select To Location"
            required
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Additional Details">
        <FormGroup>
          <InputField
            control={control}
            name="reference"
            label="Reference"
            type="text"
          />
          <InputField
            control={control}
            name="notes"
            label="Notes"
            type="text"
          />
        </FormGroup>
      </FormSection>

    </>
  );
}

function InventoryMovementForm({ onClose, onSuccess }: FormCallbacks) {
  const { id: movementId } = useParams();
  const { formMode } = useFormMode()
  const { data: movement, isPending } = useInventoryMovement(movementId);
  const prefillData = formMode === ACTION.MODIFY && !isPending && movement ? {
    ...movement,
    productId: movement.productId?._id || movement.productId, // Ensure productId is set correctly
  } : undefined;
  const logDetails = {
    action: formMode as ActionType,
    entityType: ENTITY.MOVEMENT,
  };

  const recordMovementMutation = useCreateInventoryMovement();
  const updateMovementMutation = useUpdateInventoryMovement();

  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: InventoryMovementFormValues) => {
      if (formMode === ACTION.MODIFY && movementId) {
        return updateMovementMutation.mutateAsync({
          id: movementId,
          ...data,
        });
      }
      return recordMovementMutation.mutateAsync({
        data: data,
        params: {} // Movements don't use org-based filtering
      });
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `${formMode === ACTION.MODIFY ? "Update" : "Create"} Product`,
        description: `Product movement has been ${
          formMode === ACTION.MODIFY ? "updated" : "created"
        } successfully`,
      });
      onSuccess?.();
    },
    onError: (err) => {
      console.error("Error in mutation:", err);
      toast({
        title: `${formMode === ACTION.MODIFY ? "Update" : "Create"} Product movement`,
        description: err.message
      });
    },
  });

  const onSubmit = async (formValues: InventoryMovementFormValues) => {
    try {
      await mutateWithActivityLog({
        ...formValues,
        id: movementId || '',
      });
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };

  return (
    <ReusableForm<InventoryMovementFormValues>
      defaultValues={movementDefaultValues}
      zodSchema={MovementSchema}
      prefillData={formMode === ACTION.MODIFY ? prefillData : undefined}
      onSubmit={onSubmit}
      renderActions={(form) => (
        <FormActions>
          <CloseButton onClose={onClose} entity={ENTITY.MOVEMENT} />
          <SubmitButton
            entity={ENTITY.MOVEMENT}
            loading={form.formState.isSubmitting}
          />
        </FormActions>
      )}
    >
      <InventoryMovementFormFields />
    </ReusableForm>
  );
}

export default InventoryMovementForm;

