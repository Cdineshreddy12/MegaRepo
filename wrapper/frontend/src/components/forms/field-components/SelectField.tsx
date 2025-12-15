import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps, SelectField as SelectFieldType, SelectOption } from '../types';
import { cn } from '@/lib/utils';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Select field component using shadcn Form components
 */
export const SelectField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  disabled,
  className
}) => {
  const selectField = field as SelectFieldType;

  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn('space-y-3', className)}>
          <FormLabel className={cn(
            'text-sm font-medium text-foreground dark:text-foreground',
            field.required && "after:content-['*'] after:ml-0.5 after:text-destructive dark:after:text-destructive"
          )}>
            {field.label}
          </FormLabel>
          
          <Select
            value={String(value || '')}
            onValueChange={(newValue) => {
              formField.onChange(newValue);
              onChange(newValue);
            }}
            disabled={disabled || field.disabled}
            required={field.required}
          >
            <FormControl>
              <SelectTrigger className="w-full h-12 mt-3 bg-background border-input text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring dark:bg-background dark:border-input dark:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground">
                {value ? (
                  <span className="truncate text-foreground dark:text-foreground">{selectField.options?.find(opt => String(opt.value) === String(value))?.label}</span>
                ) : (
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    {field.placeholder || 'Select an option'}
                  </span>
                )}
              </SelectTrigger>
            </FormControl>
            
            <SelectContent className="max-h-60 bg-background border-input text-foreground dark:bg-background dark:border-input dark:text-foreground">
              {selectField.options?.map((option: SelectOption) => (
                <SelectItem
                  key={option.value}
                  value={String(option.value)}
                  disabled={option.disabled}
                  className="h-12 flex items-center text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground dark:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {field.helpText && (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {field.helpText}
            </p>
          )}
          
          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};
