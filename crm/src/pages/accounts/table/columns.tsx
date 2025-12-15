import { ColumnDef, Row } from "@tanstack/react-table";
import { Building, Phone, Users, MapPin } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  tableCellFilterFns,
  DataTableColumnCell,
} from "@/components/data-grid";

import { Account } from "@/services/api/accountService";

import { AccountActions } from "./actions";
import { formatDate, formatUser, validateUser } from "@/utils/format";
import { toPrettyString } from "@/utils/common";
import { NameCard, UserCard } from "@/components/common/UserCard";
import { AccountWithMetadata } from "../types";
import { FormTemplate } from "@/components/template-builder/form-builder";
import { generateTableColumnsFromTemplate, isFieldVisibleInTable } from "@/utils/dynamicFields";

const baseColumns: ColumnDef<Account>[] = [
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
    accessorKey: "companyName",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Account" />;
    },
    cell: ({ row }) => {
      const companyName = row.getValue<Account["companyName"]>("companyName");
      const website = row.original?.website;
      return (
        <NameCard
          primary={companyName}
          secondary={website}
          avatar={<Building className="h-5 w-5 text-primary" />}
        />
      );
    },
  },
  {
    accessorKey: "createdBy", // Keep this if you want to use row.getValue
    accessorFn: (row) => formatUser(row.createdBy),
    id: "createdBy", // Required when using accessorFn and accessorKey together
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original?.createdBy
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
    accessorKey: "phone",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Phone" />;
    },
    cell: ({ row }) => {
      const phone = row.getValue<Account["phone"]>("phone");
      return (
        <DataTableColumnCell renderAs="tel" variant="overline" icon={Phone}>
          {phone}
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
      const industry = row.getValue<Account["industry"]>("industry") || '';
      return (
        <DataTableColumnCell.ColorBadge value={industry}>
          {industry}
        </DataTableColumnCell.ColorBadge>
      );
    },
  },
  {
    accessorKey: "accountType",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Type" />;
    },
    cell: ({ row }) => {
      const accountType = row.getValue<Account["accountType"]>("accountType");
      return (
        <DataTableColumnCell className="capitalize">
          {accountType}
        </DataTableColumnCell>
      );
    },
  },
  // {
  //   accessorKey: "segment",
  //   header: ({ column }) => {
  //     return <DataTableColumnHeader column={column} title="Segment" />;
  //   },
  //   cell: ({ row }) => {
  //     const segment = row.getValue<Account["segment"]>("segment");
  //     return (
  //       <DataTableColumnCell className="capitalize">
  //         {segment}
  //       </DataTableColumnCell>
  //     );
  //   },
  // },
  {
    accessorKey: "employeesCount",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Employees" />;
    },
    cell: ({ row }) => {
      const employeesCount =
        row.getValue<Account["employeesCount"]>("employeesCount");
      return (
        <DataTableColumnCell icon={Users}>{employeesCount}</DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "zone",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Zone" />;
    },
    cell: ({ row }) => {
      const zone = row.getValue<Account["zone"]>("zone");
      return <DataTableColumnCell icon={MapPin}>{zone}</DataTableColumnCell>;
    },
  },
  {
    accessorKey: "ownershipType",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Ownership" />;
    },
    cell: ({ row }) => {
      const ownershipType =
        row.getValue<Account["ownershipType"]>("ownershipType");
      return (
        <DataTableColumnCell>
          {toPrettyString(ownershipType || '')}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "invoicing",
    accessorFn: (row) => row.invoicing ? toPrettyString(row.invoicing) : row.invoicing,
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Invoicing" />;
    },
    cell: ({ row }) => {
      const invoicing = row.getValue<Account["invoicing"]>("invoicing");
      return (
        <DataTableColumnCell>{invoicing}</DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "creditTerm",
    accessorFn: (row) => row.creditTerm ? toPrettyString(row.creditTerm): row.creditTerm,
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Credit Term" />;
    },
    cell: ({ row }) => {
      const creditTerm = row.getValue<Account["creditTerm"]>("creditTerm");
      return (
        <DataTableColumnCell>{creditTerm}</DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "createdAt",
    accessorFn: (row) => {
      const rowData = (row as AccountWithMetadata)
      return rowData?.createdAt ? formatDate(rowData?.createdAt): rowData?.createdAt},
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
    cell: ({ row }) => <AccountActions row={row as unknown as Row<Account>} />,
  },
];

/**
 * Check if website should be shown in companyName column based on template
 */
function shouldShowWebsite(template?: FormTemplate | null): boolean {
  return isFieldVisibleInTable("website", template);
}

/**
 * Get columns with dynamic fields from template
 */
export function getColumns(template?: FormTemplate | null): ColumnDef<Account>[] {
  const showWebsite = shouldShowWebsite(template);
  
  // Create a modified baseColumns array with conditional website display
  const modifiedBaseColumns = baseColumns.map((col) => {
    if (col.accessorKey === "companyName") {
      return {
        ...col,
        cell: ({ row }) => {
          const companyName = row.getValue<Account["companyName"]>("companyName");
          const website = showWebsite ? row.original?.website : undefined;
          return (
            <NameCard
              primary={companyName}
              secondary={website}
              avatar={<Building className="h-5 w-5 text-primary" />}
            />
          );
        },
      };
    }
    return col;
  });

  return generateTableColumnsFromTemplate(template, modifiedBaseColumns);
}

/**
 * Default columns export (for backward compatibility)
 */
export const columns = baseColumns;
