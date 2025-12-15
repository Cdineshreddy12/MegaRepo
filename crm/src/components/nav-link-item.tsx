import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { SidebarMenuItem, SidebarMenuButton, useSidebar } from "./ui/sidebar";

function NavLinkItem({
  item,
}: {
  item: {
    id: string;
    title: string;
    url: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    disabled?: boolean;
  };
}) {
  const { state } = useSidebar();
  return (
    <NavLink
      className={cn(item.disabled && "cursor-not-allowed")}
      key={item.id}
      to={item.id}
      aria-disabled={item.disabled}
      onClick={(e) => {
        if (item?.disabled) {
          e.preventDefault(); // stops navigation
        }
      }}
    >
      {({ isActive }) => (
        <SidebarMenuItem>
          <SidebarMenuButton
            disabled={item.disabled}
            tooltip={item.title}
            className={cn(
              "py-5 px-4 hover:bg-primary/10",
              isActive &&
                "relative bg-primary/20 font-semibold hover:bg-primary/30 backdrop-filter backdrop-blur-sm bg-opacity-10"
            )}
          >
            {item.icon && <item.icon className="h-8 w-8" />}
            <span>{item.title}</span>
            {item?.disabled && state === "expanded" ? (
              <span className="text-xs absolute right-1 top-1/4 -translate-y-1/2">
                coming soon
              </span>
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </NavLink>
  );
}

export default NavLinkItem;
