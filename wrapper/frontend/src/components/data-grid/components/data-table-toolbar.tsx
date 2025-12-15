import type { Table } from "@tanstack/react-table";
import { X, Search, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { DataTableDensityToggle } from "./data-table-density-toggle";
import type { TableDensity } from "./data-table";
import { Typography } from "@/components/common/Typography";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  tableDensity: TableDensity;
  setTableDensity: (density: TableDensity) => void;
  enableExport?: boolean;
  isExporting?: boolean;
  onExport?: () => void;
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  tableDensity,
  setTableDensity,
  enableExport = false,
  isExporting = false,
  onExport,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || globalFilter !== "";

  // Get active filters (columns that have filter values set)
  const activeFilters = table
    .getState()
    .columnFilters.map((filter) => {
      const column = table.getColumn(filter.id);
      if (!column) return null;

      const columnDef = column.columnDef as {
        meta?: { filterDisplayName?: string };
      };
      const displayName =
        columnDef.meta?.filterDisplayName ||
        filter.id.charAt(0).toUpperCase() + filter.id.slice(1);

      // Get unique values for this column from the data
      const uniqueValues = new Set<string>();

      // Get all rows
      const rows = column.getFacetedRowModel().rows;

      // Extract unique values and prepare options
      let options: { label: string; value: string }[] = [];

      // if (filter.id === "assignee") {
      //   // For assignee column, create options from the user objects
      //   const userMap = new Map<string, string>()
      //   rows.forEach((row) => {
      //     const user = row.getValue(filter.id) as { id: string; firstName: string; lastName: string }
      //     if (user) {
      //       userMap.set(user.id, `${user.firstName} ${user.lastName}`)
      //     }
      //   })
      //   options = Array.from(userMap.entries()).map(([id, name]) => ({
      //     label: name,
      //     value: id,
      //   }))
      // } else {
      //   // For other columns, use the standard approach
      rows.forEach((row) => {
        const value = row.getValue(filter.id);
        if (value != null && value !== "") {
          uniqueValues.add(String(value));
        }
      });
      options = Array.from(uniqueValues).map((value) => ({
        label: String(value),
        value: String(value),
      }));
      // }

      return {
        id: filter.id,
        title: displayName,
        options,
        value: filter.value,
      };
    })
    .filter(Boolean);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search"
              />
            </div>
          }
        </div>

        <div className="flex items-center gap-2">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
              className="h-9"
              aria-label="Export data"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          )}
          <DataTableDensityToggle
            density={tableDensity}
            setDensity={setTableDensity}
          />
          <DataTableViewOptions table={table} />
        </div>
      </div>
      {/* Active filter badges */}
      <div className="flex flex-wrap gap-1 items-center">
        {activeFilters.length > 0 && (
          <Typography className="text-muted-foreground font-medium text-sm">
            Active Filters:
          </Typography>
        )}
        {activeFilters.map((filter) => {
          if (!filter) return null;

          // For array values (multi-select filters)
          const values = Array.isArray(filter.value)
            ? filter.value
            : [filter.value];

          // Find labels for the selected values
          const selectedOptions = values.map((value) => {
            const option = filter.options.find((opt) => opt.value === value);
            return option?.label || value;
          });

          return (
            <Badge
              key={filter.id}
              variant="outline"
              className="rounded-sm px-1 py-0 text-xs flex items-center gap-1"
            >
              <span className="text-primary/80">{filter.title}</span>:{" "}
              {selectedOptions.join(", ")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  table.getColumn(filter.id)?.setFilterValue(undefined)
                }
                aria-label={`Clear ${filter.title} filter`}
              />
            </Badge>
          );
        })}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              setGlobalFilter("");
            }}
            className="rounded-sm px-1 py-0 text-xs flex items-center gap-1"
          >
            <span>Reset</span>
            <X
              className="h-3 w-3 cursor-pointer"
              aria-label={`Clear all filter`}
            />
          </Button>
        )}
      </div>
    </>
  );
}
