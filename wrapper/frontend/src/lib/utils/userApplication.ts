import type { UserClassification, ApplicationGroup, ClassificationData } from '../../types/userApplication';

// Data transformation utilities
export function getApplications(classificationData?: ClassificationData): ApplicationGroup[] {
  if (!classificationData?.byApplication) return [];

  return Object.entries(classificationData.byApplication)
    .map(([appCode, appData]: [string, any]) => {
      // Ensure we have the required structure
      if (!appData || typeof appData !== 'object') {
        console.warn(`Invalid appData for ${appCode}:`, appData);
        return null;
      }

      // Handle both flattened and nested appInfo structures
      const appInfo = appData.appInfo || {
        appCode: appData.appCode || appCode,
        appName: appData.appName || 'Unknown App',
        description: appData.description || ''
      };

      return {
        appCode,
        appInfo,
        users: appData.users || [],
        totalUsers: appData.totalUsers || appData.userCount || 0
      };
    })
    .filter(app => app !== null)
    .sort((a, b) => b.totalUsers - a.totalUsers);
}

export function getFilteredUsers(
  classificationData?: ClassificationData,
  selectedApp: string = 'all'
): UserClassification[] {
  if (!classificationData?.data) return [];

  if (selectedApp === 'all') {
    return Object.values(classificationData.data.byUser || {});
  }

  const appData = classificationData.data.byApplication?.[selectedApp];
  return appData?.users || [];
}

export function getAccessMethodColor(method: string): string {
  switch (method) {
    case 'admin': return 'bg-purple-100 text-purple-800';
    case 'super_admin': return 'bg-red-100 text-red-800';
    case 'role_based': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function getSummaryStats(classificationData?: ClassificationData, syncStatusData?: any) {
  if (!classificationData?.data) {
    return {
      totalUsers: 0,
      totalApplications: 0,
      configuredApps: 0,
      totalAccessGrants: 0,
    };
  }

  const totalUsers = classificationData.data.summary.totalUsers || 0;
  const totalApplications = Object.keys(classificationData.data.byApplication || {}).length;
  const configuredApps = Object.keys(syncStatusData?.data?.applicationStatus || {}).filter(
    app => syncStatusData?.data?.applicationStatus[app]?.isConfigured
  ).length;
  const totalAccessGrants = Object.values(classificationData.data.summary.applicationBreakdown || {})
    .reduce((sum, count) => sum + count, 0);

  return {
    totalUsers,
    totalApplications,
    configuredApps,
    totalAccessGrants,
  };
}
