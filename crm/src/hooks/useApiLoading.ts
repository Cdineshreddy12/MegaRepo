import { useState, useCallback } from 'react';
import { useLoading } from '@/contexts/LoadingContext';

interface UseApiLoadingReturn {
  isLoading: boolean;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(apiCall: () => Promise<T>, message?: string) => Promise<T>;
}

export const useApiLoading = (): UseApiLoadingReturn => {
  const [localLoading, setLocalLoading] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  const startLoading = useCallback((message: string = 'LOADING') => {
    setLocalLoading(true);
    showLoading(message);
  }, [showLoading]);

  const stopLoading = useCallback(() => {
    setLocalLoading(false);
    hideLoading();
  }, [hideLoading]);

  const withLoading = useCallback(async <T>(
    apiCall: () => Promise<T>,
    message: string = 'LOADING'
  ): Promise<T> => {
    try {
      startLoading(message);
      const result = await apiCall();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading: localLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
};

// Specialized hooks for common API operations
export const useCreateLoading = () => {
  const { withLoading } = useApiLoading();
  return useCallback(
    <T>(apiCall: () => Promise<T>) => withLoading(apiCall, 'CREATING...'),
    [withLoading]
  );
};

export const useUpdateLoading = () => {
  const { withLoading } = useApiLoading();
  return useCallback(
    <T>(apiCall: () => Promise<T>) => withLoading(apiCall, 'UPDATING...'),
    [withLoading]
  );
};

export const useDeleteLoading = () => {
  const { withLoading } = useApiLoading();
  return useCallback(
    <T>(apiCall: () => Promise<T>) => withLoading(apiCall, 'DELETING...'),
    [withLoading]
  );
};

export const useFetchLoading = () => {
  const { withLoading } = useApiLoading();
  return useCallback(
    <T>(apiCall: () => Promise<T>) => withLoading(apiCall, 'FETCHING...'),
    [withLoading]
  );
};

export const useExportLoading = () => {
  const { withLoading } = useApiLoading();
  return useCallback(
    <T>(apiCall: () => Promise<T>) => withLoading(apiCall, 'EXPORTING...'),
    [withLoading]
  );
};

export const useImportLoading = () => {
  const { withLoading } = useApiLoading();
  return useCallback(
    <T>(apiCall: () => Promise<T>) => withLoading(apiCall, 'IMPORTING...'),
    [withLoading]
  );
};
