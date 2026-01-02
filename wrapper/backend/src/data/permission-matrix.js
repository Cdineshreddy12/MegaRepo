// 🎯 **BUSINESS SUITE PERMISSION MATRIX**
// This file defines all applications, their modules, and permissions
// Run `npm run sync-permissions` to update the database

export const BUSINESS_SUITE_MATRIX = {
  // 📊 **CRM APPLICATION**
  crm: {
    appInfo: {
      appCode: 'crm',
      appName: 'Customer Relationship Management',
      description: 'Complete CRM solution for managing customers, deals, and sales pipeline',
      icon: '🎫',
      baseUrl: 'https://crm.zopkit.com',
      version: '2.0.0',
      isCore: true,
      sortOrder: 1
    },
    modules: {
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
          { code: 'assign', name: 'Assign Tickets', description: 'Assign tickets to agents' },
          { code: 'resolve', name: 'Resolve Tickets', description: 'Mark tickets as resolved' },
          { code: 'escalate', name: 'Escalate Tickets', description: 'Escalate urgent tickets' },
          { code: 'export', name: 'Export Tickets', description: 'Export ticket data' },
          { code: 'import', name: 'Import Tickets', description: 'Import tickets from files' }
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
      },
      
    }
  },
  
  // 👥 **HR APPLICATION**
  hr: {
    appInfo: {
      appCode: 'hr',
      appName: 'Human Resources Management',
      description: 'Complete HR solution for employee management and payroll',
      icon: '👥',
      baseUrl: 'http://localhost:3003',
      version: '1.5.0',
      isCore: true,
      sortOrder: 2
    },
    modules: {
      // 👤 EMPLOYEES MODULE
      employees: {
        moduleCode: 'employees',
        moduleName: 'Employee Management',
        description: 'Manage employee records and information',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Employees', description: 'View employee information' },
          { code: 'read_all', name: 'View All Employees', description: 'View all employees in organization' },
          { code: 'create', name: 'Add Employees', description: 'Add new employees to the system' },
          { code: 'update', name: 'Edit Employees', description: 'Modify employee information' },
          { code: 'delete', name: 'Remove Employees', description: 'Remove employees from system' },
          { code: 'view_salary', name: 'View Salary Information', description: 'Access employee salary details' },
          { code: 'export', name: 'Export Employee Data', description: 'Export employee data' }
        ]
      },
      
      // 💰 PAYROLL MODULE
      payroll: {
        moduleCode: 'payroll',
        moduleName: 'Payroll Management',
        description: 'Process payroll and manage compensation',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Payroll', description: 'View payroll information' },
          { code: 'process', name: 'Process Payroll', description: 'Run payroll calculations' },
          { code: 'approve', name: 'Approve Payroll', description: 'Approve payroll for processing' },
          { code: 'export', name: 'Export Payroll', description: 'Export payroll reports' },
          { code: 'generate_reports', name: 'Generate Reports', description: 'Generate payroll reports' }
        ]
      },
      
      // 📅 LEAVE MODULE
      leave: {
        moduleCode: 'leave',
        moduleName: 'Leave Management',
        description: 'Manage employee leave requests and approvals',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Leave Requests', description: 'View leave request information' },
          { code: 'create', name: 'Create Leave Requests', description: 'Submit leave requests' },
          { code: 'approve', name: 'Approve Leave', description: 'Approve leave requests' },
          { code: 'reject', name: 'Reject Leave', description: 'Reject leave requests' },
          { code: 'cancel', name: 'Cancel Leave', description: 'Cancel leave requests' },
          { code: 'export', name: 'Export Leave Data', description: 'Export leave reports' }
        ]
      },
      
      // 📊 HR DASHBOARD MODULE
      dashboard: {
        moduleCode: 'dashboard',
        moduleName: 'HR Dashboard',
        description: 'HR analytics and reporting dashboard',
        isCore: true,
        permissions: [
          { code: 'view', name: 'View Dashboard', description: 'Access HR dashboard' },
          { code: 'customize', name: 'Customize Dashboard', description: 'Customize dashboard layout' },
          { code: 'export', name: 'Export Reports', description: 'Export HR reports' }
        ]
      }
    }
  },
  
  // 🤝 **AFFILIATE CONNECT APPLICATION**
  affiliateConnect: {
    appInfo: {
      appCode: 'affiliate_connect',
      appName: 'Affiliate Connect Platform',
      description: 'Comprehensive multi-tenant SaaS platform for affiliate and influencer marketing management',
      icon: '🤝',
      baseUrl: 'https://affiliate-connect.railway.app',
      version: '1.0.0',
      isCore: true,
      sortOrder: 3
    },
    modules: {


      // 📊 DASHBOARD MODULE
      dashboard: {
        moduleCode: 'dashboard',
        moduleName: 'Dashboard & Analytics',
        description: 'Main dashboard with analytics and performance metrics',
        isCore: true,
        permissions: [
          { code: 'view_dashboard', name: 'View Dashboard', description: 'Access main dashboard interface' },
          { code: 'view_analytics', name: 'View Analytics', description: 'View performance analytics and metrics' },
          { code: 'view_reports', name: 'View Reports', description: 'Access reporting and insights' },
          { code: 'export_data', name: 'Export Data', description: 'Export dashboard data to various formats' },
          { code: 'view_all_tenants', name: 'View All Tenants', description: 'View analytics across all tenants (Super Admin)' },
          { code: 'view_tenant_analytics', name: 'View Tenant Analytics', description: 'View analytics for specific tenant' },
          { code: 'view_affiliate_analytics', name: 'View Affiliate Analytics', description: 'View affiliate-specific analytics' },
          { code: 'view_influencer_analytics', name: 'View Influencer Analytics', description: 'View influencer-specific analytics' }
        ]
      },

      // 🛍️ PRODUCTS MODULE
      products: {
        moduleCode: 'products',
        moduleName: 'Product Management',
        description: 'Product catalog management with commission settings',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Products', description: 'View and browse product information' },
          { code: 'read_all', name: 'View All Products', description: 'View all products in organization' },
          { code: 'create', name: 'Create Products', description: 'Add new products to the catalog' },
          { code: 'update', name: 'Edit Products', description: 'Modify existing product information' },
          { code: 'delete', name: 'Delete Products', description: 'Remove products from the catalog' },
          { code: 'update_commission', name: 'Update Commission', description: 'Update product commission rates' },
          { code: 'upload_images', name: 'Upload Images', description: 'Upload product images' },
          { code: 'export', name: 'Export Products', description: 'Export product data' },
          { code: 'import', name: 'Import Products', description: 'Import products from external files' },
          { code: 'manage_categories', name: 'Manage Categories', description: 'Manage product categories' }
        ]
      },

      // 👥 AFFILIATES MODULE
      affiliates: {
        moduleCode: 'affiliates',
        moduleName: 'Affiliate Management',
        description: 'Affiliate onboarding, management, and tier assignment',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Affiliates', description: 'View and browse affiliate information' },
          { code: 'read_all', name: 'View All Affiliates', description: 'View all affiliates in organization' },
          { code: 'create', name: 'Create Affiliates', description: 'Add new affiliates to the system' },
          { code: 'update', name: 'Edit Affiliates', description: 'Modify existing affiliate information' },
          { code: 'delete', name: 'Delete Affiliates', description: 'Remove affiliates from the system' },
          { code: 'invite', name: 'Invite Affiliates', description: 'Send affiliate invitations via email' },
          { code: 'approve', name: 'Approve Affiliates', description: 'Approve affiliate applications' },
          { code: 'reject', name: 'Reject Affiliates', description: 'Reject affiliate applications' },
          { code: 'assign_tier', name: 'Assign Tier', description: 'Assign commission tiers to affiliates' },
          { code: 'view_pending', name: 'View Pending', description: 'View pending affiliate applications' },
          { code: 'view_details', name: 'View Details', description: 'View detailed affiliate information' },
          { code: 'update_details', name: 'Update Details', description: 'Update affiliate profile details' },
          { code: 'view_commissions', name: 'View Commissions', description: 'View affiliate commission data' },
          { code: 'update_commissions', name: 'Update Commissions', description: 'Update affiliate commission settings' }
        ]
      },

      // 🔗 TRACKING MODULE
      tracking: {
        moduleCode: 'tracking',
        moduleName: 'Link Tracking & Analytics',
        description: 'Affiliate link generation, tracking, and conversion analytics',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Tracking Links', description: 'View and browse tracking links' },
          { code: 'read_all', name: 'View All Tracking Links', description: 'View all tracking links in organization' },
          { code: 'create', name: 'Create Tracking Links', description: 'Generate new tracking links' },
          { code: 'update', name: 'Edit Tracking Links', description: 'Modify existing tracking links' },
          { code: 'delete', name: 'Delete Tracking Links', description: 'Remove tracking links' },
          { code: 'track_clicks', name: 'Track Clicks', description: 'Track link click events' },
          { code: 'track_conversions', name: 'Track Conversions', description: 'Track conversion events' },
          { code: 'view_analytics', name: 'View Analytics', description: 'View tracking analytics and reports' },
          { code: 'export_analytics', name: 'Export Analytics', description: 'Export tracking analytics data' },
          { code: 'manage_utm', name: 'Manage UTM', description: 'Manage UTM parameters for links' }
        ]
      },
      
      // 💰 COMMISSIONS MODULE
      commissions: {
        moduleCode: 'commissions',
        moduleName: 'Commission Management',
        description: 'Commission structure, tiers, and rule management',
        isCore: true,
        permissions: [
          { code: 'read_tiers', name: 'View Commission Tiers', description: 'View commission tier information' },
          { code: 'create_tiers', name: 'Create Commission Tiers', description: 'Create new commission tiers' },
          { code: 'update_tiers', name: 'Edit Commission Tiers', description: 'Modify commission tier settings' },
          { code: 'delete_tiers', name: 'Delete Commission Tiers', description: 'Remove commission tiers' },
          { code: 'read_rules', name: 'View Commission Rules', description: 'View commission rule configurations' },
          { code: 'create_rules', name: 'Create Commission Rules', description: 'Create new commission rules' },
          { code: 'update_rules', name: 'Edit Commission Rules', description: 'Modify commission rules' },
          { code: 'delete_rules', name: 'Delete Commission Rules', description: 'Remove commission rules' },
          { code: 'view_products', name: 'View Product Commissions', description: 'View product-specific commission rates' },
          { code: 'update_products', name: 'Update Product Commissions', description: 'Update product commission rates' },
          { code: 'calculate_commissions', name: 'Calculate Commissions', description: 'Calculate commission amounts' },
          { code: 'view_affiliate_commissions', name: 'View Affiliate Commissions', description: 'View affiliate commission data' }
        ]
      },

      // 🎯 CAMPAIGNS MODULE
      campaigns: {
        moduleCode: 'campaigns',
        moduleName: 'Campaign Management',
        description: 'Marketing campaign creation, management, and influencer participation',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Campaigns', description: 'View and browse campaign information' },
          { code: 'read_all', name: 'View All Campaigns', description: 'View all campaigns in organization' },
          { code: 'create', name: 'Create Campaigns', description: 'Create new marketing campaigns' },
          { code: 'update', name: 'Edit Campaigns', description: 'Modify existing campaign information' },
          { code: 'delete', name: 'Delete Campaigns', description: 'Remove campaigns from the system' },
          { code: 'join_campaign', name: 'Join Campaign', description: 'Join campaigns as influencer' },
          { code: 'view_participants', name: 'View Participants', description: 'View campaign participants' },
          { code: 'manage_participants', name: 'Manage Participants', description: 'Manage campaign participants' },
          { code: 'view_progress', name: 'View Progress', description: 'View campaign progress and metrics' },
          { code: 'submit_content', name: 'Submit Content', description: 'Submit campaign content' },
          { code: 'approve_content', name: 'Approve Content', description: 'Approve submitted content' },
          { code: 'view_contract', name: 'View Contract', description: 'View campaign contracts' },
          { code: 'accept_contract', name: 'Accept Contract', description: 'Accept campaign contracts' },
          { code: 'manage_versions', name: 'Manage Versions', description: 'Manage campaign versions' },
          { code: 'view_analytics', name: 'View Campaign Analytics', description: 'View campaign performance analytics' }
        ]
      },

      // 🌟 INFLUENCERS MODULE
      influencers: {
        moduleCode: 'influencers',
        moduleName: 'Influencer Management',
        description: 'Influencer profiles, social media integration, and analytics',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Influencers', description: 'View and browse influencer information' },
          { code: 'read_all', name: 'View All Influencers', description: 'View all influencers in organization' },
          { code: 'create', name: 'Create Influencers', description: 'Add new influencers to the system' },
          { code: 'update', name: 'Edit Influencers', description: 'Modify existing influencer information' },
          { code: 'delete', name: 'Delete Influencers', description: 'Remove influencers from the system' },
          { code: 'connect_instagram', name: 'Connect Instagram', description: 'Connect Instagram accounts for analytics' },
          { code: 'connect_youtube', name: 'Connect YouTube', description: 'Connect YouTube accounts for analytics' },
          { code: 'connect_twitter', name: 'Connect Twitter', description: 'Connect Twitter accounts for analytics' },
          { code: 'view_analytics', name: 'View Analytics', description: 'View social media analytics' },
          { code: 'view_media_kit', name: 'View Media Kit', description: 'View influencer media kits' },
          { code: 'update_media_kit', name: 'Update Media Kit', description: 'Update media kit information' },
          { code: 'view_ratings', name: 'View Ratings', description: 'View influencer ratings and reviews' },
          { code: 'manage_ratings', name: 'Manage Ratings', description: 'Manage rating and review system' }
        ]
      },

      // 💳 PAYMENTS MODULE
      payments: {
        moduleCode: 'payments',
        moduleName: 'Payment Processing',
        description: 'Payment processing, payouts, and transaction management',
        isCore: true,
        permissions: [
          { code: 'read_payouts', name: 'View Payouts', description: 'View payout information and history' },
          { code: 'create_payouts', name: 'Create Payouts', description: 'Create new payout transactions' },
          { code: 'update_payouts', name: 'Update Payouts', description: 'Update payout status and information' },
          { code: 'view_methods', name: 'View Payment Methods', description: 'View payment method information' },
          { code: 'add_methods', name: 'Add Payment Methods', description: 'Add new payment methods' },
          { code: 'update_methods', name: 'Update Payment Methods', description: 'Update payment method details' },
          { code: 'delete_methods', name: 'Delete Payment Methods', description: 'Remove payment methods' },
          { code: 'view_history', name: 'View Payment History', description: 'View payment transaction history' },
          { code: 'process_payments', name: 'Process Payments', description: 'Process payment transactions' },
          { code: 'view_affiliate_payments', name: 'View Affiliate Payments', description: 'View affiliate payment information' }
        ]
      },

      // 📈 ANALYTICS MODULE
      analytics: {
        moduleCode: 'analytics',
        moduleName: 'Analytics & Reporting',
        description: 'Performance analytics, custom reports, and data visualization',
        isCore: true,
        permissions: [
          { code: 'view_dashboard', name: 'View Dashboard Analytics', description: 'View dashboard analytics and metrics' },
          { code: 'view_campaign_analytics', name: 'View Campaign Analytics', description: 'View campaign performance analytics' },
          { code: 'view_affiliate_analytics', name: 'View Affiliate Analytics', description: 'View affiliate performance analytics' },
          { code: 'view_revenue_analytics', name: 'View Revenue Analytics', description: 'View revenue and financial analytics' },
          { code: 'create_reports', name: 'Create Custom Reports', description: 'Create custom analytics reports' },
          { code: 'view_reports', name: 'View Reports', description: 'View existing analytics reports' },
          { code: 'export_analytics', name: 'Export Analytics', description: 'Export analytics data' },
          { code: 'view_all_tenants', name: 'View All Tenants Analytics', description: 'View analytics across all tenants' },
          { code: 'view_tenant_analytics', name: 'View Tenant Analytics', description: 'View tenant-specific analytics' }
        ]
      },

      // 🛡️ FRAUD PREVENTION MODULE
      fraud: {
        moduleCode: 'fraud',
        moduleName: 'Fraud Prevention',
        description: 'Fraud detection, monitoring, and prevention systems',
        isCore: false,
        permissions: [
          { code: 'read_rules', name: 'View Fraud Rules', description: 'View fraud detection rules' },
          { code: 'create_rules', name: 'Create Fraud Rules', description: 'Create new fraud detection rules' },
          { code: 'update_rules', name: 'Edit Fraud Rules', description: 'Modify fraud detection rules' },
          { code: 'delete_rules', name: 'Delete Fraud Rules', description: 'Remove fraud detection rules' },
          { code: 'view_alerts', name: 'View Fraud Alerts', description: 'View fraud detection alerts' },
          { code: 'update_alerts', name: 'Update Alert Status', description: 'Update fraud alert status' },
          { code: 'view_monitoring', name: 'View Fraud Monitoring', description: 'View fraud monitoring dashboard' },
          { code: 'manage_detection', name: 'Manage Detection', description: 'Manage fraud detection settings' }
        ]
      },

      // 📧 COMMUNICATIONS MODULE
      communications: {
        moduleCode: 'communications',
        moduleName: 'Communications & Notifications',
        description: 'Email templates, notifications, and messaging system',
        isCore: false,
        permissions: [
          { code: 'read_templates', name: 'View Templates', description: 'View notification templates' },
          { code: 'create_templates', name: 'Create Templates', description: 'Create new notification templates' },
          { code: 'update_templates', name: 'Edit Templates', description: 'Modify notification templates' },
          { code: 'delete_templates', name: 'Delete Templates', description: 'Remove notification templates' },
          { code: 'send_notifications', name: 'Send Notifications', description: 'Send notifications to users' },
          { code: 'view_notifications', name: 'View Notifications', description: 'View notification history' },
          { code: 'update_notification_status', name: 'Update Notification Status', description: 'Update notification status' },
          { code: 'manage_messaging', name: 'Manage Messaging', description: 'Manage messaging system settings' }
        ]
      },

      // 🔌 INTEGRATIONS MODULE
      integrations: {
        moduleCode: 'integrations',
        moduleName: 'Third-party Integrations',
        description: 'API keys, webhooks, and external service integrations',
        isCore: false,
        permissions: [
          { code: 'read_api_keys', name: 'View API Keys', description: 'View API key information' },
          { code: 'create_api_keys', name: 'Create API Keys', description: 'Create new API keys' },
          { code: 'update_api_keys', name: 'Update API Keys', description: 'Update API key settings' },
          { code: 'delete_api_keys', name: 'Delete API Keys', description: 'Remove API keys' },
          { code: 'read_webhooks', name: 'View Webhooks', description: 'View webhook configurations' },
          { code: 'create_webhooks', name: 'Create Webhooks', description: 'Create new webhook endpoints' },
          { code: 'update_webhooks', name: 'Update Webhooks', description: 'Update webhook settings' },
          { code: 'delete_webhooks', name: 'Delete Webhooks', description: 'Remove webhook endpoints' },
          { code: 'manage_integrations', name: 'Manage Integrations', description: 'Manage third-party integrations' }
        ]
      },

      // ⚙️ SETTINGS MODULE
      settings: {
        moduleCode: 'settings',
        moduleName: 'System Settings',
        description: 'Tenant settings, user management, and system configuration',
        isCore: true,
        permissions: [
          { code: 'read_tenant_settings', name: 'View Tenant Settings', description: 'View tenant configuration settings' },
          { code: 'update_tenant_settings', name: 'Update Tenant Settings', description: 'Update tenant configuration' },
          { code: 'read_users', name: 'View Users', description: 'View user information' },
          { code: 'create_users', name: 'Create Users', description: 'Create new user accounts' },
          { code: 'update_users', name: 'Update Users', description: 'Update user information' },
          { code: 'delete_users', name: 'Delete Users', description: 'Remove user accounts' },
          { code: 'read_roles', name: 'View Roles', description: 'View role information' },
          { code: 'create_roles', name: 'Create Roles', description: 'Create new user roles' },
          { code: 'update_roles', name: 'Update Roles', description: 'Update role permissions' },
          { code: 'delete_roles', name: 'Delete Roles', description: 'Remove user roles' },
          { code: 'manage_permissions', name: 'Manage Permissions', description: 'Manage role-based permissions' }
        ]
      },

      // 🎫 SUPPORT MODULE
      support: {
        moduleCode: 'support',
        moduleName: 'Customer Support',
        description: 'Support ticket management and knowledge base',
        isCore: false,
        permissions: [
          { code: 'read_tickets', name: 'View Support Tickets', description: 'View support ticket information' },
          { code: 'create_tickets', name: 'Create Support Tickets', description: 'Create new support tickets' },
          { code: 'update_tickets', name: 'Update Support Tickets', description: 'Update support ticket status' },
          { code: 'view_knowledge_base', name: 'View Knowledge Base', description: 'Access knowledge base articles' },
          { code: 'search_knowledge_base', name: 'Search Knowledge Base', description: 'Search knowledge base content' },
          { code: 'manage_tickets', name: 'Manage Tickets', description: 'Manage support ticket workflow' },
          { code: 'view_all_tickets', name: 'View All Tickets', description: 'View all support tickets (Admin)' }
        ]
      },

    }
  },

  // 📋 **PROJECT MANAGEMENT APPLICATION**
  project_management: {
    appInfo: {
      appCode: 'project_management',
      appName: 'Project Management',
      description: 'Complete project management solution for managing projects, tasks, teams, and workflows',
      icon: '📋',
      baseUrl: 'https://prm.zopkit.com',
      version: '1.0.0',
      isCore: true,
      sortOrder: 2
    },
    modules: {
      // 📁 PROJECTS MODULE
      projects: {
        moduleCode: 'projects',
        moduleName: 'Project Management',
        description: 'Manage projects, timelines, and budgets',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Projects', description: 'View and browse project information' },
          { code: 'read_all', name: 'View All Projects', description: 'View all projects in organization' },
          { code: 'create', name: 'Create Projects', description: 'Create new projects' },
          { code: 'update', name: 'Edit Projects', description: 'Modify existing project information' },
          { code: 'delete', name: 'Delete Projects', description: 'Remove projects from the system' },
          { code: 'export', name: 'Export Projects', description: 'Export project data to various formats' },
          { code: 'import', name: 'Import Projects', description: 'Import projects from external files' },
          { code: 'assign', name: 'Assign Projects', description: 'Assign projects to team members' },
          { code: 'archive', name: 'Archive Projects', description: 'Archive completed or inactive projects' },
          { code: 'restore', name: 'Restore Projects', description: 'Restore archived projects' },
          { code: 'manage_budget', name: 'Manage Budget', description: 'Manage project budgets and financials' },
          { code: 'manage_timeline', name: 'Manage Timeline', description: 'Manage project timelines and milestones' },
          { code: 'manage_settings', name: 'Manage Settings', description: 'Manage project settings and configurations' }
        ]
      },

      // ✅ TASKS MODULE
      tasks: {
        moduleCode: 'tasks',
        moduleName: 'Task Management',
        description: 'Manage tasks, subtasks, and assignments',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Tasks', description: 'View and browse task information' },
          { code: 'read_all', name: 'View All Tasks', description: 'View all tasks in organization' },
          { code: 'create', name: 'Create Tasks', description: 'Create new tasks' },
          { code: 'update', name: 'Edit Tasks', description: 'Modify existing task information' },
          { code: 'delete', name: 'Delete Tasks', description: 'Remove tasks from the system' },
          { code: 'export', name: 'Export Tasks', description: 'Export task data to various formats' },
          { code: 'import', name: 'Import Tasks', description: 'Import tasks from external files' },
          { code: 'assign', name: 'Assign Tasks', description: 'Assign tasks to team members' },
          { code: 'reassign', name: 'Reassign Tasks', description: 'Reassign tasks to different team members' },
          { code: 'change_status', name: 'Change Status', description: 'Change task status (todo, in progress, done, etc.)' },
          { code: 'change_priority', name: 'Change Priority', description: 'Change task priority levels' },
          { code: 'add_subtasks', name: 'Add Subtasks', description: 'Add subtasks to existing tasks' },
          { code: 'manage_dependencies', name: 'Manage Dependencies', description: 'Manage task dependencies and relationships' },
          { code: 'add_attachments', name: 'Add Attachments', description: 'Add attachments to tasks' },
          { code: 'add_comments', name: 'Add Comments', description: 'Add comments to tasks' },
          { code: 'time_track', name: 'Track Time', description: 'Track time spent on tasks' }
        ]
      },

      // 🏃 SPRINTS MODULE
      sprints: {
        moduleCode: 'sprints',
        moduleName: 'Sprint Management',
        description: 'Manage agile sprints and iterations',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Sprints', description: 'View and browse sprint information' },
          { code: 'read_all', name: 'View All Sprints', description: 'View all sprints in organization' },
          { code: 'create', name: 'Create Sprints', description: 'Create new sprints' },
          { code: 'update', name: 'Edit Sprints', description: 'Modify existing sprint information' },
          { code: 'delete', name: 'Delete Sprints', description: 'Remove sprints from the system' },
          { code: 'export', name: 'Export Sprints', description: 'Export sprint data' },
          { code: 'start', name: 'Start Sprints', description: 'Start sprint execution' },
          { code: 'complete', name: 'Complete Sprints', description: 'Mark sprints as completed' },
          { code: 'cancel', name: 'Cancel Sprints', description: 'Cancel active sprints' },
          { code: 'manage_capacity', name: 'Manage Capacity', description: 'Manage sprint capacity and velocity' },
          { code: 'assign_tasks', name: 'Assign Tasks', description: 'Assign tasks to sprints' },
          { code: 'view_burndown', name: 'View Burndown', description: 'View sprint burndown charts' }
        ]
      },

      // ⏱️ TIME TRACKING MODULE
      time_tracking: {
        moduleCode: 'time_tracking',
        moduleName: 'Time Tracking',
        description: 'Track time spent on projects and tasks',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Time Entries', description: 'View time entry information' },
          { code: 'read_all', name: 'View All Time Entries', description: 'View all time entries in organization' },
          { code: 'create', name: 'Create Time Entries', description: 'Create new time entries' },
          { code: 'update', name: 'Edit Time Entries', description: 'Modify existing time entries' },
          { code: 'delete', name: 'Delete Time Entries', description: 'Remove time entries' },
          { code: 'export', name: 'Export Time Entries', description: 'Export time tracking data' },
          { code: 'import', name: 'Import Time Entries', description: 'Import time entries from files' },
          { code: 'approve', name: 'Approve Time Entries', description: 'Approve time entries for billing' },
          { code: 'reject', name: 'Reject Time Entries', description: 'Reject time entries' },
          { code: 'view_reports', name: 'View Reports', description: 'View time tracking reports and analytics' },
          { code: 'manage_billable', name: 'Manage Billable Hours', description: 'Mark time entries as billable/non-billable' },
          { code: 'bulk_approve', name: 'Bulk Approve', description: 'Approve multiple time entries at once' }
        ]
      },

      // 👥 TEAM MODULE
      team: {
        moduleCode: 'team',
        moduleName: 'Team Management',
        description: 'Manage team members and assignments',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Team Members', description: 'View team member information' },
          { code: 'read_all', name: 'View All Team Members', description: 'View all team members in organization' },
          { code: 'create', name: 'Add Team Members', description: 'Add new team members to projects' },
          { code: 'update', name: 'Edit Team Members', description: 'Modify team member information' },
          { code: 'delete', name: 'Remove Team Members', description: 'Remove team members from projects' },
          { code: 'export', name: 'Export Team Data', description: 'Export team member data' },
          { code: 'import', name: 'Import Team Members', description: 'Import team members from files' },
          { code: 'assign_roles', name: 'Assign Roles', description: 'Assign roles to team members' },
          { code: 'manage_permissions', name: 'Manage Permissions', description: 'Manage team member permissions' },
          { code: 'view_performance', name: 'View Performance', description: 'View team member performance metrics' },
          { code: 'manage_availability', name: 'Manage Availability', description: 'Manage team member availability and capacity' }
        ]
      },

      // 📊 BACKLOG MODULE
      backlog: {
        moduleCode: 'backlog',
        moduleName: 'Backlog Management',
        description: 'Manage product backlog and user stories',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Backlog', description: 'View backlog items and user stories' },
          { code: 'read_all', name: 'View All Backlog', description: 'View all backlog items in organization' },
          { code: 'create', name: 'Create Backlog Items', description: 'Create new backlog items and stories' },
          { code: 'update', name: 'Edit Backlog Items', description: 'Modify existing backlog items' },
          { code: 'delete', name: 'Delete Backlog Items', description: 'Remove backlog items' },
          { code: 'export', name: 'Export Backlog', description: 'Export backlog data' },
          { code: 'import', name: 'Import Backlog', description: 'Import backlog items from files' },
          { code: 'prioritize', name: 'Prioritize Items', description: 'Prioritize backlog items' },
          { code: 'estimate', name: 'Estimate Items', description: 'Add story points and estimates' },
          { code: 'move_to_sprint', name: 'Move to Sprint', description: 'Move backlog items to sprints' },
          { code: 'manage_epics', name: 'Manage Epics', description: 'Manage epics and feature groups' }
        ]
      },

      // 📄 DOCUMENTS MODULE
      documents: {
        moduleCode: 'documents',
        moduleName: 'Document Management',
        description: 'Manage project documents and files',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Documents', description: 'View document information' },
          { code: 'read_all', name: 'View All Documents', description: 'View all documents in organization' },
          { code: 'create', name: 'Upload Documents', description: 'Upload new documents' },
          { code: 'update', name: 'Edit Documents', description: 'Modify document information and metadata' },
          { code: 'delete', name: 'Delete Documents', description: 'Remove documents from the system' },
          { code: 'export', name: 'Export Documents', description: 'Export document data' },
          { code: 'download', name: 'Download Documents', description: 'Download document files' },
          { code: 'share', name: 'Share Documents', description: 'Share documents with team members' },
          { code: 'version_control', name: 'Manage Versions', description: 'Manage document versions' },
          { code: 'add_comments', name: 'Add Comments', description: 'Add comments to documents' },
          { code: 'approve', name: 'Approve Documents', description: 'Approve documents for use' },
          { code: 'manage_permissions', name: 'Manage Permissions', description: 'Manage document access permissions' }
        ]
      },

      // 📈 ANALYTICS MODULE
      analytics: {
        moduleCode: 'analytics',
        moduleName: 'Analytics & Reporting',
        description: 'View project analytics and generate reports',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Analytics', description: 'View analytics and metrics' },
          { code: 'read_all', name: 'View All Analytics', description: 'View all analytics in organization' },
          { code: 'create', name: 'Create Reports', description: 'Create custom reports' },
          { code: 'update', name: 'Edit Reports', description: 'Modify existing reports' },
          { code: 'delete', name: 'Delete Reports', description: 'Remove reports' },
          { code: 'export', name: 'Export Reports', description: 'Export report data' },
          { code: 'schedule', name: 'Schedule Reports', description: 'Schedule automated reports' },
          { code: 'view_dashboards', name: 'View Dashboards', description: 'View analytics dashboards' },
          { code: 'customize_dashboards', name: 'Customize Dashboards', description: 'Customize dashboard layouts' },
          { code: 'view_project_health', name: 'View Project Health', description: 'View project health scores and metrics' },
          { code: 'view_team_performance', name: 'View Team Performance', description: 'View team performance analytics' },
          { code: 'view_burndown', name: 'View Burndown Charts', description: 'View sprint and project burndown charts' },
          { code: 'view_velocity', name: 'View Velocity', description: 'View team velocity metrics' }
        ]
      },

      // 📋 REPORTS MODULE
      reports: {
        moduleCode: 'reports',
        moduleName: 'Report Management',
        description: 'Create and manage project reports',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Reports', description: 'View report information' },
          { code: 'read_all', name: 'View All Reports', description: 'View all reports in organization' },
          { code: 'create', name: 'Create Reports', description: 'Create new reports' },
          { code: 'update', name: 'Edit Reports', description: 'Modify existing reports' },
          { code: 'delete', name: 'Delete Reports', description: 'Remove reports' },
          { code: 'export', name: 'Export Reports', description: 'Export report data to various formats' },
          { code: 'schedule', name: 'Schedule Reports', description: 'Schedule automated report generation' },
          { code: 'share', name: 'Share Reports', description: 'Share reports with team members' },
          { code: 'generate_pdf', name: 'Generate PDF', description: 'Generate PDF versions of reports' },
          { code: 'customize', name: 'Customize Reports', description: 'Customize report templates and layouts' }
        ]
      },

      // 💬 CHAT MODULE
      chat: {
        moduleCode: 'chat',
        moduleName: 'Project Chat',
        description: 'Team communication and collaboration',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Messages', description: 'View chat messages and conversations' },
          { code: 'read_all', name: 'View All Messages', description: 'View all messages in organization' },
          { code: 'create', name: 'Send Messages', description: 'Send messages in project chats' },
          { code: 'update', name: 'Edit Messages', description: 'Edit own messages' },
          { code: 'delete', name: 'Delete Messages', description: 'Delete own messages' },
          { code: 'create_channels', name: 'Create Channels', description: 'Create new chat channels' },
          { code: 'manage_channels', name: 'Manage Channels', description: 'Manage channel settings and members' },
          { code: 'delete_channels', name: 'Delete Channels', description: 'Delete chat channels' },
          { code: 'mention_users', name: 'Mention Users', description: 'Mention users in messages' },
          { code: 'share_files', name: 'Share Files', description: 'Share files in chat' },
          { code: 'pin_messages', name: 'Pin Messages', description: 'Pin important messages' }
        ]
      },

      // 📅 CALENDAR MODULE
      calendar: {
        moduleCode: 'calendar',
        moduleName: 'Calendar Management',
        description: 'Manage project events, meetings, and schedules',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Calendar', description: 'View calendar events' },
          { code: 'read_all', name: 'View All Events', description: 'View all calendar events in organization' },
          { code: 'create', name: 'Create Events', description: 'Create new calendar events' },
          { code: 'update', name: 'Edit Events', description: 'Modify event information' },
          { code: 'delete', name: 'Delete Events', description: 'Remove calendar events' },
          { code: 'export', name: 'Export Calendar', description: 'Export calendar data' },
          { code: 'import', name: 'Import Events', description: 'Import events from files' },
          { code: 'share', name: 'Share Events', description: 'Share events with team members' },
          { code: 'manage_recurring', name: 'Manage Recurring Events', description: 'Create and manage recurring events' }
        ]
      },

      // 🎯 KANBAN MODULE
      kanban: {
        moduleCode: 'kanban',
        moduleName: 'Kanban Board',
        description: 'Manage tasks using Kanban boards',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Kanban Boards', description: 'View Kanban board information' },
          { code: 'read_all', name: 'View All Boards', description: 'View all Kanban boards in organization' },
          { code: 'create', name: 'Create Boards', description: 'Create new Kanban boards' },
          { code: 'update', name: 'Edit Boards', description: 'Modify board settings and columns' },
          { code: 'delete', name: 'Delete Boards', description: 'Remove Kanban boards' },
          { code: 'move_cards', name: 'Move Cards', description: 'Move task cards between columns' },
          { code: 'manage_columns', name: 'Manage Columns', description: 'Add, edit, and remove board columns' },
          { code: 'manage_filters', name: 'Manage Filters', description: 'Create and manage board filters' },
          { code: 'export', name: 'Export Boards', description: 'Export board data' }
        ]
      },

      // 📊 DASHBOARD MODULE
      dashboard: {
        moduleCode: 'dashboard',
        moduleName: 'Project Dashboard',
        description: 'Project overview and analytics dashboard',
        isCore: true,
        permissions: [
          { code: 'view', name: 'View Dashboard', description: 'Access project dashboard' },
          { code: 'customize', name: 'Customize Dashboard', description: 'Customize dashboard layout and widgets' },
          { code: 'export', name: 'Export Dashboard', description: 'Export dashboard data and reports' },
          { code: 'share', name: 'Share Dashboard', description: 'Share dashboard views with others' },
          { code: 'create_widgets', name: 'Create Widgets', description: 'Create custom dashboard widgets' },
          { code: 'manage_widgets', name: 'Manage Widgets', description: 'Manage dashboard widget settings' }
        ]
      },

      // 🔔 NOTIFICATIONS MODULE
      notifications: {
        moduleCode: 'notifications',
        moduleName: 'Notification Management',
        description: 'Manage notifications and alerts',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Notifications', description: 'View notification information' },
          { code: 'read_all', name: 'View All Notifications', description: 'View all notifications in organization' },
          { code: 'create', name: 'Create Notifications', description: 'Create custom notifications' },
          { code: 'update', name: 'Edit Notifications', description: 'Modify notification settings' },
          { code: 'delete', name: 'Delete Notifications', description: 'Remove notifications' },
          { code: 'manage_preferences', name: 'Manage Preferences', description: 'Manage notification preferences' },
          { code: 'mark_read', name: 'Mark as Read', description: 'Mark notifications as read' },
          { code: 'bulk_actions', name: 'Bulk Actions', description: 'Perform bulk actions on notifications' }
        ]
      },

      // ⚙️ WORKSPACE MODULE
      workspace: {
        moduleCode: 'workspace',
        moduleName: 'Workspace Management',
        description: 'Manage workspaces and team collaboration spaces',
        isCore: true,
        permissions: [
          { code: 'read', name: 'View Workspaces', description: 'View workspace information' },
          { code: 'read_all', name: 'View All Workspaces', description: 'View all workspaces in organization' },
          { code: 'create', name: 'Create Workspaces', description: 'Create new workspaces' },
          { code: 'update', name: 'Edit Workspaces', description: 'Modify workspace settings' },
          { code: 'delete', name: 'Delete Workspaces', description: 'Remove workspaces' },
          { code: 'manage_members', name: 'Manage Members', description: 'Add and remove workspace members' },
          { code: 'manage_roles', name: 'Manage Roles', description: 'Assign roles to workspace members' },
          { code: 'manage_settings', name: 'Manage Settings', description: 'Manage workspace settings and configurations' },
          { code: 'export', name: 'Export Workspace Data', description: 'Export workspace data' },
          { code: 'archive', name: 'Archive Workspaces', description: 'Archive inactive workspaces' },
          { code: 'restore', name: 'Restore Workspaces', description: 'Restore archived workspaces' }
        ]
      },

      // 🔄 WORKFLOW MODULE
      workflow: {
        moduleCode: 'workflow',
        moduleName: 'Workflow Management',
        description: 'Manage automated workflows and processes',
        isCore: false,
        permissions: [
          { code: 'read', name: 'View Workflows', description: 'View workflow information' },
          { code: 'read_all', name: 'View All Workflows', description: 'View all workflows in organization' },
          { code: 'create', name: 'Create Workflows', description: 'Create new workflows' },
          { code: 'update', name: 'Edit Workflows', description: 'Modify workflow definitions' },
          { code: 'delete', name: 'Delete Workflows', description: 'Remove workflows' },
          { code: 'activate', name: 'Activate Workflows', description: 'Activate workflows for execution' },
          { code: 'deactivate', name: 'Deactivate Workflows', description: 'Deactivate workflows' },
          { code: 'view_executions', name: 'View Executions', description: 'View workflow execution history' },
          { code: 'manage_rules', name: 'Manage Rules', description: 'Manage workflow rules and conditions' },
          { code: 'manage_actions', name: 'Manage Actions', description: 'Manage workflow actions and triggers' },
          { code: 'export', name: 'Export Workflows', description: 'Export workflow definitions' },
          { code: 'import', name: 'Import Workflows', description: 'Import workflows from files' }
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

          // Integration Permissions
          { code: 'integrations_read', name: 'View Integrations', description: 'View system integrations' },
          { code: 'integrations_create', name: 'Create Integrations', description: 'Create new integrations' },
          { code: 'integrations_update', name: 'Update Integrations', description: 'Update existing integrations' },
          { code: 'integrations_delete', name: 'Delete Integrations', description: 'Delete integrations' },

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
    }
  }
};

