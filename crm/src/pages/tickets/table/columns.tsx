import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader, DataTableColumnCell } from "@/components/data-grid";
import { TicketActions } from "./actions";
import { Ticket } from "@/services/api/ticketService";
import { BoxIcon, Building, User } from "lucide-react";
import { formatDate, formatName, formatUser, validateUser } from "@/utils/format";

export const columns: ColumnDef<Ticket>[] = [
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
        accessorKey: "oem",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="OEM" />;
        },
        cell: ({ row }) => {
            const companyName = row.getValue<Ticket['oem']>("oem");
            return (
                <DataTableColumnCell className="text-sm font-medium text-gray-900" icon={Building}>
                {companyName}
                </DataTableColumnCell>
            );
        },
    },
    {
        accessorKey: "productName",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Product" />;
        },
        cell: ({ row }) => {
            const product = row.getValue<Ticket['productName']>("productName");
            return <DataTableColumnCell icon={BoxIcon}>{product}</DataTableColumnCell>;
        },
    },
    {
        accessorFn: (row) => formatUser(row?.assignedTo),
        accessorKey: "assignedTo",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Assigned To" />;
        },
        cell: ({ row }) => {
            const assignedTo = row.original?.assignedTo
            
            return (
                <DataTableColumnCell.User user={validateUser(assignedTo)}/>
            );
        },
    },
    {
        accessorFn: (row) => formatUser(row?.createdBy),
        accessorKey: "createdBy",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Created By" />;
        },
        cell: ({ row }) => {
            const creator = row.original?.createdBy;
            
            return (
                <DataTableColumnCell.User user={validateUser(creator)}/>

            );
        },
    },
    {
        accessorKey: "typeOfSupport",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Type" />;
        },
        cell: ({ row }) => {
            const ticketType = row.getValue<Ticket['typeOfSupport']>("typeOfSupport");
            return <DataTableColumnCell>{ticketType}</DataTableColumnCell>;
        },
    },
    {
        accessorKey: "supportLevel",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Support Level" />;
        },
        cell: ({ row }) => {
            const supportLevel = row.getValue<Ticket['supportLevel']>("supportLevel") || "N/A";
            return <DataTableColumnCell variant="overline">{supportLevel}</DataTableColumnCell>;
        },
    },
    {
        accessorKey: "status",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Status" />;
        },
        cell: ({ row }) => {
            const status = row.getValue<Ticket['status']>("status");
            return (
                <DataTableColumnCell.ColorBadge value={status}>
                    {status}
                </DataTableColumnCell.ColorBadge>
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            return <DataTableColumnHeader column={column} title="Created At" />;
        },
        cell: ({ row }) => {
            const createdAt = row.getValue<Ticket['createdAt']>("createdAt");
            return <DataTableColumnCell variant="overline">{createdAt ? formatDate(createdAt) : ""}</DataTableColumnCell>;
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <TicketActions row={row} />,
    },
];