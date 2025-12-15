import { handleApiError } from './errorHandler';
import { api } from './index';

export interface UserCreateData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'user';
  phone?: string;
  department?: string;
  position?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'user';
  phone?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const userManagementService = {
  createUser: async (data: UserCreateData) => {
    try {
      const response = await api.post<User>('/admin/users', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getUsers: async () => {
    try {
      const response = await api.get<User[]>('/admin/users');
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getUser: async (id: string) => {
    try {
      const response = await api.get<User>(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateUser: async (id: string, data: Partial<UserCreateData>) => {
    try {
      const response = await api.put<User>(`/admin/users/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    try {
      const response = await api.put<User>(`/admin/users/${id}/status`, { isActive });
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateUserRole: async (id: string, role: User['role']) => {
    try {
      const response = await api.put<User>(`/admin/users/${id}/role`, { role });
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteUser: async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  }
};