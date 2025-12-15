import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  module: string;
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  permission,
  children,
  fallback = null,
  requireAll = false
}) => {
  const { hasPermission, permissions } = usePermissions();
  
  // Debug logging for permission gates
  const checkingPermission = Array.isArray(permission) ? permission : [permission];
  const fullPermissions = checkingPermission.map(perm => `${module}.${perm}`);
  
  console.log('🔒 PermissionGate Check:', {
    module,
    permission: checkingPermission,
    fullPermissions,
    requireAll,
    availablePermissions: permissions ? permissions.length : 0,
    permissionsSample: permissions ? permissions.slice(0, 5) : [],
    allPermissions: permissions,
    permissionsType: typeof permissions,
    isArray: Array.isArray(permissions)
  });

  if (requireAll) {
    // Check if user has ALL specified permissions
    const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
    const permissionResults = permissionsToCheck.map(perm => {
      const fullPerm = `${module}.${perm}`;
      const hasIt = hasPermission(fullPerm);
      return { permission: fullPerm, hasPermission: hasIt };
    });
    const hasAllPermissions = permissionResults.every(result => result.hasPermission);
    
    console.log('🔒 Permission Check (ALL required):', {
      results: permissionResults,
      hasAllPermissions,
      decision: hasAllPermissions ? 'ALLOW' : 'DENY'
    });
    
    if (hasAllPermissions) {
      return <>{children}</>;
    }
  } else {
    // Check if user has ANY of the specified permissions
    const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
    const permissionResults = permissionsToCheck.map(perm => {
      const fullPerm = `${module}.${perm}`;
      const hasIt = hasPermission(fullPerm);
      return { permission: fullPerm, hasPermission: hasIt };
    });
    const hasAnyPermission = permissionResults.some(result => result.hasPermission);
    
    console.log('🔒 Permission Check (ANY required):', {
      results: permissionResults,
      hasAnyPermission,
      decision: hasAnyPermission ? 'ALLOW' : 'DENY'
    });
    
    if (hasAnyPermission) {
      return <>{children}</>;
    }
  }

  console.log('❌ PermissionGate: Access DENIED, showing fallback');
  return <>{fallback}</>;
};

// Convenience components for common permission checks
export const CanCreate: React.FC<{ module: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  module,
  children,
  fallback
}) => (
  <PermissionGate module={module} permission="create" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanRead: React.FC<{ module: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  module,
  children,
  fallback
}) => (
  <PermissionGate module={module} permission="read" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanUpdate: React.FC<{ module: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  module,
  children,
  fallback
}) => (
  <PermissionGate module={module} permission="update" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanDelete: React.FC<{ module: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  module,
  children,
  fallback
}) => (
  <PermissionGate module={module} permission="delete" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanManage: React.FC<{ module: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  module,
  children,
  fallback
}) => (
  <PermissionGate module={module} permission="manage" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const IsAdmin: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { isAdmin } = usePermissions();
  return isAdmin() ? <>{children}</> : <>{fallback}</>;
};

export const HasPremium: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { hasPremiumFeatures } = usePermissions();
  return hasPremiumFeatures() ? <>{children}</> : <>{fallback}</>;
};

// CRM Module-specific permission gates
export const CanViewLeads: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewLeads } = usePermissions();
  return canViewLeads() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateLeads: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateLeads } = usePermissions();
  return canCreateLeads() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditLeads: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditLeads } = usePermissions();
  return canEditLeads() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteLeads: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteLeads } = usePermissions();
  return canDeleteLeads() ? <>{children}</> : <>{fallback}</>;
};

export const CanManageLeads: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canManageLeads } = usePermissions();
  return canManageLeads() ? <>{children}</> : <>{fallback}</>;
};

// Contacts permissions
export const CanViewContacts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewContacts } = usePermissions();
  return canViewContacts() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateContacts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateContacts } = usePermissions();
  return canCreateContacts() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditContacts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditContacts } = usePermissions();
  return canEditContacts() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteContacts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteContacts } = usePermissions();
  return canDeleteContacts() ? <>{children}</> : <>{fallback}</>;
};

