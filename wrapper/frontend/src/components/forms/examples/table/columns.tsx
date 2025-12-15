import { Calendar, Building } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DataTableColumnHeader,
  DataTableColumnCell,
  tableCellFilterFns,
} from "@/components/data-grid";
import Typography from "@/components/common/Typography";

import { OpportunityActions } from "./actions";

import { Opportunity } from "@/services/api/opportunityService";

import {
  formatCurrency,
  formatDate,
  formatUser,
  validateObjectProp,
  validateUser,
} from "@/utils/format";
import { toPrettyString } from "@/utils/common";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/services/api/authService";

export const columns: ColumnDef<Opportunity>[] = [
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
    accessorKey: "createdBy", // Keep this if you want to use row.getValue
    accessorFn: (row) => formatUser(row.createdBy),
    id: "createdBy", // Required when using accessorFn and accessorKey together
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created By" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdBy; // Use original to access full object
      return <DataTableColumnCell.User user={validateUser(createdBy)} />;
    },
    filterFn: tableCellFilterFns.user,
    enableColumnFilter: true,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Opportunity Name" />;
    },
    cell: ({ row }) => {
      const opportunityName = row.getValue("name") as string;

      if (!opportunityName) return <Typography>—</Typography>;

      // Split the name by underscore
      const parts = opportunityName?.split("_");

      if (parts.length >= 2) {
        // First part is the OEM label
        const oemLabel = parts[0];
        // Rest could be multiple parts with underscores
        const customPart = parts.slice(1).join("_");

        return (
          <DataTableColumnCell.StyleLabel
            prefix={oemLabel}
            suffix={customPart}
          />
        );
      }

      // If there's no underscore, just show the whole value
      return <DataTableColumnCell>{opportunityName}</DataTableColumnCell>;
    },
  },
  {
    accessorKey: "accountId",
    accessorFn: (row) =>
      validateObjectProp(row.accountId, "companyName") ||
      validateObjectProp(row.accountId, "name"),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Account" />;
    },
    cell: ({ row }) => {
      const accountData = row.original.accountId;
      const accountName = validateObjectProp(accountData, "companyName");
      const name = validateObjectProp(accountData, "name");
      return (
        <DataTableColumnCell icon={Building}>
          {accountName || name}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "primaryContactId",
    accessorFn: (row) => formatUser(row.primaryContactId),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Primary Contact" />;
    },
    cell: ({ row }) => {
      // Handle contact information safely
      const contact = row.original.primaryContactId as unknown as Partial<User>;

      return <DataTableColumnCell.User user={contact} />;
    },
    filterFn: tableCellFilterFns.user,
  },
  {
    accessorKey: "stage",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Stage" />;
    },
    cell: ({ row }) => {
      const stage = row.getValue<Opportunity["stage"]>("stage");

      return (
        <DataTableColumnCell.ColorBadge value={stage}>
          {toPrettyString(stage)}
        </DataTableColumnCell.ColorBadge>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Status" />;
    },
    cell: ({ row }) => {
      const status = row.getValue<Opportunity["status"]>("status");
      return (
        <DataTableColumnCell.ColorBadge value={status}>
          {toPrettyString(status)}
        </DataTableColumnCell.ColorBadge>
      );
    },
  },
  {
    accessorKey: "revenue",
    accessorFn: (row) => {
      return formatCurrency(row.revenue);
    },
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Revenue" />;
    },
    cell: ({ row }) => {
      const revenue = row.getValue<Opportunity["revenue"]>("revenue") || 0;
      return (
        <DataTableColumnCell variant="overline">{revenue}</DataTableColumnCell>
      );
    },
    filterFn: (row, columnId, filterValue) => {
      const value = row.getValue<string>(columnId);
      return filterValue.some((v: (typeof filterValue)[number]) => v == value);
    },
  },
  {
    accessorKey: "services",
    accessorFn: (row) =>
      row.services
        ?.map((service) => service.serviceType)
        ?.map(toPrettyString)
        ?.join(", "), // normalize to an array (never undefined/null)
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Services" />;
    },
    cell: ({ row }) => {
      if (!row?.original?.services || row.original.services.length === 0) {
        return (
          <DataTableColumnCell
            variant="overline"
            className="text-muted-foreground"
          >
            No Services
          </DataTableColumnCell>
        );
      }
      return (
        <div className="block">
          {row?.original?.services?.map((service) => {
            const serviceName = service?.serviceType || "unknown_service";
            const serviceRevenue = service?.serviceRevenue || 0;
            return (
              <div
                className="flex p-1 border border-slate-300"
                key={serviceName}
              >
                <DataTableColumnCell.ColorBadge value={serviceName}>
                  {toPrettyString(serviceName)}
                </DataTableColumnCell.ColorBadge>
                <span className="text-gray-400 mx-1">|</span>
                <Badge className="mr-1 font-normal">
                  {formatCurrency(serviceRevenue)}
                </Badge>
              </div>
            );
          })}
        </div>
      );
    },
    filterFn: (row, columnId, filterValue: string[]) => {
      const services = row.getValue(columnId) as { serviceType: string }[];
      return filterValue.some((v: string) => {
        if (Array.isArray(services))
          return services.some(
            (s) => toPrettyString(s.serviceType) === toPrettyString(v)
          );
        return toPrettyString(services) === toPrettyString(v);
      });
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "expectedProfit",
    accessorFn: (row) => formatCurrency(row.expectedProfit ?? 0),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Expected Profit" />;
    },
    cell: ({ row }) => {
      const expectedProfit =
        row.getValue<Opportunity["expectedProfit"]>("expectedProfit") ?? 0;
      return (
        <DataTableColumnCell variant="overline">
          {expectedProfit}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "profitability",
    accessorFn: (row) => `${row.profitability}%`,
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Profitability" />;
    },
    cell: ({ row }) => {
      const profitability =
        row.getValue<Opportunity["profitability"]>("profitability") || 0;
      return (
        <DataTableColumnCell variant="overline">
          {profitability}
        </DataTableColumnCell>
      );
    },
    filterFn: (row, columnId, filterValue) => {
      const profitability =
        row.getValue<Opportunity["profitability"]>(columnId) || 0;
      return filterValue.includes(String(profitability));
    },
  },

  {
    accessorKey: "expectedCloseDate",
    accessorFn: (row) =>
      row?.expectedCloseDate ? formatDate(row.expectedCloseDate) : "",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Expected Close" />;
    },
    cell: ({ row }) => {
      const date =
        row.getValue<Opportunity["expectedCloseDate"]>("expectedCloseDate");
      return (
        <DataTableColumnCell icon={Calendar} variant="overline">
          {date}
        </DataTableColumnCell>
      );
    },
  },
  {
    accessorKey: "assignedTo",
    accessorFn: (row) => formatUser(row.assignedTo),
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Owner" />;
    },
    cell: ({ row }) => {
      // Handle assignedTo safely
      const assignedTo = row?.original?.assignedTo;

      if (!assignedTo)
        return <DataTableColumnCell>Unassigned</DataTableColumnCell>;
      return <DataTableColumnCell.User user={assignedTo as Partial<User>} />;
    },
    filterFn: tableCellFilterFns.user,
    enableColumnFilter: true,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <OpportunityActions row={row} />,
  },
];
