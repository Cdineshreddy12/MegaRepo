import React from 'react';
import { Input } from '@/components/ui/input';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps } from '../types';
import { cn } from '@/lib/utils';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Date input field component using shadcn Form components
 */
export const DateField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  className
}) => {
  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn(className)}>
          <FormLabel className={cn(
            field.required && "after:content-['*'] after:ml-0.5 after:text-destructive"
          )}>
            {field.label}
          </FormLabel>
          
          <FormControl>
            <Input
              {...formField}
              type="date"
              value={value || ''}
              onChange={(e) => {
                formField.onChange(e);
                onChange(e.target.value);
              }}
              onBlur={(e) => {
                formField.onBlur(e);
                onBlur?.();
              }}
              disabled={disabled || field.disabled}
              min={field.min}
              max={field.max}
              required={field.required}
            />
          </FormControl>
          
          {field.helpText && (
            <FormDescription>
              {field.helpText}
            </FormDescription>
          )}
          
          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};
