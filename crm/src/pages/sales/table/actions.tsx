import { Row } from "@tanstack/react-table";
import { SalesOrder } from "@/services/api/salesOrderService";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useDeleteSalesOrderOptimistic } from "@/queries/SalesOrderQueries";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY, ROUTE_PATH } from "@/constants";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.SALES_ORDER,
};

export function SalesOrderActions({ row }: { row: Row<SalesOrder> }) {
  const deleteMutation = useDeleteSalesOrderOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: SalesOrder) => {
      await deleteMutation.mutateAsync(data?.id || data?._id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Sales Order`,
        description: `Sales Order has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Sales Order`,
        description: `An error occurred while deleting the Sales Order`,
      });
    },
  });

  return (
    <DataTableDefaultActions<SalesOrder>
      row={row}
      onView={(data: SalesOrder) => navigate(`${ROUTE_PATH.SALES_ORDER}/${data?.id || data?._id}/view`)}
      onEdit={(data: SalesOrder) => navigate(`${ROUTE_PATH.SALES_ORDER}/${data?.id || data?._id}/edit`)}
      onDelete={async (data: SalesOrder) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="SalesOrder"
    />
  );
}
