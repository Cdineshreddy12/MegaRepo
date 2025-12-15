import { Row } from "@tanstack/react-table";
import { Ticket } from "@/services/api/ticketService";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useDeleteTicketOptimistic } from "@/queries/TicketQueries";
import { useNavigate } from "react-router-dom";
import { ACTION, ENTITY } from "@/constants";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";

const logDetails = {
    action: ACTION.DELETE,
    entityType: ENTITY.TICKET,
};

export function TicketActions({ row }: { row: Row<Ticket> }) {
    const deleteMutation = useDeleteTicketOptimistic();
    const navigate = useNavigate();
    const { mutateWithActivityLog } = useMutationWithActivityLog({
        mainMutation: async (data: Ticket) => {
            await deleteMutation.mutateAsync(data.id);
            return data;
        },
        logDetails,
        onSuccess: () => {
            toast({
                title: `Delete Ticket`,
                description: `Ticket has been deleted successfully`,
            });
        },
        onError: () => {
            toast({
                title: `Delete Ticket`,
                description: `An error occurred while deleting the ticket`,
            });
        },
    });

    return (
        <DataTableDefaultActions<Ticket>
            row={row}
            onView={(data: Ticket) => navigate(`/tickets/${data.id}/view`)}
            onEdit={(data: Ticket) => navigate(`/tickets/${data.id}/edit`)}
            onDelete={async (data: Ticket) => {
                try {
                    await mutateWithActivityLog(data);
                } catch (error) {
                    console.error("Error during mutation or activity logging:", error);
                }
            }}
            isPending={deleteMutation.isPending}
            name="Ticket"
        />
    );
}
