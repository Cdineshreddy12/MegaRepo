import { PermissionItem, User, Role } from './mockPermissions'

// Feature Flags
export interface FeatureFlag {
  id: string
  name: string
  description: string
  isEnabled: boolean
  category: string
  icon: string
  color: string
  affectedTools: string[]
  requiresPlan: 'trial' | 'starter' | 'professional' | 'enterprise' | null
  dependencies?: string[]
}

// Role Templates
export interface RoleTemplate {
  id: string
  name: string
  displayName: string
  description: string
  category: string
  icon: string
  color: string
  permissions: string[]
  restrictions: Record<string, any>
  targetTools: string[]
  isActive: boolean
  usageCount: number
  tags: string[]
}

// Enhanced Role with inheritance
export interface EnhancedRole extends Role {
  inheritsFrom?: string[]
  children?: string[]
  featureFlags?: string[]
  customRestrictions: CustomRestriction[]
  isTemplate: boolean
  templateSource?: string
  lastModified: string
  modifiedBy: string
}

// Custom Restrictions
export interface CustomRestriction {
  id: string
  name: string
  type: 'value_limit' | 'time_restriction' | 'ip_whitelist' | 'data_access' | 'custom'
  value: any
  description: string
  affectedPermissions: string[]
}

// Organization Structure
export interface OrganizationNode {
  id: string
  name: string
  type: 'tenant' | 'department' | 'team' | 'user'
  parentId?: string
  children: OrganizationNode[]
  roles: string[]
  userCount: number
  permissions: string[]
  isActive: boolean
}

export const mockFeatureFlags: FeatureFlag[] = [
  {
    id: 'crm_advanced_analytics',
    name: 'Advanced CRM Analytics',
    description: 'Enhanced reporting and analytics for CRM data',
    isEnabled: true,
    category: 'Analytics',
    icon: '📊',
    color: '#3B82F6',
    affectedTools: ['crm'],
    requiresPlan: 'professional'
  },
  {
    id: 'hr_ai_recruitment',
    name: 'AI-Powered Recruitment',
    description: 'Automated candidate screening and matching',
    isEnabled: false,
    category: 'AI/ML',
    icon: '🤖',
    color: '#8B5CF6',
    affectedTools: ['hr'],
    requiresPlan: 'enterprise',
    dependencies: ['hr_advanced_features']
  },
  {
    id: 'multi_language_support',
    name: 'Multi-Language Support',
    description: 'Localization for multiple languages',
    isEnabled: true,
    category: 'Localization',
    icon: '🌍',
    color: '#10B981',
    affectedTools: ['crm', 'hr', 'accounting'],
    requiresPlan: 'starter'
  },
  {
    id: 'api_webhooks',
    name: 'API Webhooks',
    description: 'Real-time event notifications via webhooks',
    isEnabled: true,
    category: 'Integration',
    icon: '🔗',
    color: '#F59E0B',
    affectedTools: ['crm', 'hr', 'affiliate', 'accounting'],
    requiresPlan: 'professional'
  },
  {
    id: 'white_label_branding',
    name: 'White Label Branding',
    description: 'Custom branding and domain configuration',
    isEnabled: false,
    category: 'Branding',
    icon: '🎨',
    color: '#EF4444',
    affectedTools: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
    requiresPlan: 'enterprise'
  },
  {
    id: 'advanced_security',
    name: 'Advanced Security',
    description: 'Two-factor authentication and advanced access controls',
    isEnabled: true,
    category: 'Security',
    icon: '🔐',
    color: '#DC2626',
    affectedTools: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
    requiresPlan: 'professional'
  }
]

