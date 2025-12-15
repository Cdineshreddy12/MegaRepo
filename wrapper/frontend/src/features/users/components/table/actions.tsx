import { Row } from "@tanstack/react-table";
import { DataTableDefaultActions } from "@/components/data-grid";
import { User } from "@/types/user-management";
import { useUserManagement } from "../context/UserManagementContext";

export function UserActions({ row }: { row: Row<User> }) {
    const { actions, isLoading} = useUserManagement();
    return (
        <DataTableDefaultActions<User>
            row={row}
            onView={(data: User) => actions.openModal('view', data)}
            onEdit={(data: User) => actions.openModal('edit', data)}
            onDelete={(data: User) => actions.openModal('delete', data)}
            isPending={isLoading} 
            name="User"
        />
    );
}