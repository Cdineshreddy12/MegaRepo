import { Row } from "@tanstack/react-table";
import { Account } from "@/services/api/accountService";
import { useDeleteAccountOptimistic } from "@/queries/AccountQueries";
import { useNavigate } from "react-router-dom";
import { ACTION, ENTITY } from "@/constants";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";
import { Eye, Pencil, Delete, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.ACCOUNT,
};

export function AccountActions({ row }: { row: Row<Account> }) {
  const deleteMutation = useDeleteAccountOptimistic();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();

  // Check permissions
  const canRead = hasPermission('crm.accounts.read');
  const canUpdate = hasPermission('crm.accounts.update');
  const canDelete = hasPermission('crm.accounts.delete');

  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: Account) => {
      // @ts-expect-error mongodb id
      await deleteMutation.mutateAsync(data?._id || data?.id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete Account`,
        description: `Account has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete Account`,
        description: `An error occurred while deleting the account`,
      });
    },
  });

  return (
    <div className="flex items-center gap-2">
      {canRead && (
        <button
          onClick={() => navigate(`/accounts/${row.original._id || row.original.id}/view`)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
          title="View"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      {canUpdate && (
        <button
          onClick={() => navigate(`/accounts/${row.original._id || row.original.id}/edit`)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      {canDelete && (
        <button
          onClick={() => {
            setIsDeleteDialogOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
          title="Delete"
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Delete className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive hover:opacity-85"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await mutateWithActivityLog(row.original);
                    setIsDeleteDialogOpen(false);
                  } catch (error) {
                    console.error("Error during mutation or activity logging:", error);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
