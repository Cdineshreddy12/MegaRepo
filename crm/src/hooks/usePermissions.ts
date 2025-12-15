import { useQuery } from '@tanstack/react-query';
import { useUserSession } from '@/contexts/UserSessionContext';

interface PermissionResponse {
  success: boolean;
  data: {
    userId: string;
    tenantId: string;
    permissions: string[];
    organizationApps: Array<{
      appCode: string;
      subscriptionTier: string;
    }>;
    plan: string;
  };
  message?: string;
}

interface UsePermissionsOptions {
  enabled?: boolean;
  token?: string | null;
  kindeUserId?: string;
  orgId?: string;
}

export const usePermissionsQuery = ({ 
  enabled = true, 
  token, 
  kindeUserId, 
  orgId 
}: UsePermissionsOptions) => {
  // Safety check: if any required parameters are invalid, return a safe default
  if (!token || !kindeUserId || !orgId || 
      token === '' || kindeUserId === '' || orgId === '' ||
      token === 'undefined' || kindeUserId === 'undefined' || orgId === 'undefined' ||
      token === 'null' || kindeUserId === 'null' || orgId === 'null') {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve(undefined),
    };
  }

  return useQuery({
    queryKey: ['permissions', token, kindeUserId, orgId],
    queryFn: async (): Promise<PermissionResponse> => {
      if (!token || !kindeUserId || !orgId) {
        throw new Error('Missing required parameters for permission fetch');
      }

      const response = await fetch(
        `${import.meta.env.VITE_WRAPPER_URL || 'https://wrapper.zopkit.com'}/api/permission-matrix/user-context`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Kinde-User-ID': kindeUserId,
            'X-Organization-ID': orgId
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Permission fetch failed: ${response.status}`);
      }

      return response.json();
    },
    enabled: enabled && !!token && !!kindeUserId && !!orgId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Context-based hook that components expect
export const usePermissions = () => {
  try {
    // Get permissions and isTenantAdmin from the UserSessionContext
    const { permissions, isTenantAdmin } = useUserSession();
    
    // Debug the permissions we're getting
    console.log('🔍 usePermissions Hook Debug:', {
      permissionsFromContext: permissions,
      permissionsType: typeof permissions,
      isArray: Array.isArray(permissions),
      permissionsLength: permissions?.length || 0,
      permissionsSample: permissions?.slice(0, 5) || [],
      isTenantAdmin
    });
    
    // Helper function to check if user has a specific permission
    const hasPermission = (permission: string) => {
      if (!permissions || !Array.isArray(permissions)) {
        console.log('⚠️ usePermissions: Invalid permissions for check:', { permission, permissions });
        return false;
      }
      const hasIt = permissions.includes(permission);
      console.log(`🔍 Permission check: ${permission} = ${hasIt}`);
      return hasIt;
  };

  return {
      permissions: permissions || [],
      hasPermission,
      canViewLeads: () => hasPermission('crm.leads.read') || hasPermission('crm.leads.read_all'),
      canCreateLeads: () => hasPermission('crm.leads.create'),
      canEditLeads: () => hasPermission('crm.leads.update'),
      canDeleteLeads: () => hasPermission('crm.leads.delete'),
      canManageLeads: () => hasPermission('crm.leads.manage'),
      canViewContacts: () => hasPermission('crm.contacts.read') || hasPermission('crm.contacts.read_all'),
      canCreateContacts: () => hasPermission('crm.contacts.create'),
      canEditContacts: () => hasPermission('crm.contacts.update'),
      canDeleteContacts: () => hasPermission('crm.contacts.delete'),
      canViewAccounts: () => hasPermission('crm.accounts.read') || hasPermission('crm.accounts.read_all'),
      canCreateAccounts: () => hasPermission('crm.accounts.create'),
      canEditAccounts: () => hasPermission('crm.accounts.update'),
      canDeleteAccounts: () => hasPermission('crm.accounts.delete'),
      canViewOpportunities: () => hasPermission('crm.opportunities.read') || hasPermission('crm.opportunities.read_all'),
      canCreateOpportunities: () => hasPermission('crm.opportunities.create'),
      canEditOpportunities: () => hasPermission('crm.opportunities.update'),
      canDeleteOpportunities: () => hasPermission('crm.opportunities.delete'),
      canViewQuotations: () => hasPermission('crm.quotations.read') || hasPermission('crm.quotations.read_all'),
      canCreateQuotations: () => hasPermission('crm.quotations.create'),
      canEditQuotations: () => hasPermission('crm.quotations.update'),
      canDeleteQuotations: () => hasPermission('crm.quotations.delete'),
      canViewSalesOrders: () => hasPermission('crm.sales_orders.read') || hasPermission('crm.sales_orders.read_all'),
      canCreateSalesOrders: () => hasPermission('crm.sales_orders.create'),
      canEditSalesOrders: () => hasPermission('crm.sales_orders.update'),
      canDeleteSalesOrders: () => hasPermission('crm.sales_orders.delete'),
      canViewProductOrders: () => hasPermission('crm.product_orders.read') || hasPermission('crm.product_orders.read_all'),
      canCreateProductOrders: () => hasPermission('crm.product_orders.create'),
      canEditProductOrders: () => hasPermission('crm.product_orders.update'),
      canDeleteProductOrders: () => hasPermission('crm.product_orders.delete'),
      canViewInvoices: () => hasPermission('crm.invoices.read') || hasPermission('crm.invoices.read_all'),
      canCreateInvoices: () => hasPermission('crm.invoices.create'),
      canEditInvoices: () => hasPermission('crm.invoices.update'),
      canDeleteInvoices: () => hasPermission('crm.invoices.delete'),
      canViewInventory: () => hasPermission('crm.inventory.read') || hasPermission('crm.inventory.read_all'),
      canCreateInventory: () => hasPermission('crm.inventory.create'),
      canEditInventory: () => hasPermission('crm.inventory.update'),
      canDeleteInventory: () => hasPermission('crm.inventory.delete'),
      canViewDashboard: () => hasPermission('crm.dashboard.view'),
      canViewSettings: () => hasPermission('crm.system.settings_read'),
      canManageSettings: () => hasPermission('crm.system.settings_manage') || hasPermission('system.users.manage'),
      canViewCommunications: () => hasPermission('crm.communications.read'),
      canViewTickets: () => hasPermission('crm.tickets.read'),
      canViewFormBuilder: () => hasPermission('crm.form_builder.read'),
      canViewDocuments: () => hasPermission('crm.documents.read'),
      canViewPayments: () => hasPermission('crm.payments.read'),
      canViewReports: () => hasPermission('crm.reports.read') || hasPermission('crm.reports.read_all'),
      canExportReports: () => hasPermission('crm.reports.export') || hasPermission('crm.reports.manage'),
      canViewAnalytics: () => hasPermission('crm.analytics.read'),
      canExportAnalytics: () => hasPermission('crm.analytics.export') || hasPermission('crm.analytics.manage'),
      canUseAdvancedFeatures: () => hasPermission('crm.features.advanced') || hasPermission('crm.system.configurations_manage'),
      canUseAIFeatures: () => hasPermission('crm.features.ai') || hasPermission('crm.ai.use'),
      canManageUsers: () => hasPermission('system.users.read') || hasPermission('crm.system.settings_manage'),
      canManageRoles: () => hasPermission('system.roles.read') || hasPermission('crm.system.settings_manage'),
      isAdmin: () => {
        // List of admin module permissions - if user has any of these, they're an admin
        const adminPermissions = [
          'crm.system.settings_read',
          'crm.system.settings_update',
          'crm.system.configurations_read',
          'crm.system.configurations_create',
          'crm.system.configurations_update',
          'crm.system.configurations_delete',
          'crm.system.tenant_config_read',
          'crm.system.tenant_config_update',
          'crm.system.admin',
          'crm.system.credit_config',
          'crm.system.system_config_read',
          'crm.system.system_config_update',
          'crm.system.dropdowns_read',
          'crm.system.dropdowns_create',
          'crm.system.dropdowns_update',
          'crm.system.dropdowns_delete',
          'crm.system.integrations_read',
          'crm.system.integrations_create',
          'crm.system.integrations_update',
          'crm.system.integrations_delete',
          'crm.system.backup_read',
          'crm.system.backup_create',
          'crm.system.backup_restore',
          'crm.system.maintenance_read',
          'crm.system.maintenance_perform',
          'crm.system.maintenance_schedule',
          'crm.system.users_read',
          'crm.system.users_read_all',
          'crm.system.users_create',
          'crm.system.users_update',
          'crm.system.users_delete',
          'crm.system.users_activate',
          'crm.system.users_reset_password',
          'crm.system.users_export',
          'crm.system.users_import',
          'crm.system.roles_read',
          'crm.system.roles_read_all',
          'crm.system.roles_create',
          'crm.system.roles_update',
          'crm.system.roles_delete',
          'crm.system.roles_assign',
          'crm.system.roles_export',
          'crm.system.reports_read',
          'crm.system.reports_read_all',
          'crm.system.reports_create',
          'crm.system.reports_update',
          'crm.system.reports_delete',
          'crm.system.reports_export',
          'crm.system.reports_schedule',
          'crm.system.audit_read',
          'crm.system.audit_read_all',
          'crm.system.audit_export',
          'crm.system.audit_view_details',
          'crm.system.audit_filter',
          'crm.system.audit_generate_reports',
          'crm.system.audit_archive',
          'crm.system.audit_purge',
          'crm.system.activity_logs_read',
          'crm.system.activity_logs_read_all',
          'crm.system.activity_logs_export',
          'crm.system.activity_logs_view_details',
          'crm.system.activity_logs_filter',
          'crm.system.activity_logs_generate_reports',
          'crm.system.activity_logs_archive',
          'crm.system.activity_logs_purge'
        ];
        
        // Check if user has any admin permission or is a tenant admin
        const hasAnyAdminPermission = adminPermissions.some(perm => hasPermission(perm));
        const isAdminUser = hasAnyAdminPermission || isTenantAdmin;
        
        console.log('🔍 isAdmin check:', { 
          hasAnyAdminPermission, 
          isTenantAdmin, 
          isAdminUser,
          permissionsChecked: adminPermissions.length,
          userPermissionsCount: permissions?.length || 0
        });
        
        return isAdminUser;
      },
      hasPremium: () => true,
      hasPremiumFeatures: () => true
    };
  } catch (error) {
    console.error('❌ Error in usePermissions hook:', error);
    // Fallback to safe defaults
    return {
      permissions: [],
      hasPermission: (permission: string) => false,
      canViewLeads: () => false,
      canCreateLeads: () => false,
      canEditLeads: () => false,
      canDeleteLeads: () => false,
      canManageLeads: () => false,
      canViewContacts: () => false,
      canCreateContacts: () => false,
      canEditContacts: () => false,
      canDeleteContacts: () => false,
      canViewAccounts: () => false,
      canCreateAccounts: () => false,
      canEditAccounts: () => false,
      canDeleteAccounts: () => false,
      canViewOpportunities: () => false,
      canCreateOpportunities: () => false,
      canEditOpportunities: () => false,
      canDeleteOpportunities: () => false,
      canViewQuotations: () => false,
      canCreateQuotations: () => false,
      canEditQuotations: () => false,
      canDeleteQuotations: () => false,
      canViewSalesOrders: () => false,
      canCreateSalesOrders: () => false,
      canEditSalesOrders: () => false,
      canDeleteSalesOrders: () => false,
      canViewProductOrders: () => false,
      canCreateProductOrders: () => false,
      canEditProductOrders: () => false,
      canDeleteProductOrders: () => false,
      canViewInvoices: () => false,
      canCreateInvoices: () => false,
      canEditInvoices: () => false,
      canDeleteInvoices: () => false,
      canViewInventory: () => false,
      canCreateInventory: () => false,
      canEditInventory: () => false,
      canDeleteInventory: () => false,
      canViewDashboard: () => false,
      canViewSettings: () => false,
      canManageSettings: () => false,
      canViewCommunications: () => false,
      canViewTickets: () => false,
      canViewFormBuilder: () => false,
      canViewDocuments: () => false,
      canViewPayments: () => false,
      canViewReports: () => false,
      canExportReports: () => false,
      canViewAnalytics: () => false,
      canExportAnalytics: () => false,
      canUseAdvancedFeatures: () => false,
      canUseAIFeatures: () => false,
      canManageUsers: () => false,
      canManageRoles: () => false,
      isAdmin: () => false,
      hasPremium: () => false,
      hasPremiumFeatures: () => false
    };
  }
};

export default usePermissionsQuery;
