import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/KindeAuthContext';
import useRedirect from "@/hooks/useRedirect"
import { formatName } from "@/utils/format"
import { toast } from "@/hooks/useToast";

export function UserNav() {
  const redirect = useRedirect()
  const { isLoading: loading, user } = useAuth();

  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const shortName = loading ? '' : `${user?.firstName?.charAt(0)}${user?.lastName?.charAt(0)}`
  const name = loading ? '' : formatName(user, 'FN-LN')
  
  // Format role to capitalize it (e.g., "admin" -> "Admin")
  const formattedRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {/* <AvatarImage src={`https://avatar.iran.liara.run/username?username=${user?.firstName}+${user?.lastName}`} alt={name} /> */}
            <AvatarImage src={`https://avatar.iran.liara.run/public`} alt={name} />
            <AvatarFallback className="uppercase ">{shortName}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none capitalize">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            <div className="flex items-center mt-1">
              <span className="text-xs font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded-full capitalize">
                {formattedRole}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => redirect.to('/profile')}>
            Profile
            {/* <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut> */}
          </DropdownMenuItem>
          {/* <DropdownMenuItem>
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem> */}
          {/* <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem> */}
          {/* <DropdownMenuItem>New Team</DropdownMenuItem> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
          {/* <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut> */}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}