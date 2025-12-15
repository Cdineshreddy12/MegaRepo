import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Control, Path, FieldValues } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';

interface TextAreaFieldProps<T extends FieldValues> extends React.InputHTMLAttributes<HTMLTextAreaElement>{
    control: Control<T>;
    name: Path<T>;
    label?: string;
    helperText?: string;
    placeholder?: string;
    defaultValue?: string | number;
    valueAsNumber?: boolean; // Allows number parsing even for text input
    className?: string;
}

function TextAreaField<T extends FieldValues>({
    control,
    name,
    label,
    helperText,
    className,
    ...restProps
}: TextAreaFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    {label ? <FormLabel>{label}</FormLabel> : null}
                    <FormControl>
                        <Textarea {...field} {...restProps} />
                    </FormControl>
                    {helperText ? <FormDescription>{helperText}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default TextAreaField;
