import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { ProductOrder, productOrderService } from "@/services/api/productOrderService";

// Ensure Quotation type extends the Entity interface
interface ProductOrderType extends Entity, ProductOrder {}

// Create an adapter for the quotationService that implements EntityService interface
const typedQuotationService: EntityService<ProductOrderType> = {
  getAll: () => productOrderService.getOrders(),
  getById: (id: string) => productOrderService.getOrder(id),
  create: (data: Omit<ProductOrderType, 'id'>) => productOrderService.createOrder(data),
  update: (id: string, data: Partial<Omit<ProductOrderType, 'id'>>) => productOrderService.updateOrder(id, data),
  delete: (id: string) => productOrderService.deleteOrder(id)
};

// Create quotation-specific hooks using the generic hook factory
export const {
  useEntities: useProductOrders,
  useEntity: useProductOrder,
  useCreateEntity: useCreateProductOrder,
  useUpdateEntity: useUpdateProductOrder,
  useUpdateEntityOptimistic: useUpdateProductOrderOptimistic,
  useDeleteEntity: useDeleteProductOrder,
  useDeleteEntityOptimistic: useDeleteProductOrderOptimistic,
  useSuspenseEntity: useSuspenseProductOrder,
  useSuspenseEntities: useSuspenseProductOrders,
} = createEntityHooks<ProductOrderType>(QUERY_KEY.PRODUCT_ORDER, typedQuotationService);