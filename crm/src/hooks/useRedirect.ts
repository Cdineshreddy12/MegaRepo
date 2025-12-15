import { useNavigate, NavigateOptions } from "react-router-dom";
import { useCallback } from "react";

/**
 * Interface for query parameters
 */
interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Hook for handling navigation with enhanced functionality
 *
 * @returns An object with methods for different navigation scenarios
 */
function useRedirect() {
  const navigate = useNavigate();

  /**
   * Convert query parameters object to URL query string
   */
  const buildQueryString = useCallback((params?: QueryParams): string => {
    if (!params) return "";

    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join("&");

    return queryString ? `?${queryString}` : "";
  }, []);

  /**
   * Navigate to a specific path
   */
  const to = useCallback(
    (path: string, options?: NavigateOptions) => {
      navigate(path, options);
    },
    [navigate]
  );

  /**
   * Navigate to a path with query parameters
   */
  const toWithQuery = useCallback(
    (path: string, queryParams?: QueryParams, options?: NavigateOptions) => {
      const queryString = buildQueryString(queryParams);
      navigate(`${path}${queryString}`, options);
    },
    [navigate, buildQueryString]
  );

  /**
   * Navigate to a path with state
   */
  const toWithState = useCallback(
    <T extends object>(
      path: string,
      state: T,
      options?: Omit<NavigateOptions, "state">
    ) => {
      navigate(path, { ...options, state });
    },
    [navigate]
  );

  /**
   * Navigate to a path with both query parameters and state
   */
  const toWithQueryAndState = useCallback(
    <T extends object>(
      path: string,
      queryParams?: QueryParams,
      state?: T,
      options?: Omit<NavigateOptions, "state">
    ) => {
      const queryString = buildQueryString(queryParams);
      navigate(`${path}${queryString}`, { ...options, state });
    },
    [navigate, buildQueryString]
  );

  /**
   * Go back to the previous route
   */
  const back = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /**
   * Go forward to the next route (if available)
   */
  const forward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  /**
   * Navigate to a specific number of entries in the history stack
   */
  const go = useCallback(
    (delta: number) => {
      navigate(delta);
    },
    [navigate]
  );

  /**
   * Replace the current URL instead of pushing a new one
   */
  const replace = useCallback(
    (path: string, queryParams?: QueryParams, state?: object) => {
      const queryString = buildQueryString(queryParams);
      navigate(`${path}${queryString}`, { replace: true, state });
    },
    [navigate, buildQueryString]
  );

  return {
    to,
    toWithQuery,
    toWithState,
    toWithQueryAndState,
    back,
    forward,
    go,
    replace,
  };
}

export default useRedirect;
