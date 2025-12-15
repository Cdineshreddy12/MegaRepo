import React from 'react';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

import { ConditionalErrorMessage } from '@/components/forms/components/ConditionalErrorMessage';
import { FieldComponentProps } from '@/components/forms/types';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
/**
 * Color input field component with color picker
 */
export const ColorField: React.FC<FieldComponentProps> = ({
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
            'text-sm font-medium text-gray-700 mb-2 block',
            field.required && "after:content-['*'] after:ml-0.5 after:text-red-500"
          )}>
            {field.label}
          </FormLabel>
          
          <div className="flex items-center space-x-3">
            <FormControl>
              <div className="relative">
                <Input
                  {...formField}
                  type="color"
                  value={typeof value === 'string' ? value : '#000000'}
                  onChange={(e) => {
                    formField.onChange(e);
                    onChange(e.target.value);
                  }}
                  onBlur={() => {
                    formField.onBlur();
                    if (onBlur) {
                      onBlur();
                    }
                  }}
                  disabled={disabled || field.disabled}
                  required={field.required}
                  className="h-12 w-20 p-1 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Palette className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </FormControl>
            
            <div className="flex-1">
              <Input
                type="text"
                value={typeof value === 'string' ? value : '#000000'}
                onChange={(e) => {
                  formField.onChange(e);
                  onChange(e.target.value);
                }}
                onBlur={() => {
                  formField.onBlur();
                  if (onBlur) {
                    onBlur();
                  }
                }}
                placeholder="#000000"
                disabled={disabled || field.disabled}
                className="h-12 px-4 py-3 text-sm border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono"
              />
            </div>
          </div>
          
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

