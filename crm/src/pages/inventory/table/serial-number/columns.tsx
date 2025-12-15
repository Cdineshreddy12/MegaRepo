// React Table and Column Definitions
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
} from "@/components/data-grid";
import { formatDate } from "@/utils/format";
import { InventorySerialNumber } from "@/services/api/inventoryService";
import { SerialNumberActions } from "./actions";

export const columns: ColumnDef<InventorySerialNumber>[] = [
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
    accessorKey: "serialNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Serial Number" />
    ),
    cell: ({ row }) => (
      <DataTableColumnCell>{row.getValue("serialNumber")}</DataTableColumnCell>
    ),
  },
  {
    accessorKey: "warrantyStart",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Warranty Start" />
    ),
    cell: ({ row }) => (
      <DataTableColumnCell>
        {row.getValue("warrantyStart")
          ? formatDate(row.getValue("warrantyStart"))
          : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "warrantyEnd",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Warranty End" />
    ),
    cell: ({ row }) => (
      <DataTableColumnCell>
        {row.getValue("warrantyEnd")
          ? formatDate(row.getValue("warrantyEnd"))
          : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("createdAt")
          ? formatDate(row.getValue("createdAt"))
          : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("updatedAt")
          ? formatDate(row.getValue("updatedAt"))
          : ""}
      </DataTableColumnCell>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <SerialNumberActions row={row} />,
  },
];