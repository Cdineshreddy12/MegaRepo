import { useQuery } from "@tanstack/react-query";
import { ENTITY } from "@/constants";
import { opportunityService } from "@/services/api/opportunityService";
import { leadService } from "@/services/api/leadService";
import { EntityType } from "@/types/common";
import { accountService } from "@/services/api/accountService";
import { contactService } from "@/services/api/contactService";
import { quotationService } from "@/services/api/quotationService";
import { ticketService } from "@/services/api/ticketService";
import { userService } from "@/services/api/userService";

export type DataSourceEntityType = Exclude<EntityType, "ACTIVITY_LOG" | "AI_INSIGHTS">;

const dataSourceMap = {
    [ENTITY.OPPORTUNITY]: opportunityService.getOpportunities,
    [ENTITY.LEAD]: leadService.getLeads,
    [ENTITY.ACCOUNT]: accountService.getAccounts,
    [ENTITY.CONTACT]: contactService.getContacts,
    [ENTITY.QUOTATION]: quotationService.getQuotations,
    [ENTITY.TICKET]: ticketService.getTickets,
    [ENTITY.USER]: userService.getUsers,
} satisfies Record<DataSourceEntityType, () => Promise<unknown>>;

type DataSourceMap = typeof dataSourceMap;

type DataSourceId = keyof DataSourceMap;

type ExtractDataSourceType<K extends DataSourceId> =
  Awaited<ReturnType<DataSourceMap[K]>>;

export const useDataSourceById = <K extends DataSourceId>(id: K) => {
  // Safety check: if id is invalid, return a safe default
  if (!id || id === '' || id === 'undefined' || id === 'null') {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve(undefined),
    };
  }

  return useQuery({
    queryKey: ["data-source", id],
    queryFn: async () => {
      const fetcher = dataSourceMap[id];
      const rawData = await fetcher();
      return {
        name: `${id.charAt(0).toUpperCase() + id.slice(1)} Data`,
        data: rawData,
      } as {
        name: string;
        data: ExtractDataSourceType<K>;
      };
    },
    enabled: !!id,
  });
};
