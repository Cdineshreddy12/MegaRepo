import SelectField, {
  DefaultOptionType,
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { useOrgAccounts } from "@/hooks/useOrgAwareQueries";
import { Account } from "@/services/api/accountService";
import { FieldValues, useWatch } from "react-hook-form";
import { useMemo } from "react";

// Define AccountSelectorProps to omit options from SelectFieldProps
export type AccountSelectorProps = Omit<SelectFieldProps<FieldValues>, "options">;

function AccountSelectorField(props: AccountSelectorProps) {
  // Fetch account data
  const { data: accountsData, isPending: isAccountPending } = useOrgAccounts();

  // Watch the current value of the field
  const currentValue = useWatch({
    control: props.control,
    name: props.name,
  });
  const normalizedCurrentValue =
    typeof currentValue === 'object' && currentValue !== null
      ? (currentValue as any)._id || (currentValue as any).id || (currentValue as any).value || ''
      : currentValue;

  // Compute account options using useMemo to avoid state mutations during render
  const accountOptions = useMemo(() => {
    // Base options from accounts data
    const baseOptions: DefaultOptionType[] =
      !isAccountPending && accountsData
        ? accountsData.map((account: Account) => ({
            value: (account as any)._id || (account as any).id,
            label: account.companyName,
          }))
        : [];

    // If we have a current value (pre-selected account) but it's not in options,
    // we need to add it temporarily to show the selected account
    // This handles the case where a contact is associated with an account
    // that might not be in the user's current accessible accounts list
    if (normalizedCurrentValue && !baseOptions.some(option => option.value === normalizedCurrentValue)) {
      // Find the account in the data if it exists but wasn't mapped to options
      const accountInData = accountsData?.find(account =>
        (account as any)._id === normalizedCurrentValue || (account as any).id === normalizedCurrentValue
      );
      if (accountInData) {
        return [
          { value: (accountInData as any)._id || (accountInData as any).id, label: accountInData.companyName },
          ...baseOptions
        ];
      } else {
        // Account not found in data, add placeholder
        return [
          { value: normalizedCurrentValue, label: 'Account not accessible' },
          ...baseOptions
        ];
      }
    }

    return baseOptions;
  }, [accountsData, isAccountPending, normalizedCurrentValue]);

  return (
    <SelectField
      {...props}
      options={accountOptions}
      label="Account"
      placeholder={props.placeholder || props.type === 'text'? 'Enter Account name' : 'Select Account'}
    />
  );
}

export default AccountSelectorField;