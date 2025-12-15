'use client'

import { Control, FieldValues, Path } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface SwitchFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  defaultValue?: boolean
  label?: string
  helperText?: string
  className?: string
  // current state label value will be used to display current state of switch
  currentStateLabel?: {
    ON: string
    OFF: string
  }
}
export default function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  helperText,
  currentStateLabel,
  ...restProps
}: SwitchFieldProps<T>) {
  const stateLabel = currentStateLabel || { ON: 'On', OFF: 'Off' }
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col  rounded-lg  p-3">
          <FormControl>
            <div className="flex gap-2 items-center">
              <div className="space-y-0.5">
                {label ? <FormLabel>{label}</FormLabel> : null}
              </div>

              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                {...restProps}
              />
              <FormLabel
                className={cn(
                  'font-light text-sm',
                  field.value === true ? 'text-info' : 'text-muted-foreground',
                )}
              >
                {field.value === true ? stateLabel.ON : stateLabel.OFF}
              </FormLabel>
            </div>
          </FormControl>
          {helperText ? <FormDescription>{helperText}</FormDescription> : null}
        </FormItem>
      )}
    />
  )
}
