import { Container } from "@/components/common/Page";
import { UserApplicationAccess } from "@/components/users/UserApplicationAccess";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { AccessDenied } from "@/components/common/AccessDenied";

export function UserAppsPage({
    isAdmin = false
}: {
    isAdmin?: boolean
}) {
    const { user } = useKindeAuth();
    return (
        <Container>
            {isAdmin || user?.email ? (
                <UserApplicationAccess />
            ) : (
                <AccessDenied description="You need admin permissions to view role management." />
            )}
        </Container>
    )
}