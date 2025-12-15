import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./columns";
import { User } from "@/types/user-management";
import { useUserManagement } from "../context/UserManagementContext";

interface UserTableProps {
  onRowDoubleClick?: (row: User) => void
}

export default function UserTable(props: UserTableProps) {
  const { users:data, isLoading, error } = useUserManagement();
  const formattedUsers = isLoading || error || !data
    ? []
    : data
  return (
    <DataTable
      tableId="opportunity"
      data={formattedUsers}
      columns={columns}
      onRowDoubleClick={props?.onRowDoubleClick}
      noDataMessage={
        <DataTableEmptyState
          action={{
            link: "new",
            label: "ADD OPPORTUNITY",
          }}
          title="You don't have any opportunities"
          subTitle="Please add opportunity"
        />
      }
      filterVariant="column"
      isLoading={isLoading}
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      enableRowSelectionSummary
      renderRowSelectionSummary={(selectedRows) => {
        const totalUsers = selectedRows.length;
        const totalActiveUsers = selectedRows.filter(row => row.isActive).length;
        const totalPendingUsers = selectedRows.filter(row => !row.isActive).length;
        const totalAdmins = selectedRows.filter(row => row.isTenantAdmin).length;

        return (
          <div className="flex items-center justify-between p-4 bg-background rounded-md shadow-sm w-full">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Users</span>
              <span className="text-lg font-semibold">{totalUsers}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Active Users</span>
              <span className="text-lg font-semibold">{totalActiveUsers}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Pending Users</span>
              <span className="text-lg font-semibold">{totalPendingUsers}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Admins</span>
              <span className="text-lg font-semibold">{totalAdmins}</span>
            </div>
          </div>
        );
      }}
    />
  );
}
