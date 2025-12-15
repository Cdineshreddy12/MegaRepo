import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Types
interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain: string;
  adminEmail: string;
  isActive: boolean;
  isVerified: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
  entityCount: number;
  totalCredits: number;
  reservedCredits: number;
  lastActivity: string | null;
}

interface TenantListResponse {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TenantFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Tenant list hook
export const useTenantList = (filters: TenantFilters = {}) => {
  const { search, status, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: ['admin', 'tenants', 'list', { search, status, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/tenants/comprehensive?${params}`);
      if (response.data.success) {
        return response.data.data as TenantListResponse;
      }
      throw new Error('Failed to fetch tenant list');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

// Tenant details hook
export const useTenantDetails = (tenantId: string) => {
  return useQuery({
    queryKey: ['admin', 'tenants', 'details', tenantId],
    queryFn: async () => {
      const response = await api.get(`/admin/tenants/${tenantId}/details`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch tenant details');
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Update tenant status mutation
export const useUpdateTenantStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      isActive,
      reason
    }: {
      tenantId: string;
      isActive: boolean;
      reason?: string;
    }) => {
      const response = await api.patch(`/admin/tenants/${tenantId}/status`, {
        isActive,
        reason
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to update tenant status');
    },
    onSuccess: (data, variables) => {
      toast.success(`Tenant ${variables.isActive ? 'activated' : 'deactivated'} successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'tenants']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onError: (error) => {
      toast.error('Failed to update tenant status');
      console.error('Update tenant status error:', error);
    },
  });
};

// Bulk update tenant status mutation
export const useBulkUpdateTenantStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantIds,
      isActive,
      reason
    }: {
      tenantIds: string[];
      isActive: boolean;
      reason?: string;
    }) => {
      const response = await api.post('/admin/tenants/bulk/status', {
        tenantIds,
        isActive,
        reason
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to bulk update tenant status');
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.tenantIds.length} tenants ${variables.isActive ? 'activated' : 'deactivated'} successfully`);

      // Invalidate related queries
      queryClient.invalidateQueries(['admin', 'tenants']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onError: (error) => {
      toast.error('Failed to bulk update tenant status');
      console.error('Bulk update tenant status error:', error);
    },
  });
};

// Available organizations within current tenant for tenant admin switcher
export const useAvailableOrganizations = () => {
  console.log('🔄 useAvailableOrganizations hook called - NEW VERSION');

  return useQuery({
    queryKey: ['organizations', 'available', 'v2'],
    queryFn: async () => {
      console.log('🚀 Executing organizations query function');
      try {
        // First get the entity scope to understand user's access level
        console.log('🔍 Fetching entity scope...');
        const scopeResponse = await api.get('/admin/entity-scope');
        console.log('🔐 Entity scope response:', scopeResponse.data);

        if (!scopeResponse.data.success || !scopeResponse.data.scope) {
          console.log('❌ Could not get entity scope');
          return [];
        }

        const { scope, entities, entityIds, isUnrestricted } = scopeResponse.data.scope;
        console.log('✅ Entity scope:', { scope, entities, entityIds, isUnrestricted });

        // Use entities directly from scope response (no additional API calls needed!)
        if (isUnrestricted) {
          console.log('🔓 Tenant admin detected - using entities from scope...');

          if (entities && entities.length > 0) {
            console.log('✅ Found entities in scope:', entities);

            // Filter only organizations and format for frontend
            const organizations = entities
              .filter(entity => entity.entityType === 'organization')
              .map((entity, index) => ({
                id: entity.entityId,
                name: entity.entityName || `Organization ${index + 1}`,
                subdomain: entity.entityCode || entity.entityName?.toLowerCase().replace(/\s+/g, '-') || `org-${index + 1}`,
                status: 'active',
                plan: 'Organization'
              }));

            console.log('✅ Returning organizations from scope:', organizations);
            return organizations;
          }

          // Fallback: return empty array to prevent security issues
          console.log('⚠️ No organizations found in scope, returning empty array');
          return [];
        } else {
          // For restricted users, only show organizations they have access to
          console.log('🔒 Restricted user - using entities from scope...');
          if (entities && entities.length > 0) {
            // Filter only organizations and format for frontend
            const organizations = entities
              .filter(entity => entity.entityType === 'organization')
              .map((entity, index) => ({
                id: entity.entityId,
                name: entity.entityName || `Assigned Organization ${index + 1}`,
                subdomain: entity.entityCode || entity.entityName?.toLowerCase().replace(/\s+/g, '-') || `assigned-org-${index + 1}`,
                status: 'active',
                plan: 'Organization'
              }));

            console.log('✅ Found organizations for restricted user:', organizations);
            return organizations;
          }
        }

        console.log('⚠️ No organizations found');
        return [];

      } catch (error) {
        console.error('❌ Error fetching available organizations:', error);
        console.error('❌ Error details:', error.message, error.stack);
        // Return empty array on error to prevent UI issues
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - organization structure changes less frequently
    enabled: true, // Always fetch for admin users
  });
};

// Export tenant data mutation
export const useExportTenantData = () => {
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.get(`/admin/tenants/${tenantId}/export`, {
        responseType: 'blob'
      });
      return { data: response.data, tenantId };
    },
    onSuccess: ({ data, tenantId }) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tenant-${tenantId}-export.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Tenant data exported successfully');
    },
    onError: (error) => {
      toast.error('Failed to export tenant data');
      console.error('Export tenant data error:', error);
    },
  });
};
