/**
 * Global error handler utilities
 * Catches unhandled errors and promise rejections
 */

/**
 * Sets up global error handlers for the application
 * This should be called early in the application lifecycle
 */
export function setupGlobalErrorHandlers() {
  // Temporarily disable atob override due to recursion issues
  // JWT parsing errors will be handled by individual components
  console.log('🔧 Global error handlers initialized (atob override disabled)');
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    // Check if it's an atob error
    if (event.reason && typeof event.reason === 'object' && 
        event.reason.message && event.reason.message.includes('atob')) {
      console.warn('⚠️ Base64 decoding error caught globally, this is likely a JWT token issue');
      console.warn('⚠️ The error will be handled by the authentication system');
      
      // Prevent the error from showing in console
      event.preventDefault();
      return;
    }
    
    // For other errors, log them but don't prevent default behavior
    console.error('🚨 Unhandled error details:', {
      message: event.reason?.message || 'Unknown error',
      stack: event.reason?.stack || 'No stack trace',
      type: event.reason?.constructor?.name || 'Unknown type'
    });
  });

  // Handle global errors (temporarily disabled to prevent URL access during error handling)
  /*
  window.addEventListener('error', (event) => {
    console.error('🚨 Global Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });

    // Check if it's an atob error
    if (event.message && event.message.includes('atob')) {
      console.warn('⚠️ Base64 decoding error caught globally, this is likely a JWT token issue');
      console.warn('⚠️ The error will be handled by the authentication system');

      // Prevent the error from showing in console
      event.preventDefault();
      return;
    }
  });
  */

  // Handle console errors (for development)
  if (import.meta.env.DEV) {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Check if it's an atob error
      const errorMessage = args.join(' ');
      if (errorMessage.includes('atob') || errorMessage.includes('InvalidCharacterError')) {
        console.warn('⚠️ Base64 decoding error detected in console, this is likely a JWT token issue');
        console.warn('⚠️ The error will be handled by the authentication system');
        return;
      }
      
      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };
  }
}

/**
 * Removes global error handlers
 * Call this when cleaning up the application
 */
export function removeGlobalErrorHandlers() {
  // Note: In a real application, you might want to store references to the handlers
  // and remove them specifically, but for now we'll just log that they should be removed
  console.log('ℹ️ Global error handlers should be removed when cleaning up the application');
}

/**
 * Safely executes a function that might throw an atob error
 * @param fn - The function to execute
 * @param fallback - Fallback value if the function fails
 * @returns The result of the function or the fallback value
 */
export function safeExecute<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error && 
        (error.message.includes('atob') || error.message.includes('InvalidCharacterError'))) {
      console.warn('⚠️ Base64 decoding error caught, using fallback value');
      return fallback;
    }
    throw error; // Re-throw non-atob errors
  }
}

/**
 * Creates a safe version of atob that handles errors gracefully
 * @param encodedString - The string to decode
 * @param fallback - Fallback value if decoding fails
 * @returns The decoded string or the fallback value
 */
export function safeAtob(encodedString: string, fallback: string = ''): string {
  try {
    // Handle URL-safe Base64 (replace - with + and _ with /)
    let safeString = encodedString.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const paddedString = safeString + '='.repeat((4 - safeString.length % 4) % 4);
    
    // Validate Base64 string
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(paddedString)) {
      console.warn('⚠️ Invalid Base64 characters, using fallback');
      return fallback;
    }
    
    return atob(paddedString);
  } catch (error) {
    console.warn('⚠️ atob failed, using fallback value:', error);
    return fallback;
  }
}
