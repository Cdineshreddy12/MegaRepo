import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { useNavigate } from "react-router-dom";
import { ACTION, ENTITY } from "@/constants";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";
import { User } from "@/services/api/authService";
import { useDeleteUserOptimistic } from "@/queries/UserQueries";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield } from "lucide-react";
import { api } from "@/services/api";
import { useState } from "react";

const logDetails = {
  action: ACTION.DELETE,
  entityType: ENTITY.ACCOUNT,
};

export function UserActions({ row }: { row: Row<User> }) {
  const deleteMutation = useDeleteUserOptimistic();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: User) => {
      // @ts-expect-error mongodb id
      await deleteMutation.mutateAsync(data?._id || data?.id);
      return data;
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `Delete User`,
        description: `User has been deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: `Delete User`,
        description: `An error occurred while deleting the account`,
      });
    },
  });

  const handleRefreshPermissions = async (user: User) => {
    if (!user.externalId) {
      toast({
        title: "Cannot Refresh",
        description: "This user has no external ID to refresh permissions from",
        variant: "destructive"
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await api.post('/admin/users/refresh-permissions', {
        userIds: [user._id || user.id],
        orgCode: user.orgCode
      });
      
      toast({
        title: "Permissions Refreshed",
        description: `Successfully refreshed permissions for ${user.firstName} ${user.lastName}`,
      });
      
      // Optionally refresh the page or trigger a refetch
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh user permissions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const user = row.original;
  const canRefreshPermissions = user.externalId && (user.authSource === 'wrapper' || user.authSource === 'kinde');

  return (
    <div className="flex items-center gap-2">
      {canRefreshPermissions && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRefreshPermissions(user)}
          disabled={isRefreshing}
          title="Refresh permissions from wrapper"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
      
      <DataTableDefaultActions<User>
        row={row}
        // @ts-expect-error mongodb id
        onView={(data: User) => navigate(`${data?._id || data?.id}/view`)}
        // @ts-expect-error mongodb id
        onEdit={(data: User) => navigate(`${data?._id || data?.id}/edit`)}
        onDelete={async (data: User) => {
          try {
            await mutateWithActivityLog(data);
          } catch (error) {
            console.error("Error during mutation or activity logging:", error);
          }
        }}
        isPending={deleteMutation.isPending}
        name="User"
      />
    </div>
  );
}
