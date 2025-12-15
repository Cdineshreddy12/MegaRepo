import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { KindeProvider } from '@kinde-oss/kinde-auth-react';
import { TooltipProvider } from '@/components/ui/tooltip';

// Contexts
import { AuthProvider as KindeAuthProvider } from "@/contexts/KindeAuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { UserSessionProvider } from "@/contexts/UserSessionContext";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import ErrorBoundary from "@/components/auth/ErrorBoundary";

// Utilities
import { setupGlobalErrorHandlers } from "@/utils/error-handler";

// HOCs
import { withSuspense } from "./hoc/withSuspense";

// Components
import Loader from "./components/common/Loader";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFoundPage from "@/pages/notfound";
import UnauthorizedPage from "@/pages/unauthorized";
import UserDeletedPage from "@/pages/user-deleted";
import NoRolePage from "@/pages/no-role";
import CallbackPage from "@/pages/auth/CallbackPage";
import { usePageTitle } from "./hooks/use-page-title";
import { TenantConfig } from "./lib/app-config";
import { useFavicon } from "./hooks/use-favicon";
import { useApplyTenantTheme } from "./hooks/use-apply-tenant-theme";
import DashboardNew from "./pages/dashboard/DashboardNew";
import KanbanBoardPage from "@/pages/opportunities/kanban-dashboard";
import { InventoryEntity } from "@/pages/inventory/view";
import { PermissionGate, IsAdmin } from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import { useOrgChangeRefresher } from "@/hooks/useOrgAwareQueries";



// Protected Route Component
const LazyProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));

// Dashboard
const Dashboard = withSuspense(
  lazy(() => import("@/pages/dashboard/Dashboard"))
);

// CRM Views
const LeadPage = withSuspense(lazy(() => import("@/pages/leads")));
const LeadView = withSuspense(lazy(() => import("@/pages/leads/view")));
const LeadForm = withSuspense(lazy(() => import("@/pages/leads/form")));
const LeadAiInsights = withSuspense(
  lazy(() => import("@/pages/leads/ai-insights/LeadInsightView"))
);

const ContactsPage = withSuspense(lazy(() => import("@/pages/contacts")));
const ContactsView = withSuspense(lazy(() => import("@/pages/contacts/view")));
const ContactsForm = withSuspense(lazy(() => import("@/pages/contacts/form")));
const ContactsAiInsights = withSuspense(
  lazy(() => import("@/pages/contacts/ai-insights"))
);

const AccountPage = withSuspense(lazy(() => import("@/pages/accounts")));
const AccountView = withSuspense(lazy(() => import("@/pages/accounts/view")));
const AccountForm = withSuspense(lazy(() => import("@/pages/accounts/form")));
const AccountAiInsights = withSuspense(
  lazy(() => import("@/pages/accounts/ai-insights"))
);

const OpportunitiesPage = withSuspense(
  lazy(() => import("@/pages/opportunities"))
);
const OpportunityView = withSuspense(
  lazy(() => import("@/pages/opportunities/view"))
);
const OpportunityForm = withSuspense(
  lazy(() => import("@/pages/opportunities/form"))
);
const OpportunityAiInsights = withSuspense(
  lazy(() => import("@/pages/opportunities/ai-insights"))
);

// Sales Views
const QuotationsPage = withSuspense(lazy(() => import("@/pages/quotations")));
const QuotationView = withSuspense(
  lazy(() => import("@/pages/quotations/view"))
);
const QuotationForm = withSuspense(
  lazy(() => import("@/pages/quotations/form"))
);
const QuotationAiInsights = withSuspense(
  lazy(() => import("@/pages/quotations/ai-insights"))
);

// Tickets
const TicketPage = withSuspense(lazy(() => import("@/pages/tickets")));
const TicketForm = withSuspense(lazy(() => import("@/pages/tickets/form")));

