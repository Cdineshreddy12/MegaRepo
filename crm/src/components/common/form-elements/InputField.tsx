import React from "react";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control, FieldValues, Path } from "react-hook-form";

interface InputFieldProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix"> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode
  hideRequiredFlag?:boolean
}

const InputField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = "text",
  required,
  prefix,
  suffix,
  hideRequiredFlag = false,
  ...props
}: InputFieldProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { onChange, ...field} }) => (
        <FormItem>
          {label ? (
            <FormLabel className="relative">
              {label}
              {required && !hideRequiredFlag && <span className="absolute -top-0.75 -right-1 text-destructive">*</span>}
            </FormLabel>
          ) : null}
          <FormControl>
            <div className="flex items-center relative">
              {prefix && (
                <span className="mr-2 opacity-60 absolute left-[.5em]">
                  {prefix}
                </span>
              )}
              <Input
                placeholder={placeholder}
                {...field}
                type={type}
                {...props}
                onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value): e.target.value)}
                className={`${prefix ? "pl-[2em]" : ""} ${suffix ? "pr-[2em]" : ""}`}
              />
              {suffix && (
                <span className="ml-2 opacity-60 absolute right-[.5em]">
                  {suffix}
                </span>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default InputField;
