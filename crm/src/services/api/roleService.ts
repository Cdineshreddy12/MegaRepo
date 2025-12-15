import { handleApiError } from './errorHandler';
import { api } from './index';

export interface Role {
  roleId: string;
  roleName: string;
  description: string;
  permissions: string[];
  permissionsStructure?: any;
  restrictions?: any;
  metadata?: any;
  priority?: number;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleStats {
  totalRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  totalAssignments: number;
  activeAssignments: number;
  tenantId: string;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
  count: number;
  pagination?: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface RoleResponse {
  success: boolean;
  data: Role;
}

export const roleService = {
  // Get all roles for the tenant
  getRoles: async (params?: {
    includeInactive?: boolean;
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: number;
  }) => {
    try {
      const response = await api.get<RolesResponse>('/roles', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get a specific role by ID
  getRole: async (roleId: string) => {
    try {
      const response = await api.get<RoleResponse>(`/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get roles assigned to a specific user
  getUserRoles: async (userId: string) => {
    try {
      const response = await api.get<RolesResponse>(`/roles/user/${userId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get current user's roles
  getMyRoles: async () => {
    try {
      const response = await api.get<RolesResponse>('/roles/my-roles');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get role statistics
  getRoleStats: async () => {
    try {
      const response = await api.get<{ success: boolean; data: RoleStats }>('/roles/stats');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Legacy methods for backward compatibility (these would need to be implemented via events)
  createRole: async (data: Omit<Role, 'roleId' | 'createdAt' | 'updatedAt'>) => {
    // This would typically trigger a role.created event
    throw new Error('Direct role creation not implemented. Use event-driven approach.');
  },

  updateRole: async (roleId: string, data: Partial<Role>) => {
    // This would typically trigger a role.updated event
    throw new Error('Direct role update not implemented. Use event-driven approach.');
  },

  deleteRole: async (roleId: string) => {
    // This would typically trigger a role.deleted event
    throw new Error('Direct role deletion not implemented. Use event-driven approach.');
  }
};