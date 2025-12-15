import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import React from 'react';

// Hook for basic table functionality
export function useTable<T>(
  data: T[],
  columns: ColumnDef<T>[],
  options?: {
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enablePagination?: boolean;
    pageSize?: number;
    initialSorting?: SortingState;
    initialFilters?: ColumnFiltersState;
  }
) {
  const [sorting, setSorting] = useState<SortingState>(options?.initialSorting || []);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(options?.initialFilters || []);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    onSortingChange: options?.enableSorting !== false ? setSorting : undefined,
    onColumnFiltersChange: options?.enableFiltering !== false ? setColumnFilters : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: options?.enablePagination !== false ? getPaginationRowModel() : undefined,
    getSortedRowModel: options?.enableSorting !== false ? getSortedRowModel() : undefined,
    getFilteredRowModel: options?.enableFiltering !== false ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: options?.enablePagination !== false ? {
        pageIndex: 0,
        pageSize: options?.pageSize || 10,
      } : undefined,
    },
  });

  return {
    table,
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    globalFilter,
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    setRowSelection,
    setGlobalFilter,
  };
}

// Hook for selectable table with row management
export function useSelectableTable<T>(
  data: T[],
  columns: ColumnDef<T>[],
  getItemId: (item: T) => string,
  options?: {
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enablePagination?: boolean;
    pageSize?: number;
    onSelectionChange?: (selectedIds: Set<string>) => void;
  }
) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const onSelectionChangeRef = React.useRef(options?.onSelectionChange);
  const getItemIdRef = React.useRef(getItemId);

  // Update refs when callbacks change
  onSelectionChangeRef.current = options?.onSelectionChange;
  getItemIdRef.current = getItemId;

  const { table, ...tableState } = useTable(data, columns, options);

  // Sync selected items when row selection changes
  React.useEffect(() => {
    const rowSelection = table.getState().rowSelection;
    const selectedRowIds = Object.keys(rowSelection);

    if (selectedRowIds.length > 0) {
      const selectedIds = new Set(
        table.getFilteredRowModel().rows
          .filter((_, index) => rowSelection[index])
          .map(row => getItemIdRef.current(row.original))
      );
      setSelectedItems(selectedIds);
      onSelectionChangeRef.current?.(selectedIds);
    } else {
      setSelectedItems(new Set());
      onSelectionChangeRef.current?.(new Set());
    }
  }, [table.getState().rowSelection]);

  return {
    ...tableState,
    table,
    selectedItems,
    setSelectedItems,
    clearSelection: () => {
      table.resetRowSelection();
      setSelectedItems(new Set());
    },
    selectAll: () => {
      table.toggleAllRowsSelected(true);
    },
  };
}

// Hook for data transformation and formatting
export function useTableData<T, R>(
  rawData: T[],
  transformFn: (item: T) => R,
  dependencies: any[] = []
) {
  return useMemo(() => {
    return rawData.map(transformFn);
  }, [rawData, ...dependencies]);
}

// Hook for column definitions with common patterns
export function useTableColumns<T>(columnDefs: ColumnDef<T>[]) {
  return useMemo(() => columnDefs, [columnDefs]);
}

// Hook for pagination state
export function useTablePagination(
  totalItems: number,
  pageSize: number = 10,
  initialPage: number = 0
) {
  const [pageIndex, setPageIndex] = useState(initialPage);

  const pageCount = Math.ceil(totalItems / pageSize);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  return {
    pageIndex,
    pageSize,
    pageCount,
    canPreviousPage,
    canNextPage,
    setPageIndex,
    nextPage: () => setPageIndex(prev => Math.min(prev + 1, pageCount - 1)),
    previousPage: () => setPageIndex(prev => Math.max(prev - 1, 0)),
    goToPage: (page: number) => setPageIndex(Math.min(Math.max(page, 0), pageCount - 1)),
  };
}

// Hook for search/filter state
export function useTableSearch(initialValue: string = '') {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  return {
    searchTerm,
    setSearchTerm,
    clearSearch: () => setSearchTerm(''),
    hasSearch: searchTerm.trim().length > 0,
  };
}

// Hook for column visibility
export function useColumnVisibility(initialVisibility: Record<string, boolean> = {}) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility);

  return {
    columnVisibility,
    setColumnVisibility,
    toggleColumn: (columnId: string) => {
      setColumnVisibility(prev => ({
        ...prev,
        [columnId]: !prev[columnId],
      }));
    },
    showColumn: (columnId: string) => {
      setColumnVisibility(prev => ({
        ...prev,
        [columnId]: true,
      }));
    },
    hideColumn: (columnId: string) => {
      setColumnVisibility(prev => ({
        ...prev,
        [columnId]: false,
      }));
    },
  };
}
