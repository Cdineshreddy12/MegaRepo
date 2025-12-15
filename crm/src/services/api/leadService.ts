import { handleApiError } from "./errorHandler";
import { api } from "./index";

import { Zone, LeadStatus, Address } from "@/types/common.ts";
import { User } from "./userService";

export interface Lead {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  jobTitle?: string;
  industry?: string;
  source?: string;
  status: LeadStatus;
  score?: number;
  notes?: string;
  product: string;
  address: Address;
  zone: Zone;
  assignedTo?: User;
  createdBy: User;
  updatedBy: User;
  createdAt: string;
  updatedAt: string;
}

export type LeadFormValues = Omit<
  Lead,
  "_id" | "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;
export type LeadUpdatePayload = Partial<LeadFormValues>;

export const leadService = {
  createLead: async (data: LeadFormValues, params?: Record<string, string>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.leads.create',
          resourceType: 'lead',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for lead creation');

      const response = await api.post<Lead>("/leads", data, { params });

      // Emit credit deduction event if present in response
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.leads.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'lead',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for lead creation');
        }
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getLeads: async (selectedOrg?: string) => {
    try {
      const params: any = {};
      if (selectedOrg) {
        params.entityId = selectedOrg;
      }
      const response = await api.get<Lead[]>("/leads", { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getLead: async (id: string) => {
    try {
      const response = await api.get<Lead>(`/leads/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateLead: async (id: string, data: LeadUpdatePayload, params?: Record<string, string>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.leads.update',
          resourceType: 'lead',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for lead update');

      const response = await api.put<Lead>(`/leads/${id}`, data, { params });

      // Emit credit deduction event if present in response
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.leads.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'lead',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for lead update');
        }
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error); // Change this line
    }
  },

  deleteLead: async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
