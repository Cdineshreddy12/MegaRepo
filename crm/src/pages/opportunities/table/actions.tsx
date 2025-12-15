import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import { Opportunity } from "@/services/api/opportunityService";
import { useDeleteOpportunityOptimistic } from "@/queries/OpportunityQueries";
import { ACTION, ENTITY } from "@/constants";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";

export function OpportunityActions({ row }: { row: Row<Opportunity> }) {
    const deleteMutation = useDeleteOpportunityOptimistic();
    const navigate = useNavigate();
    const { mutateWithActivityLog } = useMutationWithActivityLog({
        mainMutation: async (data: Opportunity) => {
            await deleteMutation.mutateAsync(data?.id || data?._id);
            return data;
        },
        logDetails: {
            action: ACTION.DELETE,
            entityType: ENTITY.OPPORTUNITY,
        },
        onSuccess: () => {
            toast({
                title: `Delete Opportunity`,
                description: `Opportunity has been deleted successfully`,
            });
        },
        onError: () => {
            toast({
                title: `Delete Opportunity`,
                description: `An error occurred while deleting the opportunity`,
            });
        },
    });

    return (
        <DataTableDefaultActions<Opportunity>
            row={row}
            onView={(data: Opportunity) => navigate(`/opportunities/${data?.id || data?._id}/view`)}
            onEdit={(data: Opportunity) => navigate(`/opportunities/${data?.id || data?._id}/edit`)}
            onDelete={(data: Opportunity) => {
                try {
                    mutateWithActivityLog(data);
                } catch (error) {
                    console.error("Error during mutation or activity logging:", error);
                }
            }}
            isPending={deleteMutation.isPending} 
            name="Opportunity"
        />
    );
}