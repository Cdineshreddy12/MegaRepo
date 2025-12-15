import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Control, Path, FieldValues, PathValue } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    label?: string;
    helperText?: string;
    defaultValue?: boolean;
}
function CheckboxField<T extends FieldValues>({
    control,
    name,
    label,
    helperText,
    defaultValue,
    ...restProps
}: CheckboxFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            defaultValue={defaultValue as PathValue<T, Path<T>>}
            render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md p-1 w-full">
                    <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} {...restProps} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        {
                            label ? <FormLabel>{label}</FormLabel> : null
                        }
                        {
                            helperText ? <FormDescription>{helperText}</FormDescription> : null
                        }
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default CheckboxField;