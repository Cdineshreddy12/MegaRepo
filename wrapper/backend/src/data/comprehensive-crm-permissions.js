// 🚀 **REALISTIC B2B CRM PERMISSION MATRIX**
// Complete permission system based on actual implementation
// Aligned with existing routes and controllers - No Events/Tasks modules

export const CRM_PERMISSION_MATRIX = {
  // 📊 **1. LEADS MODULE** (7 permissions)
  // Route: /api/leads | Controller: leadController.js
  leads: {
    'crm.leads.create': 'Create new leads',
    'crm.leads.read': 'View leads (own/assigned)',
    'crm.leads.read_all': 'View all leads in tenant',
    'crm.leads.update': 'Edit leads (own/assigned)',
    'crm.leads.delete': 'Delete leads (own/assigned)',
    'crm.leads.export': 'Export leads data',
    'crm.leads.import': 'Import leads from files'
  },

  // 🏢 **2. ACCOUNTS MODULE** (8 permissions)
  // Route: /api/accounts | Controller: accountController.js
  accounts: {
    'crm.accounts.create': 'Create new accounts',
    'crm.accounts.read': 'View accounts (own/assigned)',
    'crm.accounts.read_all': 'View all accounts in tenant',
    'crm.accounts.update': 'Edit accounts (own/assigned)',
    'crm.accounts.delete': 'Delete accounts (own/assigned)',
    'crm.accounts.view_contacts': 'View account contacts',
    'crm.accounts.export': 'Export accounts data',
    'crm.accounts.import': 'Import accounts from files'
  },

  // 👥 **3. CONTACTS MODULE** (7 permissions)
  // Route: /api/contacts | Controller: contactController.js
  contacts: {
    'crm.contacts.create': 'Create new contacts',
    'crm.contacts.read': 'View contacts (own/assigned)',
    'crm.contacts.read_all': 'View all contacts in tenant',
    'crm.contacts.update': 'Edit contacts (own/assigned)',
    'crm.contacts.delete': 'Delete contacts (own/assigned)',
    'crm.contacts.export': 'Export contacts data',
    'crm.contacts.import': 'Import contacts from files'
  },

  // 💰 **4. OPPORTUNITIES MODULE** (7 permissions)
  // Route: /api/opportunities | Controller: opportunityController.js
  opportunities: {
    'crm.opportunities.create': 'Create new opportunities',
    'crm.opportunities.read': 'View opportunities (own/assigned)',
    'crm.opportunities.read_all': 'View all opportunities in tenant',
    'crm.opportunities.update': 'Edit opportunities (own/assigned)',
    'crm.opportunities.delete': 'Delete opportunities (own/assigned)',
    'crm.opportunities.export': 'Export opportunities data',
    'crm.opportunities.import': 'Import opportunities from files'
  },

  // 📄 **5. QUOTATIONS MODULE** (8 permissions)
  // Route: /api/quotations | Controller: quotationController.js
  quotations: {
    'crm.quotations.create': 'Create new quotations',
    'crm.quotations.read': 'View quotations (own/assigned)',
    'crm.quotations.read_all': 'View all quotations in tenant',
    'crm.quotations.update': 'Edit quotations (own/assigned)',
    'crm.quotations.delete': 'Delete quotations (own/assigned)',
    'crm.quotations.generate_pdf': 'Generate quotation PDFs',
    'crm.quotations.export': 'Export quotations data',
    'crm.quotations.import': 'Import quotations from files'
  },

  // 🎫 **6. TICKETS MODULE** (5 permissions)
  // Route: /api/tickets | Controller: ticketController.js
  tickets: {
    'crm.tickets.create': 'Create new tickets',
    'crm.tickets.read': 'View tickets (own/assigned)',
    'crm.tickets.read_all': 'View all tickets in tenant',
    'crm.tickets.update': 'Edit tickets (own/assigned)',
    'crm.tickets.delete': 'Delete tickets (own/assigned)'
  },

  // 💬 **7. COMMUNICATIONS MODULE** (5 permissions)
  // Route: /api/communications | Controller: communicationController.js
  communications: {
    'crm.communications.create': 'Create new communications',
    'crm.communications.read': 'View communications (own/assigned)',
    'crm.communications.read_all': 'View all communications in tenant',
    'crm.communications.update': 'Edit communications (own/assigned)',
    'crm.communications.delete': 'Delete communications (own/assigned)'
  },

  // 💵 **8. INVOICES MODULE** (5 permissions)
  // Route: /api/invoices | Controller: invoiceController.js
  invoices: {
    'crm.invoices.create': 'Create new invoices',
    'crm.invoices.read': 'View invoices (own/assigned)',
    'crm.invoices.read_all': 'View all invoices in tenant',
    'crm.invoices.update': 'Edit invoices (own/assigned)',
    'crm.invoices.delete': 'Delete invoices (own/assigned)'
  },

  // 🛒 **9. SALES ORDERS MODULE** (5 permissions)
  // Route: /api/salesOrders | Controller: salesOrderController.js
  sales_orders: {
    'crm.sales_orders.create': 'Create new sales orders',
    'crm.sales_orders.read': 'View sales orders (own/assigned)',
    'crm.sales_orders.read_all': 'View all sales orders in tenant',
    'crm.sales_orders.update': 'Edit sales orders (own/assigned)',
    'crm.sales_orders.delete': 'Delete sales orders (own/assigned)'
  },

  // 📄 **10. DOCUMENTS MODULE** (5 permissions)
  // Route: /api/documents | Controller: documentController.js
  documents: {
    'crm.documents.upload': 'Upload documents',
    'crm.documents.read': 'View documents (own/assigned)',
    'crm.documents.read_all': 'View all documents in tenant',
    'crm.documents.download': 'Download documents',
    'crm.documents.delete': 'Delete documents (own/assigned)'
  },

  // 📤 **11. BULK OPERATIONS MODULE** (3 permissions)
  // Route: /api/bulk-upload | Controller: BulkUploadController.js
  bulk_operations: {
    'crm.bulk.import': 'Import data from files (CSV/Excel)',
    'crm.bulk.export': 'Export data to files',
    'crm.bulk.template': 'Download import templates'
  },

  // 📊 **12. PDF GENERATION MODULE** (2 permissions)
  // Route: /api/pdf | Controller: pdfController.js
  pdf: {
    'crm.pdf.generate': 'Generate PDFs for quotations',
    'crm.pdf.download': 'Download generated PDFs'
  },

  // 🏠 **13. DASHBOARD MODULE** (2 permissions)
  // Implicit from frontend (no specific routes found)
  dashboard: {
    'crm.dashboard.view': 'View dashboard',
    'crm.dashboard.stats': 'View dashboard statistics'
  },

  // 👤 **14. USER MANAGEMENT MODULE** (9 permissions)
  // Route: /api/admin/users | Controller: admin/userController.js
  users: {
    'crm.users.create': 'Create new users',
    'crm.users.read': 'View user profiles',
    'crm.users.read_all': 'View all users in tenant',
    'crm.users.update': 'Edit user profiles',
    'crm.users.delete': 'Delete users',
    'crm.users.change_status': 'Activate/deactivate users',
    'crm.users.change_role': 'Change user roles',
    'crm.users.change_password': 'Change user passwords',
    'crm.users.bulk_upload': 'Bulk upload users from files'
  },

  // 🔐 **15. ROLES MODULE** (4 permissions)
  // Route: /api/admin/roles | Controller: admin/roleController.js
  roles: {
    'crm.roles.create': 'Create new roles',
    'crm.roles.read': 'View roles',
    'crm.roles.update': 'Edit roles',
    'crm.roles.delete': 'Delete roles'
  },

  // 🔍 **16. AUDIT MODULE** (5 permissions)
  // Route: /api/audit | Controller: auditController.js
  audit: {
    'crm.audit.view_own': 'View own audit logs',
    'crm.audit.view_all': 'View all audit logs in tenant',
    'crm.audit.export': 'Export audit logs',
    'crm.audit.stats': 'View audit statistics',
    'crm.audit.search': 'Search audit logs'
  }
};

