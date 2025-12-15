import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import DatePickerWithRange from '@/components/common/DateRangePicker';
import { Control, FieldValues, Path } from 'react-hook-form';

// TODO: pass datePicker option to calendar
interface DateRangePickerFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    label?: string;
    helperText?: string;
    datePickerOptions?: Record<string, unknown>;
}
function DateRangePickerField<T extends FieldValues>({
    control,
    name,
    label,
    helperText,
}: DateRangePickerFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    {
                        label ? <FormLabel>{label}</FormLabel> : null
                    }
                    <FormControl>
                        <DatePickerWithRange field={field} />
                    </FormControl>
                    {
                        helperText ? <FormDescription>{helperText}</FormDescription> : null
                    }
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default DateRangePickerField;