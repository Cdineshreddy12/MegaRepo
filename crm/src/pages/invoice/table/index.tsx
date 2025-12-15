import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./columns";
import { ENTITY } from "@/constants";
import { FileEdit, Trash, Copy, Download, ShieldX } from "lucide-react";
import { Invoice } from "@/services/api/invoiceService";
import { useInvoices } from "@/queries/InvoiceQueries";

function InvoiceTable({ onRowDoubleClick }: { onRowDoubleClick: (row: Invoice) => void }) {
  const { data, isPending, isError, error } = useInvoices();

  const formattedInvoiceOrder: Invoice[] =
    isPending || isError || !data
      ? []
      : data

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
        Please contact your administrator to request access to the Invoice Orders module.
      </p>
    </div>
  ) : (
    <DataTableEmptyState entityType={ENTITY.INVOICE} />
  );

  return (
    <DataTable
      data={formattedInvoiceOrder}
      columns={columns}
      noDataMessage={noDataMessage}
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

export default InvoiceTable;
