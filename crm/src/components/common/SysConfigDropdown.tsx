import React from "react";
import SelectField, { SelectFieldProps } from "@/components/common/form-elements/SelectField";
import { useDropdownOptionsByCategory } from "@/queries/DropdownQueries";
import { DropdownType } from "@/types/common";
import { FieldValues } from "react-hook-form";

export type SysConfigDropdownProps = Omit<SelectFieldProps<FieldValues>, "options"> & { category: DropdownType  };

function SysConfigDropdownField({category, ...restProps}: SysConfigDropdownProps) {
  const {data, isError, isPending, error} = useDropdownOptionsByCategory(category)
  
  // Debug logging
  if (isError) {
    console.error(`❌ Error fetching dropdown options for category "${category}":`, error);
  }
  
  // Handle different data formats and ensure we have an array
  const optionsData = React.useMemo(() => {
    if (isPending || isError || !data) {
      return [];
    }
    
    // Handle array of options
    if (Array.isArray(data)) {
      return data
        .filter(option => option && (option.isActive === undefined || option.isActive === true))
        .map(option => ({
          value: String(option.value || option._id || option.id || ''),
          label: String(option.label || option.value || option.name || '')
        }))
        .filter(option => option.value && option.value !== '');
    }
    
    // Handle object with options array
    if (data && typeof data === 'object' && Array.isArray(data.options)) {
      return data.options
        .filter(option => option && (option.isActive === undefined || option.isActive === true))
        .map(option => ({
          value: String(option.value || option._id || option.id || ''),
          label: String(option.label || option.value || option.name || '')
        }))
        .filter(option => option.value && option.value !== '');
    }
    
    return [];
  }, [data, isPending, isError]);
  
  return (
    <SelectField
      {...restProps}
      options={optionsData}
      getOptionLabel={(option) => option.label}
      getOptionValue={(option) => option.value}
    />
  );
}

export default SysConfigDropdownField;
