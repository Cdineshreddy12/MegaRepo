
// queries/DocumentQueries.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/api/documentService';

/**
 * Hook to fetch documents for a specific entity
 */
export const useDocumentsByEntity = (entityType, entityId, options = {}) => {
  // Safety check: if parameters are invalid, return a safe default
  if (!entityId || !entityType || entityId === '' || entityType === '' || 
      entityId === 'undefined' || entityType === 'undefined' || 
      entityId === 'null' || entityType === 'null') {
    return {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve([]),
    };
  }

  return useQuery(
    ['documents', entityType, entityId],
    () => documentService.getDocumentsByEntity(entityType, entityId),
    {
      enabled: !!entityId && !!entityType,
      ...options,
    }
  );
};

/**
 * Hook to delete a document
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (documentId) => documentService.deleteDocument(documentId),
    {
      onSuccess: (_, documentId, context) => {
        // If we have the entity info in context, invalidate that specific query
        if (context?.entityType && context?.entityId) {
          queryClient.invalidateQueries(['documents', context.entityType, context.entityId]);
        } else {
          // Otherwise invalidate all document queries
          queryClient.invalidateQueries(['documents']);
        }
      },
    }
  );
};