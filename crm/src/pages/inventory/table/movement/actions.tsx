import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY, ROUTE_PATH } from "@/constants";
import { InventoryMovement } from "@/services/api/inventoryService";
import { useDeleteInventoryMovementOptimistic } from "@/queries/InventoryMovementQueries";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.MOVEMENT,
};

export function MovementActions({ row }: { row: Row<InventoryMovement> }) {
  const deleteMutation = useDeleteInventoryMovementOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: InventoryMovement) => {
      await deleteMutation.mutateAsync(data?.id || data._id!);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Inventory Movement`,
        description: `Inventory Movement has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Inventory Movement`,
        description: `An error occurred while deleting the Inventory Movement`,
      });
    },
  });

  return (
    <DataTableDefaultActions<InventoryMovement>
      row={row}
      onView={(data: InventoryMovement) => navigate(`/inventory${ROUTE_PATH.MOVEMENT}/${data?.id || data?._id}/view`)}
      onEdit={(data: InventoryMovement) => navigate(`/inventory${ROUTE_PATH.MOVEMENT}/${data?.id || data?._id}/edit`)}
      onDelete={async (data: InventoryMovement) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="Movement"
    />
  );
}
