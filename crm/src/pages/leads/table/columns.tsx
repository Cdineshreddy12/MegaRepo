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

import { LeadActions } from "./actions";

// Types and Utilities
import { Lead } from "@/services/api/leadService";
import {
  formatDate,
  formatAddress,
  formatUser,
  validateUser,
} from "@/utils/format";
import { User } from "@/services/api/authService";
import { toPrettyString } from "@/utils/common";

export const columns: ColumnDef<Lead>[] = [
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
    accessorKey: "firstName",
    accessorFn: (row) => formatUser(row),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Lead" />;
    },
    cell: ({ row }) => {
      const validatedUser = validateUser(row.original as unknown as User);
      return <UserCard user={validatedUser} disableClick />;
    },
    // Define the column meta options for sorting, filtering, and view options
    // By default, the column will not be filtered. Set to `true` to enable filtering.
    enableColumnFilter: true,
  },
  {
    accessorKey: "createdBy", // Keep this if you want to use row.getValue
    accessorFn: (row) =>
      `${row.createdBy?.firstName} ${row.createdBy?.lastName}`, // For filtering/sorting
    id: "createdBy", // Required when using accessorFn and accessorKey together
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdBy as unknown as User; // Use original to access full object
      return (
        <DataTableColumnCell.User user={validateUser(createdBy)} disableClick />
      );
    },
    filterFn: tableCellFilterFns.user,
    enableColumnFilter: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Contact Info" />;
    },
    cell: ({ row }) => {
      const email = row.getValue<Lead["email"]>("email");
      return (
        <DataTableColumnCell renderAs="email">{email}</DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Phone" />;
    },
    cell: ({ row }) => {
      const phone = row.getValue<Lead["phone"]>("phone");
      return <DataTableColumnCell renderAs="tel">{phone}</DataTableColumnCell>;
    },
  },
  {
    accessorKey: "companyName",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Company Name" />;
    },
    cell: ({ row }) => {
      const company = row.getValue<Lead["companyName"]>("companyName");
      return (
        <DataTableColumnCell className="capitalize">
          {company}
        </DataTableColumnCell>
      );
    },
  },

  {
    accessorKey: "industry",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Industry" />;
    },
    cell: ({ row }) => {
      const industry = row.getValue<Lead["industry"]>("industry");
      return (
        <DataTableColumnCell className="capitalize">
          {industry}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "jobTitle",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Job TItle" />;
    },
    cell: ({ row }) => {
      const jobTitle = row.getValue<Lead["jobTitle"]>("jobTitle");
      return (
        <DataTableColumnCell className="capitalize">
          {jobTitle}
        </DataTableColumnCell>
      );
    },
  },

  {
    accessorKey: "source",
    accessorFn: (row) => toPrettyString(row.source || ""),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Source" />;
    },
    cell: ({ row }) => {
      const source = row.getValue<Lead["source"]>("source");
      return <DataTableColumnCell>{source}</DataTableColumnCell>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Status" />;
    },
    cell: ({ row }) => {
      const status = row.getValue<Lead["status"]>("status");
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
    accessorKey: "score",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Score" />;
    },
    cell: ({ row }) => {
      const score = row.getValue<Lead["score"]>("score");

      return (
        <div className="flex items-center">
          <span
            className={`text-sm font-medium
            ${
              score && score >= 80
                ? "text-green-600"
                : score && score >= 60
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {score ? `${score}%` : "0%"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "product",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Product" />;
    },
    cell: ({ row }) => {
      const product = row.getValue<Lead["product"]>("product");
      return (
        <DataTableColumnCell className="capitalize">
          {product}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "address",
    accessorFn: (row) => formatAddress(row.address),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Address" />;
    },
    cell: ({ row }) => (
      <address className="max-w-sm text-sm truncate">
        {formatAddress(row?.original?.address)}
      </address>
    ),
  },
  {
    accessorKey: "zone",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Zone" />;
    },
    cell: ({ row }) => {
      const zone = row.getValue<Lead["zone"]>("zone");
      return (
        <DataTableColumnCell variant="overline">{zone}</DataTableColumnCell>
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <LeadActions row={row} />,
  },
];
