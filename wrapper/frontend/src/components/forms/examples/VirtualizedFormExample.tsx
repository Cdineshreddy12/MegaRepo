import React, { useState } from 'react';
import VirtualizedForm from '../components/VirtualizedForm';
import { EnhancedVirtualizedForm } from '../components/EnhancedVirtualizedForm';
import { FormField, FormValues } from '../types';

// Generate a large number of fields for demonstration
const generateLargeFormFields = (count: number): FormField[] => {
  const fieldTypes = ['text', 'email', 'number', 'select', 'checkbox', 'switch', 'textarea'];
  const fields: FormField[] = [];

  for (let i = 0; i < count; i++) {
    const type = fieldTypes[i % fieldTypes.length];
    const field: FormField = {
      id: `field_${i}`,
      label: `Field ${i + 1}`,
      type: type as any,
      required: i % 3 === 0,
      placeholder: `Enter field ${i + 1}`,
      className: 'col-span-1'
    };

    // Add options for select fields
    if (type === 'select') {
      (field as any).options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
      ];
    }

    // Add switch label for switch fields
    if (type === 'switch') {
      (field as any).switchLabel = `Enable field ${i + 1}`;
    }

    // Add checkbox label for checkbox fields
    if (type === 'checkbox') {
      (field as any).checkboxLabel = `Check field ${i + 1}`;
    }

    fields.push(field);
  }

  return fields;
};

