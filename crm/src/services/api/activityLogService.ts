import { handleApiError } from "./errorHandler";
import { api } from "./index";

export interface ActivityLog {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>; // To store any type of object
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  createdAt?: string; // Timestamp
  updatedAt?: string; // Timestamp
}
export type ActivityLogFormValues = Omit<ActivityLog, "userId" | "createdAt" | "updatedAt" | "user">;

export const activityLogService = {
  getLogs: async (selectedOrg?: string, filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    entityType?: string;
  }) => {
    try {
      const params: any = { ...filters };
      // Backend expects entityId parameter for organization filtering
      if (selectedOrg) {
        params.entityId = selectedOrg;
      }
      const response = await api.get<ActivityLog[]>("/admin/reports/audit", {
        params,
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      handleApiError(error);
      return [];
    }
  },
  getMyLogs: async (selectedOrg?: string, filters?: {
    startDate?: string;
    endDate?: string;
    entityType?: string;
  }) => {
    try {
      const params: any = { ...filters };
      // Backend expects selectedOrg or entityId parameter for organization filtering
      // The API interceptor will add entityId automatically, but we also pass selectedOrg
      if (selectedOrg) {
        params.selectedOrg = selectedOrg;
        // Also set entityId for consistency (backend checks both)
        params.entityId = selectedOrg;
      }
      const response = await api.get<ActivityLog[]>("/admin/reports/my-activity", {
        params,
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching my activity logs:', error);
      handleApiError(error);
      return [];
    }
  },
  getLog: async(id: string) => {
    try {
      const response = await api.get<ActivityLog>(`/admin/reports/audit/${id}`)
      return response.data
    } catch (error) {
      handleApiError(error);
    }
  },

  getUserActivityReport: async (
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
    }
  ) => {
    try {
      const response = await api.get<ActivityLog[]>(
        `/admin/reports/users/${userId}`,
        {
          params: filters,
        }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
  createUserActivityLog: async (
    data: ActivityLogFormValues
  ) => {
    try {
      const response = await api.post<ActivityLog>(
        "/admin/reports/activity-logs",
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

