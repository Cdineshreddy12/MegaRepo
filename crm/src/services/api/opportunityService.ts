import { handleApiError } from './errorHandler';
import { api } from './index';

export interface BuyingCommitteeMember {
  contactId: string;
  role: string;
}

export interface OpportunityService {
  serviceType: string;
  serviceRevenue: number;
}

export interface OpportunityStageHistory {
  id: string;
  fromStage: string;
  toStage: string;
  createdAt: string;
  updatedAt: string;
}
export interface Opportunity {
  _id: string;
  id: string;
  name: string;
  accountId: string;
  primaryContactId?: string;
  stage: 'qualification' | 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  status: 'commit' | 'upside' | 'prospect';
  revenue: number;
  profitability: number;
  expectedProfit?: number;
  expense?: number;
  oem: string;
  services?: OpportunityService[];
  expectedCloseDate: string;
  actualCloseDate?: string;
  description?: string;
  nextStep?: string;
  competition?: string;
  decisionCriteria?: string;
  createdBy: string;
  assignedTo?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
  stageHistory: OpportunityStageHistory;
  formTemplateId?: string;
  isFormSubmission?: boolean;
  customFields?: Record<string, any>;
  customFieldsCount?: number;
}

export const opportunityService = {
  createOpportunity: async (data: Omit<Opportunity, 'id' | 'createdBy' | 'updatedAt'>, params?: Record<string, string>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.opportunities.create',
          resourceType: 'opportunity',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for opportunity creation');

      const response = await api.post<Opportunity>('/opportunities', data, { params });
      
      // Handle both wrapped and direct response formats
      const opportunityData = response.data && response.data.opportunity ? response.data.opportunity : response.data;
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (opportunityData && typeof opportunityData === 'object') {
        const anyResponse = opportunityData as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.opportunities.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'opportunity',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for opportunity creation');
        }
      }
      
      return opportunityData;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOpportunities: async (selectedOrg?: string) => {
    try {
      const params: any = {};
      if (selectedOrg) {
        params.entityId = selectedOrg;
      }
      const response = await api.get<Opportunity[]>('/opportunities', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOpportunity: async (id: string) => {
    try {
      const response = await api.get<Opportunity>(`/opportunities/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateOpportunity: async (id: string, data: Partial<Opportunity>, params?: Record<string, string>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.opportunities.update',
          resourceType: 'opportunity',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for opportunity update');

      const response = await api.put<Opportunity>(`/opportunities/${id}`, data, { params });
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.opportunities.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'opportunity',
              resourceId: id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for opportunity update');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteOpportunity: async (id: string) => {
    try {
      await api.delete(`/opportunities/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  }
};