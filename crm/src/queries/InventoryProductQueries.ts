import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { inventoryService, Product, ProductFormValues, ProductUpdatePayload } from "@/services/api/inventoryService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ENTITY } from "@/constants";

// Ensure Product type extends the Entity interface
interface ProductType extends Entity, Product {}

// Create an adapter for the inventoryService that implements EntityService interface
const typedInventoryService: EntityService<ProductType> = {
  getAll: () => inventoryService.getProducts(),
  getById: (id: string) => inventoryService.getProduct(id),
  create: (data: Omit<ProductFormValues, 'id'>) => inventoryService.createProduct(data),
  update: (id: string, data: ProductUpdatePayload) => inventoryService.updateProduct(id, data),
  delete: (id: string) => inventoryService.deleteProduct(id),
};

// Create product-specific hooks using the generic hook factory
export const {
  useEntities: useInventoryProducts,
  useEntity: useInventoryProduct,
  useCreateEntity: useCreateInventoryProduct,
  useUpdateEntity: useUpdateInventoryProduct,
  useUpdateEntityOptimistic: useUpdateInventoryProductOptimistic,
  useDeleteEntity: useDeleteInventoryProduct,
  useDeleteEntityOptimistic: useDeleteInventoryProductOptimistic,
  useSuspenseEntity: useSuspenseInventoryProduct,
  useSuspenseEntities: useSuspenseInventoryProducts,

} = createEntityHooks<ProductType>(QUERY_KEY.INVENTORY_PRODUCT, typedInventoryService);

// Add a hook to update the status of a product
export const useUpdateInventoryProductStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.put<ProductType>(`/inventory/products/${id}/status`, {
        status,
      });
      return response.data;
    },

    // Optimistically update the product status before mutation is confirmed
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY.INVENTORY_PRODUCT] });

      const previousProducts = queryClient.getQueryData<ProductType[]>([QUERY_KEY.INVENTORY_PRODUCT]);

      queryClient.setQueryData<ProductType[]>([QUERY_KEY.INVENTORY_PRODUCT], (old = []) =>
        old.map((product) => {
          const productId = product?.id || product?._id;
          return productId === id ? { ...product, status: status as ProductType['status'] } : product;
        })
      );

      return { previousProducts };
    },

    // Rollback if the mutation fails
    onError: (_error, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData([QUERY_KEY.INVENTORY_PRODUCT], context.previousProducts);
      }
    },

    // Always refetch after mutation (ensure server and UI are in sync)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY_PRODUCT] });
      queryClient.invalidateQueries({ queryKey: ["data-source", ENTITY.INVENTORY] });
    },
  });
};