// 🎯 **PLAN-BASED ACCESS CONTROL**
export const PLAN_ACCESS_MATRIX = {
  free: {
    applications: ['crm'],
    modules: {
      crm: ['leads', 'contacts', 'dashboard']
    },
    permissions: {
      crm: {
        leads: ['read', 'create', 'update', 'delete'],
        contacts: ['read', 'create', 'update', 'delete'],
        dashboard: ['read']
      }
    },
    credits: {
      free: 1000,        // Free tier gets 1000 initial credits (as per onboarding requirements)
      paid: 0,           // Can purchase additional credits
      expiryDays: 30     // Monthly renewal cycle
    }
  },


  starter: {
    applications: ['crm', 'hr', 'project_management'],
    modules: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'dashboard'],
      hr: ['employees', 'leave', 'dashboard'],
      project_management: ['projects', 'tasks', 'team', 'dashboard']
    },
    permissions: {
      crm: {
        leads: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'convert'],
        contacts: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import'],
        accounts: ['read', 'read_all', 'create', 'update', 'delete', 'view_contacts', 'export', 'import', 'assign'],
        opportunities: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'close', 'assign'],
        dashboard: ['read']
      },
      hr: {
        employees: ['read', 'create', 'update', 'delete'],
        leave: ['read', 'create', 'update', 'approve'],
        dashboard: ['read']
      },
      project_management: {
        projects: ['read', 'create', 'update', 'delete', 'export', 'assign'],
        tasks: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'assign', 'change_status'],
        team: ['read', 'read_all', 'create', 'update', 'delete', 'export'],
        dashboard: ['view']
      }
    },
    credits: {
      free: 60000,       // Annual free credits (matches Stripe config)
      paid: 0,           // Additional paid credits can be purchased
      expiryDays: 365    // Annual renewal cycle
    }
  },

  professional: {
    applications: ['crm', 'hr', 'project_management'],
    modules: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'invoices', 'inventory', 'product_orders', 'tickets', 'communications', 'calendar', 'dashboard'],
      hr: ['employees', 'payroll', 'leave', 'dashboard'],
      project_management: ['projects', 'tasks', 'sprints', 'time_tracking', 'team', 'backlog', 'documents', 'analytics', 'reports', 'chat', 'calendar', 'kanban', 'dashboard', 'notifications', 'workspace']
    },
    permissions: {
      crm: {
        leads: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'convert'],
        contacts: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import'],
        accounts: ['read', 'read_all', 'create', 'update', 'delete', 'view_contacts', 'export', 'import', 'assign'],
        opportunities: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'close', 'assign'],
        quotations: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'approve'],
        invoices: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'send'],
        inventory: ['read', 'create', 'update', 'delete', 'adjust'],
        product_orders: ['read', 'create', 'update', 'delete', 'fulfill'],
        tickets: ['read', 'read_all', 'create', 'update', 'delete', 'assign', 'close'],
        communications: ['read', 'create', 'update', 'delete', 'send'],
        calendar: ['read', 'create', 'update', 'delete'],
        dashboard: ['read']
      },
      hr: {
        employees: ['read', 'read_all', 'create', 'update', 'delete', 'manage_roles'],
        payroll: ['read', 'create', 'update', 'process'],
        leave: ['read', 'read_all', 'create', 'update', 'approve', 'reject'],
        dashboard: ['read']
      },
      project_management: {
        projects: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'archive', 'restore', 'manage_budget', 'manage_timeline', 'manage_settings'],
        tasks: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'reassign', 'change_status', 'change_priority', 'add_subtasks', 'manage_dependencies', 'add_attachments', 'add_comments', 'time_track'],
        sprints: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'start', 'complete', 'cancel', 'manage_capacity', 'assign_tasks', 'view_burndown'],
        time_tracking: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'approve', 'reject', 'view_reports', 'manage_billable'],
        team: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign_roles', 'manage_permissions', 'view_performance', 'manage_availability'],
        backlog: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'prioritize', 'estimate', 'move_to_sprint', 'manage_epics'],
        documents: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'download', 'share', 'version_control', 'add_comments', 'approve', 'manage_permissions'],
        analytics: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'schedule', 'view_dashboards', 'customize_dashboards', 'view_project_health', 'view_team_performance', 'view_burndown', 'view_velocity'],
        reports: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'schedule', 'share', 'generate_pdf', 'customize'],
        chat: ['read', 'read_all', 'create', 'update', 'delete', 'create_channels', 'manage_channels', 'delete_channels', 'mention_users', 'share_files', 'pin_messages'],
        calendar: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'share', 'manage_recurring'],
        kanban: ['read', 'read_all', 'create', 'update', 'delete', 'move_cards', 'manage_columns', 'manage_filters', 'export'],
        dashboard: ['view', 'customize', 'export', 'share', 'create_widgets', 'manage_widgets'],
        notifications: ['read', 'read_all', 'create', 'update', 'delete', 'manage_preferences', 'mark_read', 'bulk_actions'],
        workspace: ['read', 'read_all', 'create', 'update', 'delete', 'manage_members', 'manage_roles', 'manage_settings', 'export', 'archive', 'restore']
      }
    },
    credits: {
      free: 300000,      // Annual free credits (matches Stripe config)
      paid: 0,           // Additional paid credits can be purchased
      expiryDays: 365    // Annual renewal cycle
    }
  },


  enterprise: {
    applications: ['crm', 'hr', 'affiliateConnect', 'project_management'],
    modules: {
      crm: ['leads', 'accounts', 'contacts', 'opportunities', 'quotations', 'invoices', 'inventory', 'product_orders', 'sales_orders', 'tickets', 'communications', 'calendar', 'ai_insights', 'form_builder', 'analytics', 'dashboard', 'system'],
      hr: ['employees', 'payroll', 'leave', 'dashboard'],
      affiliateConnect: ['dashboard', 'products', 'affiliates', 'tracking', 'commissions', 'campaigns', 'influencers', 'payments', 'analytics', 'fraud', 'communications', 'integrations', 'settings', 'support'],
      project_management: ['projects', 'tasks', 'sprints', 'time_tracking', 'team', 'backlog', 'documents', 'analytics', 'reports', 'chat', 'calendar', 'kanban', 'dashboard', 'notifications', 'workspace', 'workflow', 'system']
    },
    permissions: {
      crm: {
        leads: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'convert'],
        accounts: ['read', 'read_all', 'create', 'update', 'delete', 'view_contacts', 'export', 'import', 'assign'],
        contacts: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import'],
        opportunities: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'close', 'assign'],
        quotations: ['read', 'read_all', 'create', 'update', 'delete', 'generate_pdf', 'send', 'approve', 'assign'],
        invoices: ['read', 'read_all', 'create', 'update', 'delete', 'send', 'mark_paid', 'generate_pdf', 'export', 'import'],
        inventory: ['read', 'read_all', 'create', 'update', 'delete', 'adjust', 'movement', 'export', 'import', 'low_stock_alerts'],
        product_orders: ['read', 'read_all', 'create', 'update', 'delete', 'process', 'export', 'import'],
        sales_orders: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'approve', 'assign'],
        tickets: ['read', 'read_all', 'create', 'update', 'delete', 'assign', 'resolve', 'escalate', 'export', 'import'],
        communications: ['read', 'read_all', 'create', 'update', 'delete', 'send', 'schedule', 'export', 'import'],
        calendar: ['read', 'read_all', 'create', 'update', 'delete', 'share', 'export', 'import'],
        ai_insights: ['read', 'read_all', 'generate', 'export', 'schedule'],
        form_builder: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'publish', 'duplicate', 'view_analytics', 'manage_layout'],
        analytics: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'calculate', 'generate_formula', 'validate_formula', 'suggest_metrics', 'generate_insights', 'manage_dashboards', 'view_dashboards'],
        dashboard: ['view', 'customize', 'export'],
        system: ['settings_read', 'settings_update', 'settings_manage', 'configurations_read', 'configurations_create', 'configurations_update', 'configurations_delete', 'configurations_manage', 'tenant_config_read', 'tenant_config_update', 'admin.tenants.read', 'tenant_config_manage', 'credit_config.view', 'credit_config.edit', 'credit_config.reset', 'credit_config.bulk_update', 'credit_config.apply_templates', 'system_config_read', 'system_config_update', 'system_config_manage', 'dropdowns_read', 'dropdowns_create', 'dropdowns_update', 'dropdowns_delete', 'dropdowns_manage', 'integrations_read', 'integrations_create', 'integrations_update', 'integrations_delete', 'integrations_manage', 'backup_read', 'backup_create', 'backup_restore', 'backup_manage', 'maintenance_read', 'maintenance_perform', 'maintenance_schedule', 'users_read', 'users_read_all', 'users_create', 'users_update', 'users_delete', 'users_activate', 'users_reset_password', 'users_export', 'users_import', 'roles_read', 'roles_read_all', 'roles_create', 'roles_update', 'roles_delete', 'roles_assign', 'roles_export', 'reports_read', 'reports_read_all', 'reports_create', 'reports_update', 'reports_delete', 'reports_export', 'reports_schedule', 'audit_read', 'audit_read_all', 'audit_export', 'audit_view_details', 'audit_filter_by_user', 'audit_filter_by_action', 'audit_filter_by_date_range', 'audit_filter_by_module', 'audit_filter_by_status', 'audit_generate_reports', 'audit_archive_logs', 'audit_purge_old_logs', 'audit_trail_export', 'activity_logs_read', 'activity_logs_read_all', 'activity_logs_export', 'activity_logs_view_details', 'activity_logs_filter_by_user', 'activity_logs_filter_by_action', 'activity_logs_filter_by_date_range', 'activity_logs_filter_by_module', 'activity_logs_filter_by_status', 'activity_logs_generate_reports', 'activity_logs_archive_logs', 'activity_logs_purge_old_logs', 'activity_logs_audit_trail_export', 'user_activity_read', 'user_activity_read_all', 'user_activity_export', 'user_activity_view_details', 'user_activity_track_login_logout', 'user_activity_track_page_views', 'user_activity_track_actions', 'user_activity_track_data_changes', 'user_activity_generate_user_reports', 'user_activity_filter_by_user', 'user_activity_filter_by_date_range', 'data_changes_read', 'data_changes_read_all', 'data_changes_export', 'data_changes_view_details', 'data_changes_track_creates', 'data_changes_track_updates', 'data_changes_track_deletes', 'data_changes_track_field_changes', 'data_changes_track_relationship_changes', 'data_changes_generate_change_reports', 'data_changes_filter_by_table', 'data_changes_filter_by_user', 'data_changes_filter_by_date_range']
      },
      hr: {
        employees: ['read', 'read_all', 'create', 'update', 'delete', 'view_salary', 'export'],
        payroll: ['read', 'process', 'approve', 'export', 'generate_reports'],
        leave: ['read', 'create', 'approve', 'reject', 'cancel', 'export'],
        dashboard: ['view', 'customize', 'export']
      },
      affiliateConnect: {
        dashboard: ['view_dashboard', 'view_analytics', 'view_reports', 'export_data', 'view_all_tenants', 'view_tenant_analytics', 'view_affiliate_analytics', 'view_influencer_analytics'],
        products: ['read', 'read_all', 'create', 'update', 'delete', 'update_commission', 'upload_images', 'export', 'import', 'manage_categories'],
        affiliates: ['read', 'read_all', 'create', 'update', 'delete', 'invite', 'approve', 'reject', 'assign_tier', 'view_pending', 'view_details', 'update_details', 'view_commissions', 'update_commissions'],
        tracking: ['read', 'read_all', 'create', 'update', 'delete', 'track_clicks', 'track_conversions', 'view_analytics', 'export_analytics', 'manage_utm'],
        commissions: ['read_tiers', 'create_tiers', 'update_tiers', 'delete_tiers', 'read_rules', 'create_rules', 'update_rules', 'delete_rules', 'view_products', 'update_products', 'calculate_commissions', 'view_affiliate_commissions'],
        campaigns: ['read', 'read_all', 'create', 'update', 'delete', 'join_campaign', 'view_participants', 'manage_participants', 'view_progress', 'submit_content', 'approve_content', 'view_contract', 'accept_contract', 'manage_versions', 'view_analytics'],
        influencers: ['read', 'read_all', 'create', 'update', 'delete', 'connect_instagram', 'connect_youtube', 'connect_twitter', 'view_analytics', 'view_media_kit', 'update_media_kit', 'view_ratings', 'manage_ratings'],
        payments: ['read_payouts', 'create_payouts', 'update_payouts', 'view_methods', 'add_methods', 'update_methods', 'delete_methods', 'view_history', 'process_payments', 'view_affiliate_payments'],
        analytics: ['view_dashboard', 'view_campaign_analytics', 'view_affiliate_analytics', 'view_revenue_analytics', 'create_reports', 'view_reports', 'export_analytics', 'view_all_tenants', 'view_tenant_analytics'],
        fraud: ['read_rules', 'create_rules', 'update_rules', 'delete_rules', 'view_alerts', 'update_alerts', 'view_monitoring', 'manage_detection'],
        communications: ['read_templates', 'create_templates', 'update_templates', 'delete_templates', 'send_notifications', 'view_notifications', 'update_notification_status', 'manage_messaging'],
        integrations: ['read_api_keys', 'create_api_keys', 'update_api_keys', 'delete_api_keys', 'read_webhooks', 'create_webhooks', 'update_webhooks', 'delete_webhooks', 'manage_integrations'],
        settings: ['read_tenant_settings', 'update_tenant_settings', 'read_users', 'create_users', 'update_users', 'delete_users', 'read_roles', 'create_roles', 'update_roles', 'delete_roles', 'manage_permissions'],
        support: ['read_tickets', 'create_tickets', 'update_tickets', 'view_knowledge_base', 'search_knowledge_base', 'manage_tickets', 'view_all_tickets']
      },
      project_management: {
        projects: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'archive', 'restore', 'manage_budget', 'manage_timeline', 'manage_settings'],
        tasks: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign', 'reassign', 'change_status', 'change_priority', 'add_subtasks', 'manage_dependencies', 'add_attachments', 'add_comments', 'time_track'],
        sprints: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'start', 'complete', 'cancel', 'manage_capacity', 'assign_tasks', 'view_burndown'],
        time_tracking: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'approve', 'reject', 'view_reports', 'manage_billable', 'bulk_approve'],
        team: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign_roles', 'manage_permissions', 'view_performance', 'manage_availability'],
        backlog: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'prioritize', 'estimate', 'move_to_sprint', 'manage_epics'],
        documents: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'download', 'share', 'version_control', 'add_comments', 'approve', 'manage_permissions'],
        analytics: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'schedule', 'view_dashboards', 'customize_dashboards', 'view_project_health', 'view_team_performance', 'view_burndown', 'view_velocity'],
        reports: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'schedule', 'share', 'generate_pdf', 'customize'],
        chat: ['read', 'read_all', 'create', 'update', 'delete', 'create_channels', 'manage_channels', 'delete_channels', 'mention_users', 'share_files', 'pin_messages'],
        calendar: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'share', 'manage_recurring'],
        kanban: ['read', 'read_all', 'create', 'update', 'delete', 'move_cards', 'manage_columns', 'manage_filters', 'export'],
        dashboard: ['view', 'customize', 'export', 'share', 'create_widgets', 'manage_widgets'],
        notifications: ['read', 'read_all', 'create', 'update', 'delete', 'manage_preferences', 'mark_read', 'bulk_actions'],
        workspace: ['read', 'read_all', 'create', 'update', 'delete', 'manage_members', 'manage_roles', 'manage_settings', 'export', 'archive', 'restore'],
        workflow: ['read', 'read_all', 'create', 'update', 'delete', 'activate', 'deactivate', 'view_executions', 'manage_rules', 'manage_actions', 'export', 'import'],
        system: ['settings_read', 'settings_update', 'users_read', 'users_read_all', 'users_create', 'users_update', 'users_delete', 'users_activate', 'users_reset_password', 'users_export', 'users_import', 'roles_read', 'roles_read_all', 'roles_create', 'roles_update', 'roles_delete', 'roles_assign', 'roles_export', 'integrations_read', 'integrations_create', 'integrations_update', 'integrations_delete', 'audit_read', 'audit_read_all', 'audit_export', 'audit_view_details', 'audit_filter', 'audit_generate_reports', 'audit_archive', 'audit_purge', 'activity_logs_read', 'activity_logs_read_all', 'activity_logs_export', 'activity_logs_view_details', 'activity_logs_filter', 'activity_logs_generate_reports', 'activity_logs_archive', 'activity_logs_purge']
      }
    },
    credits: {
      free: 1200000,     // Annual free credits (100000/month × 12)
      paid: 0,           // Additional paid credits can be purchased
      expiryDays: 365    // Annual renewal cycle
    }
  }
};

