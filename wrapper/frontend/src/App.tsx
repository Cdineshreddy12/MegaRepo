import { useMemo, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// React Router future flags to suppress deprecation warnings
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
}
// Toast notifications are handled in main.tsx via Sonner Toaster

import { useAuthStatus } from '@/hooks/useSharedQueries'
import AnimatedLoader from '@/components/common/AnimatedLoader'

// Kinde Authentication
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { KindeProvider } from '@/components/auth/KindeProvider'
import SilentAuthGuard from '@/components/auth/SilentAuthGuard'

// User Context and Permission Refresh
import { UserContextProvider } from './contexts/UserContextProvider'
import { EntityScopeProvider } from './contexts/EntityScopeContext'
import { ThemeProvider } from './components/theme/ThemeProvider'


// Layout Components
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
// Onboarding feature - using optimized version for better performance
import { OnboardingGuard, OnboardingPageGuard, OnboardingPage } from '@/features/onboarding/indexOptimized'

// Pages
import { Landing, ProductPage } from '@/pages/landing'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { InviteAccept } from '@/pages/InviteAccept'
import { UserManagementDashboard } from '@/features/users/components/UserManagementDashboard'
import { Billing } from '@/features/billing'
import { Permissions } from '@/features/permissions'
import UserApplicationAccessPage from '@/pages/UserApplicationAccess'
import SuiteDashboard from '@/pages/SuiteDashboard'
// Admin feature
import { AdminDashboardPage } from '@/features/admin'
import { ApplicationPage } from './pages/ApplicationPage'
import { RolesPage } from './pages/RolesPage'
import { Settings } from '@/features/settings'
import { OrganizationPage } from '@/features/organizations'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancelled from './pages/PaymentCancelled'
import NotFound from './pages/NotFound'

// Professional Loading component using AnimatedLoader
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <AnimatedLoader size="md" className="mb-6" />
      <p className="text-gray-600 dark:text-gray-300 text-base font-medium">Your data is loading...</p>
    </div>
  </div>
)


function App() {
  return (
    <>
      <ThemeProvider defaultTheme="system" storageKey="zopkit-theme">
        <KindeProvider>
          <Router future={router.future}>
            <SilentAuthGuard>
              <UserContextProvider>
                <EntityScopeProvider>
                  <AppContent />
                </EntityScopeProvider>
              </UserContextProvider>
            </SilentAuthGuard>
          </Router>
        </KindeProvider>
      </ThemeProvider>

      {/* Toast notifications - Using Sonner only to avoid overlap */}
      {/* Removed react-hot-toast Toaster as it overlaps with Sonner */}
    </>
  )
}

