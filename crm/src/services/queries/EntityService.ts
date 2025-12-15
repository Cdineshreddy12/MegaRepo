import { useQuery, useMutation, useQueryClient, QueryKey, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@/queries/constants";

// Generic entity interface with required id field
export interface Entity {
  id: string;
}

// Service interface that any service must implement
export interface EntityService<T extends Entity> {
  getAll: (selectedOrg?: string) => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (data: Omit<T, 'id'>, params?: Record<string, string>) => Promise<T>;
  update: (id: string, data: Partial<Omit<T, 'id'>>, params?: Record<string, string>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

// Context type for optimistic updates
interface OptimisticUpdateContext<T> {
  previousEntities?: T[];
  previousEntity?: T;
  entityId: string;
}

// Context type for optimistic deletes
interface OptimisticDeleteContext<T> {
  previousEntities?: T[];
}

/**
 * Creates a set of reusable hooks for entity CRUD operations
 * @param queryKey - The base query key for this entity type
 * @param service - The service with API methods for this entity
 * @returns An object containing all the CRUD hooks for the entity
 */
export const createEntityHooks = <T extends Entity>(
  queryKey: string,
  service: EntityService<T>
) => {
  
  // Hook to fetch all entities with optional org filtering
  const useEntities = (selectedOrg?: string, options?: { enabled?: boolean }) => {
    return useQuery<T[], Error>({
      queryKey: [queryKey, selectedOrg] as const,
      queryFn: () => service.getAll(selectedOrg),
      enabled: options?.enabled ?? true,
    });
  };

  // Hook to fetch a single entity by ID
  const useEntity = (id?: string) => {
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

    return useQuery<T, Error>({
      queryKey: [queryKey, id] as const,
      queryFn: () => service.getById(id!),
      enabled: !!id,
    });
  };

  // Hook to fetch all entities with suspense
  const useSuspenseEntities = () => {
    return useSuspenseQuery<T[], Error>({
      queryKey: [queryKey] as const,
      queryFn: service.getAll,
    });
  };

  // Hook to fetch a single entity by ID with suspense
  const useSuspenseEntity = (id: string) => {
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

    return useSuspenseQuery<T, Error>({
      queryKey: [queryKey, id] as const,
      queryFn: () => service.getById(id),
    });
  };

  // Hook to create a new entity
  const useCreateEntity = () => {
    const queryClient = useQueryClient();

    return useMutation<T, Error, { data: Omit<T, 'id'>, params?: Record<string, string> }>({
      mutationFn: ({ data, params }) => service.create(data, params),
      onSuccess: () => {
        // Invalidate all opportunity queries to refresh the list
        queryClient.invalidateQueries({ queryKey: [queryKey] as QueryKey });
        // Invalidate activity logs to show new entries immediately
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
        // Invalidate credit balance to reflect any credit deductions
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CREDITS] });
        queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
      },
    });
  };

  // Hook to update an entity (simple version)
  const useUpdateEntity = () => {
    const queryClient = useQueryClient();

    return useMutation<T, Error, { data: T, params?: Record<string, string> }>({
      mutationFn: ({ data, params }) => {
        const { id, ...updateData } = data;
        return service.update(id, updateData as Partial<Omit<T, 'id'>>, params);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] as QueryKey });
        queryClient.invalidateQueries({ queryKey: [queryKey, variables.data.id] as QueryKey });
        // Invalidate activity logs to show new entries immediately
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
        // Invalidate credit balance to reflect any credit deductions
        // console.log('🔄 Invalidating credit balance queries after entity operation');
        // console.log('🔄 Current queries in cache:', queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance').map(q => q.queryKey));

        // Multiple invalidation strategies for reliability (temporarily disabled)
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'], exact: false });
        // queryClient.refetchQueries({ queryKey: ['creditBalance'], type: 'active' });

        // Also try to refetch credit balance specifically if we can identify the query (temporarily disabled)
        // const creditQueries = queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance');
        // creditQueries.forEach(query => {
        //   console.log('🔄 Force refetching specific credit query:', query.queryKey);
        //   queryClient.refetchQueries({ queryKey: query.queryKey, type: 'active' });
        // });

        // console.log('✅ Credit balance invalidation completed');
      },
    });
  };

  // Hook to update an entity with optimistic updates
  const useUpdateEntityOptimistic = () => {
    const queryClient = useQueryClient();

    return useMutation<T, Error, { data: T, params?: Record<string, string> }, OptimisticUpdateContext<T>>({
      mutationFn: ({ data, params }) => {
        const { id, ...updateData } = data;
        return service.update(id, updateData as Partial<Omit<T, 'id'>>, params);
      },
      onMutate: async (newEntity) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: [queryKey] as QueryKey });
        await queryClient.cancelQueries({ queryKey: [queryKey, newEntity.id] as QueryKey });

        // Snapshot previous values
        const previousEntities = queryClient.getQueryData<T[]>([queryKey]);
        const previousEntity = queryClient.getQueryData<T>([queryKey, newEntity.id]);

        // Optimistically update the entity list
        if (previousEntities) {
          queryClient.setQueryData<T[]>([queryKey], 
            previousEntities.map(entity => 
              entity.id === newEntity.id ? { ...entity, ...newEntity } : entity
            )
          );
        }

        // Optimistically update the individual entity
        if (previousEntity) {
          queryClient.setQueryData<T>(
            [queryKey, newEntity.id], 
            { ...previousEntity, ...newEntity }
          );
        }

        // Return context for potential rollback
        return { 
          previousEntities, 
          previousEntity,
          entityId: newEntity.id 
        };
      },
      onError: (_, __, context) => {
        // Roll back to previous values if available
        if (context?.previousEntities) {
          queryClient.setQueryData([queryKey], context.previousEntities);
        }
        
        if (context?.entityId && context?.previousEntity) {
          queryClient.setQueryData(
            [queryKey, context.entityId], 
            context.previousEntity
          );
        }
      },
      onSettled: (updatedEntity) => {
        // Refetch to ensure server state
        queryClient.invalidateQueries({ queryKey: [queryKey] as QueryKey });
        
        if (updatedEntity?.id) {
          queryClient.invalidateQueries({ 
            queryKey: [queryKey, updatedEntity.id] as QueryKey
          });
        }
        // Invalidate activity logs to show new entries immediately
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
        // Invalidate credit balance to reflect any credit deductions
        // console.log('🔄 Invalidating credit balance queries after entity operation');
        // console.log('🔄 Current queries in cache:', queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance').map(q => q.queryKey));

        // Multiple invalidation strategies for reliability (temporarily disabled)
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'], exact: false });
        // queryClient.refetchQueries({ queryKey: ['creditBalance'], type: 'active' });

        // Also try to refetch credit balance specifically if we can identify the query (temporarily disabled)
        // const creditQueries = queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance');
        // creditQueries.forEach(query => {
        //   console.log('🔄 Force refetching specific credit query:', query.queryKey);
        //   queryClient.refetchQueries({ queryKey: query.queryKey, type: 'active' });
        // });

        // console.log('✅ Credit balance invalidation completed');
      },
    });
  };

  // Hook to delete an entity
  const useDeleteEntity = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
      mutationFn: service.delete,
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] as QueryKey });
        queryClient.removeQueries({ queryKey: [queryKey, id] as QueryKey });
        // Invalidate activity logs to show new entries immediately
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
        // Invalidate credit balance to reflect any credit deductions
        // console.log('🔄 Invalidating credit balance queries after entity operation');
        // console.log('🔄 Current queries in cache:', queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance').map(q => q.queryKey));

        // Multiple invalidation strategies for reliability (temporarily disabled)
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'], exact: false });
        // queryClient.refetchQueries({ queryKey: ['creditBalance'], type: 'active' });

        // Also try to refetch credit balance specifically if we can identify the query (temporarily disabled)
        // const creditQueries = queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance');
        // creditQueries.forEach(query => {
        //   console.log('🔄 Force refetching specific credit query:', query.queryKey);
        //   queryClient.refetchQueries({ queryKey: query.queryKey, type: 'active' });
        // });

        // console.log('✅ Credit balance invalidation completed');
      },
    });
  };

  // Hook to delete an entity with optimistic updates
  const useDeleteEntityOptimistic = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string, OptimisticDeleteContext<T>>({
      mutationFn: service.delete,
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: [queryKey] as QueryKey });

        // Snapshot the previous entities
        const previousEntities = queryClient.getQueryData<T[]>([queryKey]);

        // Optimistically remove from the list
        if (previousEntities) {
          queryClient.setQueryData<T[]>(
            [queryKey], 
            previousEntities.filter(entity => entity.id !== id)
          );
        }

        // Remove the individual entity query
        queryClient.removeQueries({ queryKey: [queryKey, id] as QueryKey });

        return { previousEntities };
      },
      onError: (_, __, context) => {
        // Restore the previous entities on error
        if (context?.previousEntities) {
          queryClient.setQueryData([queryKey], context.previousEntities);
        }
      },
      onSettled: () => {
        // Refetch to ensure server state
        queryClient.invalidateQueries({ queryKey: [queryKey] as QueryKey });
        // Invalidate activity logs to show new entries immediately
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] });
        // Invalidate credit balance to reflect any credit deductions
        // console.log('🔄 Invalidating credit balance queries after entity operation');
        // console.log('🔄 Current queries in cache:', queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance').map(q => q.queryKey));

        // Multiple invalidation strategies for reliability (temporarily disabled)
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'] });
        // queryClient.invalidateQueries({ queryKey: ['creditBalance'], exact: false });
        // queryClient.refetchQueries({ queryKey: ['creditBalance'], type: 'active' });

        // Also try to refetch credit balance specifically if we can identify the query (temporarily disabled)
        // const creditQueries = queryClient.getQueryCache().getAll().filter(q => q.queryKey[0] === 'creditBalance');
        // creditQueries.forEach(query => {
        //   console.log('🔄 Force refetching specific credit query:', query.queryKey);
        //   queryClient.refetchQueries({ queryKey: query.queryKey, type: 'active' });
        // });

        // console.log('✅ Credit balance invalidation completed');
      },
    });
  };

  // Return all hooks
  return {
    useEntities,
    useEntity,
    useCreateEntity,
    useUpdateEntity,
    useUpdateEntityOptimistic,
    useDeleteEntity,
    useDeleteEntityOptimistic,
    useSuspenseEntities,
    useSuspenseEntity,
  };
};