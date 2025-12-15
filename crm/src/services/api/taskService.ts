import { handleApiError } from './errorHandler';
import { api } from './index';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'deferred';
  priority: 'low' | 'medium' | 'high';
  activityType: 'call' | 'meeting' | 'email' | 'demo' | 'presentation' | 'follow_up';
  estimatedDuration?: number;
  relatedTo?: {
    type: 'account' | 'contact' | 'opportunity';
    id: string;
  };
  reminderAt?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
  completedAt?: string;
  createdBy: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export const taskService = {
  createTask: async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.tasks.create',
          resourceType: 'task',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for task creation');

      const response = await api.post<Task>('/tasks', data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.tasks.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'task',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for task creation');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getTasks: async () => {
    try {
      const response = await api.get<Task[]>('/tasks');
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getTask: async (id: string) => {
    try {
      const response = await api.get<Task>(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateTask: async (id: string, data: Partial<Task>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.tasks.update',
          resourceType: 'task',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for task update');

      const response = await api.put<Task>(`/tasks/${id}`, data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.tasks.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'task',
              resourceId: id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for task update');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteTask: async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  }
};