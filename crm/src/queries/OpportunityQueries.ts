import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { Opportunity, opportunityService } from "@/services/api/opportunityService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ENTITY } from "@/constants";

// Enhance Opportunity type to include user data for createdBy and assignedTo
export interface OpportunityType extends Entity, Opportunity {
  createdBy: {
    _id?: string;
    name?: string;
    email?: string;
  } | string;
  assignedTo?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string;
  accountId: {
    _id?: string;
    name?: string;
  } | string;
  primaryContactId?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string;
}

// Create an adapter for the opportunityService that implements EntityService interface
const typedOpportunityService: EntityService<OpportunityType> = {
  getAll: (selectedOrg?: string) => opportunityService.getOpportunities(selectedOrg),
  getById: (id: string) => opportunityService.getOpportunity(id),
  create: (data: Omit<OpportunityType, 'id'>, params?: Record<string, string>) => opportunityService.createOpportunity(data, params),
  update: (id: string, data: Partial<Omit<OpportunityType, 'id'>>, params?: Record<string, string>) => opportunityService.updateOpportunity(id, data, params),
  delete: (id: string) => opportunityService.deleteOpportunity(id)
};

// Create opportunity-specific hooks using the generic hook factory
export const {
  useEntities: useOpportunities,
  useEntity: useOpportunity,
  useCreateEntity: useCreateOpportunity,
  useUpdateEntity: useUpdateOpportunity,
  useUpdateEntityOptimistic: useUpdateOpportunityOptimistic,
  useDeleteEntity: useDeleteOpportunity,
  useDeleteEntityOptimistic: useDeleteOpportunityOptimistic,
  useSuspenseEntity: useSuspenseOpportunity,
  useSuspenseEntities: useSuspenseOpportunities,
} = createEntityHooks<OpportunityType>(QUERY_KEY.OPPORTUNITY, typedOpportunityService);

// Add a filter by stage hook
export const useOpportunitiesByStage = (stage: string | null) => {
  // Safety check: if stage is invalid, return a safe default
  if (!stage || stage === '' || stage === 'undefined' || stage === 'null') {
    return {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve([]),
    };
  }

  return useQuery({
    queryKey: [QUERY_KEY.OPPORTUNITY, 'byStage', stage],
    queryFn: async () => {
      if (!stage) return [];
      const response = await api.get<OpportunityType[]>(`/opportunities?stage=${stage}`);
      return response.data;
    },
    enabled: !!stage,
  });
};

// Add a hook for opportunity dashboard stats
export const useOpportunityStats = () => {
  return useQuery({
    queryKey: [QUERY_KEY.OPPORTUNITY, 'stats'],
    queryFn: async () => {
      const response = await api.get<{
        totalValue: number;
        stageBreakdown: Record<string, { count: number; value: number }>;
        recentDeals: OpportunityType[];
      }>('/opportunities/stats');
      return response.data;
    }
  });
};

// Add a hook to update the stage of an opportunity
export const useUpdateOpportunityStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage, previousStage }: { id: string; stage: string; previousStage: string }) => {
      const response = await api.put<OpportunityType>(`/opportunities/${id}/stage`, {
        stage,
        previousStage,
      });
      return response.data;
    },

    // Optimistically update the opportunity stage before mutation is confirmed
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY.OPPORTUNITY] });

      const previousOpportunities = queryClient.getQueryData<OpportunityType[]>([QUERY_KEY.OPPORTUNITY]);

      queryClient.setQueryData<OpportunityType[]>([QUERY_KEY.OPPORTUNITY], (old = []) =>
        old.map((opp) =>
          opp.id === id ? { ...opp, stage: stage as OpportunityType['stage'] } : opp
        )
      );

      return { previousOpportunities };
    },

    // Rollback if the mutation fails
    onError: (_error, _variables, context) => {
      if (context?.previousOpportunities) {
        queryClient.setQueryData([QUERY_KEY.OPPORTUNITY], context.previousOpportunities);
      }
    },

    // Always refetch after mutation (ensure server and UI are in sync)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.OPPORTUNITY] });
      queryClient.invalidateQueries({ queryKey: ["data-source", ENTITY.OPPORTUNITY] });
    },
  });
};

