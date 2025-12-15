import { useState } from "react";
import React from "react";

import type { Table } from "@tanstack/react-table";
import {
  X,
  Columns,
  FilterIcon,
  Download,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableDensityToggle } from "./data-table-density-toggle";
import type { TableDensity } from "./data-table";

type FilterOperator =
  | "contains"
  | "does not contain"
  | "equals"
  | "does not equal"
  | "starts with"
  | "ends with"
  | "is empty"
  | "is not empty"
  | "is any of";

interface FilterCondition {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
}

interface DataTableAdvancedToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  tableDensity: TableDensity;
  setTableDensity: (density: TableDensity) => void;
  enableExport?: boolean;
  isExporting?: boolean;
  onExport?: () => void;
}

export function DataTableAdvancedToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  tableDensity,
  setTableDensity,
  enableExport = false,
  isExporting = false,
  onExport,
}: DataTableAdvancedToolbarProps<TData>) {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    []
  );
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterIndex, setActiveFilterIndex] = useState<number | null>(
    null
  );

  // Get all filterable columns
  const filterableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanFilter())
    .map((column) => ({
      id: column.id,
      title:
        (column.columnDef.meta as { filterDisplayName?: string })
          ?.filterDisplayName ||
        column.id.charAt(0).toUpperCase() + column.id.slice(1),
    }));

  // Filter operators
  const operators: { value: FilterOperator; label: string }[] = [
    { value: "contains", label: "contains" },
    { value: "does not contain", label: "does not contain" },
    { value: "equals", label: "equals" },
    { value: "does not equal", label: "does not equal" },
    { value: "starts with", label: "starts with" },
    { value: "ends with", label: "ends with" },
    { value: "is empty", label: "is empty" },
    { value: "is not empty", label: "is not empty" },
    { value: "is any of", label: "is any of" },
  ];

  // Add a new filter condition
  const addFilterCondition = () => {
    if (filterableColumns.length === 0) return;

    const newCondition: FilterCondition = {
      id: Math.random().toString(36).substring(2, 9),
      columnId: filterableColumns[0].id,
      operator: "contains",
      value: "",
    };

    setFilterConditions([...filterConditions, newCondition]);
    setActiveFilterIndex(filterConditions.length);
    setShowFilterPanel(true);
  };

  // Remove a filter condition
  const removeFilterCondition = (index: number) => {
    const newConditions = [...filterConditions];
    const removedCondition = newConditions.splice(index, 1)[0];

    // Clear the column filter
    table.getColumn(removedCondition.columnId)?.setFilterValue(undefined);

    setFilterConditions(newConditions);

    if (activeFilterIndex === index) {
      setActiveFilterIndex(null);
    } else if (activeFilterIndex !== null && activeFilterIndex > index) {
      setActiveFilterIndex(activeFilterIndex - 1);
    }

    if (newConditions.length === 0) {
      setShowFilterPanel(false);
    }
  };

  // Remove all filter conditions
  const removeAllFilterConditions = () => {
    // Clear all column filters
    filterConditions.forEach((condition) => {
      table.getColumn(condition.columnId)?.setFilterValue(undefined);
    });

    setFilterConditions([]);
    setActiveFilterIndex(null);
    setShowFilterPanel(false);
  };

  // Update a filter condition
  const updateFilterCondition = (
    index: number,
    updates: Partial<FilterCondition>
  ) => {
    const newConditions = [...filterConditions];
    const oldCondition = newConditions[index];

    // If column changed, clear the old column filter
    if (updates.columnId && updates.columnId !== oldCondition.columnId) {
      table.getColumn(oldCondition.columnId)?.setFilterValue(undefined);
    }

    newConditions[index] = { ...oldCondition, ...updates };
    setFilterConditions(newConditions);

    // Apply the filter
    applyFilter(newConditions[index]);
  };

  // Apply a filter condition to the table
  const applyFilter = (condition: FilterCondition) => {
    const column = table.getColumn(condition.columnId);
    if (!column) return;

    // Special handling for assignee column
    if (condition.columnId === "assignee") {
      switch (condition.operator) {
        case "is any of": {
          // Split by comma and trim
          const values = condition.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

          // For assignee, we need to find the user IDs that match the names
          const rows = column.getFacetedRowModel().rows;
          const matchingIds = new Set<string>();

          rows.forEach((row) => {
            const user = row.getValue(condition.columnId) as {
              id: string;
              firstName: string;
              lastName: string;
            };
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();

            if (values.some((v) => fullName.includes(v.toLowerCase()))) {
              matchingIds.add(user.id);
            }
          });

          column.setFilterValue(
            matchingIds.size > 0 ? Array.from(matchingIds) : undefined
          );
          break;
        }

        default:
          // For other operators, we'll search by name in the filter function
          column.setFilterValue(condition.value || undefined);
      }
      return;
    }

    // For other columns, use the standard approach
    switch (condition.operator) {
      case "contains":
        column.setFilterValue(condition.value);
        break;
      case "does not contain":
        column.setFilterValue({
          type: "doesNotContain",
          value: condition.value,
        });
        break;
      case "equals":
        column.setFilterValue(condition.value);
        break;
      case "does not equal":
        column.setFilterValue({ type: "doesNotEqual", value: condition.value });
        break;
      case "starts with":
        column.setFilterValue({ type: "startsWith", value: condition.value });
        break;
      case "ends with":
        column.setFilterValue({ type: "endsWith", value: condition.value });
        break;
      case "is empty":
        column.setFilterValue({ type: "isEmpty" });
        break;
      case "is not empty":
        column.setFilterValue({ type: "isNotEmpty" });
        break;
      case "is any of":
        {
          // Split by comma and trim
          const values = condition.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          column.setFilterValue(values.length > 0 ? values : undefined);
        }
        break;
      default:
        column.setFilterValue(condition.value || undefined);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {}}
          >
            <Columns className="mr-2 h-4 w-4" />
            COLUMNS
          </Button>
          <Button
            variant={showFilterPanel ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => {
              setShowFilterPanel(!showFilterPanel);
              if (!showFilterPanel && filterConditions.length === 0) {
                addFilterCondition();
              }
            }}
          >
            <FilterIcon className="mr-2 h-4 w-4" />
            FILTERS
          </Button>
          <DataTableDensityToggle
            density={tableDensity}
            setDensity={setTableDensity}
          />
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
                  EXPORT
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-9 w-full sm:w-[250px]"
            aria-label="Search"
          />
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {showFilterPanel && (
        <div className="rounded-md border p-4 bg-background">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-2">
            <div className="text-sm font-medium hidden sm:block">Columns</div>
            <div className="text-sm font-medium hidden sm:block">Operator</div>
            <div className="text-sm font-medium hidden sm:block">Value</div>
            <div className="hidden sm:block"></div>

            {filterConditions.map((condition, index) => (
              <React.Fragment key={condition.id}>
                <Select
                  value={condition.columnId}
                  onValueChange={(value) =>
                    updateFilterCondition(index, { columnId: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterableColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    updateFilterCondition(index, {
                      operator: value as FilterOperator,
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>
                        {operator.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Filter value"
                  value={condition.value}
                  onChange={(e) =>
                    updateFilterCondition(index, { value: e.target.value })
                  }
                  className="h-9"
                  disabled={["is empty", "is not empty"].includes(
                    condition.operator
                  )}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilterCondition(index)}
                  className="h-9 w-9"
                  aria-label="Remove filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={addFilterCondition}
              className="h-8"
            >
              <Plus className="mr-2 h-4 w-4" />
              ADD FILTER
            </Button>

            {filterConditions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAllFilterConditions}
                className="h-8 text-primary"
                aria-label="Remove all filters"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                REMOVE ALL
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
