export const APPLICATION_CONFIG = {
  crm: {
    name: 'Customer Relationship Management',
    description: 'Complete CRM solution for managing customers, deals, and sales pipeline',
    icon: '🎫',
    url: 'https://crm.zopkit.com'
  },
  hr: {
    name: 'Human Resources Management',
    description: 'Complete HR solution for employee management and payroll',
    icon: '👥',
    url: 'http://localhost:3003'
  },
  affiliate: {
    name: 'Affiliate Management',
    description: 'Manage affiliate partners and commission tracking',
    icon: '🤝',
    url: 'http://localhost:3004'
  },
  system: {
    name: 'System Administration',
    description: 'System administration and user management',
    icon: '⚙️',
    url: 'http://localhost:3000'
  }
} as const;

export const getAppDisplayName = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.name || appCode.toUpperCase();
};

export const getAppDescription = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.description || `${appCode.toUpperCase()} Application`;
};

export const getAppIcon = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.icon || '🔧';
};

export const getAppUrl = (appCode: string): string => {
  return APPLICATION_CONFIG[appCode as keyof typeof APPLICATION_CONFIG]?.url || '';
};
