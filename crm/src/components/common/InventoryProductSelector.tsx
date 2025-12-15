import SelectField, {
  DefaultOptionType,
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { FieldValues } from "react-hook-form";
import { Product } from "@/services/api/inventoryService";
import { useInventoryProducts } from "@/queries/InventoryProductQueries";

// Define AccountSelectorProps to omit options from SelectFieldProps
export type InventoryProductSelectorProps = Omit<
  SelectFieldProps<FieldValues>,
  "options"
>;

function InventoryProductSelectorField(props: InventoryProductSelectorProps) {
  // Fetch account data
  const { data: productsData, isPending: isAccountPending } =
    useInventoryProducts();

  // Ensure the account options are properly typed
  const productOptions: DefaultOptionType[] =
    !isAccountPending && productsData
      ? productsData
          ?.map((product: Product) => ({
            value: product._id as string,
            label: product.name,
          }))
      : []; // Empty array when data is pending

  return (
    <SelectField
      label="Account"
      placeholder={
        props.placeholder || props.type === "text"
          ? "Enter Account name"
          : "Select Account"
      }
      {...props}
      options={productOptions}
    />
  );
}

export default InventoryProductSelectorField;
