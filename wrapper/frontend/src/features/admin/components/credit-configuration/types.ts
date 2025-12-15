// Shared types for credit configuration components
export interface OperationCost {
  configId: string;
  operationCode: string;
  operationName?: string;
  creditCost: number;
  unit: string;
  unitMultiplier: number;
  category: string;
  isGlobal: boolean;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  usage?: {
    dailyAverage: number;
    weeklyTotal: number;
    monthlyTotal: number;
    totalCostThisMonth: number;
  };
}

export interface Application {
  appId: string;
  appCode: string;
  appName: string;
  description?: string;
  icon?: string;
  baseUrl: string;
  isCore: boolean;
  sortOrder: number;
  modules?: ApplicationModule[];
}

export interface ApplicationModule {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  description?: string;
  isCore: boolean;
  permissions?: Permission[];
}

export interface Permission {
  code: string;
  name: string;
  description?: string;
}

export interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  assignmentCount: number;
  enabledCount: number;
  applications: TenantApplication[];
}

export interface TenantApplication {
  id: string;
  appId: string;
  appCode: string;
  appName: string;
  isEnabled: boolean;
  subscriptionTier: string;
  enabledModules: string[];
  customPermissions?: Record<string, string[]>; // Custom permissions from organization_applications table
  availableModules?: ApplicationModule[]; // All modules available for this app
  enabledModulesPermissions?: Record<string, string[]>; // Permissions for enabled modules
  maxUsers?: number;
  createdAt: string;
}

export interface CostChanges {
  [appCode: string]: {
    appCost?: number;
    moduleCosts?: Record<string, number>;
    operationCosts?: Record<string, number>;
    permissionCosts?: Record<string, number>;
  };
}

export interface ChangeImpact {
  affectedOperations: number;
  affectedTenants: number;
  estimatedImpact: string;
}

export interface CostTemplate {
  templateId: string;
  templateName: string;
  templateCode: string;
  description: string;
  category: string;
  operations: OperationCost[];
  isDefault: boolean;
  version: string;
  usageCount: number;
}
