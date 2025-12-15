import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnCell, DataTableColumnHeader, tableCellFilterFns } from "@/components/data-grid";
import {UserCard} from "@/components/common/UserCard";
import Typography from "@/components/common/Typography";
import { formatDate, formatDetails, formatName, formatUser } from "@/utils/format";
import { ActivityLog } from "@/types/ActivityLog.types";
import { ActionType, BaseUser, EntityType } from "@/types/common";
import { ENTITY } from "@/constants";
import { ActionBadge, EntityBadge } from "@/components/common/StatusBadge";

const hiddenProps: Record<EntityType, string[]> = {
  [ENTITY.ACCOUNT]: [],
  [ENTITY.LEAD]: [
    "id",
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "createdBy",
    "assignedTo",
  ],
  [ENTITY.CONTACT]: [
    "id",
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "createdBy",
    "accountId",
    "deleted",
  ],
  [ENTITY.OPPORTUNITY]: [
    "id",
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "createdBy",
    "assignedTo",
  ],
  [ENTITY.QUOTATION]: [
    "id",
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "createdBy",
    "assignedTo",
    "primaryContactId",
    "contactId",
  ],
  [ENTITY.USER]: ["id", "_id", "__v", "createdAt", "updatedAt", "createdBy"],
  [ENTITY.TICKET]: ["id", "_id", "__v", "createdAt", "updatedAt", "createdBy"],
  [ENTITY.ACTIVITY_LOG]: [] // Added missing key with an empty array
};

export const columns: ColumnDef<ActivityLog>[] = [
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
    accessorKey: "user",
    accessorFn: (row) => formatUser(row.user),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => {
      return <DataTableColumnCell.User user={row.original.user} />;
    },
    filterFn: tableCellFilterFns.user
  },
  {
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => {
      const action = row.getValue<ActionType>("action");
      return (
        <ActionBadge action={action} className="capitalize">
          {action?.toLocaleLowerCase()}
        </ActionBadge>
      );
    },
  },
  {
    accessorKey: "entityType",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Entity Type" />;
    },
    cell: ({ row }) => {
      const entityType = row.getValue<EntityType>("entityType");
      return (
        <EntityBadge entityType={entityType} className="capitalize">
          {entityType?.toLocaleLowerCase()}
        </EntityBadge>
      );
    },
  },
  {
    accessorKey: "details",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Details" />;
    },
    cell: ({ row }) => {
      const pastAction: Record<ActionType, string> = {
        CREATE: "Created",
        MODIFY: "Modified",
        DELETE: "Deleted",
        VIEW: "Viewed",
      };
      const entityType = row.getValue<EntityType>("entityType");
      const action = row.getValue<ActionType>("action");
      const user = formatName(row.original.user)

      if (!user) {
        return <Typography variant="body1">Action performed</Typography>;
      }
      
      return (
        <>
          <Typography variant="caption" className="text-pretty block text-sm">
          <span className="capitalize">{user}</span>{` has ${pastAction[action]} ${entityType}`.toLowerCase()}
          </Typography>
          {/* {(action === "MODIFY" || action === "DELETE") && entityType !== 'ACTIVITY_LOG'
             ? <Typography variant="caption" className="text-xs font-mono bg-slate-100">
              {formatDetails(
                row.getValue("details"),
                entityType,
                hiddenProps,
              )}
             </Typography>
            : null} */}
        </>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => <Typography variant="overline" className="text-nowrap">{formatDate(row.getValue("createdAt"))}</Typography>,
  },
];