const SalesOrdersPage = withSuspense(lazy(() => import("@/pages/sales")));
const SalesOrderForm = withSuspense(lazy(() => import("@/pages/sales/form")));
const SalesOrdersView = withSuspense(lazy(() => import("@/pages/sales/view")));

const InvoicesView = withSuspense(lazy(() => import("@/pages/invoice")));
const InvoicesForm = withSuspense(lazy(() => import("@/pages/invoice/form")));
const InvoiceViewPage = withSuspense(lazy(() => import("@/pages/invoice/view")));

const ProductOrderView = withSuspense(
  lazy(() => import("@/pages/product-orders"))
);
const ProductOrderForm = withSuspense(
  lazy(() => import("@/pages/product-orders/form"))
);
const ProductOrderViewPage = withSuspense(
  lazy(() => import("@/pages/product-orders/view"))
);

const InventoryPage = withSuspense(lazy(() => import("@/pages/inventory")));
const InventoryMovementsPage = withSuspense(
  lazy(() => import("@/pages/inventory/table/movement"))
);
const InventorySerialNumbersPage = withSuspense(
  lazy(() => import("@/pages/inventory/table/serial-number"))
);
const InventoryForm = withSuspense(
  lazy(() => import("@/pages/inventory/form/product"))
);
const SerialNumberForm = withSuspense(
  lazy(() => import("@/pages/inventory/form/serial-number"))
);
const MovementForm = withSuspense(
  lazy(() => import("@/pages/inventory/form/movement"))
);

const InventoryViewPage = lazy(
  () => import("@/pages/inventory/view")
) as React.LazyExoticComponent<
  React.ComponentType<{ entity: InventoryEntity }>
>;

const FormTemplateBuilder = withSuspense(
  lazy(() => import("@/pages/form-template-builder"))
);

const AnalyticsPage = withSuspense(
  lazy(() => import("@/pages/analytics/AnalyticsPage"))
);

// User Profile
const UserProfilePage = withSuspense(
  lazy(() => import("@/pages/auth/ProfilePage"))
);

// Admin Views
const AdminDashboard = withSuspense(lazy(() => import("@/pages/admin/")));
const ActivityLogView = withSuspense(
  lazy(() => import("@/pages/admin/activity-log"))
);
const UserManagement = withSuspense(
  lazy(() => import("@/pages/admin/user-management"))
);
const UserManagementForm = withSuspense(
  lazy(() => import("@/pages/admin/user-management/form"))
);

const RoleManagement = withSuspense(
  lazy(() => import("@/pages/admin/role-management"))
);
const DropdownConfigurator = withSuspense(
  lazy(() => import("@/pages/admin/dropdown-configurator"))
);

