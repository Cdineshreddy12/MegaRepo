import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./column";
import { ENTITY } from "@/constants";
import { useOrgActivityLogs } from "@/hooks/useOrgAwareQueries";
import { ActivityLog } from "@/types/ActivityLog.types";
import { usePermissions } from "@/hooks/usePermissions";

function ActivityTable({
  onRowDoubleClick
}: {
  onRowDoubleClick: (row: ActivityLog) => void;
}) {
  const { isAdmin } = usePermissions();
  const isAdminUser = !!isAdmin?.();

  const activityFilters = isAdminUser
    ? undefined
    : { userId: 'me' };

  const { data, isPending, isError } = useOrgActivityLogs(activityFilters);
  const activities = (isPending || isError) ? [] : data || [];

  return (
    <DataTable
      data={activities}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.ACTIVITY_LOG} />}
      onRowDoubleClick={onRowDoubleClick}
      isLoading={isPending}
      filterVariant="column"
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={true}
    />
  );
}

export default ActivityTable;