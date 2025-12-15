
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/KindeAuthContext"
import { usePermissions } from "@/hooks/usePermissions"
import NavLinkItem from "./nav-link-item"

interface NavAdminProps {
  items: Array<{
    id: string;
    title: string | ((title: string) => string);
    url: string;
    icon?: any;
    show?: () => boolean;
  }>;
}

export function NavAdmin({ items }: NavAdminProps) {
  const { user } = useAuth();
  const permissions = usePermissions();
  
  // Check if user has admin permissions
  const hasAdminAccess = permissions.isAdmin();
  
  if (!hasAdminAccess || items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavLinkItem 
            key={item.id} 
            item={{
              ...item,
              title: typeof item.title === 'function' ? item.title('Admin') : item.title,
            }} 
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
