import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns } from "./columns";
import { ENTITY, ROUTE_PATH } from "@/constants";
import { FileEdit, Trash, Copy, Download, UserPlus } from "lucide-react";
import { InventoryMovement } from "@/services/api/inventoryService";
import useRedirect from "@/hooks/useRedirect";
import IconButton from "@/components/common/IconButton";
import Page, { PageHeader } from "@/components/Page";
import { useInventoryMovements } from "@/queries/InventoryMovementQueries";

function InventoryMovementsTable({ onRowDoubleClick }: { onRowDoubleClick: (row: InventoryMovement) => void }) {
  const { data, isPending, isError } = useInventoryMovements();

  const formattedInventoryMovements: InventoryMovement[] =
    isPending || isError || !data
      ? []
      : data

  return (
    <DataTable
      data={formattedInventoryMovements}
      columns={columns}
      noDataMessage={<DataTableEmptyState entityType={ENTITY.MOVEMENT} />}
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

function InventoryMovementsPage() {
  const redirect = useRedirect();

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Stock Movements"
          description="Track all movements of inventory items including additions, removals, and adjustments."
          actions={[
            
            <IconButton
              onClick={() => {
                redirect.to("new");
              }}
              icon={UserPlus}
            >
              Record Movement
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-5 flex-1">
        <InventoryMovementsTable
          onRowDoubleClick={(row) =>
            redirect.to(`${ROUTE_PATH.INVENTORY}${ROUTE_PATH.MOVEMENT}/${row?._id}/view`)
          }
        />
      </div>
    </Page>
  );
}

export default InventoryMovementsPage;