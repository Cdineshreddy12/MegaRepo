import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY, ROUTE_PATH } from "@/constants";
import { ProductOrder } from "@/services/api/productOrderService";
import { useDeleteProductOrderOptimistic } from "@/queries/ProductOrderQueries";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.PRODUCT_ORDER,
};

export function ProductOrderActions({ row }: { row: Row<ProductOrder> }) {
  const deleteMutation = useDeleteProductOrderOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: ProductOrder) => {
      await deleteMutation.mutateAsync(data?.id || data?._id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Product Order`,
        description: `Product Order has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Product Order`,
        description: `An error occurred while deleting the Product Order`,
      });
    },
  });

  return (
    <DataTableDefaultActions<ProductOrder>
      row={row}
      onView={(data: ProductOrder) => {
        const base = ROUTE_PATH.PRODUCT_ORDER.replace(/^\//, "");
        navigate(`/${base}/${data?.id || data?._id}/view`);
      }}
      onEdit={(data: ProductOrder) => {
        const base = ROUTE_PATH.PRODUCT_ORDER.replace(/^\//, "");
        navigate(`/${base}/${data?.id || data?._id}/edit`);
      }}
      onDelete={async (data: ProductOrder) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="ProductOrder"
    />
  );
}
