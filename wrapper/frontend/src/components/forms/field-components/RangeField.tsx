import React from 'react';
import { Slider } from '@/components/ui/slider';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps, RangeField as RangeFieldType } from '../types';
import { cn } from '@/lib/utils';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Range slider field component
 */
export const RangeField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  className
}) => {
  const rangeField = field as RangeFieldType;
  
  // Convert value to number array for slider
  const getCurrentValue = (): number[] => {
    if (Array.isArray(value)) {
      return value.map(v => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return Number(v) || 0;
        return 0;
      });
    }
    if (typeof value === 'number') return [value];
    if (typeof value === 'string') return [Number(value) || 0];
    return [rangeField.min || 0];
  };
  
  const currentValue = getCurrentValue();

  const handleValueChange = (newValue: number[]) => {
    // Ensure correct value type is passed to onChange
    if (rangeField.multiple) {
      onChange(newValue as any); // Cast to FormValue for compatibility
    } else {
      onChange(newValue[0] as any); // Cast to FormValue for compatibility
    }
  };

  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn(className)}>
          <FormLabel className={cn(
            'text-sm font-medium text-gray-700 mb-2 block',
            field.required && "after:content-['*'] after:ml-0.5 after:text-red-500"
          )}>
            {field.label}
          </FormLabel>
          
          <FormControl>
            <div className="space-y-4">
              <Slider
                value={currentValue as number[]}
                onValueChange={handleValueChange}
                onValueCommit={() => {
                  formField.onBlur();
                  if (onBlur) {
                    onBlur();
                  }
                }}
                min={rangeField.min || 0}
                max={rangeField.max || 100}
                step={rangeField.step || 1}
                disabled={disabled || field.disabled}
                className="w-full"
              />
              
              <div className="flex justify-between text-sm text-gray-500">
                <span>{rangeField.min || 0}</span>
                <span className="font-medium">
                  {rangeField.multiple 
                    ? `${currentValue[0]} - ${currentValue[1] || currentValue[0]}`
                    : currentValue[0].toString()
                  }
                </span>
                <span>{rangeField.max || 100}</span>
              </div>
            </div>
          </FormControl>
          
          {field.helpText && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">ℹ</div>
              <p className="text-sm text-blue-800 leading-relaxed">
                {field.helpText}
              </p>
            </div>
          )}

          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};

