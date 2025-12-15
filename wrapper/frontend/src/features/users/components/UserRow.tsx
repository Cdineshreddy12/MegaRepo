import { User } from "@/types/user-management";
import { MoreVertical, Eye, Send, Crown, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatarPresets } from "@/components/common/UserAvatar";

// User Row Component
export const UserRow = ({ 
    user, 
    isSelected, 
    onToggleSelect, 
    onView, 
    onPromote, 
    onDeactivate, 
    onResendInvite,
    getUserStatus 
  }: {
    user: User;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: () => void;
    onPromote: () => void;
    onDeactivate: () => void;
    onResendInvite: () => void;
    getUserStatus: (user: User) => string;
  }) => {
    // Safety check to prevent errors with invalid user data
    if (!user || !user.userId) {
      return null;
    }

    const getStatusVariant = (user: User) => {
      if (user.invitationStatus === 'pending') return 'secondary';
      if (user.isActive) return 'default';
      return 'destructive';
    };

    return (
      <div className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border/50">
        {/* Selection Checkbox */}
        <div className="flex items-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${user.name || user.email}`}
          />
        </div>
        
        {/* User Info */}
        <div className="col-span-4 flex items-center gap-3">
          <UserAvatarPresets.ListItem 
            user={user} 
            tooltipContent={`${user.name || 'Unnamed User'} - ${user.email}`}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">
              {user.name || 'Unnamed User'}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {user.email || 'No email provided'}
            </div>
            {user.department && (
              <div className="text-xs text-muted-foreground truncate">
                {user.department} • {user.title}
              </div>
            )}
          </div>
        </div>
        
        {/* Status Badges */}
        <div className="col-span-2 flex flex-col gap-1">
          <Badge 
            variant={getStatusVariant(user)}
            className="w-fit"
          >
            {getUserStatus(user)}
          </Badge>
          {user.isTenantAdmin && (
            <Badge variant="secondary" className="w-fit bg-purple-100 text-purple-800 hover:bg-purple-100">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
        
        {/* Last Login */}
        <div className="col-span-2 text-sm text-muted-foreground">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
        </div>
        
        {/* Invited Date */}
        <div className="col-span-2 text-sm text-muted-foreground">
          {user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}
        </div>
        
        {/* Actions Dropdown */}
        <div className="col-span-1 flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="User actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onView}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              
              {!user.onboardingCompleted && (
                <DropdownMenuItem onClick={onResendInvite}>
                  <Send className="mr-2 h-4 w-4" />
                  Resend Invite
                </DropdownMenuItem>
              )}
              
              {!user.isTenantAdmin && (
                <DropdownMenuItem onClick={onPromote}>
                  <Crown className="mr-2 h-4 w-4" />
                  Promote to Admin
                </DropdownMenuItem>
              )}
              
              {user.isActive && !user.isTenantAdmin && (
                <DropdownMenuItem 
                  onClick={onDeactivate}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };