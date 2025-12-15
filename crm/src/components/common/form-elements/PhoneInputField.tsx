import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Control, FieldValues, Path } from "react-hook-form";
import { PhoneInput, PhoneInputProps } from "@/components/common/phone-input";

interface PhoneInputFieldProps<T extends FieldValues>
  extends PhoneInputProps {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
  hideRequiredFlag?:boolean;
}

const PhoneInputField = <T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  hideRequiredFlag = false,
  ...restProps
}: PhoneInputFieldProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? (
            <FormLabel className="relative">
              {label}
              {required && !hideRequiredFlag && <span className="absolute -top-0.75 -right-1 text-destructive">*</span>}
            </FormLabel>
          ) : null}
          <FormControl>
              <PhoneInput
                {...field}
                {...restProps}
              />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default PhoneInputField;
