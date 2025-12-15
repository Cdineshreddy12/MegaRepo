import { Container } from "@/components/common/Page";
import { RoleManagementDashboard } from "@/features/roles";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { AccessDenied } from "@/components/common/AccessDenied";

export function RolesPage({
    isAdmin = false
}: {
    isAdmin?: boolean
}) {
    const { user } = useKindeAuth();
    return (
        <Container>
            {isAdmin || user?.email ? (
                <RoleManagementDashboard />
            ) : (
                <AccessDenied description="You need admin permissions to view role management." />
            )}
        </Container>
    )
}