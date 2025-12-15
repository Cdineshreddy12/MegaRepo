import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { useQuotations } from "@/queries/QuotationQueries";
import { columns } from "./columns";
import { ENTITY } from "@/constants";
import { Quotation } from "@/services/api/quotationService";
import { formatCurrency } from "@/utils/format";

function QuotationTable({
  onRowDoubleClick,
}: {
  onRowDoubleClick: (row: Quotation) => void;
}) {
  const { data, isPending, isError } = useQuotations();
  const quotationsData =
    isPending || isError || !data
      ? []
      : 
        data.map((d) => ({ ...d, id: d.id || d._id }));
  return (
    <DataTable
      data={quotationsData}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.QUOTATION} />}
      onRowDoubleClick={onRowDoubleClick}
      filterVariant="column"
      isLoading={isPending}
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      enableColumnPinning
      enableRowSelectionSummary
      renderRowSelectionSummary={(selectedRows) => {
        const totalAmount = selectedRows.reduce(
          (sum, row) => sum + (row.total || 0),
          0
        );
        return (
            <div className="flex items-center justify-between p-4 bg-background bg-opacity-70 backdrop-blur-md rounded-md shadow-sm w-full bg-gradient-to-r from-primary/20 to-primary/0">
              <span className="text-sm font-medium"> Total Selected Quotations Amount</span>
              <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        );
      }}
    />
  );
}

export default QuotationTable;