// 🎯 **ROLE TEMPLATES** - REMOVED
// Templates are no longer needed - roles are created directly from applications/modules

// 🛠️ **UTILITY FUNCTIONS**
export class PermissionMatrixUtils {
  
  // Get all applications from matrix
  static getAllApplications() {
    return Object.keys(BUSINESS_SUITE_MATRIX).map(appCode => ({
      appCode,
      ...BUSINESS_SUITE_MATRIX[appCode].appInfo
    }));
  }
  
  // Get all modules for an application
  static getApplicationModules(appCode) {
    const app = BUSINESS_SUITE_MATRIX[appCode];
    if (!app) return [];
    
    return Object.keys(app.modules).map(moduleCode => ({
      appCode,
      moduleCode,
      ...app.modules[moduleCode]
    }));
  }
  
  // Get all permissions for a module
  static getModulePermissions(appCode, moduleCode) {
    const module = BUSINESS_SUITE_MATRIX[appCode]?.modules[moduleCode];
    if (!module) return [];
    
    return module.permissions.map(permission => ({
      ...permission,
      fullCode: `${appCode}.${moduleCode}.${permission.code}`,
      appCode,
      moduleCode
    }));
  }
  
  // Get permissions for a plan
  static getPlanPermissions(planId) {
    const planAccess = PLAN_ACCESS_MATRIX[planId];
    if (!planAccess) return [];

    const permissions = [];

    planAccess.applications.forEach(appCode => {
      const appPermissions = planAccess.permissions[appCode];

      if (appPermissions === '*') {
        // All permissions for all modules in this app
        const allModules = this.getApplicationModules(appCode);
        allModules.forEach(module => {
          const modulePermissions = this.getModulePermissions(appCode, module.moduleCode);
          permissions.push(...modulePermissions);
        });
      } else if (typeof appPermissions === 'object') {
        // Specific permissions per module
        Object.keys(appPermissions).forEach(moduleCode => {
          const modulePermCodes = appPermissions[moduleCode];

          if (modulePermCodes === '*') {
            // All permissions for this module
            const modulePermissions = this.getModulePermissions(appCode, moduleCode);
            permissions.push(...modulePermissions);
          } else if (Array.isArray(modulePermCodes)) {
            // Specific permissions for this module
            modulePermCodes.forEach(permCode => {
              permissions.push({
                code: permCode,
                name: this.getPermissionName(appCode, moduleCode, permCode),
                description: this.getPermissionDescription(appCode, moduleCode, permCode),
                fullCode: `${appCode}.${moduleCode}.${permCode}`,
                appCode,
                moduleCode
              });
            });
          }
        });
      }
    });

    return permissions;
  }

