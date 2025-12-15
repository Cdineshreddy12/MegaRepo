import { Row } from "@tanstack/react-table";
import { Lead } from "@/services/api/leadService";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useDeleteLeadOptimistic } from "@/queries/LeadQueries";
import { useNavigate } from "react-router-dom";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { ACTION, ENTITY } from "@/constants";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.LEAD,
};

export function LeadActions({ row }: { row: Row<Lead> }) {
  const deleteMutation = useDeleteLeadOptimistic();
  const navigate = useNavigate();
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: Lead) => {
      await deleteMutation.mutateAsync(data?.id || data?._id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Lead`,
        description: `Lead has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Lead`,
        description: `An error occurred while deleting the lead`,
      });
    },
  });

  return (
    <DataTableDefaultActions<Lead>
      row={row}
      onView={(data: Lead) => navigate(`/leads/${data?.id || data?._id}/view`)}
      onEdit={(data: Lead) => navigate(`/leads/${data?.id || data?._id}/edit`)}
      onDelete={async (data: Lead) => {
        try {
          await mutateWithActivityLog(data);
        } catch (error) {
          console.error("Error during mutation or activity logging:", error);
        }
        }
      }
      isPending={deleteMutation.isPending}
      name="Lead"
    />
  );
}
