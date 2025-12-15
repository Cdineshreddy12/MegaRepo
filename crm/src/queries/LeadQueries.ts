import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { leadService } from "@/services/api/leadService";
import {Lead, LeadFormValues, LeadUpdatePayload } from "@/types/Lead.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ENTITY } from "@/constants";

// Ensure Lead type extends the Entity interface
interface LeadType extends Entity, Lead {}

// Create an adapter for the leadService that implements EntityService interface
const typedLeadService: EntityService<LeadType> = {
  getAll: (selectedOrg?: string) => leadService.getLeads(selectedOrg),
  getById: (id: string) => leadService.getLead(id),
  create: (data: LeadFormValues, params?: Record<string, string>) => leadService.createLead(data, params),
  update: (id: string, data: LeadUpdatePayload, params?: Record<string, string>) => leadService.updateLead(id, data, params),
  delete: (id: string) => leadService.deleteLead(id)
};

// Create lead-specific hooks using the generic hook factory
export const {
  useEntities: useLeads,
  useEntity: useLead,
  useCreateEntity: useCreateLead,
  useUpdateEntity: useUpdateLead,
  useUpdateEntityOptimistic: useUpdateLeadOptimistic,
  useDeleteEntity: useDeleteLead,
  useDeleteEntityOptimistic: useDeleteLeadOptimistic,
  useSuspenseEntity: useSuspenseLead,
  useSuspenseEntities: useSuspenseLeads,

} = createEntityHooks<LeadType>(QUERY_KEY.LEAD, typedLeadService);


// Add a hook to update the status of a lead
export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, previousStatus }: { id: string; status: string; previousStatus: string }) => {
      const response = await api.put<LeadType>(`/leads/${id}/status`, {
        status,
        previousStatus,
      });
      return response.data;
    },

    // Optimistically update the lead status before mutation is confirmed
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY.LEAD] });

      const previousLeads = queryClient.getQueryData<LeadType[]>([QUERY_KEY.LEAD]);

      queryClient.setQueryData<LeadType[]>([QUERY_KEY.LEAD], (old = []) =>
        old.map((lead) => {
          const leadId = lead?.id || lead?._id
          return  leadId === id ? { ...lead, status: status as LeadType['status'] } : lead

        }
        )
      );

      return { previousLeads };
    },

    // Rollback if the mutation fails
    onError: (_error, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData([QUERY_KEY.LEAD], context.previousLeads);
      }
    },

    // Always refetch after mutation (ensure server and UI are in sync)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.LEAD] });
      queryClient.invalidateQueries({ queryKey: ["data-source", ENTITY.LEAD] });
    },
  });
};