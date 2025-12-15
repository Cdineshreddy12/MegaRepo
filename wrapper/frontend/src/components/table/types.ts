import { ReactNode } from 'react';
import { FilterFn } from '@tanstack/react-table';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterFn?: FilterFn<T>;
  cell?: (props: any) => ReactNode;
}

export interface TableAction<T = any> {
  key: string;
  label: string | ((item: T) => string);
  icon: React.ElementType;
  onClick: (item: T) => void;
  disabled?: (item: T) => boolean;
  destructive?: boolean;
  separator?: boolean;
  variant?: 'ghost' | 'default' | 'destructive' | 'outline' | 'secondary' | 'link';
  className?: string;
}

export interface TableFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ReusableTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  filters?: TableFilter[];
  selectable?: boolean;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
  getItemId: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  enablePagination?: boolean;
  pageSize?: number;
  enableColumnVisibility?: boolean;
  enableGlobalSearch?: boolean;
  searchPlaceholder?: string;
  title?: string;
}

// Common filter functions
export const createTextFilter = (key: string, label: string, placeholder?: string): TableFilter => ({
  key,
  label,
  type: 'text',
  placeholder,
});

export const createSelectFilter = (
  key: string,
  label: string,
  options: { value: string; label: string }[],
  placeholder?: string
): TableFilter => ({
  key,
  label,
  type: 'select',
  options,
  placeholder,
});

export const createMultiSelectFilter = (
  key: string,
  label: string,
  options: { value: string; label: string }[],
  placeholder?: string
): TableFilter => ({
  key,
  label,
  type: 'multiselect',
  options,
  placeholder,
});

// Common action creators
export const createAction = <T = any>(
  key: string,
  label: string | ((item: T) => string),
  icon: React.ElementType,
  onClick: (item: T) => void,
  options?: {
    disabled?: (item: T) => boolean;
    destructive?: boolean;
    separator?: boolean;
    variant?: TableAction<T>['variant'];
    className?: string;
  }
): TableAction<T> => ({
  key,
  label,
  icon,
  onClick,
  ...options,
});

// Common column creators
export const createTextColumn = <T = any>(
  key: keyof T,
  label: string,
  options?: {
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (item: T) => ReactNode;
  }
): TableColumn<T> => ({
  key: key as string,
  label,
  width: options?.width,
  sortable: options?.sortable ?? true,
  filterable: options?.filterable ?? false,
  render: options?.render,
});

export const createCustomColumn = <T = any>(
  key: string,
  label: string,
  render: (item: T) => ReactNode,
  options?: {
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
  }
): TableColumn<T> => ({
  key,
  label,
  width: options?.width,
  sortable: options?.sortable ?? false,
  filterable: options?.filterable ?? false,
  render,
});
