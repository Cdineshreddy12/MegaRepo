import { DataTable, DataTableEmptyState } from "@/components/data-grid";

import { getColumns } from "./columns";
import { ENTITY } from "@/constants";

import { useOrgAccounts } from "@/hooks/useOrgAwareQueries";
import { Account } from "@/services/api/accountService";
import { Users2, ShieldX } from "lucide-react";
import Typography from "@/components/common/Typography";
import NumberAnimation from "@/components/common/NumberAnimation";
import { useFormTemplate } from "@/hooks/useFormTemplate";

function AccountTable({
  onRowDoubleClick,
}: {
  onRowDoubleClick: (row: Account) => void;
}) {
  const { data, isPending, isError, error } = useOrgAccounts();
  const accountsData = isPending || !data || isError ? [] : data;
  
  // Fetch form template for dynamic columns
  const { template } = useFormTemplate("account");
  const columns = getColumns(template);

  // Check if the error is a permission error (403)
  const isPermissionError = error && (
    (error as any)?.response?.status === 403 ||
    (error as any)?.status === 403 ||
    (error as any)?.message?.includes('403') ||
    (error as any)?.message?.includes('permission')
  );

  // Custom no data message for permission errors
  const noDataMessage = isPermissionError ? (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <ShieldX className="h-16 w-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Access Denied
      </h3>
      <p className="text-gray-600 mb-4">
        You don't have permissions to access this module
      </p>
      <p className="text-sm text-gray-500">
        Please contact your administrator to request access to the Accounts module.
      </p>
    </div>
  ) : (
    <DataTableEmptyState entityType={ENTITY.ACCOUNT} />
  );

  return (
    <DataTable
      data={accountsData}
      columns={columns}
      noDataMessage={noDataMessage}
      onRowDoubleClick={onRowDoubleClick}
      isLoading={isPending}
      filterVariant="column"
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      enableRowSelectionSummary
      renderRowSelectionSummary={(selectedRows) => {
        const totalEmployeesCount = selectedRows.reduce(
          (sum, row) => sum + (row.employeesCount || 0),
          0
        );
        return (
          <div className="flex items-center justify-between p-4 bg-background bg-opacity-70 backdrop-blur-md rounded-md shadow-sm w-full bg-gradient-to-r from-primary/20 to-primary/0">
            <Typography variant="h6">
              Total Selected Employees count
            </Typography>
            <div className="flex gap-2 items-center">
            <Users2 />
            <NumberAnimation variant="h3" className="font-bold" to={totalEmployeesCount} />
            </div>
          </div>
        );
      }}
    />
  );
}

export default AccountTable;
