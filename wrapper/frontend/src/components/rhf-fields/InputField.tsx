import { FieldValues, Path, Control } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { Input } from '../ui'
import { cn } from '@/lib/utils'

interface InputFieldProps<T extends FieldValues> extends Omit<React.ComponentProps<'input'>, 'name' | 'value' | 'onChange' | 'onBlur'> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  description?: string
}

export function InputField<T extends FieldValues>(props: InputFieldProps<T>) {
  const { name, control, label = "Field", placeholder, description, required, className, ...inputProps } = props
  
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className={cn(className)}>
            {label && (
                <FormLabel>{label} {required ? <span className="text-destructive">*</span> : null}</FormLabel>
            )}
          <FormControl>
            <Input placeholder={placeholder} {...field} {...inputProps} />
          </FormControl>
          {description && (
            <FormDescription>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

