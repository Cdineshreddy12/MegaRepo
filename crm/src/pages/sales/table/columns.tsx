// React Table and Column Definitions
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
} from "@/components/data-grid";
import { UserCard } from "@/components/common/UserCard";
import { tableCellFilterFns } from "@/components/data-grid/components/data-table-cell-render-utils";

import { SalesOrderActions } from "./actions";

// Types and Utilities
import {
  formatDate,
  formatAddress,
  formatUser,
  validateUser,
  formatCurrency,
} from "@/utils/format";
import { User } from "@/services/api/authService";
import { toPrettyString } from "@/utils/common";
import { SalesOrder } from "@/services/api/salesOrderService";

export const columns: ColumnDef<SalesOrder>[] = [
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
      const orderNumber = row.getValue<SalesOrder["orderNumber"]>("orderNumber");
      return (
        <DataTableColumnCell className="font-medium">
          {orderNumber}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "accountId",
    accessorFn: (row) => row.accountId?.name || row.accountId?.companyName || "",
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
    accessorKey: "opportunityId",
    accessorFn: (row) => row.opportunityId?.name || row.opportunityId?.title || "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Opportunity" />
    ),
    cell: ({ row }) => {
      const opportunity = row.original.opportunityId;
      return (
        <DataTableColumnCell>
          {opportunity?.name || opportunity?.title || "N/A"}
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
      const status = row.getValue<SalesOrder["status"]>("status");
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
    accessorKey: "orderDate",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Order Date" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("orderDate") ? formatDate(row.getValue("orderDate")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "deliveryDate",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Delivery Date" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("deliveryDate") ? formatDate(row.getValue("deliveryDate")) : "Not set"}
      </DataTableColumnCell>
    ),
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
        <DataTableColumnCell>
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
      const subtotal = row.getValue<SalesOrder["subtotal"]>("subtotal");
      return (
        <DataTableColumnCell className="text-right font-medium">
          {formatCurrency ? formatCurrency(subtotal) : `$${subtotal?.toFixed(2) || '0.00'}`}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "taxAmount",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Tax" />;
    },
    cell: ({ row }) => {
      const taxAmount = row.getValue<SalesOrder["taxAmount"]>("taxAmount");
      return (
        <DataTableColumnCell className="text-right">
          {formatCurrency ? formatCurrency(taxAmount) : `$${taxAmount?.toFixed(2) || '0.00'}`}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Total Amount" />;
    },
    cell: ({ row }) => {
      const totalAmount = row.getValue<SalesOrder["totalAmount"]>("totalAmount");
      return (
        <DataTableColumnCell className="text-right font-bold">
          {formatCurrency ? formatCurrency(totalAmount) : `$${totalAmount?.toFixed(2) || '0.00'}`}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "billingAddress",
    accessorFn: (row) => formatAddress(row.billingAddress),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Billing Address" />;
    },
    cell: ({ row }) => (
      <address className="max-w-sm text-sm truncate">
        {formatAddress(row?.original?.billingAddress)}
      </address>
    ),
  },
  {
    accessorKey: "shippingAddress",
    accessorFn: (row) => formatAddress(row.shippingAddress),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Shipping Address" />;
    },
    cell: ({ row }) => (
      <address className="max-w-sm text-sm truncate">
        {formatAddress(row?.original?.shippingAddress)}
      </address>
    ),
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
    accessorKey: "notes",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Notes" />;
    },
    cell: ({ row }) => {
      const notes = row.getValue<SalesOrder["notes"]>("notes");
      return (
        <DataTableColumnCell className="max-w-xs truncate">
          {notes || "No notes"}
        </DataTableColumnCell>
      );
    },
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
    cell: ({ row }) => <SalesOrderActions row={row} />,
  },
];