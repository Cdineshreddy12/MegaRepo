// React Table and Column Definitions
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
} from "@/components/data-grid";
import { tableCellFilterFns } from "@/components/data-grid/components/data-table-cell-render-utils";

import { ProductOrderActions } from "./actions";

// Types and Utilities
import {
  formatDate,
  validateUser,
  formatCurrency,
} from "@/utils/format";
import { User } from "@/services/api/authService";
import { ProductOrder } from "@/services/api/productOrderService";

export const columns: ColumnDef<ProductOrder>[] = [
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
    accessorKey: "orderNumber",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Order Number" />;
    },
    cell: ({ row }) => {
      const orderNumber = row.getValue<ProductOrder["orderNumber"]>("orderNumber");
      return (
        <DataTableColumnCell className="font-medium">
          {orderNumber}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "srdar",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Srdar" />;
    },
    cell: ({ row }) => {
      const srdar = row.getValue<ProductOrder["srdar"]>("srdar");
      return (
        <DataTableColumnCell>
          {srdar || "N/A"}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "accountId",
    accessorFn: (row) =>  row.accountId?.companyName || "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),
    cell: ({ row }) => {
      const account = row.original.accountId;
      return (
        <DataTableColumnCell>
          {account?.name || account?.companyName || "N/A"}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "contact",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Contact" />;
    },
    cell: ({ row }) => {
      const contact = row.getValue<ProductOrder["contact"]>("contact");
      return (
        <DataTableColumnCell>
          {contact || "N/A"}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Status" />;
    },
    cell: ({ row }) => {
      const status = row.getValue<ProductOrder["status"]>("status");
      return (
        <DataTableColumnCell.ColorBadge value={status}>
          {status}
        </DataTableColumnCell.ColorBadge>
      );
    },
    meta: {
      filterVariant: "select",
    },
  },
  {
    accessorKey: "expectedDeliveryDate",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Expected Delivery" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("expectedDeliveryDate") ? formatDate(row.getValue("expectedDeliveryDate")) : "Not set"}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "shippingMethod",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Shipping Method" />;
    },
    cell: ({ row }) => {
      const shippingMethod = row.getValue<ProductOrder["shippingMethod"]>("shippingMethod");
      return (
        <DataTableColumnCell>
          {shippingMethod || "N/A"}
        </DataTableColumnCell>
      );
    },
    meta: {
      filterVariant: "select",
    },
  },
  {
    accessorKey: "freightTerms",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Freight Terms" />;
    },
    cell: ({ row }) => {
      const freightTerms = row.getValue<ProductOrder["freightTerms"]>("freightTerms");
      return (
        <DataTableColumnCell>
          {freightTerms || "N/A"}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "currency",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Currency" />;
    },
    cell: ({ row }) => {
      const currency = row.getValue<ProductOrder["currency"]>("currency");
      return (
        <DataTableColumnCell className="text-center">
          {currency || "INR"}
        </DataTableColumnCell>
      );
    },
    meta: {
      filterVariant: "select",
    },
  },
  {
    accessorKey: "exchangeRate",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Exchange Rate" />;
    },
    cell: ({ row }) => {
      const exchangeRate = row.getValue<ProductOrder["exchangeRate"]>("exchangeRate");
      return (
        <DataTableColumnCell className="text-right">
          {exchangeRate || "1.00"}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "items",
    accessorFn: (row) => row.items?.length || 0,
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Items" />;
    },
    cell: ({ row }) => {
      const itemCount = row.original.items?.length || 0;
      return (
        <DataTableColumnCell className="text-center">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "subtotal",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Subtotal" />;
    },
    cell: ({ row }) => {
      const subtotal = row.getValue<ProductOrder["subtotal"]>("subtotal");
      return (
        <DataTableColumnCell className="text-right font-medium">
          {formatCurrency(subtotal || 0)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "gstTotal",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="GST" />;
    },
    cell: ({ row }) => {
      const gstTotal = row.getValue<ProductOrder["gstTotal"]>("gstTotal");
      return (
        <DataTableColumnCell className="text-right">
          {formatCurrency(gstTotal || 0)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "freightCharges",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Freight Charges" />;
    },
    cell: ({ row }) => {
      const freightCharges = row.getValue<ProductOrder["freightCharges"]>("freightCharges");
      return (
        <DataTableColumnCell className="text-right">
          {formatCurrency(freightCharges || 0)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Total Amount" />;
    },
    cell: ({ row }) => {
      const total = row.getValue<ProductOrder["total"]>("total");
      return (
        <DataTableColumnCell className="text-right font-bold">
          {formatCurrency(total || 0)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "paymentTerms",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Payment Terms" />;
    },
    cell: ({ row }) => {
      const paymentTerms = row.getValue<ProductOrder["paymentTerms"]>("paymentTerms");
      return (
        <DataTableColumnCell className="max-w-xs truncate">
          {paymentTerms || "Not specified"}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "priceTerms",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Price Terms" />;
    },
    cell: ({ row }) => {
      const priceTerms = row.getValue<ProductOrder["priceTerms"]>("priceTerms");
      return (
        <DataTableColumnCell className="max-w-xs truncate">
          {priceTerms || "Not specified"}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "createdBy",
    accessorFn: (row) =>
      `${row.createdBy?.firstName} ${row.createdBy?.lastName}`,
    id: "createdBy",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdBy as unknown as User;
      return (
        <DataTableColumnCell.User user={validateUser(createdBy)} disableClick />
      );
    },
    filterFn: tableCellFilterFns.user,
    enableColumnFilter: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Created At" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("createdAt") ? formatDate(row.getValue("createdAt")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Updated At" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("updatedAt") ? formatDate(row.getValue("updatedAt")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ProductOrderActions row={row} />,
  },
];