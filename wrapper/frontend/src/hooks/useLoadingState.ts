import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: Error | string | null;
  isEmpty: boolean;
  retryCount: number;
}

export interface UseLoadingStateOptions {
  initialLoading?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: () => void;
  onError?: (error: Error | string) => void;
  onSuccess?: () => void;
}

export interface UseLoadingStateReturn {
  // State
  isLoading: boolean;
  error: Error | string | null;
  isEmpty: boolean;
  retryCount: number;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: Error | string | null) => void;
  setEmpty: (empty: boolean) => void;
  setSuccess: () => void;
  retry: () => void;
  reset: () => void;
  
  // Computed
  hasError: boolean;
  canRetry: boolean;
  isRetrying: boolean;
}

/**
 * Custom hook for managing loading states with retry logic
 */
export function useLoadingState(options: UseLoadingStateOptions = {}): UseLoadingStateReturn {
  const {
    initialLoading = false,
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    isEmpty: false,
    retryCount: 0
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isRetryingRef = useRef(false);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: Error | string | null) => {
    setState(prev => ({ 
      ...prev, 
      error, 
      isLoading: false,
      isEmpty: false 
    }));
    
    if (error && onError) {
      onError(error);
    }
  }, [onError]);

  const setEmpty = useCallback((empty: boolean) => {
    setState(prev => ({ 
      ...prev, 
      isEmpty: empty,
      isLoading: false,
      error: null 
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isLoading: false,
      error: null,
      isEmpty: false,
      retryCount: 0 
    }));
    
    if (onSuccess) {
      onSuccess();
    }
  }, [onSuccess]);

  const retry = useCallback(() => {
    if (isRetryingRef.current || state.retryCount >= maxRetries) {
      return;
    }

    isRetryingRef.current = true;
    setState(prev => ({ 
      ...prev, 
      isLoading: true,
      error: null,
      retryCount: prev.retryCount + 1 
    }));

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Set retry timeout
    retryTimeoutRef.current = setTimeout(() => {
      isRetryingRef.current = false;
      if (onRetry) {
        onRetry();
      }
    }, retryDelay);
  }, [state.retryCount, maxRetries, retryDelay, onRetry]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isEmpty: false,
      retryCount: 0
    });
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    isRetryingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    isEmpty: state.isEmpty,
    retryCount: state.retryCount,
    
    // Actions
    setLoading,
    setError,
    setEmpty,
    setSuccess,
    retry,
    reset,
    
    // Computed
    hasError: !!state.error,
    canRetry: state.retryCount < maxRetries,
    isRetrying: isRetryingRef.current
  };
}

/**
 * Hook for managing async operations with loading states
 */
export function useAsyncOperation<T = any>(
  asyncFn: () => Promise<T>,
  options: UseLoadingStateOptions = {}
) {
  const loadingState = useLoadingState(options);

  const execute = useCallback(async () => {
    try {
      loadingState.setLoading(true);
      loadingState.setError(null);
      
      const result = await asyncFn();
      
      loadingState.setSuccess();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : String(error);
      loadingState.setError(errorMessage);
      throw error;
    }
  }, [asyncFn, loadingState]);

  return {
    ...loadingState,
    execute
  };
}

/**
 * Hook for managing multiple loading states
 */
export function useMultipleLoadingStates(states: string[]) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    states.reduce((acc, state) => ({ ...acc, [state]: false }), {})
  );

  const setLoading = useCallback((state: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [state]: loading }));
  }, []);

  const setAllLoading = useCallback((loading: boolean) => {
    setLoadingStates(
      states.reduce((acc, state) => ({ ...acc, [state]: loading }), {})
    );
  }, [states]);

  const isLoading = Object.values(loadingStates).some(Boolean);
  const loadingCount = Object.values(loadingStates).filter(Boolean).length;

  return {
    loadingStates,
    setLoading,
    setAllLoading,
    isLoading,
    loadingCount
  };
}
