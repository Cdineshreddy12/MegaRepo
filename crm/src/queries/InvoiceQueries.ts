import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { Invoice, invoiceService } from "@/services/api/invoiceService";

// Ensure Quotation type extends the Entity interface
interface InvoiceType extends Entity, Invoice {}

// Create an adapter for the quotationService that implements EntityService interface
const typedQuotationService: EntityService<InvoiceType> = {
  getAll: () => invoiceService.getInvoices(),
  getById: (id: string) => invoiceService.getInvoice(id),
  create: (data: Omit<InvoiceType, 'id'>, params?: Record<string, string>) => invoiceService.createInvoice(data, params),
  update: (id: string, data: Partial<Omit<InvoiceType, 'id'>>) => invoiceService.updateInvoice(id, data),
  delete: (id: string) => invoiceService.deleteInvoice(id)
};

// Create quotation-specific hooks using the generic hook factory
export const {
  useEntities: useInvoices,
  useEntity: useInvoice,
  useCreateEntity: useCreateInvoice,
  useUpdateEntity: useUpdateInvoice,
  useUpdateEntityOptimistic: useUpdateInvoiceOptimistic,
  useDeleteEntity: useDeleteInvoice,
  useDeleteEntityOptimistic: useDeleteInvoiceOptimistic,
  useSuspenseEntity: useSuspenseInvoice,
  useSuspenseEntities: useSuspenseInvoices,
} = createEntityHooks<InvoiceType>(QUERY_KEY.INVOICE, typedQuotationService);