// 🔑 **SPECIAL PERMISSIONS** (Cross-Module)
export const CRM_SPECIAL_PERMISSIONS = {
  'crm.admin_access': 'Full administrative access',
  'crm.super_admin': 'Super admin privileges (cross-tenant)',
  'crm.view_all_data': 'View all data across modules',
  'crm.export_all': 'Export data from all modules',
  'crm.import_all': 'Import data to all modules'
};

// 📈 **PERMISSION STATISTICS**
export const PERMISSION_STATS = (() => {
  const moduleCount = Object.keys(CRM_PERMISSION_MATRIX).length;
  const totalPermissions = Object.values(CRM_PERMISSION_MATRIX)
    .reduce((total, modulePerms) => total + Object.keys(modulePerms).length, 0) + 
    Object.keys(CRM_SPECIAL_PERMISSIONS).length;
  
  return {
    totalPermissions,
    moduleCount,
    specialPermissions: Object.keys(CRM_SPECIAL_PERMISSIONS).length,
    moduleBreakdown: Object.entries(CRM_PERMISSION_MATRIX).map(([module, perms]) => ({
      module,
      count: Object.keys(perms).length
    }))
  };
})();

// 🛠️ **UTILITY FUNCTIONS**

// Get all permissions as flat array
function getAllPermissionsFlat() {
  const allPermissions = [];
  Object.values(CRM_PERMISSION_MATRIX).forEach(modulePerms => {
    allPermissions.push(...Object.keys(modulePerms));
  });
  allPermissions.push(...Object.keys(CRM_SPECIAL_PERMISSIONS));
  return allPermissions;
}

