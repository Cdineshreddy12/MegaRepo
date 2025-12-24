export interface Application {
  appId: string;
  appName: string;
  appCode: string;
  description?: string;
  isEnabled: boolean;
  status?: string | object;
  subscriptionTier?: string | object;
  baseUrl?: string;
  modules?: Module[];
  enabledModules?: string[];
  enabledModulesPermissions?: Record<string, string[]>;
  customPermissions?: Record<string, string[]>;
}

export interface Module {
  moduleId: string;
  moduleName: string;
  moduleCode: string;
  description?: string;
  isCore: boolean;
  permissions?: Permission[];
}

export interface Permission {
  code?: string;
  name?: string;
}

export type ApplicationStatus = 'active' | 'inactive' | 'maintenance';

export type AppCode = 'crm' | 'hr' | 'affiliate' | 'system' | 'finance' | 'inventory' | 'analytics';

export type ThemeType = 'yellow' | 'red' | 'blue' | 'orange' | 'emerald' | 'purple' | 'indigo' | 'cyan' | 'rose' | 'violet' | 'amber';

export interface AppThemeConfig {
  type: ThemeType;
  color: string;
  colorClass: string;
  bgGradient: string;
  glowClass: string;
  icon: React.ReactNode;
}