export const mockRoleTemplates: RoleTemplate[] = [
  {
    id: 'template_sales_exec',
    name: 'sales_executive',
    displayName: 'Sales Executive',
    description: 'Complete sales management with team oversight',
    category: 'Sales',
    icon: '👔',
    color: '#059669',
    permissions: [
      'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit',
      'crm.deals.view', 'crm.deals.create', 'crm.deals.edit', 'crm.deals.approve',
      'crm.campaigns.view', 'crm.campaigns.create'
    ],
    restrictions: {
      'crm.deals.value_limit': 500000,
      'crm.contacts.own_team_only': true
    },
    targetTools: ['crm'],
    isActive: true,
    usageCount: 12,
    tags: ['sales', 'management', 'popular']
  },
  {
    id: 'template_hr_specialist',
    name: 'hr_specialist',
    displayName: 'HR Specialist',
    description: 'Human resources specialist with employee management',
    category: 'Human Resources',
    icon: '👥',
    color: '#8B5CF6',
    permissions: [
      'hr.employees.view', 'hr.employees.create', 'hr.employees.edit',
      'hr.recruitment.view', 'hr.recruitment.create', 'hr.recruitment.candidates'
    ],
    restrictions: {
      'hr.employees.sensitive_data': false
    },
    targetTools: ['hr'],
    isActive: true,
    usageCount: 8,
    tags: ['hr', 'recruitment', 'popular']
  },
  {
    id: 'template_finance_analyst',
    name: 'finance_analyst',
    displayName: 'Finance Analyst',
    description: 'Financial analysis and reporting specialist',
    category: 'Finance',
    icon: '📈',
    color: '#0891B2',
    permissions: [
      'accounting.invoices.view', 'accounting.invoices.create',
      'accounting.expenses.view', 'accounting.expenses.reports'
    ],
    restrictions: {
      'accounting.invoice_amount_limit': 100000
    },
    targetTools: ['accounting'],
    isActive: true,
    usageCount: 5,
    tags: ['finance', 'analytics', 'reporting']
  },
  {
    id: 'template_operations_manager',
    name: 'operations_manager',
    displayName: 'Operations Manager',
    description: 'Cross-functional operations oversight',
    category: 'Operations',
    icon: '⚙️',
    color: '#7C3AED',
    permissions: [
      'inventory.products.view', 'inventory.products.edit',
      'inventory.stock.view', 'inventory.stock.adjust',
      'accounting.expenses.view', 'accounting.expenses.approve'
    ],
    restrictions: {},
    targetTools: ['inventory', 'accounting'],
    isActive: true,
    usageCount: 3,
    tags: ['operations', 'inventory', 'cross-functional']
  },
  {
    id: 'template_support_agent',
    name: 'support_agent',
    displayName: 'Support Agent',
    description: 'Customer support with limited access',
    category: 'Support',
    icon: '🎧',
    color: '#F59E0B',
    permissions: [
      'crm.contacts.view', 'crm.contacts.edit',
      'crm.deals.view'
    ],
    restrictions: {
      'crm.contacts.own_records_only': true,
      'crm.deals.value_limit': 10000
    },
    targetTools: ['crm'],
    isActive: true,
    usageCount: 15,
    tags: ['support', 'customer-service', 'limited-access']
  }
]

export const mockEnhancedRoles: EnhancedRole[] = [
  {
    id: 'role_enhanced_1',
    name: 'Senior Sales Manager',
    description: 'Enhanced sales management with inheritance',
    color: '#059669',
    icon: '🏆',
    type: 'custom',
    userCount: 2,
    permissions: ['crm.deals.approve'],
    restrictions: {
      'crm.deals.value_limit': 1000000
    },
    createdAt: '2024-01-01T00:00:00Z',
    isDefault: false,
    inheritsFrom: ['role-1'], // Inherits from Sales Manager
    featureFlags: ['crm_advanced_analytics'],
    customRestrictions: [
      {
        id: 'rest_1',
        name: 'High Value Deals Only',
        type: 'value_limit',
        value: 1000000,
        description: 'Can only approve deals above $1M',
        affectedPermissions: ['crm.deals.approve']
      }
    ],
    isTemplate: false,
    lastModified: '2024-01-15T10:30:00Z',
    modifiedBy: 'admin@company.com'
  },
  {
    id: 'role_enhanced_2',
    name: 'HR Director',
    description: 'Complete HR oversight with all permissions',
    color: '#8B5CF6',
    icon: '👑',
    type: 'custom',
    userCount: 1,
    permissions: ['hr.payroll.approve'],
    restrictions: {},
    createdAt: '2024-01-01T00:00:00Z',
    isDefault: false,
    inheritsFrom: ['role-3'], // Inherits from HR Administrator
    featureFlags: ['hr_ai_recruitment', 'advanced_security'],
    customRestrictions: [],
    isTemplate: false,
    templateSource: 'template_hr_specialist',
    lastModified: '2024-01-10T14:20:00Z',
    modifiedBy: 'hr@company.com'
  }
]

