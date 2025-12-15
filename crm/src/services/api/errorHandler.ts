import axios from 'axios';

interface ApiErrorResponse {
  message: string;
  error?: string;
  errors?: string[]; // for validation errors
}

export const handleApiError = (error: unknown, _defaultMessage?: string): never => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const data = error.response.data;

      // Re-throw the server response structure as-is (if it's already formatted)
      if (typeof data === 'object' && data !== null && 'message' in data) {
        throw data as ApiErrorResponse;
      }

      // Fallback if server returns plain string or unexpected format
      throw {
        message: typeof data === 'string' ? data : _defaultMessage ?? 'An unexpected error occurred',
        error: 'UNKNOWN_ERROR',
      } as ApiErrorResponse;
    }

    // No response received
    throw {
      message: _defaultMessage ?? 'No response received from server',
      error: 'NO_RESPONSE',
    } as ApiErrorResponse;
  }

  if (error instanceof Error) {
    throw {
      message: error.message,
      error: 'UNCAUGHT_CLIENT_ERROR',
    } as ApiErrorResponse;
  }

  throw {
    message: _defaultMessage ?? 'An unknown error occurred',
    error: 'UNKNOWN_ERROR',
  } as ApiErrorResponse;
};
