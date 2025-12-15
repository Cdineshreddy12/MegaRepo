import { ColumnDef } from "@tanstack/react-table";
import { MailIcon, MapPin, PhoneIcon, UserIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  tableCellFilterFns,
  DataTableColumnCell,
} from "@/components/data-grid";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


import { UserActions } from "./actions";
import { formatDate, formatName, formatUser, validateUser } from "@/utils/format";
import { UserCard } from "@/components/common/UserCard";
import { User } from "@/services/api/authService";
import { UserAvatar } from "@/components/common/UserAvatar";
import { toPrettyString } from "@/utils/common";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<User>[] = [
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
    id: 'name',
    accessorFn: (row) => {
      // More robust defensive check
      if (!row || typeof row !== 'object') {
        console.warn('name accessorFn: row is invalid:', row);
        return 'Unknown User';
      }
      return formatName(row);
    },
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Name" />;
    },
    cell: ({ row }) => {
      // More robust defensive check
      if (!row || !row.original) {
        console.warn('name cell: row or row.original is invalid:', row);
        return <span className="text-muted-foreground">Unknown User</span>;
      }
      
      return (
        <DataTableColumnCell.NameCard
        primary={formatName(row.original)}
        avatar={<UserAvatar user={row.original}/>}
        />
      );
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({row}) => {
      const value = row.getValue<User['role']>('role')
      return <DataTableColumnCell.ColorBadge value={value}> 
      {toPrettyString(value)}</DataTableColumnCell.ColorBadge>
    }
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email Address" />,
    cell: ({row}) => <DataTableColumnCell renderAs="email" icon={MailIcon}
    >{row.getValue('email')}</DataTableColumnCell>
  },
  {
    accessorKey: 'contactMobile',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Mobile" />,
    cell: ({row}) => <DataTableColumnCell renderAs="tel" icon={PhoneIcon}
    >{row.getValue('contactMobile')}</DataTableColumnCell>
  },
  {
    accessorKey: 'employeeCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Employee ID" />,
    cell: ({row}) => <DataTableColumnCell icon={UserIcon}
    >{row.getValue('employeeCode')}</DataTableColumnCell>
  },
  {
    accessorKey: 'designation',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Designation" />,
    cell: ({row}) => {
      const value = row.getValue<User['designation']>('designation') || ''
    return <DataTableColumnCell.ColorBadge value={value}
    >{toPrettyString(value)}</DataTableColumnCell.ColorBadge>
  }
  },
  {
    accessorKey: "zone",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Zone" />;
    },
    cell: ({ row }) => {
      const zone = row.getValue<User['zone']>("zone");
      return <DataTableColumnCell icon={MapPin}>{zone}</DataTableColumnCell>;
    },
  },
  {
    id: "isActive",
    accessorFn: (row) => row.isActive ? 'Active' : 'Inactive',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Active User" />;
    },
    cell: ({ row }) => {
      const isActiveAccount = row.getValue<User["isActive"]>("isActive");
      return <Badge className={
        cn(isActiveAccount ? 'bg-green-500' : 'bg-gray-500')
      }>{isActiveAccount}</Badge>;
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
      // if (!createdBy) return <DataTableColumnCell variant="overline" className="text-muted-foreground">System</DataTableColumnCell>
      return (
        <UserCard
          user={createdBy ? validateUser(createdBy) : {
            id: 'system',
            firstName: 'SYSTEM USER',
            lastName: '',
          }}
          className={cn(!createdBy && "text-muted-foreground")}
          disableClick
        />
      );
    },
    filterFn: tableCellFilterFns.user,
    enableColumnFilter: true,
  },
  {
    accessorKey: "createdAt",
    accessorFn: (row) => formatDate(row?.createdAt),
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
    id: "syncStatus",
    accessorFn: (row) => {
      // More robust defensive check
      if (!row || typeof row !== 'object') {
        console.warn('syncStatus accessorFn: row is invalid:', row);
        return 'Unknown';
      }
      
      const user: any = row || {};
      const authSource = user?.authSource as string | undefined;
      const lastSyncedAt = user?.lastSyncedAt as string | Date | undefined;
      
      if (authSource === 'wrapper' || authSource === 'kinde') {
        return lastSyncedAt ? 'Synced' : 'Pending';
      }
      return authSource ? 'Local' : 'Unknown';
    },
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Sync Status" />;
    },
    cell: ({ row }) => {
      // More robust defensive check
      if (!row || !row.original) {
        console.warn('syncStatus cell: row or row.original is invalid:', row);
        return <span className="text-muted-foreground">-</span>;
      }
      
      const user: any = row.original || {};
      const authSource = user?.authSource as string | undefined;
      const lastSyncedAt = user?.lastSyncedAt as string | Date | undefined;
      const externalId = user?.externalId as string | undefined;
      const orgCode = user?.orgCode as string | undefined;

      if (authSource === 'wrapper' || authSource === 'kinde') {
        const isSynced = !!lastSyncedAt;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col gap-1 cursor-help">
                  <Badge className={cn(
                    isSynced ? 'bg-green-500' : 'bg-yellow-500'
                  )}>
                    {isSynced ? 'Synced' : 'Pending'}
                  </Badge>
                  {lastSyncedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(lastSyncedAt)}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p><strong>Source:</strong> {authSource || 'N/A'}</p>
                  <p><strong>External ID:</strong> {externalId || 'N/A'}</p>
                  <p><strong>Org Code:</strong> {orgCode || 'N/A'}</p>
                  {lastSyncedAt && (
                    <p><strong>Last Sync:</strong> {formatDate(lastSyncedAt)}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-gray-500 cursor-help">Local</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Local user - no external sync</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "wrapperRoles",
    accessorFn: (row) => {
      // More robust defensive check
      if (!row || typeof row !== 'object') {
        console.warn('wrapperRoles accessorFn: row is invalid:', row);
        return 'No roles';
      }
      
      const user: any = row || {};
      const roleDetails = Array.isArray(user?.roleDetails) ? user.roleDetails : [];
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const primaryRole = typeof user?.role === 'string' ? user.role : '';
      
      if (roleDetails.length > 0) {
        return roleDetails.map((role: any) => role?.roleName || 'Unknown').join(', ');
      }
      if (roles.length > 0) {
        return roles.join(', ');
      }
      return primaryRole || 'No roles';
    },
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Wrapper Roles" />;
    },
    cell: ({ row }) => {
      // More robust defensive check
      if (!row || !row.original) {
        console.warn('wrapperRoles cell: row or row.original is invalid:', row);
        return <span className="text-muted-foreground">-</span>;
      }
      
      const user: any = row.original || {};
      const roleDetails = Array.isArray(user?.roleDetails) ? user.roleDetails : [];
      const roles = Array.isArray(user?.roles) ? user.roles : [];

      if (roleDetails.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {roleDetails.map((role: any, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {role?.roleName || 'Unknown'}
                {role?.priority && (
                  <span className="ml-1 text-muted-foreground">({role.priority})</span>
                )}
              </Badge>
            ))}
          </div>
        );
      }
      if (roles.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: "permissions",
    accessorFn: (row) => {
      // More robust defensive check
      if (!row || typeof row !== 'object') {
        console.warn('permissions accessorFn: row is invalid:', row);
        return '';
      }
      
      const user: any = row || {};
      const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
      if (permissions.length > 0) {
        return permissions.join(', ');
      }
      return '';
    },
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Permissions" />;
    },
    cell: ({ row }) => {
      // More robust defensive check
      if (!row || !row.original) {
        console.warn('permissions cell: row or row.original is invalid:', row);
        return <span className="text-muted-foreground">-</span>;
      }
      
      const user: any = row.original || {};
      const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
      if (permissions.length > 0) {
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {permissions.slice(0, 3).map((permission: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {permission}
              </Badge>
            ))}
            {permissions.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{permissions.length - 3} more
              </Badge>
            )}
          </div>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <UserActions row={row } />,
  },
];