// Accounts permissions
export const CanViewAccounts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewAccounts } = usePermissions();
  return canViewAccounts() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateAccounts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateAccounts } = usePermissions();
  return canCreateAccounts() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditAccounts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditAccounts } = usePermissions();
  return canEditAccounts() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteAccounts: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteAccounts } = usePermissions();
  return canDeleteAccounts() ? <>{children}</> : <>{fallback}</>;
};

// Opportunities permissions
export const CanViewOpportunities: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewOpportunities } = usePermissions();
  return canViewOpportunities() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateOpportunities: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateOpportunities } = usePermissions();
  return canCreateOpportunities() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditOpportunities: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditOpportunities } = usePermissions();
  return canEditOpportunities() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteOpportunities: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteOpportunities } = usePermissions();
  return canDeleteOpportunities() ? <>{children}</> : <>{fallback}</>;
};

// Quotations permissions
export const CanViewQuotations: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewQuotations } = usePermissions();
  return canViewQuotations() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateQuotations: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateQuotations } = usePermissions();
  return canCreateQuotations() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditQuotations: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditQuotations } = usePermissions();
  return canEditQuotations() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteQuotations: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteQuotations } = usePermissions();
  return canDeleteQuotations() ? <>{children}</> : <>{fallback}</>;
};

// Tasks permissions
export const CanViewTasks: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewTasks } = usePermissions();
  return canViewTasks() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateTasks: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateTasks } = usePermissions();
  return canCreateTasks() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditTasks: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditTasks } = usePermissions();
  return canEditTasks() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteTasks: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteTasks } = usePermissions();
  return canDeleteTasks() ? <>{children}</> : <>{fallback}</>;
};

// Tickets permissions
export const CanViewTickets: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewTickets } = usePermissions();
  return canViewTickets() ? <>{children}</> : <>{fallback}</>;
};

export const CanCreateTickets: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canCreateTickets } = usePermissions();
  return canCreateTickets() ? <>{children}</> : <>{fallback}</>;
};

export const CanEditTickets: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canEditTickets } = usePermissions();
  return canEditTickets() ? <>{children}</> : <>{fallback}</>;
};

export const CanDeleteTickets: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canDeleteTickets } = usePermissions();
  return canDeleteTickets() ? <>{children}</> : <>{fallback}</>;
};

// Reports permissions
export const CanViewReports: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewReports } = usePermissions();
  return canViewReports() ? <>{children}</> : <>{fallback}</>;
};

export const CanExportReports: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canExportReports } = usePermissions();
  return canExportReports() ? <>{children}</> : <>{fallback}</>;
};

// Analytics permissions
export const CanViewAnalytics: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canViewAnalytics } = usePermissions();
  return canViewAnalytics() ? <>{children}</> : <>{fallback}</>;
};

export const CanExportAnalytics: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canExportAnalytics } = usePermissions();
  return canExportAnalytics() ? <>{children}</> : <>{fallback}</>;
};

// Admin permissions
export const CanManageUsers: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canManageUsers } = usePermissions();
  return canManageUsers() ? <>{children}</> : <>{fallback}</>;
};

export const CanManageRoles: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canManageRoles } = usePermissions();
  return canManageRoles() ? <>{children}</> : <>{fallback}</>;
};

export const CanManageSettings: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canManageSettings } = usePermissions();
  return canManageSettings() ? <>{children}</> : <>{fallback}</>;
};

// Subscription-based gates
export const HasAdvancedFeatures: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canUseAdvancedFeatures } = usePermissions();
  return canUseAdvancedFeatures() ? <>{children}</> : <>{fallback}</>;
};

export const HasAIFeatures: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { canUseAIFeatures } = usePermissions();
  return canUseAIFeatures() ? <>{children}</> : <>{fallback}</>;
};
