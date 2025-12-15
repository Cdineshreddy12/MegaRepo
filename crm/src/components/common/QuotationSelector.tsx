import SelectField, {
  DefaultOptionType,
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { useQuotations } from "@/queries/QuotationQueries";
import { Quotation } from "@/services/api/quotationService";
import { FieldValues } from "react-hook-form";

// Define SalesOrderSelectorProps to omit options from SelectFieldProps
export type QuotationSelectorProps = Omit<SelectFieldProps<FieldValues>, "options">;

function QuotationSelectorField(props: QuotationSelectorProps) {
  // Fetch account data
  const { data: quotationData, isPending: isQuotationsPending } = useQuotations();

  // Ensure the account options are properly typed
  const opportunitiesOptions: DefaultOptionType[] =
    !isQuotationsPending && quotationData
      ? quotationData.map((opportunity: Quotation) => ({
          value: opportunity._id ?? '', // Ensure value is a string
          label: opportunity.quotationNumber,
        }))
      : []; // Empty array when data is pending

  return (
    <SelectField
      label="Quotation"
      placeholder={props.placeholder || props.type === 'text'? 'Enter Quotation name' : 'Select Quotation'}
      {...props}
      options={opportunitiesOptions}
      
    />
  );
}

export default QuotationSelectorField;