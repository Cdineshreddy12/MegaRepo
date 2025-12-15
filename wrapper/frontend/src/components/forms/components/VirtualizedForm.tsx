import React, { useState, useRef, useEffect } from 'react';
import { FormField, FormValues } from '../types';
import { cn } from '@/lib/utils';

interface VirtualizedFormProps {
  fields: FormField[];
  renderField: (field: FormField, index: number) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  className?: string;
  overscanCount?: number;
  enablePerformanceMonitoring?: boolean;
  virtualizationThreshold?: number;
  onFieldChange?: (fieldId: string, value: any) => void;
  onFieldBlur?: (fieldId: string) => void;
  formValues?: FormValues;
  errors?: Record<string, any>;
}


/**
 * Virtualized form component for handling large forms with many fields
 * Automatically switches to virtualization when field count exceeds threshold
 */
export const VirtualizedForm: React.FC<VirtualizedFormProps> = ({
  fields,
  renderField,
  height = 400,
  itemHeight = 80,
  className,
  enablePerformanceMonitoring = true,
  virtualizationThreshold = 50,
  onFieldChange,
  onFieldBlur,
  formValues = {},
  errors = {}
}) => {
  const [containerHeight, setContainerHeight] = useState(height);
  const [shouldVirtualize, setShouldVirtualize] = useState(fields.length > virtualizationThreshold);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container height based on available space
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100; // Leave 100px margin
        setContainerHeight(Math.min(height, availableHeight));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [height]);

  // Determine if virtualization should be used
  useEffect(() => {
    setShouldVirtualize(fields.length > virtualizationThreshold);
  }, [fields.length, virtualizationThreshold]);

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      console.log(`VirtualizedForm: ${fields.length} fields, virtualized: ${shouldVirtualize}`);
    }
  }, [fields.length, shouldVirtualize, enablePerformanceMonitoring]);


  // Calculate total height needed
  const totalHeight = fields.length * itemHeight;




  // If total height is less than container height or below threshold, don't virtualize
  if (!shouldVirtualize || totalHeight <= containerHeight) {
    return (
      <div ref={containerRef} className={cn('space-y-4', className)} data-form-container>
        {fields.map((field, index) => {
          const enhancedField = {
            ...field,
            value: formValues?.[field.id],
            error: errors?.[field.id],
            onChange: onFieldChange ? (value: any) => onFieldChange(field.id, value) : undefined,
            onBlur: onFieldBlur ? () => onFieldBlur(field.id) : undefined,
          };
          
          return (
          <div key={field.id}>
              {renderField(enhancedField, index)}
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} data-form-container>
      <div 
        ref={containerRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{ height: containerHeight }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {fields.map((field, index) => {
            const enhancedField = {
              ...field,
              value: formValues?.[field.id],
              error: errors?.[field.id],
              onChange: onFieldChange ? (value: any) => onFieldChange(field.id, value) : undefined,
              onBlur: onFieldBlur ? () => onFieldBlur(field.id) : undefined,
            };
            
            return (
              <div
                key={field.id}
                style={{
                  position: 'absolute',
                  top: index * itemHeight,
                  left: 0,
                  right: 0,
                  height: itemHeight,
                  padding: '4px'
                }}
              >
                {renderField(enhancedField, index)}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Virtualization info */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Showing {fields.length} fields
        {shouldVirtualize && (
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">
            Virtualized
          </span>
        )}
      </div>
    </div>
  );
};

export default VirtualizedForm;