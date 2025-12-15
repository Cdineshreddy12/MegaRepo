import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/KindeAuthContext";
import useRedirect from "@/hooks/useRedirect";
import UserCard from "./common/UserCard";



export function NavUser() {
  const { isMobile } = useSidebar();
  const { isLoading: loading, user, logout } = useAuth();
  const redirect = useRedirect();

  const handleLogout = () => {
    logout();
  };

 
const placeholderAvatar = 'https://avatar.iran.liara.run/public'
  

  if (loading || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <Avatar className="h-8 w-8 rounded-lg bg-muted" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="h-4 w-24 bg-muted rounded"></span>
              <span className="h-3 w-16 bg-muted rounded mt-1"></span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserCard user={{
                ...user,
                avatarUrl: user?.avatarUrl || placeholderAvatar
              }} className="grayscale" />
              {/* <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage
                  src={`https://avatar.iran.liara.run/public`}
                  alt={name}
                />
                <AvatarFallback className="uppercase">{shortName}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium capitalize">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div> */}
              <MoreVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <UserCard user={{
                ...user,
                avatarUrl: user?.avatarUrl || placeholderAvatar
              }} showRole/>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => redirect.to("/profile")}>
                <UserCircleIcon />
                Account
              </DropdownMenuItem>
              {user?.role === "super_admin" && (
                <DropdownMenuItem>
                  <CreditCardIcon />
                  Billing
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
