import { Mail, User as UserIcon, CheckCircle, Clock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/common/Page/Section";
import { User } from "@/types/user-management";
import UserAvatar, { UserAvatarPresets } from "@/components/common/UserAvatar";



interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  generateInvitationUrl: (user: User) => string | null;
  copyInvitationUrl: (user: User) => Promise<void>;
}

export const UserDetailsModal = ({ 
  user, 
  isOpen, 
  onClose, 
  generateInvitationUrl,
  copyInvitationUrl
}: UserDetailsModalProps) => {
  if (!isOpen || !user) return null;

  const getStatusBadge = () => {
    if (user.invitationStatus === 'pending') {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Pending Invitation
        </Badge>
      );
    }
    if (user.isActive) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <AlertCircle className="w-3 h-3 mr-1" />
        Setup Required
      </Badge>
    );
  };

  const getOnboardingStatus = () => {
    return user.onboardingCompleted ? (
      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatarPresets.Header user={user} /> 
            <div className="flex-1">
              <DialogTitle className="text-xl">{user.name || 'Unnamed User'}</DialogTitle>
              <DialogDescription className="text-base">
                {user.email || 'No email provided'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Status & Role Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section
                title="Account Status"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge()}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <span className="text-sm font-medium">
                      {user.roles && user.roles.length > 0 
                        ? user.roles.map((role: any) => role.roleName).join(', ')
                        : 'No roles assigned'
                      }
                    </span>
                  </div>
                </div>
              </Section>

              <Section
                title="Activity"
                size="sm"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Invited:</span>
                    <span className="text-sm font-medium">
                      {user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Login:</span>
                    <span className="text-sm font-medium">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Onboarding:</span>
                    {getOnboardingStatus()}
                  </div>
                </div>
              </Section>
            </div>

            {/* Invitation URL Section */}
            {user.invitationStatus === 'pending' && (
              <Section
                title="Invitation URL"
                description={`Share this URL with ${user.name || user.email} to complete their invitation`}
                size="sm"
                variant="banner"
                className="border-blue-200 bg-blue-50/50"
                headerActions={[
                  {
                    label: "Copy",
                    onClick: () => copyInvitationUrl(user),
                    icon: Mail,
                    variant: "default"
                  }
                ]}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={generateInvitationUrl(user) || 'No invitation URL available'}
                      readOnly
                      className="font-mono text-sm bg-white border-blue-300"
                    />
                  </div>
                  <p className="text-xs text-blue-600">
                    The user can click this link to accept the invitation and join your organization.
                  </p>
                </div>
              </Section>
            )}

            {/* Assigned Roles */}
            <Section
              title="Assigned Roles"
              size="sm"
              variant="filled"
            >
              {user.roles && user.roles.length > 0 ? (
                <div className="space-y-2">
                  {user.roles.map((role: any) => (
                    <div key={role.roleId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                      <span 
                        className="text-lg" 
                        style={{ color: role.color }}
                      >
                        {role.icon}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{role.roleName}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roles assigned
                </p>
              )}
            </Section>

            {/* Actions */}
            <Section
              title="Actions"
              size="sm"
              variant="filled"
              footer={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Edit User
                  </Button>
                  <Button size="sm" variant="outline">
                    Reset Password
                  </Button>
                  {!user.onboardingCompleted && (
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Invite
                    </Button>
                  )}
                </div>
              }
            >
             
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;