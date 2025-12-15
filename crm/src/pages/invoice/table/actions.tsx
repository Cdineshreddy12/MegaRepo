import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY, ROUTE_PATH } from "@/constants";
import { useDeleteInvoiceOptimistic } from "@/queries/InvoiceQueries";
import { Invoice } from "@/services/api/invoiceService";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.INVOICE,
};

export function InvoiceActions({ row }: { row: Row<Invoice> }) {
  const deleteMutation = useDeleteInvoiceOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: Invoice) => {
      await deleteMutation.mutateAsync(data?.id || data?._id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Invoice`,
        description: `Invoice has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Invoice`,
        description: `An error occurred while deleting the Invoice`,
      });
    },
  });

  return (
    <DataTableDefaultActions<Invoice>
      row={row}
      onView={(data: Invoice) => navigate(`${ROUTE_PATH.INVOICE}/${data?.id || data?._id}/view`)}
      onEdit={(data: Invoice) => navigate(`${ROUTE_PATH.INVOICE}/${data?.id || data?._id}/edit`)}
      onDelete={async (data: Invoice) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="Invoice"
    />
  );
}
