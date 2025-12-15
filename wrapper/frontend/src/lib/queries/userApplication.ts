import { userSyncAPI } from '../api';

// Query Keys
export const userApplicationKeys = {
  all: ['user-application'] as const,
  classification: () => [...userApplicationKeys.all, 'classification'] as const,
  syncStatus: () => [...userApplicationKeys.all, 'sync-status'] as const,
  connectivity: () => [...userApplicationKeys.all, 'connectivity'] as const,
} as const;

// API Functions
export const userApplicationAPI = {
  getClassification: () => userSyncAPI.getUserClassification().then(res => res.data),
  getSyncStatus: () => userSyncAPI.getSyncStatus().then(res => res.data),
  testConnectivity: () => userSyncAPI.testConnectivity().then(res => res.data),
  syncAllUsers: (options: { dryRun?: boolean } = {}) => userSyncAPI.syncAllUsers(options),
  syncUsersForApplication: (appCode: string) => userSyncAPI.syncUsersForApplication(appCode),
  syncUser: (userId: string) => userSyncAPI.syncUser(userId),
} as const;
