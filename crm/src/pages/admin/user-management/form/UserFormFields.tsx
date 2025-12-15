import { useFormContext } from "react-hook-form";
import {
  FormSection,
  FormGroup,
  InputField,
  SelectField,  // Import SelectField instead of relying on SysConfigDropdownField
} from "@/components/common/form-elements";
import PhoneInputField from "@/components/common/form-elements/PhoneInputField";
import SwitchField from "@/components/common/form-elements/SwitchField";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";

function UserFormFields() {
  const { control } = useFormContext();

  // Define role options directly in the component to ensure they're always available
  const roleOptions = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "super_admin", label: "Super Admin" }
  ];

  return (
    <FormSection title="Employee Details">
      <FormGroup>
        <InputField
          control={control}
          name="firstName"
          label="First Name"
          required
        />
        <InputField
          control={control}
          name="lastName"
          label="Last Name"
        />
        <InputField
          control={control}
          name="employeeCode"
          label="Employee Code"
          required
        />
        <PhoneInputField
          control={control}
          name="contactMobile"
          label="Contact Mobile"
          defaultCountry="IN"
          required
        />
      </FormGroup>
      <FormGroup>
        <InputField
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
          required
        />
        <InputField
          control={control}
          name="password"
          label="Password"
          type="password"
          autoComplete="off"
          required
        />
        {/* Use SelectField instead of SysConfigDropdownField for roles */}
        <SelectField
          control={control}
          name="role"
          label="Role"
          options={roleOptions}
          placeholder="Select Role"
          defaultValue="user"
          required
        />
      </FormGroup>
      <FormGroup>
        <SysConfigDropdownField
          control={control}
          name="designation"
          label="Designation"
          category="designation"
          placeholder="Select Designation"
          required
        />
        <SysConfigDropdownField 
          control={control} 
          name="zone" 
          label="Zone" 
          category="zones" 
          includeAllOption 
          placeholder="Select Zone"
          multi
        />
        <SwitchField 
          control={control} 
          name="isActive" 
          label="Is Active" 
          currentStateLabel={{
            ON: "Active",
            OFF: "Inactive"
          }}
        />    
      </FormGroup>
    </FormSection>
  );
}

export default UserFormFields;