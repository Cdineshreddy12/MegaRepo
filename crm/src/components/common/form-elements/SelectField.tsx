import React, { useState } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import Combobox from "./ComboBox";
import { Control, Path, FieldValues, PathValue } from "react-hook-form";
import { Input } from "@/components/ui/input";

export type DefaultOptionType = {
  label: string;
  value: string;
};

export interface SelectFieldProps<
  T extends FieldValues,
  OptionType extends DefaultOptionType = DefaultOptionType
> {
  control: Control<T>;
  name: Path<T>;
  options: OptionType[];
  helperText?: string;
  label?: React.ReactNode;
  getOptionLabel?: (option: OptionType) => string | React.ReactNode;
  getOptionValue?: (option: OptionType) => string;
  multi?: boolean;
  includeAllOption?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultValue?: PathValue<T, Path<T>> | undefined;
  required?: boolean;
  description?: string;
  type?: "text" | "select"; // added prop
}

function SelectField<
  T extends FieldValues,
  OptionType extends DefaultOptionType
>({
  control,
  name,
  options,
  helperText,
  label,
  getOptionLabel,
  getOptionValue,
  placeholder,
  multi = false,
  className,
  disabled = false,
  defaultValue,
  required,
  includeAllOption = false,
  description,
  type = "select",
}: SelectFieldProps<T, OptionType>) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      disabled={disabled}
      defaultValue={defaultValue}
      render={({ field }) => {
        const filteredOptions = options.filter((option) => {
          const label =
            typeof getOptionLabel === "function"
              ? getOptionLabel(option)
              : option.label;
              
          // Add safety check for label before calling toString()
          const labelStr = label !== undefined && label !== null 
            ? String(label) 
            : "";
            
          return labelStr
            .toLowerCase()
            .includes((inputValue || "").toLowerCase());
        });

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label} {required && <span style={{ color: "red" }}>*</span>}
              </FormLabel>
            )}
            <FormControl aria-disabled={disabled}>
              {type === "text" ? (
                <div className="relative">
                  <Input
                    placeholder={placeholder}
                    disabled={disabled}
                    value={inputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValue(val);
                      field.onChange(val); // allow any input
                      setShowDropdown(true);
                    }}
                    onFocus={() => {
                      if (inputValue) setShowDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowDropdown(false), 100);
                    }}
                    name={field.name}
                    ref={field.ref}
                  />
                  {showDropdown && inputValue && filteredOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-md max-h-60 overflow-y-auto">
                      {filteredOptions.map((option) => {
                        const label =
                          typeof getOptionLabel === "function"
                            ? getOptionLabel(option)
                            : option.label;
                            
                        // Add safety check when converting to string
                        const labelStr = label !== undefined && label !== null 
                          ? String(label) 
                          : "";
                            
                        return (
                          <div
                            key={option.value}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur before selection
                              setInputValue(labelStr);
                              field.onChange(labelStr);
                              setShowDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Combobox
                  {...field}
                  multi={multi}
                  includeAllOption={includeAllOption}
                  placeholder={placeholder}
                  options={options
                    ?.filter((option) => {
                      const val = typeof getOptionValue === "function"
                        ? getOptionValue(option)
                        : option.value;
                      // Filter out empty string values to prevent Select.Item error
                      return val !== "" && val !== null && val !== undefined;
                    })
                    .map((option) => ({
                      label:
                        typeof getOptionLabel === "function"
                          ? getOptionLabel(option)
                          : option.label,
                      value:
                        typeof getOptionValue === "function"
                          ? getOptionValue(option)
                          : option.value,
                    })) || []}
                />
              )}
            </FormControl>
            {helperText && <FormDescription>{helperText}</FormDescription>}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export default SelectField;