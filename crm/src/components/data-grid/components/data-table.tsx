import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type FilterFn,
  type Row,
  type PaginationState,
  type RowSelectionState,
  type ColumnOrderState,
  type ColumnPinningState,
  type Header,
  type Cell,
} from "@tanstack/react-table";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useUrlState } from "@/hooks/use-url-state";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableAdvancedToolbar } from "./data-table-advanced-toolbar";
import { DataTableSelectedRowsActions } from "./data-table-selected-rows-actions";
import { useDebounce } from "@/hooks/use-debounce";
import DataTableSkeleton from "./data-table-skeleton";
import { cn } from "@/lib/utils";
import { DataTableRowSelectionSummary } from "./data-table-row-selection-summary";

// Define a default filter function that uses OR logic for array values
const defaultFilterFn: FilterFn<Record<string, unknown>> = (
  row,
  columnId,
  filterValues
) => {
  // If no filter values, return true (show all)
  if (!Array.isArray(filterValues) || filterValues.length === 0) return true;

  // Get the value from the row
  const value = row.getValue(columnId);

  // Check if the value is in any of the filter values (OR logic)
  return filterValues.includes(value);
};

// Custom global filter function that handles object values
const globalFilterFn: FilterFn<Record<string, unknown>> = (
  row,
  columnId,
  filterValue
) => {
  const searchValue = String(filterValue).toLowerCase();

  // If the search value is empty, show all rows
  if (!searchValue) return true;

  // Get the value from the row
  const value = row.getValue(columnId);

  // Handle different value types
  if (value === null || value === undefined) {
    return false;
  }

  // Handle object values (e.g., for columns with complex data like assignee)
  if (typeof value === "object" && value !== null) {
    // Flatten the object into a string representation
    const flattenedValue = Object.values(value)
      .map((v) =>
        v !== null && v !== undefined ? String(v).toLowerCase() : ""
      )
      .join(" ");

    return flattenedValue.includes(searchValue);
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toLocaleDateString().toLowerCase().includes(searchValue);
  }

  // Handle regular values
  return String(value).toLowerCase().includes(searchValue);
};

export type FilterVariant = "column" | "toolbar";
export type TableDensity = "compact" | "default" | "spacious";

