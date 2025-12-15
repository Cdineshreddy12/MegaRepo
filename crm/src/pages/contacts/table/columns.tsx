// External libraries
import { ColumnDef } from "@tanstack/react-table";

// UI components./actions
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  tableCellFilterFns,
  DataTableColumnCell,
} from "@/components/data-grid";
import { UserCard } from "@/components/common/UserCard";

// Local components
import { ContactActions } from "./actions";

// Utilities
import { formatDate, formatName, formatUser, validateObjectProp, validateUser } from "@/utils/format";

// Types
import { Contact } from "@/services/api/contactService";

// Optional imports
// import { formatPhoneNumber } from "react-phone-number-input";

export const columns: ColumnDef<Contact>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
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
    id: "name",
    accessorFn: (row) => formatName(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const firstName = row.original?.firstName || "";
      const lastName = row.original?.lastName || "";
      const email = row.original?.email || ""
      return (
        <UserCard
          user={{
            firstName,
            lastName,
            email
          }}
        />
      );
    },
  },
  {
    accessorKey: "createdBy", // Keep this if you want to use row.getValue
    accessorFn: (row) => formatUser(row?.createdBy),
    id: "createdBy", // Required when using accessorFn and accessorKey together
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdBy; // Use original to access full object
      return (
        <UserCard
          user={validateUser(createdBy)}
          disableClick
        />
      );
    },
    filterFn: tableCellFilterFns.user,
    enableColumnFilter: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const email = row.getValue<Contact['email']>("email");
      return <DataTableColumnCell renderAs="email">{email}</DataTableColumnCell>;
    },
  },
  {
    accessorKey: "accountId",
    accessorFn: (row) => validateObjectProp(row.accountId, 'companyName'),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),

    cell: ({ row }) => {
      const account = row.getValue<Contact['accountId']>("accountId");
      return <DataTableColumnCell> {validateObjectProp(account, 'companyName')}</DataTableColumnCell>;
    },
  },

  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => (
      <DataTableColumnCell>{row.getValue("phone")}</DataTableColumnCell>
    ),
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Department" />
    ),
    cell: ({ row }) => {
      const department = row.getValue<Contact['department']>("department")
    return  <DataTableColumnCell.ColorBadge value={department|| ''}>{department}</DataTableColumnCell.ColorBadge>
    },
  },
  {
    accessorKey: "createdAt",
    accessorFn: (row) => row?.createdAt ? formatDate(row.createdAt) : "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),

    cell: ({ row }) => {
      const createdAt = row.getValue<Contact['createdAt']>("createdAt");
      return (
        <DataTableColumnCell variant="overline">
          {String(createdAt)}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    accessorFn: (row) => row?.updatedAt ? formatDate(row.updatedAt) : "",

    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Updated At" />
    ),

    cell: ({ row }) => {
      const updatedAt = row.getValue<Contact['updatedAt']>("updatedAt");
      return (
        <DataTableColumnCell variant="overline">
          {String(updatedAt)}
        </DataTableColumnCell>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ContactActions row={row} />,
  },
];
