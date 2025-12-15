import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./columns";
import { ENTITY } from "@/constants";
import { FileEdit, Trash, Copy, Download } from "lucide-react";
import { useInventoryProducts } from "@/queries/InventoryProductQueries";
import { Product } from "@/services/api/inventoryService";

function InventoryTable({ onRowDoubleClick }: { onRowDoubleClick: (row: Product) => void }) {
  const { data, isPending, isError } = useInventoryProducts();

  const formattedInventoryProducts: Product[] =
    isPending || isError || !data
      ? []
      : data

  return (
    <DataTable
      data={formattedInventoryProducts}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.PRODUCT} />}
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

export default InventoryTable