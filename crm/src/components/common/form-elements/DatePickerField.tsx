import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Control, FieldValues, Path } from "react-hook-form";
import { DatePicker } from "@/components/common/DatePicker";

// TODO: pass datePicker option to calendar
interface DatePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  helperText?: string;
  datePickerOptions?: Record<string, unknown>;
  required?: boolean;
}
function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  helperText,
  required,
}: DatePickerFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? (
            <FormLabel>
             {label} {required && <span style={{ color: "red" }}>*</span>}
            </FormLabel>
          ) : null}
          <FormControl>
            <DatePicker field={field} />
          </FormControl>
          {helperText ? <FormDescription>{helperText}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default DatePickerField;
