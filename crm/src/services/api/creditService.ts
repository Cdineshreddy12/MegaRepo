import { handleApiError } from "./errorHandler";
import { api } from "./index";

export interface OrganizationCredits {
  allocated: number;
  used: number;
  available: number;
  entityId: string;
  organizationName: string;
  status: string;
}

export interface UserCreditsResponse {
  organizationCredits: OrganizationCredits;
}

export interface ConsumeCreditsRequest {
  operationCode: string;
  entityType?: string;
  entityId?: string;
  operationDetails?: Record<string, unknown>;
}

export interface ConsumeCreditsResponse {
  consumed: number;
  remaining: number;
  operationCode: string;
  transactionId: string;
}

export interface CreditHistoryLog {
  id: string;
  action: string;
  operationCode: string;
  creditCost: number;
  entityId: string;
  operationDetails?: Record<string, unknown>;
  remainingCredits: number;
  timestamp: string;
  transactionId: string;
}

export interface CreditHistoryResponse {
  logs: CreditHistoryLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreditStats {
  currentCredits: {
    allocated: number;
    used: number;
    available: number;
    utilization: number;
  } | null;
  consumptionHistory: Array<{
    date: string;
    consumed: number;
    operations: number;
  }>;
}

export const creditService = {
  // Get user's available credits and configurations
  getUserCredits: async (): Promise<UserCreditsResponse> => {
    try {
      const response = await api.get<{ success: boolean; data: UserCreditsResponse }>("/credits/user-credits");
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Consume credits for an operation
  consumeCredits: async (data: ConsumeCreditsRequest): Promise<ConsumeCreditsResponse> => {
    try {
      const response = await api.post<ConsumeCreditsResponse>("/credits/consume", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get credit consumption history
  getCreditHistory: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<CreditHistoryResponse> => {
    try {
      const response = await api.get<{ success: boolean; data: CreditHistoryResponse }>("/credits/history", {
        params
      });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get credit statistics
  getCreditStats: async (): Promise<CreditStats> => {
    try {
      const response = await api.get<CreditStats>("/credits/stats");
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get credit cost for an operation (fallback to default values)
  getCreditCost: (operationCode: string): number => {
    // Default credit costs - these could be moved to a config file
    const defaultCosts: Record<string, number> = {
      'crm.accounts.create': 35,
      'crm.accounts.update': 3,
      'crm.accounts.delete': 3,
      'crm.accounts.read': 3,
      'crm.accounts.read_all': 3,
      'crm.accounts.assign': 196,
      'crm.contacts.create': 4,
      'crm.contacts.update': 2,
      'crm.contacts.delete': 2,
      'crm.leads.create': 5,
      'crm.leads.update': 3,
      'crm.leads.delete': 3,
      'crm.opportunities.create': 8,
      'crm.opportunities.update': 5,
      'crm.opportunities.delete': 5,
      'crm.tasks.create': 2,
      'crm.tasks.update': 1,
      'crm.tasks.delete': 1,
    };
    return defaultCosts[operationCode] || 0;
  },

  // Check if user has sufficient credits
  hasSufficientCredits: (
    requiredCredits: number,
    availableCredits: number
  ): boolean => {
    return availableCredits >= requiredCredits;
  }
};
