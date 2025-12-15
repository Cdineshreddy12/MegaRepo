import { AlignJustify, AlignVerticalJustifyCenter, AlignVerticalSpaceAround } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { TableDensity } from "./data-table"

interface DataTableDensityToggleProps {
  density: TableDensity
  setDensity: (density: TableDensity) => void
}

export function DataTableDensityToggle({ density, setDensity }: DataTableDensityToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {density === "compact" ? (
            <AlignJustify className="h-4 w-4" />
          ) : density === "spacious" ? (
            <AlignVerticalSpaceAround className="h-4 w-4" />
          ) : (
            <AlignVerticalJustifyCenter className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline-block">Density</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDensity("compact")} className="flex items-center gap-2">
          <AlignJustify className="h-4 w-4" />
          <span>Compact</span>
          {density === "compact" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDensity("default")} className="flex items-center gap-2">
          <AlignVerticalJustifyCenter className="h-4 w-4" />
          <span>Default</span>
          {density === "default" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDensity("spacious")} className="flex items-center gap-2">
          <AlignVerticalSpaceAround className="h-4 w-4" />
          <span>Spacious</span>
          {density === "spacious" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
