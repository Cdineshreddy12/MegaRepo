import * as React from "react";
import { NavAdmin } from "@/components/nav-admin";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CONTENT } from "@/constants/content";
import { getMenuItems, getAdminMenuItems, getSecondaryMenuItems } from "@/constants/sidebarConfig";
import { NavLink } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const permissions = usePermissions();
  
  // Debug permissions
  console.log('🔍 Sidebar Permissions Debug:', {
    permissionsObject: permissions,
    hasPermissions: !!permissions.permissions,
    permissionsArray: permissions.permissions,
    permissionsLength: permissions.permissions?.length || 0,
    canViewLeads: permissions.canViewLeads?.(),
    canViewContacts: permissions.canViewContacts?.(),
    canViewAccounts: permissions.canViewAccounts?.(),
    canViewOpportunities: permissions.canViewOpportunities?.(),
    canViewQuotations: permissions.canViewQuotations?.(),
    canViewSalesOrders: permissions.canViewSalesOrders?.(),
    canViewInvoices: permissions.canViewInvoices?.(),
    canViewInventory: permissions.canViewInventory?.()
  });
  
  // Get permission-filtered menu items
  const menuItems = getMenuItems(permissions);
  const adminMenuItems = getAdminMenuItems(permissions);
  const secondaryMenuItems = getSecondaryMenuItems(permissions);
  
  // Filter items based on permissions
  const filteredMenuItems = menuItems.filter(item => item.show());
  const filteredAdminItems = adminMenuItems.filter(item => item.show());
  const filteredSecondaryItems = secondaryMenuItems.filter(item => item.show());
  
  console.log('🔍 Sidebar Menu Items Debug:', {
    totalMenuItems: menuItems.length,
    filteredMenuItems: filteredMenuItems.length,
    menuItems: menuItems.map(item => ({ title: item.title, show: item.show() })),
    filteredItems: filteredMenuItems.map(item => item.title)
  });

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <NavLink to="/">
                <img
                  src={CONTENT.APP.logo}
                  className="h-5 w-5 aspect-square min-h-5 min-w-5"
                  alt={CONTENT.APP.name}
                />
                <span className="text-base font-semibold text-primary">
                  {CONTENT.APP.name}
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-0 m-0">
        <NavMain items={filteredMenuItems} />
        {filteredAdminItems.length > 0 && <NavAdmin items={filteredAdminItems} />}
        <NavSecondary className="mt-auto" items={filteredSecondaryItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
