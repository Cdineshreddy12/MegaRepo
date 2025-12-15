import { AccessDenied } from "@/components/common/AccessDenied";
import { Container } from "@/components/common/Page";
import { UserManagementDashboard } from "@/features/users/components/UserManagementDashboard";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

export function UsersPage({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const { user } = useKindeAuth();
  return (
    <Container>
      {isAdmin || user?.email ? (
        <UserManagementDashboard />
      ) : (
        <AccessDenied description="You need admin permissions to view user management." />
      )}
    </Container>
  );
}