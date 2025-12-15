import React from 'react';
import { Switch } from '@/components/ui/switch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps, SwitchField as SwitchFieldType } from '../types';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Switch field component using shadcn Form components
 */
export const SwitchField: React.FC<FieldComponentProps> = ({
  field,
  disabled,

}) => {
  const switchField = field as SwitchFieldType;

  return (<FormField
    name={field.id}
    render={({ field: formField }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <FormLabel>{field.label || switchField.switchLabel}</FormLabel>
          <FormDescription>
            {field.helpText}
          </FormDescription>
        </div>
        <FormControl>
          <Switch
            checked={formField.value}
            onCheckedChange={formField.onChange}
            disabled={disabled || field.disabled}
            required={field.required}
          />
        </FormControl>
        <ConditionalErrorMessage fieldName={field.id} />
      </FormItem>
    )}
  />)

};