// Simple field renderer
const renderField = (field: FormField, _index: number) => {
  // Cast to any for enhanced properties
  const enhancedField = field as any;
  const commonProps = {
    id: enhancedField.id,
    name: enhancedField.id,
    placeholder: enhancedField.placeholder,
    required: enhancedField.required,
    className: `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${enhancedField.className || ''}`
  };

  switch (enhancedField.type) {
    case 'text':
    case 'email':
    case 'number':
      return (
        <div key={enhancedField.id} className="space-y-2">
          <label htmlFor={enhancedField.id} className="block text-sm font-medium text-gray-700">
            {enhancedField.label} {enhancedField.required && <span className="text-red-500">*</span>}
          </label>
          <input
            {...commonProps}
            type={enhancedField.type}
            value={enhancedField.value || ''}
            onChange={(e) => enhancedField.onChange?.(e.target.value)}
            onBlur={() => enhancedField.onBlur?.()}
          />
          {enhancedField.error && (
            <p className="text-sm text-red-600">{enhancedField.error}</p>
          )}
        </div>
      );

    case 'select':
      return (
        <div key={enhancedField.id} className="space-y-2">
          <label htmlFor={enhancedField.id} className="block text-sm font-medium text-gray-700">
            {enhancedField.label} {enhancedField.required && <span className="text-red-500">*</span>}
          </label>
          <select
            {...commonProps}
            value={enhancedField.value || ''}
            onChange={(e) => enhancedField.onChange?.(e.target.value)}
            onBlur={() => enhancedField.onBlur?.()}
          >
            <option value="">Select an option</option>
            {(enhancedField as any).options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {enhancedField.error && (
            <p className="text-sm text-red-600">{enhancedField.error}</p>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div key={enhancedField.id} className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={enhancedField.id}
              checked={enhancedField.value || false}
              onChange={(e) => enhancedField.onChange?.(e.target.checked)}
              onBlur={() => enhancedField.onBlur?.()}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              {(enhancedField as any).checkboxLabel || enhancedField.label} {enhancedField.required && <span className="text-red-500">*</span>}
            </span>
          </label>
          {enhancedField.error && (
            <p className="text-sm text-red-600">{enhancedField.error}</p>
          )}
        </div>
      );

    case 'switch':
      return (
        <div key={enhancedField.id} className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={enhancedField.id}
              checked={enhancedField.value || false}
              onChange={(e) => enhancedField.onChange?.(e.target.checked)}
              onBlur={() => enhancedField.onBlur?.()}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              {(enhancedField as any).switchLabel || enhancedField.label} {enhancedField.required && <span className="text-red-500">*</span>}
            </span>
          </label>
          {enhancedField.error && (
            <p className="text-sm text-red-600">{enhancedField.error}</p>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div key={enhancedField.id} className="space-y-2">
          <label htmlFor={enhancedField.id} className="block text-sm font-medium text-gray-700">
            {enhancedField.label} {enhancedField.required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            {...commonProps}
            rows={3}
            value={enhancedField.value || ''}
            onChange={(e) => enhancedField.onChange?.(e.target.value)}
            onBlur={() => enhancedField.onBlur?.()}
          />
          {enhancedField.error && (
            <p className="text-sm text-red-600">{enhancedField.error}</p>
          )}
        </div>
      );

    default:
      return (
        <div key={enhancedField.id} className="space-y-2">
          <label htmlFor={enhancedField.id} className="block text-sm font-medium text-gray-700">
            {enhancedField.label} {enhancedField.required && <span className="text-red-500">*</span>}
          </label>
          <input
            {...commonProps}
            type="text"
            value={enhancedField.value || ''}
            onChange={(e) => enhancedField.onChange?.(e.target.value)}
            onBlur={() => enhancedField.onBlur?.()}
          />
          {enhancedField.error && (
            <p className="text-sm text-red-600">{enhancedField.error}</p>
          )}
        </div>
      );
  }
};

export const VirtualizedFormExample: React.FC = () => {
  const [formType, setFormType] = useState<'basic' | 'enhanced'>('basic');
  const [fieldCount, setFieldCount] = useState(100);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, any>>({});

  const fields = generateLargeFormFields(fieldCount);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFieldBlur = (fieldId: string) => {
    // Simulate validation
    const field = fields.find(f => f.id === fieldId);
    if (field?.required && !formValues[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: 'This field is required' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  const handleFilter = (filters: Record<string, any>) => {
    console.log('Filters:', filters);
  };

  const handleSort = (sortBy: string, direction: 'asc' | 'desc') => {
    console.log('Sort:', sortBy, direction);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          VirtualizedForm Examples
        </h1>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'basic' | 'enhanced')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic VirtualizedForm</option>
                <option value="enhanced">Enhanced with Search/Filter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Count
              </label>
              <select
                value={fieldCount}
                onChange={(e) => setFieldCount(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={50}>50 fields</option>
                <option value={100}>100 fields</option>
                <option value={200}>200 fields</option>
                <option value={500}>500 fields</option>
                <option value={1000}>1000 fields</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>Current: {fieldCount} fields</p>
            <p>Virtualization threshold: 50 fields</p>
            <p>Status: {fieldCount > 50 ? 'Virtualized' : 'Normal rendering'}</p>
          </div>
        </div>

        {/* Form */}
        <div className="border border-gray-200 rounded-lg p-4">
          {formType === 'basic' ? (
            <VirtualizedForm
              fields={fields}
              renderField={renderField}
              height={400}
              itemHeight={100}
              virtualizationThreshold={50}
              onFieldChange={handleFieldChange}
              onFieldBlur={handleFieldBlur}
              formValues={formValues}
              errors={errors}
              enablePerformanceMonitoring={true}
            />
          ) : (
            <EnhancedVirtualizedForm
              fields={fields}
              renderField={renderField}
              height={400}
              itemHeight={100}
              virtualizationThreshold={50}
              onFieldChange={handleFieldChange}
              onFieldBlur={handleFieldBlur}
              formValues={formValues}
              errors={errors}
              enablePerformanceMonitoring={true}
              searchEnabled={true}
              filterEnabled={true}
              sortEnabled={true}
              onSearch={handleSearch}
              onFilter={handleFilter}
              onSort={handleSort}
            />
          )}
        </div>

        {/* Form Values Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Form Values Summary
          </h3>
          <div className="text-sm text-gray-600">
            <p>Total fields: {fields.length}</p>
            <p>Filled fields: {Object.keys(formValues).length}</p>
            <p>Errors: {Object.keys(errors).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedFormExample;