// Get permissions by action type
function getPermissionsByAction(action) {
  return getAllPermissionsFlat().filter(p => p.includes(`.${action}`));
}

// Get permissions by pattern
function getPermissionsByPattern(pattern) {
  return getAllPermissionsFlat().filter(p => p.includes(pattern));
}

// Get permissions for specific module
function getModulePermissions(module) {
  return Object.keys(CRM_PERMISSION_MATRIX[module] || {});
}

// 🎯 **CRM PERMISSION UTILITIES CLASS**
export class CRMPermissionUtils {
  // Get all permissions including special ones
  static getAllPermissions() {
    const allPermissions = [];
    Object.values(CRM_PERMISSION_MATRIX).forEach(modulePerms => {
      allPermissions.push(...Object.keys(modulePerms));
    });
    allPermissions.push(...Object.keys(CRM_SPECIAL_PERMISSIONS));
    return allPermissions;
  }

  // Get permissions for a specific module
  static getModulePermissions(module) {
    return Object.keys(CRM_PERMISSION_MATRIX[module] || {});
  }

  // Get permissions for a role template
  static getRolePermissions(roleTemplate) {
    return this.getAllPermissions().filter(permission => 
      roleTemplate.permissions && roleTemplate.permissions[permission]
    );
  }

  // Check if permission is valid
  static isValidPermission(permission) {
    return this.getAllPermissions().includes(permission);
  }

  // Get permission description
  static getPermissionDescription(permission) {
    // Check in regular modules
    for (const modulePerms of Object.values(CRM_PERMISSION_MATRIX)) {
      if (modulePerms[permission]) {
        return modulePerms[permission];
      }
    }
    
    // Check in special permissions
    if (CRM_SPECIAL_PERMISSIONS[permission]) {
      return CRM_SPECIAL_PERMISSIONS[permission];
    }
    
    return 'Unknown permission';
  }

  // Generate structured permissions object
  static generatePermissionsObject(permissionsList) {
    const permissionsObj = {};
    permissionsList.forEach(permission => {
      permissionsObj[permission] = {
        granted: true,
        description: this.getPermissionDescription(permission),
        grantedAt: new Date().toISOString()
      };
    });
    return permissionsObj;
  }

  // Get statistics
  static getStats() {
    return PERMISSION_STATS;
  }
}

// Export utility functions for backward compatibility
export { getAllPermissionsFlat, getPermissionsByAction, getPermissionsByPattern, getModulePermissions }; 