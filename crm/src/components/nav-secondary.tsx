import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu
} from "@/components/ui/sidebar"
import NavLinkItem from "./nav-link-item"

interface NavSecondaryProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: Array<{
    id: string;
    title: string;
    url: string;
    icon?: any;
    show?: () => boolean;
  }>;
}

export function NavSecondary({
  items,
  ...props
}: NavSecondaryProps) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => <NavLinkItem key={item.id} item={item} />)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
