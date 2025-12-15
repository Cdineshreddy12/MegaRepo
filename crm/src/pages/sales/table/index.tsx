import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./columns";
import { ENTITY } from "@/constants";
import { FileEdit, Trash, Copy, Download } from "lucide-react";
import { SalesOrder } from "@/services/api/salesOrderService";
import { useSalesOrders } from "@/queries/SalesOrderQueries";

function SalesOrderTable({ onRowDoubleClick }: { onRowDoubleClick: (row: SalesOrder) => void }) {
  const { data, isPending, isError } = useSalesOrders();

  const formattedSalesOrders: SalesOrder[] =
    isPending || isError || !data
      ? []
      : data

  return (
    <DataTable
      data={formattedSalesOrders}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.SALES_ORDER} />}
      onRowDoubleClick={onRowDoubleClick}
      isLoading={isPending}
      filterVariant="column"
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      enableRowSelection
       rowActions={[
        {
          label: "Edit Selected",
          icon: <FileEdit className="h-4 w-4" />,
          action: (rows) => console.log("Edit rows:", rows),
          variant: "default",
        },
        {
          label: "Delete Selected",
          icon: <Trash className="h-4 w-4" />,
          action: (rows) => console.log("Delete rows:", rows),
          variant: "destructive",
        },
        {
          label: "Duplicate",
          icon: <Copy className="h-4 w-4" />,
          action: (rows) => console.log("Duplicate rows:", rows),
          variant: "outline",
        },
        {
          label: "Export Selected",
          icon: <Download className="h-4 w-4" />,
          action: (rows) => console.log("Export rows:", rows),
          variant: "secondary",
        },
      ]}
    />
  );
}

export default SalesOrderTable;
