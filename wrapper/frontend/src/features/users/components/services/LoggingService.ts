/**
 * Logging Service for User Management
 * 
 * Provides structured logging with different levels and contexts
 */
export class LoggingService {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Log user management actions with context
   */
  static logUserAction(action: string, userId: string, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      context: 'user-management'
    };
    
    if (this.isDevelopment) {
      console.log(`🔧 User Action: ${action}`, logData);
    }
    
    // In production, you might want to send this to a logging service
    // this.sendToLoggingService(logData);
  }
  
  /**
   * Log errors with context
   */
  static logError(error: Error, context: string, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      details
    };
    
    console.error(`❌ Error in ${context}:`, logData);
    
    // In production, you might want to send this to an error tracking service
    // this.sendToErrorTrackingService(logData);
  }
  
  /**
   * Log performance metrics
   */
  static logPerformance(operation: string, duration: number, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      details,
      context: 'performance'
    };
    
    if (this.isDevelopment) {
      console.log(`⏱️ Performance: ${operation} took ${duration}ms`, logData);
    }
  }
  
  /**
   * Log API calls
   */
  static logApiCall(method: string, endpoint: string, status: number, duration?: number): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      status,
      duration,
      context: 'api'
    };
    
    if (this.isDevelopment) {
      console.log(`🌐 API Call: ${method} ${endpoint} - ${status}`, logData);
    }
  }
  
  /**
   * Log user interface interactions
   */
  static logUIInteraction(component: string, action: string, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      component,
      action,
      details,
      context: 'ui'
    };
    
    if (this.isDevelopment) {
      console.log(`🖱️ UI Interaction: ${component} - ${action}`, logData);
    }
  }
}
