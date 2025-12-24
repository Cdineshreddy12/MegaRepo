import * as React from "react"
import { cn } from "@/lib/utils"
import { Link, useLocation } from "react-router-dom"
import {
  AudioWaveform,
  Building2,
  Command,
  CreditCard,
  Crown,
  GalleryVerticalEnd,
  Users,
  Settings,
  Network,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAvailableOrganizations } from "@/features/admin"

// Default navigation data for regular dashboard routes
const defaultData = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Zopkit",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Silent Readers",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Unity",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Applications",
      url: "/dashboard/applications",
      icon: Building2,
    },
    {
      title: "Team",
      url: "/dashboard/users",
      icon: Users,
    },
    {
      title: "Organization",
      url: "/dashboard/organization",
      icon: Network,
    },
    {
      title: "Roles",
      url: "/dashboard/roles",
      icon: Crown,
    },
  ],
  projects: [],
  bottomNav: [
    {
      name: "Billing",
      url: "/dashboard/billing",
      icon: CreditCard,
    },
    {
      name: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({
  navData,
  userData,
  tenantData,
  isTenantAdmin = false,
  onOrganizationSwitch,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navData?: typeof defaultData;
  userData?: { name: string; email: string; avatar?: string };
  tenantData?: { tenantId: string; companyName: string; subdomain?: string; industry?: string };
  isTenantAdmin?: boolean;
  onOrganizationSwitch?: (organizationId: string) => void;
}) {
  const location = useLocation();
  // Fetch available organizations for tenant admins
  const { data: availableOrganizations = [], isLoading: orgsLoading, error: orgsError } = useAvailableOrganizations();

  // Debug logging
  console.log('🔧 AppSidebar Debug:', {
    isTenantAdmin,
    availableOrganizationsCount: availableOrganizations.length,
    availableOrganizations,
    orgsLoading,
    orgsError: orgsError?.message
  });

  // Merge user data with default, ensuring avatar is always a string
  const mergedUserData = {
    name: userData?.name || defaultData.user.name,
    email: userData?.email || defaultData.user.email,
    avatar: userData?.avatar || defaultData.user.avatar,
  };

  // Merge tenant data with default teams
  const mergedTeamsData = tenantData
    ? [{
      name: tenantData.companyName || defaultData.teams[0].name,
      logo: Building2,
      plan: tenantData.industry || defaultData.teams[0].plan,
    }]
    : defaultData.teams;

  // Use provided navData or fall back to default, but always use real user/tenant data
  const data = navData
    ? { ...navData, user: mergedUserData, teams: mergedTeamsData }
    : { ...defaultData, user: mergedUserData, teams: mergedTeamsData };

  return (
    <div className="relative h-full">
      <Sidebar
        collapsible="icon"
        className={cn(
          "!bg-[#2563EB] !border-r-0 relative z-10 font-medium",
        )}
        {...props}
      >
        <SidebarHeader className="bg-[#2563EB] text-white">
          <TeamSwitcher
            teams={!isTenantAdmin ? data.teams : undefined}
            organizations={isTenantAdmin ? availableOrganizations : undefined}
            tenantName={tenantData?.companyName}
            onOrganizationSwitch={onOrganizationSwitch}
          />
        </SidebarHeader>
        <SidebarContent className="bg-[#2563EB]">
          <NavMain items={data.navMain} />
        </SidebarContent>
        <SidebarFooter className="bg-[#2563EB] text-white">
          {/* Bottom navigation items */}
          <SidebarMenu className="mb-2">
            <SidebarMenuItem>
              {data.bottomNav.map((item) => (
                <SidebarMenuButton
                  key={item.name}
                  asChild
                  tooltip={item.name}
                  variant="curved"
                  isActive={location.pathname === item.url}
                >
                  <Link to={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              ))}
            </SidebarMenuItem>
          </SidebarMenu>
          <NavUser user={data.user} />
        </SidebarFooter>
        <SidebarRail className="hover:bg-white/10" />
      </Sidebar>
    </div>
  )
}
