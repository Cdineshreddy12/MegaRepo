// React Table
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Checkbox } from "@/components/ui/checkbox";
import Typography from "@/components/common/Typography";
import {
  DataTableColumnCell,
  DataTableColumnHeader,
} from "@/components/data-grid";

// Icons
import { FileText, Calendar, Building, Tag } from "lucide-react";

// Actions
import { QuotationActions } from "./actions";

// Services and Utilities
import { Quotation } from "@/services/api/quotationService";
import {
  formatCurrency,
  formatDate,
  formatUser,
  validateObjectProp,
  validateUser,
} from "@/utils/format";
import UserCard from "@/components/common/UserCard";
import { toPrettyString } from "@/utils/common";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Quotation>[] = [
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
    accessorKey: "quotationNumber",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Quotation" />;
    },
    cell: ({ row }) => {
      const quotation = row.original;
      const noOfItems = quotation?.items?.length;
      return (
        <DataTableColumnCell.NameCard
          size="md"
          avatar={<FileText className="h-5 w-5 text-primary" />}
          primary={quotation?.quotationNumber}
          secondary={<Badge variant="outline">{noOfItems} {noOfItems === 1 ? "item" : "items"}</Badge>}
        />
      );
    },
  },
  {
    accessorKey: "accountId",
    accessorFn: (row) =>
      validateObjectProp(row.accountId, "companyName") ||
      validateObjectProp(row.accountId, "name"),
    id: "accountId",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Customer" />;
    },
    cell: ({ row }) => {
      return (
        <DataTableColumnCell icon={Building}>
          {validateObjectProp(row.original?.accountId, "name") ||
            validateObjectProp(row.original?.accountId, "companyName")}
        </DataTableColumnCell>
      );
    },
    filterFn: (row, columnId, filterValue) => {
      const value = row.getValue<string>(columnId)?.toLowerCase();
      return filterValue.some((v: string) =>
        value?.toLocaleLowerCase()?.includes(v.toLowerCase())
      );
    },
  },
  {
    accessorKey: "contactId",
    accessorFn: (row) => formatUser(row.contactId),
    id: "contactId",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Contact" />;
    },
    cell: ({ row }) => {
      return <UserCard user={validateUser(row?.original?.contactId)} />;
    },
  },
  {
    accessorKey: "oem",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="OEM" />;
    },
    cell: ({ row }) => {
      const oem = row.getValue<Quotation["oem"]>("oem");
      return (
        <DataTableColumnCell icon={Tag}>
          {toPrettyString(oem)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Status" />;
    },
    cell: ({ row }) => {
      const status = row.getValue<Quotation["status"]>("status");

      return (
        <DataTableColumnCell.ColorBadge value={status}>
          {toPrettyString(status)}
        </DataTableColumnCell.ColorBadge>
      );
    },
  },
  {
    accessorKey: "quoteCurrency",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Currency" />;
    },
    cell: ({ row }) => {
      const currency =
        row.getValue<Quotation["quoteCurrency"]>("quoteCurrency");
      return (
        <DataTableColumnCell variant="overline">{currency}</DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Total" />;
    },
    cell: ({ row }) => {
      const total = row.getValue<Quotation["total"]>("total");
      const currency =
        row.getValue<Quotation["quoteCurrency"]>("quoteCurrency") || "INR";

      return (
        <DataTableColumnCell variant="overline">
          {formatCurrency(total as number, currency as string)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "issueDate",
    accessorFn: (row) => formatDate(row?.issueDate),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Issue Date" />;
    },
    cell: ({ row }) => {
      const date = row.getValue<Quotation["issueDate"]>("issueDate");
      return (
        <DataTableColumnCell icon={Calendar} variant="overline">
          {date}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "validUntil",
    accessorFn: (row) => formatDate(row?.validUntil),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Valid Until" />;
    },
    cell: ({ row }) => {
      const date = row.getValue<Quotation["validUntil"]>("validUntil");
      const today = new Date();
      const validUntil = new Date(date as string);
      const isExpiring =
        validUntil.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
      const isExpired = validUntil < today;

      return (
        <DataTableColumnCell icon={Calendar} variant="overline">
          <Typography
            variant="overline"
            className={
              isExpired
                ? "text-red-600 text-nowrap"
                : isExpiring
                ? "text-amber-600"
                : ""
            }
          >
            {date}
          </Typography>
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "renewalTerm",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Renewal Term" />;
    },
    cell: ({ row }) => {
      const renewalTerm = row.getValue<Quotation["renewalTerm"]>("renewalTerm");
      return <DataTableColumnCell>{renewalTerm}</DataTableColumnCell>;
    },
  },
  {
    accessorKey: "createdAt",
    accessorFn: (row) => (row?.createdAt ? formatDate(row?.createdAt) : ""),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Created At" />;
    },
    cell: ({ row }) => {
      return (
        <DataTableColumnCell variant="overline">
          {row.getValue("createdAt")}
        </DataTableColumnCell>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <QuotationActions row={row} />,
  },
];
