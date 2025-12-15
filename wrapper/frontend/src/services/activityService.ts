/**
 * Activity Service - API calls for activity logs and audit trails
 */

import { api } from '../lib/api';

export interface ActivityLog {
  logId: string;
  action: string;
  appCode?: string;
  appName?: string;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  ipAddress: string;
  createdAt: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userInfo?: {
    id: string;
    name: string;
    email: string;
  };
  tenantId?: string;
}

export interface AuditLog {
  logId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  details?: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}


export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  pages?: number;
}

export interface ActivityResponse {
  activities: ActivityLog[];
  pagination: PaginationInfo;
}

export interface AuditResponse {
  logs: AuditLog[];
  pagination: PaginationInfo;
}

export interface ActivityFilters {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  action?: string;
  app?: string;
  userId?: string;
  resourceType?: string;
  includeDetails?: boolean;
}

class ActivityService {
  /**
   * Get current user's activity logs (filtered for meaningful operations only)
   */
  async getUserActivity(filters: ActivityFilters = {}): Promise<ActivityResponse> {
    const queryParams = new URLSearchParams();

    // Default to recent activities (last 7 days) if no date filter specified
    if (!filters.startDate && !filters.endDate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filters.startDate = sevenDaysAgo.toISOString();
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/activity/user?${queryParams}`);
    console.log('API response:', response.data);

    // Backend now handles filtering, just return the response
    return response.data;
  }

  /**
   * Get tenant audit logs (admin only, filtered for meaningful operations)
   */
  async getAuditLogs(filters: ActivityFilters = {}): Promise<AuditResponse> {
    const queryParams = new URLSearchParams();

    // Default to recent activities (last 7 days) if no date filter specified
    if (!filters.startDate && !filters.endDate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filters.startDate = sevenDaysAgo.toISOString();
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/activity/audit?${queryParams}`);

    // Backend now handles filtering, just return the response
    return response.data;
  }


  /**
   * Get user activity summary (admin only)
   */
  async getUserActivitySummary(userId: string, days: number = 30): Promise<any> {
    const response = await api.get(`/activity/user/${userId}/summary?days=${days}`);
    return response.data;
  }

  /**
   * Export activity logs
   */
  async exportActivityLogs(
    type: 'user' | 'audit' = 'audit',
    format: 'json' | 'csv' = 'json',
    filters: ActivityFilters = {}
  ): Promise<Blob> {
    const response = await api.post(
      '/activity/export',
      {
        type,
        format,
        filters
      },
      {
        responseType: 'blob'
      }
    );
    return response.data;
  }

  /**
   * Get available activity and resource types
   */
  async getActivityTypes(): Promise<{
    activityTypes: Record<string, string>;
    resourceTypes: Record<string, string>;
  }> {
    const response = await api.get('/activity/types');
    return response.data.data;
  }

  /**
   * Format activity action for display
   */
  formatActivityAction(action: string): string {
    return action
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  /**
   * Get activity icon based on action type
   */
  getActivityIcon(action: string): string {
    if (action.includes('login') || action.includes('auth')) {
      return '🔐';
    }
    if (action.includes('user') || action.includes('profile')) {
      return '👤';
    }
    if (action.includes('role') || action.includes('permission')) {
      return '🛡️';
    }
    if (action.includes('tenant') || action.includes('admin')) {
      return '🏢';
    }
    if (action.includes('subscription') || action.includes('payment')) {
      return '💳';
    }
    if (action.includes('data') || action.includes('export') || action.includes('import')) {
      return '📊';
    }
    if (action.includes('security') || action.includes('breach')) {
      return '🚨';
    }
    return '📝';
  }

  /**
   * Get activity color based on action type
   */
  getActivityColor(action: string): string {
    if (action.includes('login') || action.includes('auth')) {
      return 'green';
    }
    if (action.includes('user') || action.includes('profile')) {
      return 'blue';
    }
    if (action.includes('role') || action.includes('permission')) {
      return 'purple';
    }
    if (action.includes('tenant') || action.includes('admin')) {
      return 'indigo';
    }
    if (action.includes('subscription') || action.includes('payment')) {
      return 'emerald';
    }
    if (action.includes('data') || action.includes('export') || action.includes('import')) {
      return 'orange';
    }
    if (action.includes('security') || action.includes('breach')) {
      return 'red';
    }
    return 'gray';
  }
}

export default new ActivityService();