export const mockCustomRestrictions: CustomRestriction[] = [
  {
    id: 'rest_time_business_hours',
    name: 'Business Hours Only',
    type: 'time_restriction',
    value: { start: '09:00', end: '17:00', timezone: 'UTC', weekdays: true },
    description: 'Access restricted to business hours only',
    affectedPermissions: ['hr.payroll.process']
  },
  {
    id: 'rest_ip_office_only',
    name: 'Office IP Whitelist',
    type: 'ip_whitelist',
    value: ['192.168.1.0/24', '10.0.0.0/8'],
    description: 'Access only from office IP ranges',
    affectedPermissions: ['hr.employees.salary', 'accounting.invoices.create']
  },
  {
    id: 'rest_data_regional',
    name: 'Regional Data Access',
    type: 'data_access',
    value: { regions: ['US', 'EU'], excludeFields: ['ssn', 'tax_id'] },
    description: 'Access limited to specific regions and excludes sensitive fields',
    affectedPermissions: ['hr.employees.view']
  }
]

export const mockOrganizationStructure: OrganizationNode = {
  id: 'org_root',
  name: 'AcmeCorp',
  type: 'tenant',
  children: [
    {
      id: 'dept_sales',
      name: 'Sales Department',
      type: 'department',
      parentId: 'org_root',
      children: [
        {
          id: 'team_enterprise_sales',
          name: 'Enterprise Sales',
          type: 'team',
          parentId: 'dept_sales',
          children: [],
          roles: ['role-1', 'role_enhanced_1'],
          userCount: 5,
          permissions: ['crm.contacts.view', 'crm.deals.view', 'crm.deals.create'],
          isActive: true
        },
        {
          id: 'team_smb_sales',
          name: 'SMB Sales',
          type: 'team',
          parentId: 'dept_sales',
          children: [],
          roles: ['role-2'],
          userCount: 12,
          permissions: ['crm.contacts.view', 'crm.deals.view'],
          isActive: true
        }
      ],
      roles: ['role-1', 'role-2'],
      userCount: 17,
      permissions: ['crm.contacts.view', 'crm.deals.view'],
      isActive: true
    },
    {
      id: 'dept_hr',
      name: 'Human Resources',
      type: 'department',
      parentId: 'org_root',
      children: [
        {
          id: 'team_recruitment',
          name: 'Recruitment Team',
          type: 'team',
          parentId: 'dept_hr',
          children: [],
          roles: ['template_hr_specialist'],
          userCount: 3,
          permissions: ['hr.employees.view', 'hr.recruitment.view'],
          isActive: true
        }
      ],
      roles: ['role-3', 'role_enhanced_2'],
      userCount: 5,
      permissions: ['hr.employees.view'],
      isActive: true
    },
    {
      id: 'dept_finance',
      name: 'Finance Department',
      type: 'department',
      parentId: 'org_root',
      children: [],
      roles: ['role-4', 'template_finance_analyst'],
      userCount: 8,
      permissions: ['accounting.invoices.view'],
      isActive: true
    }
  ],
  roles: ['role-5'], // Admin role at org level
  userCount: 30,
  permissions: ['*'],
  isActive: true
}

// Feature flag utilities
export const getEnabledFeatureFlags = () => {
  return mockFeatureFlags.filter(flag => flag.isEnabled)
}

export const getFeatureFlagsByTool = (tool: string) => {
  return mockFeatureFlags.filter(flag => flag.affectedTools.includes(tool))
}

export const isFeatureEnabled = (flagId: string) => {
  const flag = mockFeatureFlags.find(f => f.id === flagId)
  return flag?.isEnabled || false
} 