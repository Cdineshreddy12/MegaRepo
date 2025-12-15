import { api, handleApiError, ApiResponse } from './index';

export interface LeadInsightRequest {
  request: {
    lead_id: string;
    session_id?: string;
  };
}

export interface LeadInsight {
    session_id: string;
    reasoning_history: string[];
    action_history: string[];
    observation_history: string[];
    react_turns: number;
    reached_max_turns: boolean;
    answer: {
      executive_summary: string;
      lead_summary: string;
      sales_intelligence: string;
      conversation_starter: string;
      question_to_ask: string;
      convertion_likelihood_score: number;
      next_best_action: string;
    };
  }
/**
 * Service for generating AI insights for leads
 */
export const leadInsightService = {
  /**
   * Generate AI insights for a specific lead
   * @param leadId - The ID of the lead to analyze
   * @param sessionId - Optional session ID for persisting conversation context
   * @returns The generated lead insights
   */
  generateInsights: async (leadId: string, sessionId?: string): Promise<LeadInsight> => {
    try {
      // Create a unique session ID if not provided
      const session = sessionId || `session_${Date.now()}`;
      
      const requestData: LeadInsightRequest = {
        request: {
          lead_id: leadId,
          session_id: session
        }
      };
      
      // If this is the actual response structure (without nested data property)
const response = await api.post<LeadInsight>(
    'https://crm.zopkit.com/ai/api/v1/generate_lead_insight',
    requestData,
    {
      headers: {
        'accept': 'application/json',
        'X-API-Key': 'ruthereyet?',
        'Content-Type': 'application/json'
      },
      withCredentials: false,
    }
  );
  console.log('Lead Insight response:', response.data);
   return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

export default leadInsightService;