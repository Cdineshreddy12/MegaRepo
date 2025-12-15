import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChangePasswordForm from "./changePassword";
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/KindeAuthContext";
import Loader from "@/components/common/Loader";
import ColorBadge from "@/components/ColorBadge";
import { toPrettyString } from "@/utils/common";
import { formatDate } from "@/utils/format";
import Page, { PageHeader } from "@/components/Page";

const UserProfilePage = () => {
  const { isLoading, user } = useAuth();

  if (isLoading) return <Loader />;

  // Get user initials for avatar
  const getInitials = () => {
    return `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(0)}`;
  };

  return (
    <Page
      header={
        <PageHeader
          title="Profile"
          description="Manage profile settings and preferences."
        />
      }
    >
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left column - User basic info */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader className="flex flex-col items-center pb-2">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={`https://avatar.iran.liara.run/public`} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl capitalize">
                  {user?.firstName?.toLocaleLowerCase()}{" "}
                  {user?.lastName?.toLocaleLowerCase()}
                </CardTitle>
                <div className="mt-1">
                  <ColorBadge value={user?.role ?? ""}>
                    {toPrettyString(user?.role ?? "")}
                  </ColorBadge>
                </div>
                <CardDescription className="mt-2 flex items-center">
                  <span className="inline-flex items-center mr-2">
                    {!user?.isActive ? (
                      <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                    )}
                  </span>
                  {!user?.isActive ? "Inactive account" : "Active account"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-3 flex flex-col items-center gap-1">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                    <a className="text-sm" href={`mailto:${user?.email}`}>
                      {user?.email}
                    </a>
                  </div>
                  {user?.contactMobile && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                      <a
                        className="text-sm"
                        href={`tel:${user?.contactMobile}`}
                      >
                        {user?.contactMobile}
                      </a>
                    </div>
                  )}
                  {user?.department && (
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm">{user?.department}</span>
                    </div>
                  )}
                  {user?.designation && (
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm capitalize">
                        {toPrettyString(user?.designation)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Tabs with detailed info */}
          <div className="md:col-span-2">
            <Tabs defaultValue="details" className="h-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>
                      Complete information about this user account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Employee Code</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {user?.employeeCode}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Full Name</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.firstName} {user?.lastName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Status</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          {!user?.isActive ? (
                            <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                          )}
                          {!user?.isActive ? "Inactive" : "Active"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                            <p className="text-sm font-medium">Created</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user?.createdAt && formatDate(user?.createdAt)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                            <p className="text-sm font-medium">Last Updated</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user?.updatedAt && formatDate(user?.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                      Recent account activity and history.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      No recent activity to display.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account settings and security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChangePasswordForm />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default UserProfilePage;
