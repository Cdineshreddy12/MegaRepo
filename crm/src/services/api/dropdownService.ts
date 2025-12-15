import { handleApiError, } from './errorHandler';
import { api } from './index';
import { DropdownFormValues, DropdownOption } from '@/types/Dropdown.types';

const BASE_URL = '/admin/sys-config/dropdowns'; 

export const dropdownService = {
  createOption: async (data: DropdownFormValues) => {
    try {
      const response = await api.post<DropdownOption>(BASE_URL, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOptions: async () => {
    try {
      const response = await api.get<DropdownOption[]>(BASE_URL);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOptionsGroupByCategory: async () => {
    try {
      const response = await api.get<DropdownOption[]>(`${BASE_URL}/group-by-category`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOptionsByCategory: async (category: DropdownOption['category']) => {
    try {
      const response = await api.get<DropdownOption[]>(`${BASE_URL}/${category}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateOption: async (id: string, data: Partial<DropdownOption>) => {
    try {
      const response = await api.put<DropdownOption>(`${BASE_URL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteOption: async (id: string) => {
    try {
      await api.delete(`/admin/sys-config/dropdowns/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getDropdownCategories: async () => {
    try {
      const response = await api.get<string[]>(`${BASE_URL}/categories`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },
};