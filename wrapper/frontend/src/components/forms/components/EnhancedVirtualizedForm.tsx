import React, { useMemo, useCallback, useState } from 'react';
import { FormField, FormValues } from '../types';
import VirtualizedForm from './VirtualizedForm';

interface EnhancedVirtualizedFormProps {
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
  searchEnabled?: boolean;
  filterEnabled?: boolean;
  sortEnabled?: boolean;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSort?: (sortBy: string, direction: 'asc' | 'desc') => void;
}

/**
 * Enhanced virtualized form with search, filter, and sort capabilities
 */
export const EnhancedVirtualizedForm: React.FC<EnhancedVirtualizedFormProps> = ({
  searchEnabled = false,
  filterEnabled = false,
  sortEnabled = false,
  onSearch,
  onFilter,
  onSort,
  ...props
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort fields
  const processedFields = useMemo(() => {
    let filteredFields = props.fields;

    // Apply search
    if (searchEnabled && searchQuery) {
      filteredFields = filteredFields.filter(field =>
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (filterEnabled && Object.keys(filters).length > 0) {
      filteredFields = filteredFields.filter(field => {
        return Object.entries(filters).every(([key, value]) => {
          if (key === 'type') return field.type === value;
          if (key === 'required') return field.required === value;
          return true;
        });
      });
    }

    // Apply sorting
    if (sortEnabled && sortBy) {
      filteredFields = [...filteredFields].sort((a, b) => {
        const aValue = a[sortBy as keyof FormField];
        const bValue = b[sortBy as keyof FormField];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredFields;
  }, [props.fields, searchQuery, filters, sortBy, sortDirection, searchEnabled, filterEnabled, sortEnabled]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  const handleFilter = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [onFilter]);

  const handleSort = useCallback((field: string) => {
    const newDirection = sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  }, [sortBy, sortDirection, onSort]);

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      {(searchEnabled || filterEnabled || sortEnabled) && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {searchEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Fields
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search fields..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          {filterEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleFilter({ ...filters, type: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required
                </label>
                <select
                  value={filters.required || ''}
                  onChange={(e) => handleFilter({ ...filters, required: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Required</option>
                  <option value="false">Optional</option>
                </select>
              </div>
            </div>
          )}
          
          {sortEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Sorting</option>
                  <option value="label">Label</option>
                  <option value="type">Type</option>
                  <option value="id">ID</option>
                </select>
                {sortBy && (
                  <button
                    onClick={() => handleSort(sortBy)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Virtualized form */}
      <VirtualizedForm
        {...props}
        fields={processedFields}
      />
    </div>
  );
};

export default EnhancedVirtualizedForm;
