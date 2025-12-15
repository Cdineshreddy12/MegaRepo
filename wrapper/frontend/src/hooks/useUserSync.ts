import { useState } from 'react';
import { api } from '../lib/api';

interface SyncResult {
  success: boolean;
  userCount: number;
  error?: string;
  warning?: string;
  syncedAt: string;
  applicationUrl?: string;
  statusCode?: number;
  response?: any;
}

export function useUserSync() {
  const [syncing, setSyncing] = useState<{ [key: string]: boolean }>({});
  const [syncResults, setSyncResults] = useState<{ [key: string]: SyncResult }>({});

  const handleSyncToApplication = async (appCode: string, orgCode?: string) => {
    try {
      setSyncing(prev => ({ ...prev, [appCode]: true }));
      
      const syncPayload = {
        syncType: 'full',
        orgCode,
        forceUpdate: true
      };
      
      console.log(`🔄 Syncing to ${appCode} with payload:`, syncPayload);
      
      const response = await api.post(`/user-sync/sync/application/${appCode}`, syncPayload);

      if (response.status === 200) {
        const result = response.data;
        setSyncResults(prev => ({
          ...prev,
          [appCode]: result.data
        }));
        
        return { success: true, result: result.data };
      }
    } catch (error) {
      console.error(`Error syncing to ${appCode}:`, error);
      return { success: false, error };
    } finally {
      setSyncing(prev => ({ ...prev, [appCode]: false }));
    }
  };

  const handleBulkSync = async (orgCode?: string, dryRun = false) => {
    try {
      setSyncing(prev => ({ ...prev, 'bulk': true }));
      
      const response = await api.post('/user-sync/sync', { 
        syncType: 'full',
        orgCode,
        forceUpdate: true,
        dryRun 
      });

      if (response.status === 200) {
        const result = response.data;
        setSyncResults(result.data.applicationResults || {});
        
        return { success: true, result: result.data };
      }
    } catch (error) {
      console.error('Error in bulk sync:', error);
      return { success: false, error };
    } finally {
      setSyncing(prev => ({ ...prev, 'bulk': false }));
    }
  };

  const handleSyncUser = async (userId: string, orgCode?: string) => {
    try {
      setSyncing(prev => ({ ...prev, 'bulk': true }));
      
      const response = await api.post(`/user-sync/sync/user/${userId}`, {
        syncType: 'update',
        orgCode,
        forceUpdate: true
      });

      if (response.status === 200) {
        const result = response.data;
        if (result.data && result.data.syncResults) {
          Object.entries(result.data.syncResults).forEach(([appCode, syncResult]: [string, any]) => {
            setSyncResults(prev => ({
              ...prev,
              [`${appCode}_${userId}`]: syncResult
            }));
          });
        }
        
        return { success: true, result: result.data };
      }
    } catch (error) {
      console.error(`Error syncing user ${userId}:`, error);
      return { success: false, error };
    } finally {
      setSyncing(prev => ({ ...prev, 'bulk': false }));
    }
  };

  const clearSyncResults = () => {
    setSyncResults({});
  };

  return {
    syncing,
    syncResults,
    handleSyncToApplication,
    handleBulkSync,
    handleSyncUser,
    clearSyncResults
  };
}
