import SelectField, {
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { useUsers } from "@/queries/UserQueries";
import { FieldValues } from "react-hook-form";
import { useOrgStore } from "@/store/org-store";

export type AssigneeSelectorProps = Omit<SelectFieldProps<FieldValues>, "options">;

function AssigneeSelectorField(props: AssigneeSelectorProps) {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const {data, isError, isPending} = useUsers(selectedOrg || undefined)
  const users = isPending || isError || !data ? [] : data
  const userOptions = users?.map(user => ({
    // @ts-expect-error mongodb id
    value: user.id || user._id,
    label: `${user.firstName} ${user.lastName}`
  }))
  return (
    <SelectField
      {...props}
      options={userOptions}
      label="Assignee"
      placeholder="Select Assignee"
      getOptionLabel={(option) => option.label}
      getOptionValue={(option) => option.value}
    />
  );
}

export default AssigneeSelectorField;
