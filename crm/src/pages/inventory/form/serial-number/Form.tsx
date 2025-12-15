import { useFormContext } from "react-hook-form";
import {
  DatePickerField,
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
import {
  useCreateInventorySerialNumber,
  useInventorySerialNumber,
  useSuspenseInventorySerialNumber,
  useUpdateInventorySerialNumber,
} from "@/queries/InventorySerialNumberQueries";
import { InventorySerialNumberFormValues } from "@/services/api/inventoryService";
import { SerialNumberSchema } from "../../zodSchema";
import { serialNumberDefaultValues } from "../../testData";
import InventoryProductSelectorField from "@/components/common/InventoryProductSelector";
import AccountSelectorField from "@/components/common/AccountSelector";
import useFormMode from "@/hooks/useFormMode";
import { object } from "zod";

function InventorySerialNumberFields() {
  const { control } = useFormContext();

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
      <FormSection title="Serial Number Details">
        <FormGroup>
          <InputField
            control={control}
            name="serialNumber"
            label="Serial Number"
            required
          />
          <SelectField
            control={control}
            name="status"
            label="Status"
            options={[
              { value: "available", label: "Available" },
              { value: "sold", label: "Sold" },
              { value: "damaged", label: "Damaged" },
            ]}
            required
          />
        </FormGroup>
        <FormGroup>
          <AccountSelectorField
            control={control}
            name="customer"
            label="Customer"
            placeholder="Select Customer"
            required
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Warranty Details">
        <FormGroup>
          <DatePickerField
            control={control}
            name="warrantyStart"
            label="Warranty Start Date"
            required
          />
          <DatePickerField
            control={control}
            name="warrantyEnd"
            label="Warranty End Date"
            required
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Pricing">
        <FormGroup>
          <InputField
            control={control}
            name="price"
            label="Price"
            type="number"
            required
          />
        </FormGroup>
      </FormSection>
    </>
  );
}

function InventorySerialNumberForm({ onClose, onSuccess }: FormCallbacks) {
  const { id: serialNumberId } = useParams();
  const { formMode } = useFormMode();
  const { data: serialNumber, isPending } = useInventorySerialNumber(serialNumberId)

  const prefillData = formMode === ACTION.MODIFY && !isPending ? {
    ...serialNumber,
    productId: serialNumber?.productId?._id || serialNumber?.productId,
    customer: serialNumber?.customer?._id || serialNumber?.customer,
  } : undefined;
  const createSerialNumberMutation = useCreateInventorySerialNumber();
  const updateSerialNumberMutation = useUpdateInventorySerialNumber();

  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: InventorySerialNumberFormValues) => {
      if (formMode === ACTION.MODIFY && serialNumberId) {
        return updateSerialNumberMutation.mutateAsync({
          id: serialNumberId,
          ...data,
        });
      }
      return createSerialNumberMutation.mutateAsync({
        data: data,
        params: {} // Serial numbers don't use org-based filtering
      });
    },
    logDetails: {
      entityType: ENTITY.SERIAL_NUMBER,
      action: formMode as ActionType,
    },
    onSuccess: () => {
      toast({
        title: `${formMode === ACTION.MODIFY ? "Update" : "Create"} Product`,
        description: `Product has been ${
          formMode === ACTION.MODIFY ? "updated" : "created"
        } successfully`,
      });
      onSuccess?.();
    },
    onError: (err) => {
      console.error("Error in mutation:", err);
      toast({
        title: `${formMode === ACTION.MODIFY ? "Update" : "Create"} Product`,
        description: "Failed to submit product data",
      });
    },
  });

  // Added validation for ObjectId conversion
  const onSubmit = async (formValues: InventorySerialNumberFormValues) => {
    try {
      await mutateWithActivityLog({
        ...formValues,
        productId: formValues.productId?._id || formValues.productId,
        customer: formValues.customer?._id || formValues.customer,
        id: serialNumberId, // Ensure id is included for updates
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Submission Error",
        description: error.message,
      });
    }
  };

  return (
    <ReusableForm<InventorySerialNumberFormValues>
      zodSchema={SerialNumberSchema}
      defaultValues={serialNumberDefaultValues}
      prefillData={formMode === ACTION.MODIFY ? prefillData : undefined}
      onSubmit={onSubmit}
      renderActions={(form) => (
        <FormActions>
          <CloseButton onClose={onClose} entity={ENTITY.SERIAL_NUMBER} />
          <SubmitButton
            entity={ENTITY.SERIAL_NUMBER}
            loading={form.formState.isSubmitting}
          />
        </FormActions>
      )}
    >
      <InventorySerialNumberFields />
    </ReusableForm>
  );
}

export default InventorySerialNumberForm;
