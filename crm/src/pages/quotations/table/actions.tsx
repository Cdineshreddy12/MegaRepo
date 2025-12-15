// React and Router imports
import { useNavigate } from "react-router-dom";

// Third-party library imports
import { Row } from "@tanstack/react-table";

// Service and API imports
import { Quotation } from "@/services/api/quotationService";
import { useDeleteQuotationOptimistic } from "@/queries/QuotationQueries";

// Component imports
import { DataTableDefaultActions } from "@/components/data-grid";

// Hook imports
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";

// Constant imports
import { ACTION, ENTITY } from "@/constants";

const logDetails = {
    action: ACTION.DELETE,
    entityType: ENTITY.QUOTATION,
  };
export function QuotationActions({ row }: { row: Row<Quotation> }) {
    const deleteMutation = useDeleteQuotationOptimistic();
    const navigate = useNavigate();
    const {mutateWithActivityLog} = useMutationWithActivityLog({
        mainMutation: async (data: Quotation) => {
            await deleteMutation.mutateAsync(data?.id || data?._id);
            return data;
        },
        logDetails,
        onSuccess: () => {
            toast({
                title: `Delete Quotation`,
                description: `Quotation has been deleted successfully`,
            });
        },
        onError: () => {
            toast({
                title: `Delete Quotation`,
                description: `An error occurred while deleting the quotation`,
            });
        },

    })

    return (
        <DataTableDefaultActions<Quotation>
            row={row}
            onView={(data: Quotation) => navigate(`/quotations/${data?.id || data?._id}/view`)}
            onEdit={(data: Quotation) => navigate(`/quotations/${data?.id || data?._id}/edit`)}
            onDelete={async (data: Quotation) => {
                try {
                   await mutateWithActivityLog(data);
                } catch (error) {
                    console.error('Error during mutation or activity logging:', error);
                }
            } 
            }
            isPending={deleteMutation.isPending}
            name="Quotation"
        />
    );
}