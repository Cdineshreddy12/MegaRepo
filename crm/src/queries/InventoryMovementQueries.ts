import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { InventoryMovement, InventoryMovementFormValues, inventoryService } from "@/services/api/inventoryService";

// Ensure Product type extends the Entity interface
export interface MovementType extends Entity, InventoryMovement {}

// Create an adapter for the inventoryService that implements EntityService interface
const typedInventoryMovement: EntityService<MovementType> = {
  getAll: () => inventoryService.getInventoryMovements(),
  getById: (id: string) => inventoryService.getInventoryMovement(id),
  create: (data: InventoryMovementFormValues) => inventoryService.recordInventoryMovement(data),
  update: (id: string, data: Partial<InventoryMovementFormValues>) => inventoryService.updateInventoryMovement(id, data),
  delete: (id: string) => inventoryService.deleteInventoryMovement(id),};


// Create product-specific hooks using the generic hook factory
export const {
  useEntities: useInventoryMovements,
  useEntity: useInventoryMovement,
  useCreateEntity: useCreateInventoryMovement,
  useUpdateEntity: useUpdateInventoryMovement,
  useUpdateEntityOptimistic: useUpdateInventoryMovementOptimistic,
  useDeleteEntity: useDeleteInventoryMovement,
  useDeleteEntityOptimistic: useDeleteInventoryMovementOptimistic,
  useSuspenseEntity: useSuspenseInventoryMovement,
  useSuspenseEntities: useSuspenseInventoryMovements,
} = createEntityHooks<InventoryMovement>(QUERY_KEY.INVENTORY_MOVEMENT, typedInventoryMovement);

