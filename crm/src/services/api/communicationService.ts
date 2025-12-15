import { handleApiError } from './errorHandler';
import { api } from './index';

export interface Communication {
  id: string;
  type: 'email' | 'phone' | 'meeting' | 'video_call' | 'chat';
  subject: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  relatedToType: 'account' | 'contact' | 'opportunity';
  relatedToId: string;
  createdBy: string;
  assignedTo?: string;
  participants?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const communicationService = {
  createCommunication: async (data: Omit<Communication, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await api.post<Communication>('/communications', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getCommunications: async () => {
    try {
      const response = await api.get<Communication[]>('/communications');
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getCommunication: async (id: string) => {
    try {
      const response = await api.get<Communication>(`/communications/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateCommunication: async (id: string, data: Partial<Communication>) => {
    try {
      const response = await api.put<Communication>(`/communications/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteCommunication: async (id: string) => {
    try {
      await api.delete(`/communications/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  }
};