export interface DataTableExportOptions {
  format: "csv" | "json" | "excel";
  filename?: string;
  includeHeaders?: boolean;
  onlySelectedRows?: boolean;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchableColumns?: {
    id: string;
    title: string;
  }[];
  defaultVisibility?: VisibilityState;
  defaultColumnPinning?: ColumnPinningState;
  filterVariant?: FilterVariant;
  tableId?: string;
  isLoading?: boolean;
  loadingRows?: number;
  enableRowSelectionSummary?: boolean;
  renderRowSelectionSummary?: (selectedRows: TData[]) => JSX.Element;
  enableRowSelection?: boolean;
  enableColumnReordering?: boolean;
  enableColumnPinning?: boolean;
  enableExport?: boolean;
  exportOptions?: DataTableExportOptions;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  rowActions?: {
    label: string;
    icon?: React.ReactNode;
    action: (rows: TData[]) => void;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  }[];
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
  noDataMessage?: React.ReactNode;
  onStateChange?: (state: {
    filters: ColumnFiltersState;
    sorting: SortingState;
    pagination: PaginationState;
    globalFilter: string;
    columnVisibility: VisibilityState;
    columnOrder: ColumnOrderState;
    columnPinning: ColumnPinningState;
  }) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultVisibility = {},
  defaultColumnPinning = { left: [], right: [] },
  filterVariant = "column",
  tableId = "default",
  isLoading = false,
  loadingRows = 5,
  enableRowSelectionSummary = false,
  renderRowSelectionSummary = () => <></>,
  enableRowSelection = true,
  enableColumnReordering = false,
  enableColumnPinning = true,
  enableExport = false,
  exportOptions = {
    format: "csv",
    filename: "data-export",
    includeHeaders: true,
    onlySelectedRows: false,
  },
  onRowSelectionChange,
  rowActions = [],
  onStateChange,
  onRowClick,
  onRowDoubleClick,
  noDataMessage = "No results.",
}: DataTableProps<TData, TValue>) {
  const [isExporting, setIsExporting] = React.useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const tableHeaderRef = React.useRef<HTMLTableSectionElement>(null);



  // Use local state instead of URL state to avoid initialization issues
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(defaultVisibility);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    columns.map((column) => (column.id as string) || "")
  );
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(defaultColumnPinning);

  // Get table density from local storage
  const [tableDensity, setTableDensity] = useLocalStorage<TableDensity>(
    `${tableId}_density`,
    "default"
  );

  // Local state for row selection (not persisted in URL)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Debounce global filter to avoid too many URL updates
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  // Notify parent component of state changes
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({
        filters: columnFilters,
        sorting,
        pagination,
        globalFilter,
        columnVisibility,
        columnOrder,
        columnPinning,
      });
    }
  }, [
    columnFilters,
    sorting,
    pagination,
    globalFilter,
    columnVisibility,
    columnOrder,
    columnPinning,
    onStateChange,
  ]);

  // Set default filter function for columns that don't specify one
  const columnsWithDefaultFilter = React.useMemo(() => {
    return columns.map((column) => {
      // If the column doesn't have a filterFn, add the default one
      if (column.enableColumnFilter !== false && !column.filterFn) {
        return {
          ...column,
          filterFn: defaultFilterFn,
        };
      }
      return column;
    });
  }, [columns]);

  // Notify parent component when row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = Object.keys(rowSelection).map((key) => {
        const index = Number.parseInt(key, 10);
        return data[index];
      });
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, data, onRowSelectionChange]);

  const table = useReactTable({
    data,
    columns: columnsWithDefaultFilter,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter: debouncedGlobalFilter,
      pagination,
      columnOrder: enableColumnReordering ? columnOrder : undefined,
      columnPinning: enableColumnPinning ? columnPinning : undefined,
    },
    enableRowSelection,
    enableColumnPinning,
    manualPagination: false,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updaterOrValue) =>
      setSorting(
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue
      ),
    onColumnFiltersChange: (updaterOrValue) =>
      setColumnFilters(
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnFilters)
          : updaterOrValue
      ),
    onColumnVisibilityChange: (updaterOrValue) =>
      setColumnVisibility(
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnVisibility)
          : updaterOrValue
      ),
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updaterOrValue) =>
      setPagination(
        typeof updaterOrValue === "function"
          ? updaterOrValue(pagination)
          : updaterOrValue
      ),
    onColumnOrderChange: enableColumnReordering
      ? (updaterOrValue) =>
          setColumnOrder(
            typeof updaterOrValue === "function"
              ? updaterOrValue(columnOrder)
              : updaterOrValue
          )
      : undefined,
    onColumnPinningChange: enableColumnPinning
      ? (updaterOrValue) =>
          setColumnPinning(
            typeof updaterOrValue === "function"
              ? updaterOrValue(columnPinning)
              : updaterOrValue
          )
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // Custom global filter function
    globalFilterFn: (
      row: Row<TData>,
      columnId: string,
      filterValue: string
    ) => {
      return globalFilterFn(
        row as Row<Record<string, unknown>>,
        columnId,
        filterValue,
        () => {}
      );
    },
  });

  // Calculate and set CSS variables for pinned column widths
  React.useEffect(() => {
    if (!tableContainerRef.current) return;

    const leftPinnedColumns = table.getLeftLeafHeaders();
    const rightPinnedColumns = table.getRightLeafHeaders();

    // Set CSS variables for left pinned columns
    let leftOffset = 0;
    leftPinnedColumns.forEach((header, index) => {
      const width = header.getSize();
      leftOffset += width;
      tableContainerRef.current?.style.setProperty(
        `--pinned-left-${index + 1}-width`,
        `${leftOffset}px`
      );
    });

    // Set CSS variables for right pinned columns
    let rightOffset = 0;
    rightPinnedColumns.forEach((header, index) => {
      const width = header.getSize();
      rightOffset += width;
      tableContainerRef.current?.style.setProperty(
        `--pinned-right-${index + 1}-width`,
        `${rightOffset}px`
      );
    });
  }, [table, columnPinning, columnVisibility]);

  // Helper function to get pinned class names for header cells
  const getPinnedHeaderClassName = (header: Header<TData, unknown>) => {
    if (header.column.getIsPinned() === "left") {
      const leftPinnedIndex = table
        .getLeftLeafHeaders()
        .findIndex((h) => h.id === header.id);
      const isLastLeftPinned =
        leftPinnedIndex === table.getLeftLeafHeaders().length - 1;

      return cn(
        "table-head-pinned-left",
        leftPinnedIndex >= 0 && `table-pinned-left-${leftPinnedIndex}`,
        isLastLeftPinned && "table-head-pinned-left-last"
      );
    }

    if (header.column.getIsPinned() === "right") {
      const rightPinnedIndex = table
        .getRightLeafHeaders()
        .findIndex((h) => h.id === header.id);
      const isFirstRightPinned = rightPinnedIndex === 0;

      return cn(
        "table-head-pinned-right",
        rightPinnedIndex >= 0 && `table-pinned-right-${rightPinnedIndex}`,
        isFirstRightPinned && "table-head-pinned-right-first"
      );
    }

    return "";
  };

  // Helper function to get pinned class names for cells
  const getPinnedCellClassName = (cell: Cell<TData, unknown>) => {
    if (cell.column.getIsPinned() === "left") {
      const leftPinnedIndex = table
        .getLeftLeafHeaders()
        .findIndex((h) => h.column.id === cell.column.id);
      const isLastLeftPinned =
        leftPinnedIndex === table.getLeftLeafHeaders().length - 1;

      return cn(
        "table-cell-pinned-left",
        leftPinnedIndex >= 0 && `table-pinned-left-${leftPinnedIndex}`,
        isLastLeftPinned && "table-cell-pinned-left-last"
      );
    }

    if (cell.column.getIsPinned() === "right") {
      const rightPinnedIndex = table
        .getRightLeafHeaders()
        .findIndex((h) => h.column.id === cell.column.id);
      const isFirstRightPinned = rightPinnedIndex === 0;

      return cn(
        "table-cell-pinned-right",
        rightPinnedIndex >= 0 && `table-pinned-right-${rightPinnedIndex}`,
        isFirstRightPinned && "table-cell-pinned-right-first"
      );
    }

    return "";
  };

  // Export table data
  const exportData = async () => {
    if (!enableExport) return;

    setIsExporting(true);

    try {
      // Determine which rows to export
      const rowsToExport = exportOptions.onlySelectedRows
        ? table.getSelectedRowModel().rows
        : table.getFilteredRowModel().rows;

      // Get visible columns (excluding action columns)
      const visibleColumns = table
        .getAllColumns()
        .filter(
          (column) =>
            column.getIsVisible() &&
            column.id !== "actions" &&
            column.id !== "select"
        );

      // Create headers array
      const headers = visibleColumns.map((column) => {
        // Use the column ID or meta data for the header
        return (
          (column.columnDef.meta as { filterDisplayName: string })
            ?.filterDisplayName ||
          (typeof column.id === "string"
            ? column.id.charAt(0).toUpperCase() + column.id.slice(1)
            : "Column")
        );
      });

      // Create data array
      const exportRows = rowsToExport.map((row) => {
        const rowData: Record<string, string | number | boolean | null> = {};
        visibleColumns.forEach((column) => {
          const cellValue = row.getValue(column.id) as
            | string
            | number
            | boolean
            | null
            | Date
            | object;

          // Handle special cell types
          if (typeof cellValue === "object" && cellValue !== null) {
            if (typeof cellValue === "object" && cellValue !== null) {
              // Handle any kind of object by flattening its values into a string
              rowData[column.id] = Object.values(cellValue)
                .filter((v) => v !== null && v !== undefined)
                .join(" ");
            } else if (cellValue instanceof Date) {
              // Handle Date objects
              rowData[column.id] =
                cellValue instanceof Date
                  ? cellValue.toLocaleDateString()
                  : cellValue;
            } else {
              // Handle other objects
              rowData[column.id] = JSON.stringify(cellValue);
            }
          } else {
            // Handle primitive values
            rowData[column.id] = cellValue;
          }
        });
        return rowData;
      });

      // Export based on format
      switch (exportOptions.format) {
        case "csv":
          exportToCsv(
            headers,
            exportRows,
            exportOptions.filename || "data-export"
          );
          break;
        case "json":
          exportToJson(exportRows, exportOptions.filename || "data-export");
          break;
        case "excel":
          exportToExcel(
            headers,
            exportRows,
            exportOptions.filename || "data-export"
          );
          break;
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const exportToCsv = (
    headers: string[],
    data: Record<string, string | number | boolean | null>[],
    filename: string
  ) => {
    // Create CSV content
    let csvContent = exportOptions.includeHeaders
      ? headers.join(",") + "\n"
      : "";

    // Add data rows
    data.forEach((row) => {
      const rowValues = Object.values(row).map((value) => {
        // Escape quotes and wrap in quotes if contains comma
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += rowValues.join(",") + "\n";
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const exportToJson = (data: Record<string, unknown>[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (simplified - just creates a CSV that Excel can open)
  const exportToExcel = (
    headers: string[],
    data: Record<string, string | number | boolean | null | Date>[],
    filename: string
  ) => {
    // For a proper Excel export, you would use a library like xlsx
    // This is a simplified version that creates a CSV that Excel can open
    exportToCsv(
      headers,
      data.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            value instanceof Date ? value.toISOString() : value,
          ])
        )
      ),
      filename
    );
  };

  // Get table density classes
  const getDensityClass = () => {
    switch (tableDensity) {
      case "compact":
        return "data-table-density-compact";
      case "spacious":
        return "data-table-density-spacious";
      default:
        return "data-table-density-default";
    }
  };


  // Handle table header position on scroll
React.useEffect(() => {
  const handleScroll = () => {
    if (!tableContainerRef.current || !tableHeaderRef.current || isLoading) return;

    const scrollTop = tableContainerRef.current.scrollTop;
    tableHeaderRef.current.style.transform = `translateY(${scrollTop}px)`;
    tableHeaderRef.current.style.position = "sticky";
    tableHeaderRef.current.style.top = "0";
    tableHeaderRef.current.style.zIndex = "50";

    if (scrollTop > 0) {
      tableHeaderRef.current.className = "bg-grey-200 bg-opacity-20 backdrop-blur-md";
    } else {
      tableHeaderRef.current.className = "bg-background";
    }
  };

  const container = tableContainerRef.current;
  if (container) {
    container.addEventListener("scroll", handleScroll);
    handleScroll(); // run initially
  }

  return () => {
    container?.removeEventListener("scroll", handleScroll);
  };
}, [isLoading, tableContainerRef, tableHeaderRef]);

  // Render loading skeleton
  if (isLoading) {
    return <DataTableSkeleton loadingRows={loadingRows} />;
  }

  // Get selected rows count
  const selectedRowsCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4 p-4 rounded-md">
      {filterVariant === "column" ? (
        <DataTableToolbar
          table={table}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          tableDensity={tableDensity}
          setTableDensity={setTableDensity}
          enableExport={enableExport}
          isExporting={isExporting}
          onExport={exportData}
        />
      ) : (
        <DataTableAdvancedToolbar
          table={table}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          tableDensity={tableDensity}
          setTableDensity={setTableDensity}
          enableExport={enableExport}
          isExporting={isExporting}
          onExport={exportData}
        />
      )}

      {/* Selected rows actions */}
      {enableRowSelection && selectedRowsCount > 0 && rowActions.length > 0 && (
        <DataTableSelectedRowsActions
          selectedRowsCount={selectedRowsCount}
          rowActions={rowActions}
          onAction={(action) => {
            const selectedRows = Object.keys(rowSelection).map((key) => {
              const index = Number.parseInt(key, 10);
              return data[index];
            });
            action(selectedRows);
          }}
          onClearSelection={() => table.resetRowSelection()}
        />
      )}

      {enableRowSelectionSummary ? (
        <DataTableRowSelectionSummary
          table={table}
          renderRowSelectionSummary={renderRowSelectionSummary}
        />
      ) : null}

      <div className={`rounded-md bg-background border ${getDensityClass()}`}>
        <div
          className="data-table-container relative max-h-[80vh] overflow-y-auto"
          ref={tableContainerRef}
        >
          <Table >
            <TableHeader  ref={tableHeaderRef}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "select-none",
                        getPinnedHeaderClassName(header)
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, {
                            ...header.getContext(),
                            filterDisabled: filterVariant === "toolbar",
                          })}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        row.toggleSelected();
                        e.preventDefault();
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-selected={row.getIsSelected()}
                    onClick={() => onRowClick?.(row.original as TData)}
                    onDoubleClick={() =>
                      onRowDoubleClick?.(row.original as TData)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        id={cell.id}
                        className={getPinnedCellClassName(cell)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {noDataMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedRowsCount > 0 ? (
            <span>
              {selectedRowsCount} of {table.getFilteredRowModel().rows.length}{" "}
              row(s) selected.
            </span>
          ) : (
            <span>Total Rows: {table.getFilteredRowModel().rows.length}</span>
          )}
        </div>
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
