/**
 * CRM Modules Configuration
 * Defines all modules, their permissions, and metadata
 */

export const modules = {
  // 📊 LEADS MODULE
  leads: {
    moduleCode: 'leads',
    moduleName: 'Lead Management',
    description: 'Manage sales leads and prospects',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Leads', description: 'View and browse lead information' },
      { code: 'read_all', name: 'View All Leads', description: 'View all leads in organization' },
      { code: 'create', name: 'Create Leads', description: 'Add new leads to the system' },
      { code: 'update', name: 'Edit Leads', description: 'Modify existing lead information' },
      { code: 'delete', name: 'Delete Leads', description: 'Remove leads from the system' },
      { code: 'export', name: 'Export Leads', description: 'Export lead data to various formats' },
      { code: 'import', name: 'Import Leads', description: 'Import leads from external files' },
      { code: 'assign', name: 'Assign Leads', description: 'Assign leads to other users' },
      { code: 'convert', name: 'Convert Leads', description: 'Convert leads to opportunities' }
    ]
  },

  // 🏢 ACCOUNTS MODULE
  accounts: {
    moduleCode: 'accounts',
    moduleName: 'Account Management',
    description: 'Manage customer accounts and companies',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Accounts', description: 'View and browse account information' },
      { code: 'read_all', name: 'View All Accounts', description: 'View all accounts in organization' },
      { code: 'create', name: 'Create Accounts', description: 'Add new accounts to the system' },
      { code: 'update', name: 'Edit Accounts', description: 'Modify existing account information' },
      { code: 'delete', name: 'Delete Accounts', description: 'Remove accounts from the system' },
      { code: 'export', name: 'Export Accounts', description: 'Export account data' },
      { code: 'import', name: 'Import Accounts', description: 'Import accounts from files' },
      { code: 'assign', name: 'Assign Accounts', description: 'Assign accounts to other users' }
    ]
  },

  // 👥 CONTACTS MODULE
  contacts: {
    moduleCode: 'contacts',
    moduleName: 'Contact Management',
    description: 'Manage customer contacts and relationships',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Contacts', description: 'View and browse contact information' },
      { code: 'read_all', name: 'View All Contacts', description: 'View all contacts in organization' },
      { code: 'create', name: 'Create Contacts', description: 'Add new contacts to the system' },
      { code: 'update', name: 'Edit Contacts', description: 'Modify existing contact information' },
      { code: 'delete', name: 'Delete Contacts', description: 'Remove contacts from the system' },
      { code: 'export', name: 'Export Contacts', description: 'Export contact data' },
      { code: 'import', name: 'Import Contacts', description: 'Import contacts from files' },
      { code: 'assign', name: 'Assign Contacts', description: 'Assign contacts to other users' }
    ]
  },

  // 💰 OPPORTUNITIES MODULE
  opportunities: {
    moduleCode: 'opportunities',
    moduleName: 'Opportunity Management',
    description: 'Manage sales opportunities and deals',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Opportunities', description: 'View opportunity information' },
      { code: 'read_all', name: 'View All Opportunities', description: 'View all opportunities in organization' },
      { code: 'create', name: 'Create Opportunities', description: 'Add new opportunities' },
      { code: 'update', name: 'Edit Opportunities', description: 'Modify opportunity information' },
      { code: 'delete', name: 'Delete Opportunities', description: 'Remove opportunities' },
      { code: 'export', name: 'Export Opportunities', description: 'Export opportunity data' },
      { code: 'import', name: 'Import Opportunities', description: 'Import opportunities from files' },
      { code: 'close', name: 'Close Opportunities', description: 'Mark opportunities as won/lost' },
      { code: 'assign', name: 'Assign Opportunities', description: 'Assign opportunities to other users' }
    ]
  },

  // 📄 QUOTATIONS MODULE
  quotations: {
    moduleCode: 'quotations',
    moduleName: 'Quote Management',
    description: 'Create and manage sales quotations',
    isCore: false,
    permissions: [
      { code: 'read', name: 'View Quotations', description: 'View quotation information' },
      { code: 'read_all', name: 'View All Quotations', description: 'View all quotations in organization' },
      { code: 'create', name: 'Create Quotations', description: 'Create new quotations' },
      { code: 'update', name: 'Edit Quotations', description: 'Modify quotation information' },
      { code: 'delete', name: 'Delete Quotations', description: 'Remove quotations' },
      { code: 'export', name: 'Export Quotations', description: 'Export quotation data' },
      { code: 'generate_pdf', name: 'Generate PDF', description: 'Generate PDF versions of quotations' },
      { code: 'send', name: 'Send Quotations', description: 'Send quotations to customers' },
      { code: 'approve', name: 'Approve Quotations', description: 'Approve quotations for sending' },
      { code: 'assign', name: 'Assign Quotations', description: 'Assign quotations to other users' }
    ]
  },

  // 🧾 INVOICES MODULE
  invoices: {
    moduleCode: 'invoices',
    moduleName: 'Invoice Management',
    description: 'Create and manage customer invoices',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Invoices', description: 'View invoice information' },
      { code: 'read_all', name: 'View All Invoices', description: 'View all invoices in organization' },
      { code: 'create', name: 'Create Invoices', description: 'Create new invoices' },
      { code: 'update', name: 'Edit Invoices', description: 'Modify invoice information' },
      { code: 'delete', name: 'Delete Invoices', description: 'Remove invoices' },
      { code: 'export', name: 'Export Invoices', description: 'Export invoice data' },
      { code: 'send', name: 'Send Invoices', description: 'Send invoices to customers' },
      { code: 'mark_paid', name: 'Mark as Paid', description: 'Mark invoices as paid' },
      { code: 'generate_pdf', name: 'Generate PDF', description: 'Generate PDF versions' },
      { code: 'assign', name: 'Assign Invoices', description: 'Assign invoices to other users' }
    ]
  },

  // 📦 INVENTORY MODULE
  inventory: {
    moduleCode: 'inventory',
    moduleName: 'Inventory Management',
    description: 'Manage product inventory and stock levels',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Inventory', description: 'View inventory information' },
      { code: 'read_all', name: 'View All Inventory', description: 'View all inventory items' },
      { code: 'create', name: 'Create Inventory Items', description: 'Add new inventory items' },
      { code: 'update', name: 'Edit Inventory', description: 'Modify inventory information' },
      { code: 'delete', name: 'Delete Inventory', description: 'Remove inventory items' },
      { code: 'export', name: 'Export Inventory', description: 'Export inventory data' },
      { code: 'import', name: 'Import Inventory', description: 'Import inventory from files' },
      { code: 'adjust', name: 'Adjust Stock Levels', description: 'Adjust inventory quantities' },
      { code: 'movement', name: 'Track Movements', description: 'Track inventory movements' }
    ]
  },

  // 🛒 PRODUCT ORDERS MODULE
  product_orders: {
    moduleCode: 'product_orders',
    moduleName: 'Product Order Management',
    description: 'Manage product orders and fulfillment',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Product Orders', description: 'View product order information' },
      { code: 'read_all', name: 'View All Product Orders', description: 'View all product orders' },
      { code: 'create', name: 'Create Product Orders', description: 'Create new product orders' },
      { code: 'update', name: 'Edit Product Orders', description: 'Modify order information' },
      { code: 'delete', name: 'Delete Product Orders', description: 'Remove product orders' },
      { code: 'export', name: 'Export Orders', description: 'Export order data' },
      { code: 'import', name: 'Import Orders', description: 'Import orders from files' },
      { code: 'process', name: 'Process Orders', description: 'Process and fulfill orders' },
      { code: 'assign', name: 'Assign Orders', description: 'Assign orders to other users' }
    ]
  },

  // 📋 SALES ORDERS MODULE
  sales_orders: {
    moduleCode: 'sales_orders',
    moduleName: 'Sales Order Management',
    description: 'Manage sales orders and transactions',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Sales Orders', description: 'View sales order information' },
      { code: 'read_all', name: 'View All Sales Orders', description: 'View all sales orders' },
      { code: 'create', name: 'Create Sales Orders', description: 'Create new sales orders' },
      { code: 'update', name: 'Edit Sales Orders', description: 'Modify sales order information' },
      { code: 'delete', name: 'Delete Sales Orders', description: 'Remove sales orders' },
      { code: 'export', name: 'Export Sales Orders', description: 'Export sales order data' },
      { code: 'import', name: 'Import Sales Orders', description: 'Import sales orders from files' },
      { code: 'approve', name: 'Approve Sales Orders', description: 'Approve sales orders' },
      { code: 'assign', name: 'Assign Sales Orders', description: 'Assign sales orders to other users' }
    ]
  },

  // 🎫 TICKETS MODULE
  tickets: {
    moduleCode: 'tickets',
    moduleName: 'Support Ticket Management',
    description: 'Manage customer support tickets and issues',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Tickets', description: 'View ticket information' },
      { code: 'read_all', name: 'View All Tickets', description: 'View all tickets in organization' },
      { code: 'create', name: 'Create Tickets', description: 'Create new support tickets' },
      { code: 'update', name: 'Edit Tickets', description: 'Modify ticket information' },
      { code: 'delete', name: 'Delete Tickets', description: 'Remove tickets' },
      { code: 'export', name: 'Export Tickets', description: 'Export ticket data' },
      { code: 'import', name: 'Import Tickets', description: 'Import tickets from files' },
      { code: 'assign', name: 'Assign Tickets', description: 'Assign tickets to agents' },
      { code: 'resolve', name: 'Resolve Tickets', description: 'Mark tickets as resolved' },
      { code: 'escalate', name: 'Escalate Tickets', description: 'Escalate urgent tickets' }
    ]
  },

  // 📞 COMMUNICATIONS MODULE
  communications: {
    moduleCode: 'communications',
    moduleName: 'Communication Management',
    description: 'Manage customer communications and interactions',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Communications', description: 'View communication history' },
      { code: 'read_all', name: 'View All Communications', description: 'View all communications' },
      { code: 'create', name: 'Create Communications', description: 'Create new communications' },
      { code: 'update', name: 'Edit Communications', description: 'Modify communication content' },
      { code: 'delete', name: 'Delete Communications', description: 'Remove communications' },
      { code: 'export', name: 'Export Communications', description: 'Export communication data' },
      { code: 'send', name: 'Send Communications', description: 'Send communications to customers' },
      { code: 'schedule', name: 'Schedule Communications', description: 'Schedule future communications' }
    ]
  },

  // 📅 CALENDAR MODULE
  calendar: {
    moduleCode: 'calendar',
    moduleName: 'Calendar Management',
    description: 'Manage appointments, meetings, and schedules',
    isCore: true,
    permissions: [
      { code: 'read', name: 'View Calendar', description: 'View calendar events' },
      { code: 'read_all', name: 'View All Events', description: 'View all calendar events' },
      { code: 'create', name: 'Create Events', description: 'Create new calendar events' },
      { code: 'update', name: 'Edit Events', description: 'Modify event information' },
      { code: 'delete', name: 'Delete Events', description: 'Remove calendar events' },
      { code: 'export', name: 'Export Calendar', description: 'Export calendar data' },
      { code: 'import', name: 'Import Events', description: 'Import events from files' },
      { code: 'share', name: 'Share Events', description: 'Share events with others' }
    ]
  },

  // 📊 DASHBOARD MODULE
  dashboard: {
    moduleCode: 'dashboard',
    moduleName: 'CRM Dashboard',
    description: 'CRM analytics and reporting dashboard',
    isCore: true,
    permissions: [
      { code: 'view', name: 'View Dashboard', description: 'Access CRM dashboard' },
      { code: 'customize', name: 'Customize Dashboard', description: 'Customize dashboard layout and widgets' },
      { code: 'export', name: 'Export Reports', description: 'Export dashboard reports' }
    ]
  },

  // 🤖 AI INSIGHTS MODULE
  ai_insights: {
    moduleCode: 'ai_insights',
    moduleName: 'AI Insights & Analytics',
    description: 'AI-powered insights and predictive analytics',
    isCore: false,
    permissions: [
      { code: 'read', name: 'View AI Insights', description: 'View AI-generated insights' },
      { code: 'read_all', name: 'View All Insights', description: 'View all AI insights' },
      { code: 'generate', name: 'Generate Insights', description: 'Generate new AI insights' },
      { code: 'export', name: 'Export Insights', description: 'Export insight data' },
      { code: 'schedule', name: 'Schedule Insights', description: 'Schedule automated insights' }
    ]
  },

  // 📝 FORM BUILDER MODULE
  form_builder: {
    moduleCode: 'form_builder',
    moduleName: 'Form Builder',
    description: 'Create and manage dynamic form templates',
    isCore: false,
    permissions: [
      { code: 'read', name: 'View Forms', description: 'View form templates and builder' },
      { code: 'read_all', name: 'View All Forms', description: 'View all form templates in organization' },
      { code: 'create', name: 'Create Forms', description: 'Create new form templates' },
      { code: 'update', name: 'Edit Forms', description: 'Modify existing form templates' },
      { code: 'delete', name: 'Delete Forms', description: 'Remove form templates' },
      { code: 'export', name: 'Export Forms', description: 'Export form template data' },
      { code: 'import', name: 'Import Forms', description: 'Import form templates from files' },
      { code: 'publish', name: 'Publish Forms', description: 'Publish forms for use' },
      { code: 'duplicate', name: 'Duplicate Forms', description: 'Duplicate existing form templates' },
      { code: 'view_analytics', name: 'View Form Analytics', description: 'View analytics for form submissions' },
      { code: 'manage_layout', name: 'Manage Layout', description: 'Manage form layout and design' }
    ]
  },

  // 📊 ANALYTICS MODULE
  analytics: {
    moduleCode: 'analytics',
    moduleName: 'Analytics & Reporting',
    description: 'Create and manage analytics formulas, calculations, and insights',
    isCore: false,
    permissions: [
      { code: 'read', name: 'View Analytics', description: 'View analytics formulas and results' },
      { code: 'read_all', name: 'View All Analytics', description: 'View all analytics in organization' },
      { code: 'create', name: 'Create Analytics', description: 'Create new analytics formulas' },
      { code: 'update', name: 'Edit Analytics', description: 'Modify existing analytics formulas' },
      { code: 'delete', name: 'Delete Analytics', description: 'Remove analytics formulas' },
      { code: 'export', name: 'Export Analytics', description: 'Export analytics data and reports' },
      { code: 'calculate', name: 'Calculate Analytics', description: 'Execute analytics calculations' },
      { code: 'generate_formula', name: 'Generate Formulas', description: 'Generate formulas from descriptions using AI' },
      { code: 'validate_formula', name: 'Validate Formulas', description: 'Validate analytics formulas' },
      { code: 'suggest_metrics', name: 'Suggest Metrics', description: 'Get AI-suggested metrics for forms' },
      { code: 'generate_insights', name: 'Generate Insights', description: 'Generate insights from analytics results' },
      { code: 'manage_dashboards', name: 'Manage Dashboards', description: 'Create and manage analytics dashboard views' },
      { code: 'view_dashboards', name: 'View Dashboards', description: 'View analytics dashboard views' }
    ]
  },

  // ⚙️ SYSTEM MODULE
  system: {
    moduleCode: 'system',
    moduleName: 'System Configuration',
    description: 'System administration and configuration management',
    isCore: true,
    permissions: [
      // Settings Permissions
      { code: 'settings_read', name: 'View Settings', description: 'View system settings and configurations' },
      { code: 'settings_update', name: 'Update Settings', description: 'Update system settings' },

      // Configuration Permissions
      { code: 'configurations_read', name: 'View Configurations', description: 'View system configurations' },
      { code: 'configurations_create', name: 'Create Configurations', description: 'Create new system configurations' },
      { code: 'configurations_update', name: 'Update Configurations', description: 'Update existing configurations' },
      { code: 'configurations_delete', name: 'Delete Configurations', description: 'Delete system configurations' },

      // Tenant Configuration Permissions
      { code: 'tenant_config_read', name: 'View Tenant Config', description: 'View tenant-specific configurations' },
      { code: 'tenant_config_update', name: 'Update Tenant Config', description: 'Update tenant configurations' },
      { code: 'admin.tenants.read', name: 'View All Tenants', description: 'View and list all tenants in the system' },

      // Credit Configuration Permissions
      { code: 'credit_config.view', name: 'View Credit Configurations', description: 'View tenant credit configuration settings' },
      { code: 'credit_config.edit', name: 'Edit Credit Configurations', description: 'Edit tenant credit configuration settings' },
      { code: 'credit_config.reset', name: 'Reset Credit Configurations', description: 'Reset tenant configurations to global defaults' },
      { code: 'credit_config.bulk_update', name: 'Bulk Update Credit Configurations', description: 'Bulk update multiple credit configuration settings' },

      // System Configuration Permissions
      { code: 'system_config_read', name: 'View System Config', description: 'View system-level configurations' },
      { code: 'system_config_update', name: 'Update System Config', description: 'Update system-level configurations' },

      // Dropdown Permissions
      { code: 'dropdowns_read', name: 'View Dropdowns', description: 'View system dropdown values' },
      { code: 'dropdowns_create', name: 'Create Dropdowns', description: 'Create new dropdown values' },
      { code: 'dropdowns_update', name: 'Update Dropdowns', description: 'Update dropdown values' },
      { code: 'dropdowns_delete', name: 'Delete Dropdowns', description: 'Delete dropdown values' },

      // Integration Permissions
      { code: 'integrations_read', name: 'View Integrations', description: 'View system integrations' },
      { code: 'integrations_create', name: 'Create Integrations', description: 'Create new integrations' },
      { code: 'integrations_update', name: 'Update Integrations', description: 'Update existing integrations' },
      { code: 'integrations_delete', name: 'Delete Integrations', description: 'Delete integrations' },

      // Backup Permissions
      { code: 'backup_read', name: 'View Backups', description: 'View backup information and history' },
      { code: 'backup_create', name: 'Create Backups', description: 'Create system backups' },
      { code: 'backup_restore', name: 'Restore Backups', description: 'Restore system from backups' },

      // Maintenance Permissions
      { code: 'maintenance_read', name: 'View Maintenance', description: 'View maintenance schedules and status' },
      { code: 'maintenance_perform', name: 'Perform Maintenance', description: 'Execute maintenance operations' },
      { code: 'maintenance_schedule', name: 'Schedule Maintenance', description: 'Schedule maintenance operations' },

      // User Management Permissions
      { code: 'users_read', name: 'View Users', description: 'View user information' },
      { code: 'users_read_all', name: 'View All Users', description: 'View all users in organization' },
      { code: 'users_create', name: 'Create Users', description: 'Create new user accounts' },
      { code: 'users_update', name: 'Edit Users', description: 'Modify user information' },
      { code: 'users_delete', name: 'Delete Users', description: 'Remove user accounts' },
      { code: 'users_activate', name: 'Activate Users', description: 'Activate/deactivate users' },
      { code: 'users_reset_password', name: 'Reset Passwords', description: 'Reset user passwords' },
      { code: 'users_export', name: 'Export Users', description: 'Export user data' },
      { code: 'users_import', name: 'Import Users', description: 'Import users from files' },

      // Role Management Permissions
      { code: 'roles_read', name: 'View Roles', description: 'View role information' },
      { code: 'roles_read_all', name: 'View All Roles', description: 'View all roles in organization' },
      { code: 'roles_create', name: 'Create Roles', description: 'Create new roles' },
      { code: 'roles_update', name: 'Edit Roles', description: 'Modify role information' },
      { code: 'roles_delete', name: 'Delete Roles', description: 'Remove roles' },
      { code: 'roles_assign', name: 'Assign Roles', description: 'Assign roles to users' },
      { code: 'roles_export', name: 'Export Roles', description: 'Export role data' },

      // Reports Permissions
      { code: 'reports_read', name: 'View Reports', description: 'View report information' },
      { code: 'reports_read_all', name: 'View All Reports', description: 'View all reports' },
      { code: 'reports_create', name: 'Create Reports', description: 'Create new reports' },
      { code: 'reports_update', name: 'Edit Reports', description: 'Modify existing reports' },
      { code: 'reports_delete', name: 'Delete Reports', description: 'Remove reports' },
      { code: 'reports_export', name: 'Export Reports', description: 'Export report data' },
      { code: 'reports_schedule', name: 'Schedule Reports', description: 'Schedule automated reports' },

      // Audit Logs Permissions
      { code: 'audit_read', name: 'View Audit Logs', description: 'View basic audit log information' },
      { code: 'audit_read_all', name: 'View All Audit Logs', description: 'View all audit logs in organization' },
      { code: 'audit_export', name: 'Export Audit Logs', description: 'Export audit log data to various formats' },
      { code: 'audit_view_details', name: 'View Audit Details', description: 'View detailed audit log information' },
      { code: 'audit_filter', name: 'Filter Audit Logs', description: 'Filter audit logs by various criteria' },
      { code: 'audit_generate_reports', name: 'Generate Reports', description: 'Generate audit reports' },
      { code: 'audit_archive', name: 'Archive Logs', description: 'Archive old audit logs' },
      { code: 'audit_purge', name: 'Purge Old Logs', description: 'Purge old audit logs' },

      // Activity Logs Permissions
      { code: 'activity_logs_read', name: 'View Activity Logs', description: 'View activity log information' },
      { code: 'activity_logs_read_all', name: 'View All Activity Logs', description: 'View all activity logs in organization' },
      { code: 'activity_logs_export', name: 'Export Activity Logs', description: 'Export activity log data' },
      { code: 'activity_logs_view_details', name: 'View Activity Details', description: 'View detailed activity information' },
      { code: 'activity_logs_filter', name: 'Filter Activity Logs', description: 'Filter activity logs by various criteria' },
      { code: 'activity_logs_generate_reports', name: 'Generate Reports', description: 'Generate activity log reports' },
      { code: 'activity_logs_archive', name: 'Archive Logs', description: 'Archive old activity logs' },
      { code: 'activity_logs_purge', name: 'Purge Old Logs', description: 'Purge old activity logs' }
    ]
  }
};

/**
 * Get all permissions for a specific module
 * @param {string} moduleCode - The module code
 * @returns {Array} Array of permission objects
 */
export const getModulePermissions = (moduleCode) => {
  const module = modules[moduleCode];
  return module ? module.permissions : [];
};

/**
 * Get all permission codes for a specific module
 * @param {string} moduleCode - The module code
 * @returns {Array} Array of permission codes
 */
export const getModulePermissionCodes = (moduleCode) => {
  const permissions = getModulePermissions(moduleCode);
  return permissions.map(p => p.code);
};

/**
 * Get all modules
 * @returns {Object} All modules configuration
 */
export const getAllModules = () => {
  return modules;
};

/**
 * Get core modules only
 * @returns {Object} Core modules configuration
 */
export const getCoreModules = () => {
  return Object.fromEntries(
    Object.entries(modules).filter(([_, module]) => module.isCore)
  );
};

/**
 * Get all permission codes across all modules
 * @returns {Array} Array of all permission codes
 */
export const getAllPermissionCodes = () => {
  const allCodes = [];
  Object.values(modules).forEach(module => {
    module.permissions.forEach(permission => {
      allCodes.push(`${module.moduleCode}.${permission.code}`);
    });
  });
  return allCodes;
};

export default modules;

