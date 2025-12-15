import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui.store"
import { 
  Home, 
  Users, 
  Building2, 
  BarChart3, 
  Settings, 
  CreditCard,
  Activity,
  Shield
} from "lucide-react"

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Organizations', href: '/dashboard/organizations', icon: Building2 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Permissions', href: '/dashboard/permissions', icon: Shield },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const location = useLocation()

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out",
      sidebarOpen ? "translate-x-0" : "-translate-x-full",
      "md:translate-x-0 md:static md:inset-0"
    )}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
