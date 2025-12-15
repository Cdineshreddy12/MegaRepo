import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { useOrgTickets } from "@/hooks/useOrgAwareQueries";
import { columns } from "./columns";
import { ENTITY } from "@/constants";

function TicketTable({onRowDoubleClick}: {
  onRowDoubleClick: (row: Quotation) => void;
}) {
  const { data, isPending, isError } = useOrgTickets();
  const ticketsData =
    isPending || isError || !data
      ? []
      : // @ts-expect-error mongodb collection id
        data.map((d) => ({ ...d, id: d.id || d._id }));
  return (
    <DataTable
      data={ticketsData}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.TICKET} />}
      onRowDoubleClick={onRowDoubleClick}
      filterVariant="column"
      isLoading={isPending}
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
    />
  );
}

export default TicketTable;
