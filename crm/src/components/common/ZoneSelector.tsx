import React from "react";
import SelectField, {
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { zoneOptions } from "@/constants";

export type ZoneSelectorProps = Omit<SelectFieldProps<any, any>, "options">;

function ZoneSelectorField(props: ZoneSelectorProps) {
  return (
    <SelectField
      {...props}
      control={props.control}
      name={props.name}
      options={zoneOptions}
      label="Zone"
      placeholder="Select Zone"
      getOptionLabel={(option) => option.label}
      getOptionValue={(option) => option.value}
    />
  );
}

export default ZoneSelectorField;
