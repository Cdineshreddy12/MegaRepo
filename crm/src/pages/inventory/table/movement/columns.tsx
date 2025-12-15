// React Table and Column Definitions
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
} from "@/components/data-grid";
import { formatDate } from "@/utils/format";
import { InventoryMovement } from "@/services/api/inventoryService";
import { MovementActions } from "./actions";

export const columns: ColumnDef<InventoryMovement>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Movement Type" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("type")}</DataTableColumnCell>,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("quantity")}</DataTableColumnCell>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("createdAt") ? formatDate(row.getValue("createdAt")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated At" />,
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("updatedAt") ? formatDate(row.getValue("updatedAt")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <MovementActions row={row} />,
  },
];
