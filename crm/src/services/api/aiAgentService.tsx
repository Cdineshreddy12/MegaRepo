import axios from 'axios';
import { api, handleApiError } from './index';

// Use the correct API endpoint
const AI_AGENT_URL = 'https://crm.zopkit.com/ai/api/v1/query';

// Define interfaces for AI agent requests and responses
export interface AIAgentRequest {
  question: string;
  session_id?: string;
}

export interface AIAgentResponse {
  session_id: string;
  reasoning_history: string[];
  action_history: string[];
  observation_history: string[];
  react_turns: number;
  reached_max_turns: boolean;
  answer: string;
}

/**
 * Service for interacting with the AI agent API
 */
export const aiAgentService = {
  /**
   * Send a query to the AI agent
   * @param question The user's question to the AI agent
   * @param sessionId Optional session ID for continuing a conversation
   * @returns Promise with the AI agent's response
   */
  async query(question: string, sessionId?: string): Promise<AIAgentResponse> {
    try {
      const response = await axios.post<AIAgentResponse>(
        AI_AGENT_URL,
        {
          request: {
            question,
            session_id: sessionId || Date.now().toString()
          }
        },
        {
          headers: {
            'accept': 'application/json',
            'X-API-Key': 'ruthereyet?',
            'Content-Type': 'application/json'
          },
          withCredentials: false,
          timeout: 30000 // 30 second timeout
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('AI Agent query error:', error);
      
      // Check if this is a CORS error
      if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
        console.log('Network error - attempting alternative connection...');
        
        // Try the direct IP as fallback
        try {
          const fallbackResponse = await axios.post<AIAgentResponse>(
            'http://172.24.0.8:8000/api/v1/query',
            {
              request: {
                question,
                session_id: sessionId || Date.now().toString()
              }
            },
            {
              headers: {
                'accept': 'application/json',
                'X-API-Key': 'ruthereyet?',
                'Content-Type': 'application/json'
              },
              withCredentials: false,
              timeout: 30000
            }
          );
          
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error('Fallback connection also failed:', fallbackError);
          throw handleApiError(fallbackError);
        }
      }
      
      throw handleApiError(error);
    }
  },
  
  /**
   * Process the AI agent response for display in the UI
   * @param response The raw response from the AI agent
   * @returns Formatted answer with any additional UI elements
   */
  formatResponse(response: AIAgentResponse): string {
    // For now, just return the answer directly
    // This can be enhanced to format lists, tables, or other structured data
    return response.answer;
  }
};

export default aiAgentService;