function App() {
  usePageTitle(TenantConfig.name);
  useFavicon(TenantConfig.branding.faviconUrl || "/favicon.ico");
  useApplyTenantTheme(TenantConfig);

  // Add organization change refresher to automatically refresh data when org changes
  useOrgChangeRefresher();

  // Set up global error handlers
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  // CRM-specific Kinde configuration for subdomain deployment
  // CRM is now hosted on crm.zopkit.com (subdomain) instead of zopkit.com/crm (path)
  // So Kinde should redirect to crm.zopkit.com/callback (no /crm prefix needed)
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const { protocol, host } = window.location;
      return `${protocol}//${host}`;
    }
    // Fallback for SSR/initialization
    return import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173';
  };

  const baseUrl = getBaseUrl();
  const kindeConfig = {
    clientId: import.meta.env.VITE_KINDE_CLIENT_ID || '',
    domain: import.meta.env.VITE_KINDE_DOMAIN || 'https://auth.zopkit.com',
    redirectUri: import.meta.env.VITE_KINDE_REDIRECT_URI || `${baseUrl}/callback`,
    logoutUri: import.meta.env.VITE_KINDE_LOGOUT_URI || `${baseUrl}`,
    scope: import.meta.env.VITE_KINDE_SCOPE || 'openid profile email offline',
  };

  // Safe debug logging for Kinde configuration and Vite base (no secrets)
  if (typeof window !== 'undefined') {
    console.log('🔧 Kinde config (safe):', {
      clientId: kindeConfig.clientId ? `${kindeConfig.clientId.substring(0, 6)}...` : 'NOT SET',
      domain: kindeConfig.domain,
      redirectUri: kindeConfig.redirectUri,
      logoutUri: kindeConfig.logoutUri,
      scope: kindeConfig.scope,
      viteBase: import.meta.env.BASE_URL,
      constructedBaseUrl: baseUrl,
      currentLocation: window.location.href,
    });
  }

  // Validate configuration
  if (!kindeConfig.clientId) {
    console.error('❌ CRITICAL: VITE_KINDE_CLIENT_ID is not set!');
    console.error('📝 Please check your .env file and ensure it uses VITE_ prefix');
  }

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <KindeProvider
          clientId={kindeConfig.clientId}
          domain={kindeConfig.domain}
          redirectUri={kindeConfig.redirectUri}
          logoutUri={kindeConfig.logoutUri}
          scope={kindeConfig.scope}
          useInsecureForRefreshToken={process.env.NODE_ENV === 'development'}
        >
        <Router>
          <KindeAuthProvider>
            <LoadingProvider>
              <UserSessionProvider>
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/user-deleted" element={<UserDeletedPage />} />
          <Route path="/no-role" element={<NoRolePage />} />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/"
            element={
              <AuthWrapper>
                <ProtectedRoute requiredRole={["user", "admin", "super_admin"]}>
                  <MainLayout />
                </ProtectedRoute>
              </AuthWrapper>
            }
          >
            {/* Root route shows dashboard directly */}
            <Route index element={<Dashboard />} />

            {/* Explicit dashboard route for direct navigation */}
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="profile" element={<UserProfilePage />} />
            {/* <Route path="profile/:userId/view" element={<ProtectedRoute requiredRole={["user"]}>
              <UserProfilePage />
            </ProtectedRoute>} /> */}

            <Route path="kanban-dashboard" element={<KanbanBoardPage />} />
            <Route path="dashboard-new" element={<DashboardNew />} />

            {/* CRM Routes */}
            <Route path="leads" element={
              <PermissionGate module="crm" permission="leads.read" fallback={<AccessDenied />}>
                <LeadPage />
              </PermissionGate>
            } />
            <Route path="leads/:leadId/edit" element={
              <PermissionGate module="crm" permission="leads.update" fallback={<AccessDenied />}>
                <LeadForm />
              </PermissionGate>
            } />
            <Route path="leads/:leadId/view" element={
              <PermissionGate module="crm" permission="leads.read" fallback={<AccessDenied />}>
                <LeadView />
              </PermissionGate>
            } />
            <Route path="leads/new" element={
              <PermissionGate module="crm" permission="leads.create" fallback={<AccessDenied />}>
                <LeadForm />
              </PermissionGate>
            } />
            <Route
              path="leads/:leadId/ai-insights"
              element={
                <PermissionGate module="crm" permission="leads.read" fallback={<AccessDenied />}>
                  <LeadAiInsights />
                </PermissionGate>
              }
            />

            <Route path="contacts" element={
              <PermissionGate module="crm" permission="contacts.read" fallback={<AccessDenied />}>
                <ContactsPage />
              </PermissionGate>
            } />
            <Route path="contacts/:contactId/edit" element={
              <PermissionGate module="crm" permission="contacts.update" fallback={<AccessDenied />}>
                <ContactsForm />
              </PermissionGate>
            } />
            <Route path="contacts/:contactId/view" element={
              <PermissionGate module="crm" permission="contacts.read" fallback={<AccessDenied />}>
                <ContactsView />
              </PermissionGate>
            } />
            <Route path="contacts/new" element={
              <PermissionGate module="crm" permission="contacts.create" fallback={<AccessDenied />}>
                <ContactsForm />
              </PermissionGate>
            } />
            <Route
              path="contacts/:contactId/ai-insights"
              element={
                <PermissionGate module="crm" permission="contacts.read" fallback={<AccessDenied />}>
                  <ContactsAiInsights />
                </PermissionGate>
              }
            />

            {/* Accounts Routes */}
            <Route path="accounts" element={
              <PermissionGate module="crm" permission="accounts.read" fallback={<AccessDenied />}>
                <AccountPage />
              </PermissionGate>
            } />
            <Route path="accounts/:accountId/edit" element={
              <PermissionGate module="crm" permission="accounts.update" fallback={<AccessDenied />}>
                <AccountForm />
              </PermissionGate>
            } />
            <Route path="accounts/:accountId/view" element={
              <PermissionGate module="crm" permission="accounts.read" fallback={<AccessDenied />}>
                <AccountView />
              </PermissionGate>
            } />
            <Route path="accounts/new" element={
              <PermissionGate module="crm" permission="accounts.create" fallback={<AccessDenied />}>
                <AccountForm />
              </PermissionGate>
            } />
            <Route
              path="accounts/:accountId/ai-insights"
              element={
                <PermissionGate module="crm" permission="accounts.read" fallback={<AccessDenied />}>
                  <AccountAiInsights />
                </PermissionGate>
              }
            />

            {/* Opportunities Routes */}
            <Route path="opportunities" element={
              <PermissionGate module="crm" permission="opportunities.read" fallback={<AccessDenied />}>
                <OpportunitiesPage />
              </PermissionGate>
            } />
            <Route
              path="opportunities/:opportunityId/edit"
              element={
                <PermissionGate module="crm" permission="opportunities.update" fallback={<AccessDenied />}>
                  <OpportunityForm />
                </PermissionGate>
              }
            />
            <Route
              path="opportunities/:opportunityId/view"
              element={
                <PermissionGate module="crm" permission="opportunities.read" fallback={<AccessDenied />}>
                  <OpportunityView />
                </PermissionGate>
              }
            />
            <Route path="opportunities/new" element={
              <PermissionGate module="crm" permission="opportunities.create" fallback={<AccessDenied />}>
                <OpportunityForm />
              </PermissionGate>
            } />
            <Route
              path="opportunities/:opportunityId/ai-insights"
              element={
                <PermissionGate module="crm" permission="opportunities.read" fallback={<AccessDenied />}>
                  <OpportunityAiInsights />
                </PermissionGate>
              }
            />

            {/* Sales Routes */}
            <Route path="quotations" element={
              <PermissionGate module="crm" permission="quotations.read" fallback={<AccessDenied />}>
                <QuotationsPage />
              </PermissionGate>
            } />
            <Route
              path="quotations/:quotationId/edit"
              element={
                <PermissionGate module="crm" permission="quotations.update" fallback={<AccessDenied />}>
                  <QuotationForm />
                </PermissionGate>
              }
            />
            <Route
              path="quotations/:quotationId/view"
              element={
                <PermissionGate module="crm" permission="quotations.read" fallback={<AccessDenied />}>
                  <QuotationView />
                </PermissionGate>
              }
            />
            <Route path="quotations/new" element={
              <PermissionGate module="crm" permission="quotations.create" fallback={<AccessDenied />}>
                <QuotationForm />
              </PermissionGate>
            } />
            <Route
              path="quotations/:quotationId/ai-insights"
              element={
                <PermissionGate module="crm" permission="quotations.read" fallback={<AccessDenied />}>
                  <QuotationAiInsights />
                </PermissionGate>
              }
            />

            <Route path="tickets" element={
              <PermissionGate module="crm" permission="tickets.read" fallback={<AccessDenied />}>
                <TicketPage />
              </PermissionGate>
            } />
            <Route path="tickets/:ticketId/edit" element={
              <PermissionGate module="crm" permission="tickets.update" fallback={<AccessDenied />}>
                <TicketForm />
              </PermissionGate>
            } />
            <Route path="tickets/new" element={
              <PermissionGate module="crm" permission="tickets.create" fallback={<AccessDenied />}>
                <TicketForm />
              </PermissionGate>
            } />

            <Route path="sales-orders" element={<SalesOrdersPage />} />
            <Route path="sales-orders/new" element={<SalesOrderForm />} />
            <Route
              path="sales-orders/:salesOrderId/edit"
              element={<SalesOrderForm />}
            />
            <Route
              path="sales-orders/:salesOrderId/view"
              element={<SalesOrdersView />}
            />

            <Route path="invoices" element={<InvoicesView />} />
            <Route path="invoices/new" element={<InvoicesForm />} />
            <Route path="invoices/:invoiceId/edit" element={<InvoicesForm />} />
            <Route path="invoices/:invoiceId/view" element={<InvoiceViewPage />} />

            <Route path="product-orders" element={<ProductOrderView />} />
            <Route path="product-orders/new" element={<ProductOrderForm />} />
            <Route
              path="product-orders/:productOrderId/edit"
              element={<ProductOrderForm />}
            />
            <Route
              path="product-orders/:productOrderId/view"
              element={<ProductOrderViewPage />}
            />

            <Route path="inventory/" element={<InventoryPage />} />
            <Route path="inventory/new" element={<InventoryForm />} />
            <Route
              path="inventory/:id/edit"
              element={<InventoryForm />}
            />
            <Route
              path="inventory/:id/view"
              element={
                <Suspense fallback={<Loader />}>
                  <InventoryViewPage entity="INVENTORY" />
                </Suspense>
              }
            />

            <Route
              path="inventory/serial-numbers"
              element={<InventorySerialNumbersPage />}
            />
            <Route
              path="inventory/serial-numbers/new"
              element={<SerialNumberForm />}
            />
            <Route
              path="inventory/serial-numbers/:id/edit"
              element={<SerialNumberForm />}
            />
            <Route
              path="inventory/serial-numbers/:id/view"
              element={
                <Suspense fallback={<Loader />}>
                  <InventoryViewPage entity="SERIAL_NUMBER" />
                </Suspense>
              }
            />
            <Route
              path="inventory/movements"
              element={<InventoryMovementsPage />}
            />
            <Route path="inventory/movements/new" element={<MovementForm />} />
            <Route
              path="inventory/movements/:id/edit"
              element={<MovementForm />}
            />
            <Route
              path="inventory/movements/:id/view"
              element={
                <Suspense fallback={<Loader />}>
                  <InventoryViewPage entity="MOVEMENT" />
                </Suspense>
              }
            />

            <Route
              path="form-template-builder"
              element={<FormTemplateBuilder />}
            />

            <Route
              path="analytics"
              element={<AnalyticsPage />}
            />

            {/* Admin Routes */}
            <Route
              path="admin"
              element={
                <Suspense fallback={<Loader />}>
                  <IsAdmin fallback={<AccessDenied />}>
                    <AdminDashboard />
                  </IsAdmin>
                </Suspense>
              }
            >
              {/* Tabbed pages inside AdminDashboard */}

              {/* Redirect from /admin to /admin/activity-logs */}
              <Route index element={<Navigate to="activity-logs" replace />} />

              <Route path="activity-logs" element={<ActivityLogView />} />
              <Route
                path="activity-logs/:activityLogId/view"
                element={<ActivityLogView />}
              />
              <Route path="dropdowns" element={<DropdownConfigurator />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/new" element={<UserManagementForm />} />
              <Route
                path="users/:userId/edit"
                element={<UserManagementForm />}
              />
              <Route path="users/:userId/view" element={<UserProfilePage />} />
            </Route>
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
              </UserSessionProvider>
            </LoadingProvider>
          </KindeAuthProvider>
      </Router>
      
      {/* Debug components removed for clean authentication */}
        </KindeProvider>
      </TooltipProvider>
      </ErrorBoundary>
    );
  }

export default App;
