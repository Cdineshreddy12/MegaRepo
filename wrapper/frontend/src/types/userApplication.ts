export interface UserClassification {
  userId: string;
  name: string;
  email: string;
  allowedApplications: string[];
  roles: Array<{ roleId: string; roleName: string }>;
  classificationReason: {
    primary: string;
    accessMethod: string;
    allowedAppCount: number;
  };
}

export interface ApplicationGroup {
  appCode: string;
  appInfo: {
    appCode: string;
    appName: string;
    description: string;
  };
  users: UserClassification[];
  totalUsers: number;
  userCount?: number;
  icon?: string;
  baseUrl?: string;
}

export interface ClassificationData {
  summary: {
    totalUsers: number;
    applicationBreakdown: Record<string, number>;
    subscriptionBreakdown: Record<string, number>;
  };
  byApplication: Record<string, ApplicationGroup>;
  byUser: Record<string, UserClassification>;
}

export interface SyncStatusData {
  tenantId: string;
  summary: { totalUsers: number };
  applicationStatus: Record<string, {
    userCount: number;
    applicationUrl: string;
    isConfigured: boolean;
    status: string;
  }>;
}

export interface ConnectivityTestResult {
  summary: {
    total: number;
    available: number;
  };
  applications: Record<string, {
    available: boolean;
    url: string;
    error?: string;
  }>;
}