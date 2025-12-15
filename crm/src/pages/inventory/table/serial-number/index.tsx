import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { ENTITY, ROUTE_PATH } from "@/constants";
import { FileEdit, Trash, Copy, Download, UserPlus } from "lucide-react";
import { InventorySerialNumber } from "@/services/api/inventoryService";
import useRedirect from "@/hooks/useRedirect";
import Page, { PageHeader } from "@/components/Page";
import IconButton from "@/components/common/IconButton";
import { useInventorySerialNumbers } from "@/queries/InventorySerialNumberQueries";
import { columns } from "./columns";

function InventorySerialNumberTable({
  onRowDoubleClick,
}: {
  onRowDoubleClick: (row: InventorySerialNumber) => void;
}) {
  const { data, isPending, isError } = useInventorySerialNumbers();

  const formattedSerialNumbers: InventorySerialNumber[] =
    isPending || isError || !data ? [] : data;

  return (
    <DataTable
      data={formattedSerialNumbers}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.SERIAL_NUMBER} />}
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

function InventorySerialNumbersPage() {
  const redirect = useRedirect();
  return (
    <Page
      removeBackground
      header={
        <PageHeader
          title="Serial Numbers"
          description="Manage serial numbers for your inventory products."
          actions={[
            <IconButton
              onClick={() => {
                redirect.to("new");
              }}
              icon={UserPlus}
            >
              Add Serial Number
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-5 flex-1">
        <InventorySerialNumberTable
          onRowDoubleClick={(row) =>
            redirect.to(
              `${ROUTE_PATH.INVENTORY}${ROUTE_PATH.SERIAL_NUMBER}/${row?._id}/view`
            )
          }
        />
      </div>
    </Page>
  );
}

export default InventorySerialNumbersPage;
