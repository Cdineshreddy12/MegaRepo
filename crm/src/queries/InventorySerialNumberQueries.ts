import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { InventorySerialNumber, InventorySerialNumberFormValues, inventoryService } from "@/services/api/inventoryService";

// Ensure Product type extends the Entity interface
export interface ServiceNumberType extends Entity, InventorySerialNumber {}

// Create an adapter for the inventoryService that implements EntityService interface
const typedInventoryService: EntityService<ServiceNumberType> = {
  getAll: () => inventoryService.getInventorySerialNumbers(),
  getById: (id: string) => inventoryService.getInventorySerialNumber(id),
  create: (data: InventorySerialNumberFormValues) => inventoryService.createInventorySerialNumber(data),
  update: (id: string, data: Partial<InventorySerialNumberFormValues>) => inventoryService.updateInventorySerialNumber(id, data),
  delete: (id: string) => inventoryService.deleteInventorySerialNumber(id),};


// Create product-specific hooks using the generic hook factory
export const {
  useEntities: useInventorySerialNumbers,
  useEntity: useInventorySerialNumber,
  useCreateEntity: useCreateInventorySerialNumber,
  useUpdateEntity: useUpdateInventorySerialNumber,
  useUpdateEntityOptimistic: useUpdateInventorySerialNumberOptimistic,
  useDeleteEntity: useDeleteInventorySerialNumber,
  useDeleteEntityOptimistic: useDeleteInventorySerialNumberOptimistic,
  useSuspenseEntity: useSuspenseInventorySerialNumber,
  useSuspenseEntities: useSuspenseInventorySerialNumbers,
} = createEntityHooks<ServiceNumberType>(QUERY_KEY.INVENTORY_SERIAL_NUMBER, typedInventoryService);

