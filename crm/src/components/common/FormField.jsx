import React from 'react';
import { AlertCircle } from 'lucide-react';

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required,
  options,
  placeholder,
  rows
}) {
  const baseClasses = `mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
    error ? 'border-red-300' : 'border-gray-300'
  }`;

  const renderInput = () => {
    if (type === 'select' && options) {
      return (
        <select name={name} value={value} onChange={onChange} className={baseClasses}>
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows || 3}
          className={baseClasses}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={baseClasses}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
      {error && (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle size={16} className="mr-1" />
          {error}
        </div>
      )}
    </div>
  );
}

export default FormField;