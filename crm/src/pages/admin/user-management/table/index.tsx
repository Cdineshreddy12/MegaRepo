import { DataTable, DataTableEmptyState } from "@/components/data-grid";

import { columns } from "./columns";
import { ENTITY } from "@/constants";

import { useUsers } from "@/queries/UserQueries";
import { User } from "@/services/api/authService";
import { useOrgStore } from "@/store/org-store";

function UserTable({
  userFilter = 'all',
  onRowDoubleClick,
}: {
  userFilter?: string;
  onRowDoubleClick: (row: User) => void;
}) {
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const { data, isPending, isError } = useUsers(selectedOrg || undefined);

  const usersData = isPending || !data || isError ? [] : data;
  
  // Apply filter to users data
  const filteredUsers = usersData.filter((user: User) => {
    if (userFilter === 'all') return true;
    if (userFilter === 'wrapper') return user.authSource === 'wrapper';
    if (userFilter === 'kinde') return user.authSource === 'kinde';
    if (userFilter === 'local') return !user.authSource || user.authSource === 'local';
    return true;
  });
  return (
    <DataTable
      data={filteredUsers}
      columns={columns as any}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.USER} />}
      onRowDoubleClick={onRowDoubleClick}
      isLoading={isPending}
      filterVariant="column"
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
    />
  );
}

export default UserTable;
