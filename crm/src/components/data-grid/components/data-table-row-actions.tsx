import { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from "react"

interface ActionItem<TData> {
  label: string
  onClick: (row: TData) => void
  shortcut?: string
  icon?: ReactNode
}

interface ActionGroup<TData> {
  label: string
  type: 'radio'
  value?: string
  options: Array<{
    label: string
    value: string
  }>
  onChange: (value: string, row: TData) => void
}

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  actions: Array<ActionItem<TData> | ActionGroup<TData>>
  groupSeparator?: boolean
}

function isActionGroup<TData>(
  action: ActionItem<TData> | ActionGroup<TData>
): action is ActionGroup<TData> {
  return 'type' in action && action.type === 'radio'
}

export function DataTableRowActions<TData>({
  row,
  actions,
  groupSeparator = true
}: DataTableRowActionsProps<TData>) {
  const rowData = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {actions.map((action, index) => {
          if (isActionGroup(action)) {
            return (
              <React.Fragment key={`${action.label}-${index}`}>
                {index !== 0 && groupSeparator && <DropdownMenuSeparator />}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>{action.label}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup 
                      value={action.value}
                      onValueChange={(value) => action.onChange(value, rowData)}
                    >
                      {action.options.map((option) => (
                        <DropdownMenuRadioItem 
                          key={option.value} 
                          value={option.value}
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </React.Fragment>
            )
          }

          return (
            <React.Fragment key={action.label}>
              {index !== 0 && groupSeparator && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation(); // Prevents row click event
                action.onClick(rowData)
              }}>
                {action.icon && (
                  <span className="mr-2">{action.icon}</span>
                )}
                {action.label}
                {action.shortcut && (
                  <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}