import React from 'react';
import { Input } from '@/components/ui/input';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps } from '../types';
import { cn } from '@/lib/utils';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Number input field component using shadcn Form components
 */
export const NumberField: React.FC<FieldComponentProps> = ({
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
              type="number"
              value={value || ''}
              onChange={(e) => {
                const numValue = e.target.value === '' ? '' : Number(e.target.value);
                formField.onChange(e);
                onChange(numValue);
              }}
              onBlur={(e) => {
                formField.onBlur(e);
                onBlur?.();
              }}
              placeholder={field.placeholder}
              disabled={disabled || field.disabled}
              min={field.min}
              max={field.max}
              step={field.step}
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
