import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { SalesOrder, salesOrderService } from "@/services/api/salesOrderService";

// Ensure Quotation type extends the Entity interface
interface SalesOrderType extends Entity, SalesOrder {}

// Create an adapter for the quotationService that implements EntityService interface
const typedQuotationService: EntityService<SalesOrderType> = {
  getAll: () => salesOrderService.getOrders(),
  getById: (id: string) => salesOrderService.getOrder(id),
  create: (data: Omit<SalesOrderType, 'id'>) => salesOrderService.createOrder(data),
  update: (id: string, data: Partial<Omit<SalesOrderType, 'id'>>) => salesOrderService.updateOrder(id, data),
  delete: (id: string) => salesOrderService.deleteOrder(id)
};

// Create quotation-specific hooks using the generic hook factory
export const {
  useEntities: useSalesOrders,
  useEntity: useSalesOrder,
  useCreateEntity: useCreateSalesOrder,
  useUpdateEntity: useUpdateSalesOrder,
  useUpdateEntityOptimistic: useUpdateSalesOrderOptimistic,
  useDeleteEntity: useDeleteSalesOrder,
  useDeleteEntityOptimistic: useDeleteSalesOrderOptimistic,
  useSuspenseEntity: useSuspenseSalesOrder,
  useSuspenseEntities: useSuspenseSalesOrders,
} = createEntityHooks<SalesOrderType>(QUERY_KEY.SALES_ORDER, typedQuotationService);