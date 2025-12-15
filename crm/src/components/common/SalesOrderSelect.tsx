import SelectField, {
  DefaultOptionType,
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { FieldValues } from "react-hook-form";
import { useSalesOrders } from "@/queries/SalesOrderQueries";
import { SalesOrder } from "@/services/api/salesOrderService";

// Define SalesOrderSelectorProps to omit options from SelectFieldProps
export type SalesOrderSelectorProps = Omit<SelectFieldProps<FieldValues>, "options">;

function SalesOrderSelectorField(props: SalesOrderSelectorProps) {
  // Fetch account data
  const { data: salesOrderData, isPending: isSalesOrderPending } = useSalesOrders();

  // Ensure the account options are properly typed
  const salesOrderOptions: DefaultOptionType[] =
    !isSalesOrderPending && salesOrderData
      ? salesOrderData.map((salesOrder: SalesOrder) => ({
          value: salesOrder?._id ?? '', // Ensure value is a string
          label: salesOrder.orderNumber,
        }))
      : []; // Empty array when data is pending

  return (
    <SelectField
      label="Sales Order"
      placeholder={props.placeholder || props.type === 'text'? 'Enter Sales Order' : 'Select Sales Order'}
      {...props}
      options={salesOrderOptions}
      
    />
  );
}

export default SalesOrderSelectorField;