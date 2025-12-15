"use client"

import type React from "react"

import { useState } from "react"
import type { Column } from "@tanstack/react-table"
import { ChevronsUpDown, EyeOff, SortAsc, SortDesc, Filter, Settings, Check, Pin, PinOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  filterDisabled?: boolean
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  filterDisabled = false,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const [showFilterInput, setShowFilterInput] = useState(false)
  const [filterValue, setFilterValue] = useState("")

  // Get unique values for this column from the data
  const getUniqueValues = () => {
    const uniqueValues = new Set<string>()

    // Get all rows
    const rows = column.getFacetedRowModel().rows

    // Extract unique values
    rows.forEach((row) => {
      const value = row.getValue(column.id)
      if (value != null && value !== "") {
        // Special handling for user objects (assignee column)
        if (column.id === "assignee" && typeof value === "object" && value !== null) {
          const user = value as { firstName: string; lastName: string; id: string }
          uniqueValues.add(`${user.firstName} ${user.lastName}|${user.id}`)
        } else {
          uniqueValues.add(String(value))
        }
      }
    })

    // Convert to array of options
    return Array.from(uniqueValues).map((value) => {
      // For user objects, split the value to get the name and id
      if (column.id === "assignee" && value.includes("|")) {
        const [name, id] = value.split("|")
        return {
          label: name,
          value: id, // Use the user ID as the value
        }
      }
      return {
        label: String(value),
        value: String(value),
      }
    })
  }

  const options = getUniqueValues()

  // Safely handle the filter value, ensuring it's an array
  const filterValueArray = (() => {
    const value = column.getFilterValue()
    if (Array.isArray(value)) return value
    if (value === undefined || value === null) return []
    return [String(value)]
  })()

  const selectedValues = new Set(filterValueArray)

  const hasFilter = !!column.getFilterValue()
  const isPinned = column.getIsPinned()

  // Visual indicator for pinned columns
  const renderPinIndicator = () => {
    if (isPinned === "left") {
      return <Pin className="h-3 w-3 mr-1 text-primary" />
    } else if (isPinned === "right") {
      return <Pin className="h-3 w-3 mr-1 text-primary -rotate-90" />
    }
    return null
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent flex items-center gap-1">
            {renderPinIndicator()}
            <span>{title}</span>
            {hasFilter && <Filter className="h-3 w-3 text-primary" />}
            {column.getIsSorted() === "desc" ? (
              <SortDesc className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <SortAsc className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)} className="flex items-center gap-2">
                <SortAsc className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Sort by ASC</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)} className="flex items-center gap-2">
                <SortDesc className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Sort by DESC</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {column.getCanFilter() && !filterDisabled && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span>Filter</span>
                  {hasFilter && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {filterValueArray.length}
                    </span>
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-[220px] p-0">
                    <Command>
                      <CommandInput placeholder={`Search ${title}...`} />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                          {options.map((option) => {
                            const isSelected = selectedValues.has(option.value)
                            return (
                              <CommandItem
                                key={option.value}
                                onSelect={() => {
                                  const newSelectedValues = new Set(selectedValues)
                                  if (isSelected) {
                                    newSelectedValues.delete(option.value)
                                  } else {
                                    newSelectedValues.add(option.value)
                                  }
                                  const filterValues = Array.from(newSelectedValues)

                                  // Apply the filter values
                                  if (filterValues.length) {
                                    // For title column, we want to use the array directly
                                    column.setFilterValue(filterValues)
                                  } else {
                                    column.setFilterValue(undefined)
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                                  )}
                                >
                                  <Check className={cn("h-3 w-3")} />
                                </div>
                                <span className="truncate">{option.label}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                        {selectedValues.size > 0 && (
                          <div className="border-t p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-center text-center"
                              onClick={() => column.setFilterValue(undefined)}
                            >
                              Clear filters
                            </Button>
                          </div>
                        )}
                      </CommandList>
                    </Command>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          )}

          {column.getCanPin() && (
            <>
              {isPinned === "left" ? (
                <DropdownMenuItem
                  onClick={() => column.pin(false)}
                  className="flex items-center gap-2 column-pin-active"
                >
                  <PinOff className="h-3.5 w-3.5" />
                  <span>Unpin from left</span>
                </DropdownMenuItem>
              ) : isPinned === "right" ? (
                <DropdownMenuItem
                  onClick={() => column.pin(false)}
                  className="flex items-center gap-2 column-pin-active"
                >
                  <PinOff className="h-3.5 w-3.5" />
                  <span>Unpin from right</span>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => column.pin("left")} className="flex items-center gap-2">
                    <Pin className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <span>Pin to left</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => column.pin("right")} className="flex items-center gap-2">
                    <Pin className="h-3.5 w-3.5 -rotate-90 text-muted-foreground/70" />
                    <span>Pin to right</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => column.toggleVisibility(false)} className="flex items-center gap-2">
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Hide column</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-2" asChild>
            <div onClick={(e) => e.stopPropagation()}>
              <Settings className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>Manage columns</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
