import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY, ROUTE_PATH } from "@/constants";
import { InventorySerialNumber } from "@/services/api/inventoryService";
import { useDeleteInventorySerialNumberOptimistic } from "@/queries/InventorySerialNumberQueries";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.SERIAL_NUMBER,
};

export function SerialNumberActions({ row }: { row: Row<InventorySerialNumber> }) {
  const deleteMutation = useDeleteInventorySerialNumberOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: InventorySerialNumber) => {
      await deleteMutation.mutateAsync(data?.id || data._id!);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Inventory  Serial Number`,
        description: `Inventory Product Serial Number has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Inventory  Serial Number`,
        description: `An error occurred while deleting the Inventory Serial Number`,
      });
    },
  });

  return (
    <DataTableDefaultActions<InventorySerialNumber>
      row={row}
      onView={(data: InventorySerialNumber) => navigate(`/inventory${ROUTE_PATH.SERIAL_NUMBER}/${data?.id || data?._id}/view`)}
      onEdit={(data: InventorySerialNumber) => navigate(`/inventory${ROUTE_PATH.SERIAL_NUMBER}/${data?.id || data?._id}/edit`)}
      onDelete={async (data: InventorySerialNumber) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="InventorySerialNumber"
    />
  );
}
