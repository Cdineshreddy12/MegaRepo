import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadInsightService, LeadInsight } from '@/services/api/leadAiService';

export const LEAD_INSIGHTS_QUERY_KEY = 'leadInsights';

/**
 * Hook for fetching and managing lead insights
 */
export const useLeadInsights = (leadId: string | undefined) => {
  const queryClient = useQueryClient();

  // Safety check: if leadId is invalid, return a safe default
  if (!leadId || leadId === '' || leadId === 'undefined' || leadId === 'null') {
    return {
      insights: null,
      isLoading: false,
      isError: false,
      error: null,
      fetchInsights: () => Promise.resolve(null),
      generateInsights: () => Promise.resolve(null),
    };
  }

  // Query for fetching lead insights if they exist
  const insightsQuery = useQuery({
    queryKey: [LEAD_INSIGHTS_QUERY_KEY, leadId],
    queryFn: async () => {
      if (!leadId) throw new Error('Lead ID is required');
      return leadInsightService.generateInsights(leadId);
    },
    // Only enable when we have a valid leadId
    enabled: leadId !== undefined && leadId !== null && leadId !== '',
    staleTime: 1000 * 60 * 15, // Consider insights stale after 15 minutes
  });

  // Mutation for generating new insights
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!leadId) throw new Error('Lead ID is required');
      return leadInsightService.generateInsights(leadId);
    },
    onSuccess: (data) => {
      // Update cache with new insights
      queryClient.setQueryData([LEAD_INSIGHTS_QUERY_KEY, leadId], data);
    },
  });

  return {
    insights: insightsQuery.data,
    isLoading: insightsQuery.isLoading || generateInsightsMutation.isPending,
    isError: insightsQuery.isError || generateInsightsMutation.isError,
    error: insightsQuery.error || generateInsightsMutation.error,
    fetchInsights: insightsQuery.refetch,
    generateInsights: generateInsightsMutation.mutate,
  };
};

export default useLeadInsights;