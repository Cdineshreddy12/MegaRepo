import SelectField, {
  DefaultOptionType,
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { FieldValues } from "react-hook-form";
import { useOpportunities } from "@/queries/OpportunityQueries";
import { Opportunity } from "@/services/api/opportunityService";

// Define SalesOrderSelectorProps to omit options from SelectFieldProps
export type OpportunitySelectorProps = Omit<SelectFieldProps<FieldValues>, "options">;

function OpportunitySelectorField(props: OpportunitySelectorProps) {
  // Fetch account data
  const { data: opportunitiesData, isPending: isOpportunitiesPending } = useOpportunities();

  // Ensure the account options are properly typed
  const opportunitiesOptions: DefaultOptionType[] =
    !isOpportunitiesPending && opportunitiesData
      ? opportunitiesData.map((opportunity: Opportunity) => ({
          value: opportunity._id ?? '', // Ensure value is a string
          label: opportunity.name,
        }))
      : []; // Empty array when data is pending

  return (
    <SelectField
      label="Opportunity"
      placeholder={props.placeholder || props.type === 'text'? 'Enter Opportunity name' : 'Select Opportunity'}
      {...props}
      options={opportunitiesOptions}
      
    />
  );
}

export default OpportunitySelectorField;