  // Helper method to get permission name from BUSINESS_SUITE_MATRIX
  static getPermissionName(appCode, moduleCode, permCode) {
    const module = BUSINESS_SUITE_MATRIX[appCode]?.modules[moduleCode];
    if (!module) return permCode;

    const permission = module.permissions?.find(p => p.code === permCode);
    return permission?.name || permCode;
  }

  // Helper method to get permission description from BUSINESS_SUITE_MATRIX
  static getPermissionDescription(appCode, moduleCode, permCode) {
    const module = BUSINESS_SUITE_MATRIX[appCode]?.modules[moduleCode];
    if (!module) return '';

    const permission = module.permissions?.find(p => p.code === permCode);
    return permission?.description || '';
  }

  // Get credits configuration for a plan
  static getPlanCredits(planId) {
    const planAccess = PLAN_ACCESS_MATRIX[planId];
    return planAccess?.credits || { free: 0, paid: 0, expiryDays: 30 };
  }
  
  // Validate permission matrix
  static validateMatrix() {
    const errors = [];
    
    Object.keys(BUSINESS_SUITE_MATRIX).forEach(appCode => {
      const app = BUSINESS_SUITE_MATRIX[appCode];
      
      // Validate app info
      if (!app.appInfo || !app.appInfo.appName) {
        errors.push(`App ${appCode} missing appInfo.appName`);
      }
      
      // Validate modules
      if (!app.modules || Object.keys(app.modules).length === 0) {
        errors.push(`App ${appCode} has no modules defined`);
      } else {
        Object.keys(app.modules).forEach(moduleCode => {
          const module = app.modules[moduleCode];
          
          if (!module.permissions || module.permissions.length === 0) {
            errors.push(`Module ${appCode}.${moduleCode} has no permissions defined`);
          }
          
          module.permissions.forEach(permission => {
            if (!permission.code || !permission.name) {
              errors.push(`Permission in ${appCode}.${moduleCode} missing code or name`);
            }
          });
        });
      }
    });
    
    return errors;
  }

