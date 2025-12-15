import { useFormContext } from "react-hook-form";
import {
  FormActions,
  FormGroup,
  FormSection,
  InputField,
  SelectField,
  TextAreaField,
} from "@/components/common/form-elements";

import { toast } from "@/hooks/useToast";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { ACTION, ENTITY } from "@/constants";
import { useParams } from "react-router-dom";
import ReusableForm from "@/components/common/form-elements/ReusableForm";
import CloseButton from "@/components/common/CloseButton";
import SubmitButton from "@/components/common/SubmitButton";
import { FormCallbacks } from "@/types/common";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import { useCreateInventoryProduct, useInventoryProduct, useUpdateInventoryProduct } from "@/queries/InventoryProductQueries";
import { ProductFormValues, ProductSchema } from "../../zodSchema";
import { productDefaultValues } from "../../testData";
import { useSuspenseProductOrder } from "@/queries/ProductOrderQueries";
import useFormMode from "@/hooks/useFormMode";

function InventoryProductFields() {
  const { control, formState } = useFormContext();

  console.log("Inventory", formState.errors);
  return (
    <>
      <FormSection title="Basic Information">
        <FormGroup>
          <InputField control={control} name="name" label="Name" required />
          <InputField control={control} name="sku" label="SKU" required />
        </FormGroup>
        <FormGroup>
          <SysConfigDropdownField
            control={control}
            name="category"
            label="Category"
            category="product_categories"
            placeholder="Select Product Category"
            required
          />
          <InputField control={control} name="brand" label="Brand" required />
        </FormGroup>
      </FormSection>

      <FormSection title="Pricing">
        <FormGroup>
          <InputField
            control={control}
            name="basePrice"
            label="Base Price"
            type="number"
            required
          />
          <InputField
            control={control}
            name="sellingPrice"
            label="Selling Price"
            type="number"
            required
          />
        </FormGroup>
        <FormGroup>
          <InputField
            control={control}
            name="taxRate"
            label="Tax Rate (%)"
            type="number"
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Stock and Location">
        <FormGroup>
          <InputField
            control={control}
            name="quantity"
            label="Quantity"
            type="number"
            required
          />
           <InputField
            control={control}
            name="stockLevel"
            label="Stock Level"
            type="number"
          />
          <InputField
            control={control}
            name="minStockLevel"
            label="Minimum Stock Level"
            type="number"
          />
        </FormGroup>
        <FormGroup>
          <SysConfigDropdownField category="warehouse_names" control={control} name="location" label="Warehouse" placeholder="Select Warehouse" required />
          <SelectField
            control={control}
            name="status"
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            required
          />
        </FormGroup>
      </FormSection>

      <FormSection title="Additional Information">
        <FormGroup>
          <InputField
            control={control}
            name="warrantyPeriod"
            label="Warranty Period (Months)"
            type="number"
          />
        </FormGroup>
        <FormGroup>
          <TextAreaField
            control={control}
            name="description"
            label="Description"
          />
          <TextAreaField
            control={control}
            name="specifications"
            label="Specifications"
          />
        </FormGroup>
      </FormSection>
    </>
  );
}

function InventoryProductForm({ onClose, onSuccess }: FormCallbacks) {
  const { id: inventoryId } = useParams();
  const { data: inventory, isPending} = useInventoryProduct(inventoryId)
  const { formMode } = useFormMode()
  const prefillData = formMode === 'MODIFY' && !isPending ? inventory : undefined;

  const logDetails = {
    action: formMode,
    entityType: ENTITY.INVENTORY,
  };

  const createInventoryProductMutation = useCreateInventoryProduct();
  const updateInventoryProductMutation = useUpdateInventoryProduct();

  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: ProductFormValues) => {
      if (formMode === ACTION.MODIFY && inventoryId) {
        return updateInventoryProductMutation.mutateAsync({
          id: inventoryId,
          ...data,
        });
      }
      return createInventoryProductMutation.mutateAsync({
        data: data,
        params: {} // Products don't use org-based filtering
      });
    },
    logDetails,
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

  const onSubmit = async (formValues: ProductFormValues) => {
    try {
      await mutateWithActivityLog(formValues);
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };

  return (
    <ReusableForm<ProductFormValues>
      zodSchema={ProductSchema}
      defaultValues={productDefaultValues} // Adjusted to match expected type
      prefillData={formMode === ACTION.MODIFY ? prefillData : undefined}
      onSubmit={(formValues) => onSubmit(formValues)}
      renderActions={(form) => (
        <FormActions>
          <CloseButton onClose={onClose} entity={ENTITY.INVENTORY} />
          <SubmitButton
            entity={ENTITY.INVENTORY}
            loading={form.formState.isSubmitting}
          />
        </FormActions>
      )}
    >
      <InventoryProductFields />
    </ReusableForm>
  );
}

export default InventoryProductForm;
