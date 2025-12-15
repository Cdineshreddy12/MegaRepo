import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./columns";
import { useOpportunities } from "@/queries/OpportunityQueries";
import { Opportunity } from "@/services/api/opportunityService";
import { formatCurrency } from "@/utils/format";

interface OpportunityTableProps {
  onRowDoubleClick?: (row: Opportunity) => void
}

function OpportunityTable(props: OpportunityTableProps) {
  const { data, isPending, isError } = useOpportunities();
  const formattedOpportunities = isPending || isError || !data
    ? []
    : data
  return (
    <DataTable
      tableId="opportunity"
      data={formattedOpportunities}
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
      loading={isPending}
      filterVariant="column"
      isLoading={isPending}
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      enableRowSelectionSummary
      renderRowSelectionSummary={(selectedRows) => {
        const totalRevenue = selectedRows.reduce((sum, row) => sum + (row.revenue || 0), 0);
        const totalExpectedProfit = selectedRows.reduce((sum, row) => sum + (row.expectedProfit || 0), 0);
        const profitability = totalRevenue > 0 ? (totalExpectedProfit / totalRevenue) * 100 : 0;

        return (
          <div className="flex items-center justify-between p-4 bg-background rounded-md shadow-sm w-full">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Revenue</span>
              <span className="text-lg font-semibold">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Expected Profit</span>
              <span className="text-lg font-semibold">{formatCurrency(totalExpectedProfit)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Profitability</span>
              <span className="text-lg font-semibold">{profitability.toFixed(2)}%</span>
            </div>
          </div>
        );
      }}
    />
  );
}

export default OpportunityTable;