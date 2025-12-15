// React Table and Column Definitions
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
} from "@/components/data-grid";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { ProductActions } from "./actions";
import { Product } from "@/services/api/inventoryService";

export const columns: ColumnDef<Product>[] = [
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
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Product Name" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("name")}</DataTableColumnCell>,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("sku")}</DataTableColumnCell>,
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("category")}</DataTableColumnCell>,
  },

   {
    accessorKey: "quantity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("quantity")}</DataTableColumnCell>,
  },

  // {
  //   accessorKey: "brand",
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Brand" />,
  //   cell: ({ row }) => <DataTableColumnCell>{row.getValue("brand")}</DataTableColumnCell>,
  // },
  {
    accessorKey: "basePrice",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
    cell: ({ row }) => (
      <DataTableColumnCell>{formatCurrency(row.getValue("basePrice"))}</DataTableColumnCell>
    ),
  },
  {
    accessorKey: "sellingPrice",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Selling Price" />,
    cell: ({ row }) => (
      <DataTableColumnCell>{formatCurrency(row.getValue("sellingPrice"))}</DataTableColumnCell>
    ),
  },
 
  // {
  //   accessorKey: "minStockLevel",
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Min Stock Level" />,
  //   cell: ({ row }) => <DataTableColumnCell>{row.getValue("minStockLevel")}</DataTableColumnCell>,
  // },
   {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <DataTableColumnCell.ColorBadge value={row.getValue("status")}>
        {row.getValue("status")}
      </DataTableColumnCell.ColorBadge>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
    cell: ({ row }) => <DataTableColumnCell>{row.getValue("location")}</DataTableColumnCell>,
  },
 
  // {
  //   accessorKey: "warrantyPeriod",
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Warranty Period" />,
  //   cell: ({ row }) => (
  //     <DataTableColumnCell>{row.getValue("warrantyPeriod")} months</DataTableColumnCell>
  //   ),
  // },
  // {
  //   accessorKey: "taxRate",
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Tax Rate" />,
  //   cell: ({ row }) => <DataTableColumnCell>{row.getValue("taxRate")}%</DataTableColumnCell>,
  // },
  // {
  //   accessorKey: "description",
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
  //   cell: ({ row }) => <DataTableColumnCell>{row.getValue("description")}</DataTableColumnCell>,
  // },
  // {
  //   accessorKey: "specifications",
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Specifications" />,
  //   cell: ({ row }) => <DataTableColumnCell>{row.getValue("specifications")}</DataTableColumnCell>,
  // },
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ProductActions row={row} />,
  },
];
