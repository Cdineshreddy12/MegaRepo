import { handleApiError } from './errorHandler';
import { api } from './index';
import { User } from './userService';

export interface Ticket {
  id: string;
  accountId: string;
  oem: string;
  assignedTo: string;
  regionOwner?: string;
  zone: 'east' | 'west' | 'north' | 'south';
  productName: string;
  type: 'pre_sales' | 'post_sales_service' | 'post_sales_support';
  salesDescription?: string;
  effortEstimatedManDays: number;
  technicalTeamDescription?: string;
  typeOfSupport: 'standard' | 'premium' | 'enterprise';
  supportLevel: 'l1' | 'l2' | 'l3' | 'sme' | 'consultant';
  status: 'new' | 'open' | 'in_progress' | 'completed' | 'closed';
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: User;
}

export const ticketService = {
  createTicket: async (data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.tickets.create',
          resourceType: 'ticket',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for ticket creation');

      const response = await api.post<Ticket>('/tickets', data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.tickets.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'ticket',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for ticket creation');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getTickets: async (selectedOrg?: string) => {
    try {
      const params: any = {};
      if (selectedOrg) {
        params.entityId = selectedOrg;
      }
      const response = await api.get<Ticket[]>('/tickets', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getTicket: async (id: string) => {
    try {
      const response = await api.get<Ticket>(`/tickets/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateTicket: async (id: string, data: Partial<Ticket>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.tickets.update',
          resourceType: 'ticket',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for ticket update');

      const response = await api.put<Ticket>(`/tickets/${id}`, data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.tickets.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'ticket',
              resourceId: id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for ticket update');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteTicket: async (id: string) => {
    try {
      await api.delete(`/tickets/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  }
};