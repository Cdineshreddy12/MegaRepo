import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Types
interface Entity {
  entityId: string;
  tenantId: string;
  entityType: string;
  entityName: string;
  entityCode: string;
  parentEntityId: string | null;
  entityLevel: number;
  isActive: boolean;
  createdAt: string;
  companyName: string;
  availableCredits: number;
  reservedCredits: number;
  responsiblePerson: string | null;
}

interface EntityListResponse {
  entities: Entity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface EntityFilters {
  tenantId?: string;
  entityType?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// Entity list hook
export const useEntityList = (filters: EntityFilters = {}) => {
  const { tenantId, entityType, search, isActive, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: ['admin', 'entities', 'list', { tenantId, entityType, search, isActive, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);
      if (entityType) params.append('entityType', entityType);
      if (search) params.append('search', search);
      if (isActive !== undefined) params.append('isActive', isActive.toString());
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/entities/all?${params}`);
      if (response.data.success) {
        return response.data.data as EntityListResponse;
      }
      throw new Error('Failed to fetch entity list');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

// Entity details hook
export const useEntityDetails = (entityId: string) => {
  return useQuery({
    queryKey: ['admin', 'entities', 'details', entityId],
    queryFn: async () => {
      const response = await api.get(`/admin/entities/${entityId}/details`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch entity details');
    },
    enabled: !!entityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Entity hierarchy hook
export const useEntityHierarchy = (tenantId: string) => {
  return useQuery({
    queryKey: ['admin', 'entities', 'hierarchy', tenantId],
    queryFn: async () => {
      const response = await api.get(`/admin/entities/hierarchy/${tenantId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch entity hierarchy');
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Update entity status mutation
export const useUpdateEntityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      isActive,
      reason
    }: {
      entityId: string;
      isActive: boolean;
      reason?: string;
    }) => {
      const response = await api.patch(`/admin/entities/${entityId}/status`, {
        isActive,
        reason
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to update entity status');
    },
    onSuccess: (data, variables) => {
      toast.success(`Entity ${variables.isActive ? 'activated' : 'deactivated'} successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'entities']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onError: (error) => {
      toast.error('Failed to update entity status');
      console.error('Update entity status error:', error);
    },
  });
};

// Bulk update entity status mutation
export const useBulkUpdateEntityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityIds,
      isActive,
      reason
    }: {
      entityIds: string[];
      isActive: boolean;
      reason?: string;
    }) => {
      const response = await api.post('/admin/entities/bulk/status', {
        entityIds,
        isActive,
        reason
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to bulk update entity status');
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.entityIds.length} entities ${variables.isActive ? 'activated' : 'deactivated'} successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'entities']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onError: (error) => {
      toast.error('Failed to bulk update entity status');
      console.error('Bulk update entity status error:', error);
    },
  });
};

// Entity search hook
export const useEntitySearch = (query: string, filters: { entityType?: string; tenantId?: string; limit?: number } = {}) => {
  const { entityType, tenantId, limit = 20 } = filters;

  return useQuery({
    queryKey: ['admin', 'entities', 'search', query, filters],
    queryFn: async () => {
      if (!query.trim()) return { query: '', results: [], total: 0 };

      const params = new URLSearchParams();
      params.append('q', query);
      if (entityType) params.append('entityType', entityType);
      if (tenantId) params.append('tenantId', tenantId);
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/entities/search?${params}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to search entities');
    },
    enabled: !!query.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Entity statistics hook
export const useEntityStats = () => {
  return useQuery({
    queryKey: ['admin', 'entities', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/entities/stats/overview');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch entity statistics');
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};
