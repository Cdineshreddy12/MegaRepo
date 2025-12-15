import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps, CheckboxField as CheckboxFieldType } from '../types';
import { cn } from '@/lib/utils';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Checkbox field component using shadcn Form components
 */
export const CheckboxField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  disabled,
  className
}) => {
  const checkboxField = field as CheckboxFieldType;

  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn('flex flex-row items-start space-x-3 space-y-0', className)}>
          <FormControl>
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => {
                formField.onChange(checked);
                onChange(checked);
              }}
              disabled={disabled || field.disabled}
              required={field.required}
            />
          </FormControl>
          
          <div className="space-y-1 leading-none">
            <FormLabel className={cn(
              'text-sm font-medium cursor-pointer',
              field.required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}>
              {checkboxField.checkboxLabel || field.label}
            </FormLabel>
            
            {field.helpText && (
              <FormDescription>
                {field.helpText}
              </FormDescription>
            )}
          </div>
          
          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};
