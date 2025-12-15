import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortAsc } from "lucide-react";
import type { SortOption } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Column } from "./types";

interface KanbanColumnProps<T> {
  column: Column;
  records: T[];
  renderColumnSummary?: (columnData: T[]) => React.ReactNode;
  renderColumnRecord: (record: T) => React.ReactNode;
  sortFn: (a: T, b: T, sortOption: SortOption) => number;
  label?: string;
}

export default function KanbanColumn<T>({
  column,
  records,
  renderColumnSummary,
  renderColumnRecord,
  sortFn,
  label = "Records",
}: KanbanColumnProps<T>) {
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${column.id}`,
  });

  const sortedRecords = [...records].sort((a, b) => sortFn(a, b, sortOption));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted rounded-lg p-3 min-h-[500px] min-w-[300px]",
        isOver && "ring-2 ring-primary ring-inset"
      )}
    >
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{column.name}</h3>
            <Badge variant="outline">{records?.length}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <SortAsc className="h-4 w-4" />
                <span className="sr-only"> Sort {label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOption("name-asc")}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("name-desc")}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("value-asc")}>
                Value (Low to High)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("value-desc")}>
                Value (High to Low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("newest")}>
                Date (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("oldest")}>
                Date (Oldest)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {renderColumnSummary?.(records)}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        <SortableContext
          items={sortedRecords.map((record) => record.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedRecords.map((record) => renderColumnRecord(record))}
        </SortableContext>
        {records.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed rounded-md text-muted-foreground text-sm">
            No {label}
          </div>
        )}
      </div>
    </div>
  );
}
