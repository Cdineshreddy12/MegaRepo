import type React from "react"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataTableSelectedRowsActionsProps<TData> {
  selectedRowsCount: number
  rowActions: {
    label: string
    icon?: React.ReactNode
    action: (rows: TData[]) => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }[]
  onAction: (action: (rows: TData[]) => void) => void
  onClearSelection: () => void
}

export function DataTableSelectedRowsActions<TData>({
  selectedRowsCount,
  rowActions,
  onAction,
  onClearSelection,
}: DataTableSelectedRowsActionsProps<TData>) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2">
      <div className="text-sm font-medium">
        {selectedRowsCount} {selectedRowsCount === 1 ? "row" : "rows"} selected
      </div>
      <div className="ml-auto flex items-center gap-2">
        {rowActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "outline"}
            size="sm"
            onClick={() => onAction(action.action)}
            className="h-8"
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8">
          <X className="mr-2 h-4 w-4" />
          Clear selection
        </Button>
      </div>
    </div>
  )
}
