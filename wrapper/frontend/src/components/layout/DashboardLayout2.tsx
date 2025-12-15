import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link, useSearchParams, useParams } from 'react-router-dom'
import { 
  BarChart3, 
  Settings, 
  Users, 
  CreditCard, 
  Shield, 
  Menu, 
  X,
  Home,
  Activity,
  LogOut,
  User,
  Bell,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Building2,
  Crown,
  Database
} from 'lucide-react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { TrialStatusWidget } from '@/components/trial/TrialStatusWidget'
import { SeasonalCreditNotification, useSeasonalCreditNotifications } from '@/components/SeasonalCreditNotification'
import { NotificationManager } from '@/components/notifications'

interface TrialInfo {
  plan: string
  endDate: Date
  daysRemaining: number
  checkoutUrl?: string
}

const getDashboardNavigation = () => [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home,
    children: [
      { name: 'Overview', href: '/dashboard?tab=overview', icon: BarChart3 },
      { name: 'Applications', href: '/dashboard?tab=applications', icon: Building2 },
      { name: 'Team', href: '/dashboard?tab=users', icon: Users },
      { name: 'Roles', href: '/dashboard?tab=roles', icon: Crown },
     
      { name: 'App Management', href: '/dashboard/user-application-management', icon: Shield },

      { name: 'Analytics', href: '/dashboard?tab=analytics', icon: Activity },
    ]
  },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Usage', href: '/dashboard/usage', icon: Activity },
  { name: 'Admin', href: '/admin', icon: Crown },
]

const getOrganizationNavigation = (orgCode: string) => [
  { name: 'Dashboard', href: `/org/${orgCode}`, icon: Home },
  { name: 'Analytics', href: `/org/${orgCode}/analytics`, icon: BarChart3 },
  { name: 'Users', href: `/org/${orgCode}/users`, icon: Users },
  { name: 'App Management', href: `/org/${orgCode}/user-application-management`, icon: Shield },
  { name: 'Billing', href: `/org/${orgCode}/billing`, icon: CreditCard },
  { name: 'Usage', href: `/org/${orgCode}/usage`, icon: Activity },
  { name: 'Permissions', href: `/org/${orgCode}/permissions`, icon: Shield },
  { name: 'Admin', href: '/admin', icon: Crown },
]

export function DashboardLayout2() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard'])
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [showTrialBanner, setShowTrialBanner] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const params = useParams()
  const { user, logout } = useKindeAuth()

  // Seasonal credit notifications
  useSeasonalCreditNotifications()

  // Determine which navigation to use based on current route
  const isOrganizationRoute = location.pathname.startsWith('/org/')
  const orgCode = params.orgCode
  const navigation = isOrganizationRoute && orgCode 
    ? getOrganizationNavigation(orgCode) 
    : getDashboardNavigation()

  // Check for trial information from URL params or localStorage
  useEffect(() => {
    const isTrial = searchParams.get('trial') === 'true'
    const plan = searchParams.get('plan')
    const trialEndDate = localStorage.getItem('trialEndDate')
    const pendingCheckoutUrl = localStorage.getItem('pendingCheckoutUrl')

    if (isTrial || trialEndDate) {
      const endDate = trialEndDate ? new Date(trialEndDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      
      setTrialInfo({
        plan: plan || 'free', // Changed from 'professional' to 'free' for consistency
        endDate,
        daysRemaining,
        checkoutUrl: pendingCheckoutUrl || undefined
      })
      setShowTrialBanner(true)
    }
  }, [searchParams])

  const handleUpgradeNow = () => {
    const checkoutUrl = localStorage.getItem('pendingCheckoutUrl')
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    } else {
      navigate('/dashboard/billing')
    }
  }

  const dismissTrialBanner = () => {
    setShowTrialBanner(false)
  }

  const handleLogout = () => {
    logout()
  }

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const [basePath, tabParam] = href.split('?tab=')
      return location.pathname === basePath && searchParams.get('tab') === tabParam
    }
    return location.pathname === href
  }

  const renderNavigationItem = (item: any, isChild = false) => {
    const active = isActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)

    return (
      <div key={item.name}>
        <div className="flex items-center">
          <Link
            to={item.href}
            className={cn(
              'group flex items-center flex-1 text-sm font-medium rounded-md transition-colors',
              isChild ? 'pl-8 py-1.5' : 'px-2 py-2',
              active
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon className={cn('h-4 w-4', !sidebarCollapsed && 'mr-3')} />
            {!sidebarCollapsed && item.name}
          </Link>
          {hasChildren && !sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mr-2"
              onClick={() => toggleExpanded(item.name)}
            >
              {isExpanded ? (
                <ChevronRight className="h-3 w-3 rotate-90 transition-transform" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
        {hasChildren && isExpanded && !sidebarCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children.map((child: any) => renderNavigationItem(child, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4">
              <span className="text-xl font-semibold">Wrapper</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map(item => renderNavigationItem(item))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300",
        sidebarCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center justify-between px-4">
            {!sidebarCollapsed && (
              <span className="text-xl font-semibold">🔐 Wrapper</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map(item => renderNavigationItem(item))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        {/* Top navigation */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex items-center gap-4">
              <NotificationManager />

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">{user?.givenName} {user?.familyName}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {/* Trial Banner */}
          {showTrialBanner && trialInfo && (
            <div className="bg-primary">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Card className="m-4 border-0 bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Zap className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Free Trial Active
                          </h3>
                          <p className="text-sm text-gray-600">
                            {trialInfo.daysRemaining > 0 ? (
                              <>
                                <Clock className="inline h-4 w-4 mr-1" />
                                {trialInfo.daysRemaining} days remaining on your {trialInfo.plan} trial
                              </>
                            ) : (
                              <span className="text-orange-600 font-medium">
                                Trial expired - upgrade to continue using all features
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button onClick={handleUpgradeNow} size="sm">
                          {trialInfo.daysRemaining > 0 ? 'Setup Payment' : 'Upgrade Now'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={dismissTrialBanner}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Seasonal Credit Notifications */}
      <SeasonalCreditNotification />
    </div>
  )
}