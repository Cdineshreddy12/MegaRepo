import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { Quotation, quotationService } from "@/services/api/quotationService";

// Ensure Quotation type extends the Entity interface
interface QuotationType extends Entity, Quotation {}

// Create an adapter for the quotationService that implements EntityService interface
const typedQuotationService: EntityService<QuotationType> = {
  getAll: () => quotationService.getQuotations(),
  getById: (id: string) => quotationService.getQuotation(id),
  create: (data: Omit<QuotationType, 'id'>) => quotationService.createQuotation(data),
  update: (id: string, data: Partial<Omit<QuotationType, 'id'>>) => quotationService.updateQuotation(id, data),
  delete: (id: string) => quotationService.deleteQuotation(id)
};

// Create quotation-specific hooks using the generic hook factory
export const {
  useEntities: useQuotations,
  useEntity: useQuotation,
  useCreateEntity: useCreateQuotation,
  useUpdateEntity: useUpdateQuotation,
  useUpdateEntityOptimistic: useUpdateQuotationOptimistic,
  useDeleteEntity: useDeleteQuotation,
  useDeleteEntityOptimistic: useDeleteQuotationOptimistic,
  useSuspenseEntity: useSuspenseQuotation,
  useSuspenseEntities: useSuspenseQuotations,
} = createEntityHooks<QuotationType>(QUERY_KEY.QUOTATION, typedQuotationService);