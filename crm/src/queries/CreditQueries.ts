import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "./constants";
import { creditService, ConsumeCreditsRequest } from "@/services/api/creditService";

export const useUserCredits = () => {
  return useQuery({
    queryKey: [QUERY_KEY.CREDITS, "user"],
    queryFn: () => creditService.getUserCredits(),
    staleTime: 0, // No caching for credit data
    gcTime: 0, // Don't cache
    retry: 2,
  });
};

export const useCreditHistory = (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: [QUERY_KEY.CREDITS, "history", params],
    queryFn: () => creditService.getCreditHistory(params),
    staleTime: 0, // No caching for credit data
    gcTime: 0, // Don't cache
  });
};

export const useCreditStats = () => {
  return useQuery({
    queryKey: [QUERY_KEY.CREDITS, "stats"],
    queryFn: () => creditService.getCreditStats(),
    staleTime: 0, // No caching for credit data
    gcTime: 0, // Don't cache
  });
};

export const useConsumeCredits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsumeCreditsRequest) => creditService.consumeCredits(data),
    onSuccess: () => {
      // Invalidate and refetch credit-related queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CREDITS] });
      // Also invalidate creditBalance queries (used by CreditBalance component) - temporarily disabled
      // queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
      // Also invalidate creditBalance queries with org-specific keys - temporarily disabled
      // queryClient.invalidateQueries({ queryKey: ['creditBalance'], exact: false });
      // Invalidate activity logs to show new credit consumption entries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
    },
  });
};