// Main App content component
function AppContent() {
  const { isAuthenticated, isLoading } = useKindeAuth()

  // Memoize auth state to prevent unnecessary re-renders
  const authState = useMemo(() => ({
    isAuthenticated: !!isAuthenticated,
    isLoading: !!isLoading
  }), [isAuthenticated, isLoading])

  // Show loading spinner while authentication is being determined
  if (authState.isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="App">
      {/* Trial Expiry Banner Only */}
      {/* <TrialExpiryBanner />
      <TrialBannerSpacer /> */}


      <Routes>
        {/* Public Routes */}
        <Route
          path="/landing"
          element={
            authState.isAuthenticated ? <Navigate to="/" replace /> : <Landing />
          }
        />

        {/* Product Pages - Public */}
        <Route
          path="/products/:productId"
          element={<ProductPage />}
        />

        {/* Root redirect based on auth status */}
        <Route
          path="/"
          element={<RootRedirect />}
        />



        <Route
          path="/onboarding"
          element={
            <OnboardingPageGuard>
              <OnboardingPage />
            </OnboardingPageGuard>
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />

        {/* Invitation Accept Route - Public (handles auth internally) */}
        <Route
          path="/invite/accept"
          element={<InviteAccept />}
        />

        {/* Payment Status Routes - Protected */}
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment-cancelled"
          element={
            <ProtectedRoute>
              <PaymentCancelled />
            </ProtectedRoute>
          }
        />

        {/* Business Suite Dashboard Route */}
        <Route
          path="/suite"
          element={
            <ProtectedRoute>
              <SuiteDashboard />
            </ProtectedRoute>
          }
        />





















        {/* Protected dashboard routes with onboarding guard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<ApplicationPage />} />
          <Route path="applications" element={<ApplicationPage />} />
          <Route path="users" element={<UserManagementDashboard />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="user-apps" element={<UserApplicationAccessPage />} />
          <Route path="billing" element={<Billing />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Company Admin Dashboard - Secure Route with Kinde Permissions */}
        <Route
          path="/company-admin"
          element={
            <ProtectedRoute>
              <PermissionGuard requiredPermission="company:admin:access">
                <AdminDashboardPage />
              </PermissionGuard>
            </ProtectedRoute>
          }
        />

        {/* Organization-specific routes with onboarding guard
        <Route
          path="/org/:orgCode"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="users" element={<UserManagementDashboard />} />
          <Route path="user-apps" element={<UserApplicationAccessPage />} />
          <Route path="user-application-management" element={<UserApplicationManagement />} />
          <Route path="billing" element={<Billing />} />
          <Route path="usage" element={<Usage />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="settings" element={<Settings />} />
        </Route> */}

        {/* Catch all - show NotFound page for invalid routes */}
        <Route
          path="*"
          element={
            authState.isLoading ? (
              <LoadingScreen />
            ) : (
              <NotFound />
            )
          }
        />
      </Routes>
    </div>
  )
}




// Root redirect component to handle initial route decisions
function RootRedirect() {
  const { isAuthenticated, isLoading } = useKindeAuth()
  const { data: authData, isLoading: authLoading } = useAuthStatus()
  const [isChecking, setIsChecking] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)

  const backendAuthStatus = authData?.authStatus

  useEffect(() => {
    async function checkStatus() {
      if (isLoading || authLoading) {
        return // Wait for Kinde and auth status to finish loading
      }

      // Check if this is a CRM authentication flow (from Kinde callback)
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');

      if (stateParam && isAuthenticated) {
        try {
          const stateData = JSON.parse(stateParam);

          if (stateData.app_code && stateData.redirect_url) {
            // Get the token from Kinde
            const { getToken } = useKindeAuth();
            const token = await getToken();

            if (token) {
              // Generate app-specific token using backend
              const backendUrl = 'https://zopkit.com/api';
              const response = await fetch(`${backendUrl}/auth/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, app_code: stateData.app_code }),
              });

              if (response.ok) {
                const validation = await response.json();

                if (validation.success) {
                  // Generate app-specific token
                  const appTokenResponse = await fetch(`${backendUrl}/auth/generate-app-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, app_code: stateData.app_code }),
                  });

                  if (appTokenResponse.ok) {
                    const appTokenData = await appTokenResponse.json();

                    // Redirect to CRM with token
                    const redirectUrl = new URL(stateData.redirect_url);
                    redirectUrl.searchParams.set('token', appTokenData.token);
                    redirectUrl.searchParams.set('expires_at', appTokenData.expiresAt);
                    redirectUrl.searchParams.set('app_code', stateData.app_code);

                    window.location.href = redirectUrl.toString();
                    return;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing CRM authentication:', error);
        }
      }

      if (!isAuthenticated) {
        setIsChecking(false)
        return
      }

      // Use auth data from shared hook
      if (backendAuthStatus) {
        setOnboardingStatus({ authStatus: backendAuthStatus })
      } else {
        setOnboardingStatus({ hasUser: false, hasTenant: false })
      }

      setIsChecking(false)
    }

    checkStatus()
  }, [isAuthenticated, isLoading, authLoading, backendAuthStatus])

  // Show loading while checking
  if (isLoading || authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AnimatedLoader size="sm" className="mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - go to landing
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }

  // Authenticated but no onboarding status yet
  if (!onboardingStatus) {
    return <Navigate to="/landing" replace />
  }

  // Check if user needs onboarding based on the actual backend response structure
  const needsOnboarding = onboardingStatus.authStatus?.needsOnboarding ?? !onboardingStatus.authStatus?.onboardingCompleted

  // Check if this is an invited user (they should never need onboarding)
  const isInvitedUser = onboardingStatus.authStatus?.userType === 'INVITED_USER' ||
    onboardingStatus.authStatus?.isInvitedUser === true ||
    onboardingStatus.authStatus?.onboardingCompleted === true

  // Check if there's a pending invitation (user should complete invitation flow first)
  const hasPendingInvitation = localStorage.getItem('pendingInvitationToken')

  if (needsOnboarding && !isInvitedUser && !hasPendingInvitation) {
    return <Navigate to="/onboarding" replace />
  }

  // INVITED USERS: Always go to dashboard (they skip onboarding)
  if (isInvitedUser) {
    return <Navigate to="/dashboard" replace />
  }

  // If there's a pending invitation, redirect to invitation acceptance
  if (hasPendingInvitation) {
    const token = localStorage.getItem('pendingInvitationToken')
    return <Navigate to={`/invite/accept?token=${token}`} replace />
  }

  // User is authenticated and onboarded - go to dashboard
  return <Navigate to="/dashboard" replace />
}

export default App