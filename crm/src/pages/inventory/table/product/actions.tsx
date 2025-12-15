import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY, ROUTE_PATH } from "@/constants";
import { Product } from "@/services/api/inventoryService";
import { useDeleteInventoryProductOptimistic } from "@/queries/InventoryProductQueries";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.PRODUCT,
};

export function ProductActions({ row }: { row: Row<Product> }) {
  const deleteMutation = useDeleteInventoryProductOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: Product) => {
      await deleteMutation.mutateAsync(data?.id || data?._id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Inventory Product`,
        description: `Inventory Product has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Inventory Product`,
        description: `An error occurred while deleting the Inventory Product`,
      });
    },
  });

  return (
    <DataTableDefaultActions<Product>
      row={row}
      onView={(data: Product) => navigate(`${ROUTE_PATH.PRODUCT}/${data?.id || data?._id}/view`)}
      onEdit={(data: Product) => navigate(`${ROUTE_PATH.PRODUCT}/${data?.id || data?._id}/edit`)}
      onDelete={async (data: Product) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="Product"
    />
  );
}