  /**
   * Extract applications present in a role's permissions
   * @param {object} permissions - Role permissions object (hierarchical: { crm: { leads: [...] }, hr: { employees: [...] } })
   * @returns {string[]} Array of application codes (e.g., ['crm', 'hr'])
   */
  static extractApplicationsFromPermissions(permissions) {
    if (!permissions || typeof permissions !== 'object') {
      return [];
    }

    const applications = new Set();

    // Handle hierarchical format where top-level keys are app codes
    Object.keys(permissions).forEach(appCode => {
      // Check if this is a valid application code
      if (BUSINESS_SUITE_MATRIX[appCode]) {
        applications.add(appCode);
      }
    });

    return Array.from(applications);
  }

  /**
   * Filter permissions for a specific application
   * @param {object} permissions - Full permissions object (hierarchical format)
   * @param {string} appCode - Application code (e.g., 'crm', 'hr')
   * @returns {object} Filtered permissions for the application
   */
  static filterPermissionsByApplication(permissions, appCode) {
    if (!permissions || typeof permissions !== 'object') {
      return {};
    }

    // For hierarchical format, return just the app-specific permissions
    if (permissions[appCode]) {
      return {
        [appCode]: permissions[appCode]
      };
    }

    return {};
  }
}

/**
 * Create super admin role configuration for onboarding
 * Uses PLAN_ACCESS_MATRIX to generate permissions based on subscription plan
 * @param {string} selectedPlan - The selected plan (free, trial, starter, professional, basic, enterprise)
 * @param {string} tenantId - The tenant ID
 * @param {string} createdBy - The user ID creating the role
 * @returns {object} Role configuration object with nested permissions structure
 */
export function createSuperAdminRoleConfig(selectedPlan = 'free', tenantId, createdBy) {
  // Get plan access configuration from PLAN_ACCESS_MATRIX
  const planAccess = PLAN_ACCESS_MATRIX[selectedPlan];
  
  if (!planAccess) {
    console.warn(`⚠️ Plan ${selectedPlan} not found in PLAN_ACCESS_MATRIX, using 'free' plan`);
    return createSuperAdminRoleConfig('free', tenantId, createdBy);
  }

  // Extract permissions from PLAN_ACCESS_MATRIX
  // The permissions structure is already in nested format: { crm: { leads: [...], contacts: [...] } }
  const permissions = planAccess.permissions || {};

  return {
    tenantId,
    organizationId: tenantId, // Set organizationId to tenantId for root organization (will be updated after org creation)
    roleName: 'Organization Admin',
    description: 'Full administrative access to all features and settings. This role has complete control over the organization.',
    permissions,
    isSystemRole: true,
    isDefault: true,
    priority: 100, // Highest priority
    scope: 'organization',
    isInheritable: true,
    color: '#dc2626', // Red color for admin role
    createdBy,
    restrictions: {}, // No restrictions for super admin
  };
}

export default BUSINESS_SUITE_MATRIX; 