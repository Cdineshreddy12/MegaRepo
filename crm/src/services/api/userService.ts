import { handleApiError } from "./errorHandler";
import { api } from "./index";

const BASE_URL = '/admin/users'; 

export interface User {
  _id: string;
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  // password: string;
  countryCode?: string;
  contactMobile: string;
  zone: string[],
  avatarUrl?: string;
  department?: string;
  role: "super_admin" | "admin" | "user";
  designation: "national_head" | "zonal_head" | "deal_owner";
  isActive: boolean;
  
  // Wrapper sync fields
  externalId?: string;
  authSource?: "local" | "wrapper" | "kinde";
  orgCode?: string;
  lastSyncedAt?: string;
  
  // Enhanced role and permission fields
  roles?: string[];
  permissions?: string[];
  roleDetails?: Array<{
    roleId: string;
    roleName: string;
    priority: number;
    permissions: string[];
  }>;
  
  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const userService = {

  createUser: async (data: Omit<User, 'isActive' | 'id' | 'createdBy' >) => {
    try {
      const response = await api.post<User>(BASE_URL, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getUsers: async (selectedOrg?: string) => {
    try {
      // Add selectedOrg parameter if provided, plus cache-busting param
      const params = selectedOrg ? { selectedOrg, ts: Date.now() } : { ts: Date.now() };

      const response = await api.get<User[]>(BASE_URL, {
        params,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getUser: async (id: string) => {
    try {
      const response = await api.get<User>(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

 updateUser: async (id: string, data: Partial<User>) => {
     try {
       const response = await api.put<User>(`${BASE_URL}/${id}`, data);
       return response.data;
     } catch (error) {
       throw handleApiError(error)
     }
   },

   deleteUser: async (id: string) => {
    try {
      return api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
