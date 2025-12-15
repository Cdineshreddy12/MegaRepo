import { Control, Path, useFormContext } from "react-hook-form"
import { InputField } from "./form-elements"
// import { SelectOption } from '@/common/types'
import { FormLabel } from "@/components/ui/form"
// import { countryOptions as defaultCountryOptions} from "@/constants"
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";

interface AddressFormProps {
    parentPath: Path<Control>
    // countryOptions?: SelectOption[]
    required?: boolean
    label?: string
    className?: string
}

function AddressForm({ parentPath, required = false, label, className }: AddressFormProps) {
    const {control } = useFormContext()
  return (
    <div className={className}>
     {
      label ? (<FormLabel >
        {label}
        {required && <span className="text-destructive">*</span>}
      </FormLabel>)
     : null}
    <div className="space-y-4">
      <InputField
        label="Street Address"
        name={`${parentPath}.street`}
        control={control}
        required={required}
      />
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="City"
          name={`${parentPath}.city`}
          control={control}
          required={required}
        />
        <InputField
          label="State/Province"
          name={`${parentPath}.state`}
          control={control}
          required={required}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="ZIP/Postal Code"
          name={`${parentPath}.zipCode`}
          control={control}
          required={required}
        />
        <SysConfigDropdownField
          label="Country"
          name={`${parentPath}.country`}
          placeholder="Select Country"
          control={control}
          category="countries"
          // options={countryOptions || defaultCountryOptions }
          required={required}
        />
      </div>
    </div>
    </div>
  )
}

export default AddressForm