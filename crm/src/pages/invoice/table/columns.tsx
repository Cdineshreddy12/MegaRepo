// React Table and Column Definitions
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
} from "@/components/data-grid";
import { tableCellFilterFns } from "@/components/data-grid/components/data-table-cell-render-utils";

import { InvoiceActions } from "./actions";

// Types and Utilities
import {
  formatDate,
  validateUser,
  formatCurrency,
} from "@/utils/format";
import { User } from "@/services/api/authService";
import { Invoice } from "@/services/api/invoiceService";
import { Account } from "@/services/api/accountService";

export const columns: ColumnDef<Invoice>[] = [
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
    accessorKey: "invoiceNumber",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Invoice Number" />;
    },
    cell: ({ row }) => {
      const invoiceNumber = row.getValue<Invoice["invoiceNumber"]>("invoiceNumber");
      return (
        <DataTableColumnCell className="font-medium">
          {invoiceNumber}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "salesOrderId",
    accessorFn: (row) => row.salesOrderId || "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sales Order" />
    ),
    cell: ({ row }) => {
      const salesOrder = (row.original?.salesOrderId as unknown as { _id: string; orderNumber: string})?.orderNumber || "N/A";
      return (
        <DataTableColumnCell>
          {salesOrder}
        </DataTableColumnCell>
      );
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "accountId",
    accessorFn: (row) => (row.accountId as Account)?.companyName || "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),
    cell: ({ row }) => {
      const account = row.original.accountId;
      return (
        <DataTableColumnCell>
          {account?.companyName || "N/A"}
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
      const status = row.getValue<Invoice["status"]>("status");
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
    accessorKey: "issueDate",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Issue Date" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("issueDate") ? formatDate(row.getValue("issueDate")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Due Date" />;
    },
    cell: ({ row }) => (
      <DataTableColumnCell variant="overline" className="text-xs">
        {row.getValue("dueDate") ? formatDate(row.getValue("dueDate")) : ""}
      </DataTableColumnCell>
    ),
  },
  {
    accessorKey: "subtotal",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Subtotal" />;
    },
    cell: ({ row }) => {
      const subtotal = row.getValue<Invoice["subtotal"]>("subtotal");
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
      const taxAmount = row.getValue<Invoice["taxAmount"]>("taxAmount");
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
      const totalAmount = row.getValue<Invoice["totalAmount"]>("totalAmount");
      return (
        <DataTableColumnCell className="text-right font-bold">
          {formatCurrency ? formatCurrency(totalAmount) : `$${totalAmount?.toFixed(2) || '0.00'}`}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "amountPaid",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Amount Paid" />;
    },
    cell: ({ row }) => {
      const amountPaid = row.getValue<Invoice["amountPaid"]>("amountPaid");
      return (
        <DataTableColumnCell className="text-right font-medium">
          {formatCurrency ? formatCurrency(amountPaid) : `$${amountPaid?.toFixed(2) || '0.00'}`}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "balance",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Balance" />;
    },
    cell: ({ row }) => {
      const balance = row.getValue<Invoice["balance"]>("balance");
      const isOverdue = balance > 0 && new Date(row.getValue("dueDate")) < new Date();
      return (
        <DataTableColumnCell 
          className={`text-right font-bold ${isOverdue ? 'text-red-600' : balance === 0 ? 'text-green-600' : ''}`}
        >
          {formatCurrency ? formatCurrency(balance) : `$${balance?.toFixed(2) || '0.00'}`}
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
      const paymentTerms = row.getValue<Invoice["paymentTerms"]>("paymentTerms");
      return (
        <DataTableColumnCell className="max-w-xs truncate">
          {paymentTerms || "Standard"}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "paymentHistory",
    accessorFn: (row) => row.paymentHistory?.length || 0,
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Payments" />;
    },
    cell: ({ row }) => {
      const paymentCount = row.original.paymentHistory?.length || 0;
      return (
        <DataTableColumnCell>
          {paymentCount} {paymentCount === 1 ? 'payment' : 'payments'}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "notes",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Notes" />;
    },
    cell: ({ row }) => {
      const notes = row.getValue<Invoice["notes"]>("notes");
      return (
        <DataTableColumnCell className="max-w-xs truncate">
          {notes || "No notes"}
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
    cell: ({ row }) => <InvoiceActions row={row} />,
  },
];