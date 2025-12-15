import * as React from "react"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"
import {
  Activity,
  AudioWaveform,
  BarChart3,
  Building2,
  Command,
  CreditCard,
  Crown,
  GalleryVerticalEnd,
  Shield,
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
import { useTheme } from "@/components/theme/ThemeProvider"
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
            title: "Overview",
            url: "/dashboard/overview",
            icon: BarChart3,
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
    {
      name: "Admin",
      url: "/admin",
      icon: Crown,
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
  
  const { glassmorphismEnabled } = useTheme();

  return (
    <div className="relative  overflow-hidden">
      {glassmorphismEnabled && (
        <>
          {/* Decorative floating elements */}
          <div className="absolute top-20 left-4 w-16 h-16 rounded-full blur-xl animate-pulse bg-gradient-to-r from-purple-200/20 to-violet-200/20 dark:from-purple-400/12 dark:to-violet-400/12 backdrop-blur-3xl border border-purple-300/30 dark:border-purple-600/30" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-32 left-6 w-12 h-12 rounded-full blur-lg animate-pulse bg-gradient-to-r from-violet-200/15 to-indigo-200/15 dark:from-violet-400/8 dark:to-indigo-400/8 backdrop-blur-3xl border border-violet-300/30 dark:border-violet-600/30" style={{animationDelay: '2.5s'}}></div>
          <div className="absolute top-1/2 right-2 w-8 h-8 rounded-full blur-md animate-pulse bg-gradient-to-r from-indigo-200/10 to-purple-200/10 dark:from-indigo-400/6 dark:to-purple-400/6 backdrop-blur-3xl border border-indigo-300/30 dark:border-indigo-600/30" style={{animationDelay: '4s'}}></div>
        </>
      )}
      <Sidebar
        collapsible="icon"
        className={cn(
          glassmorphismEnabled
            ? "backdrop-blur-3xl bg-gradient-to-b from-purple-200/20 via-violet-200/15 to-indigo-200/20 dark:from-purple-900/25 dark:via-purple-800/20 dark:to-indigo-900/25 border-r border-purple-300/50 dark:border-purple-600/40 ring-1 ring-purple-300/30 dark:ring-purple-600/20 shadow-2xl rounded-l-3xl"
            : "bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 rounded-l-3xl",
          "relative z-10"
        )}
        {...props}
      >
        <SidebarHeader className={glassmorphismEnabled ? "backdrop-blur-xl bg-gradient-to-r from-white/10 via-white/5 to-transparent dark:from-slate-900/20 dark:via-slate-800/15 dark:to-transparent rounded-tl-3xl" : "bg-white dark:bg-black"}>
          <TeamSwitcher
            teams={!isTenantAdmin ? data.teams : undefined}
            organizations={isTenantAdmin ? availableOrganizations : undefined}
            tenantName={tenantData?.companyName}
            onOrganizationSwitch={onOrganizationSwitch}
          />
        </SidebarHeader>
        <SidebarContent className={glassmorphismEnabled ? "backdrop-blur-xl bg-gradient-to-b from-white/5 via-transparent to-white/3 dark:from-slate-900/10 dark:via-transparent dark:to-slate-800/5" : "bg-white  dark:bg-black"}>
          <NavMain items={data.navMain} glassmorphismEnabled={glassmorphismEnabled} />
        </SidebarContent>
        <SidebarFooter className={glassmorphismEnabled ? "backdrop-blur-xl bg-gradient-to-t from-white/10 via-white/5 to-transparent dark:from-slate-900/20 dark:via-slate-800/15 dark:to-transparent rounded-bl-3xl" : "bg-white dark:bg-black"}>
          {/* Bottom navigation items */}
          <SidebarMenu className="mb-2">
            <SidebarMenuItem>
              {data.bottomNav.map((item) => (
                <SidebarMenuButton
                  key={item.name}
                  asChild
                  tooltip={item.name}
                  className={cn(
                    glassmorphismEnabled
                      ? "hover:bg-white/10 dark:hover:bg-white/5 data-[active=true]:bg-white/20 dark:data-[active=true]:bg-white/10 backdrop-blur-sm"
                      : ""
                  )}
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
        <SidebarRail />
      </Sidebar>
    </div>
  )
}
