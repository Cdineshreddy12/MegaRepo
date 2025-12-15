import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  allowRetry?: boolean;
  allowReset?: boolean;
  onRetry?: () => void;
  onReset?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * Enhanced error boundary with detailed error reporting and recovery options
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
  private errorReportingService: any;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Enhanced Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, this would send error data to a monitoring service
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    // Simulate error reporting
    console.log('Error reported:', errorReport);
    
    // In production, this would be:
    // this.errorReportingService?.captureException(error, {
    //   tags: { errorId: this.state.errorId },
    //   extra: errorReport
    // });
  };

  private handleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    // Determine error severity based on error type and message
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'medium';
    }
    if (error.name === 'TypeError' && error.message.includes('Cannot read property')) {
      return 'high';
    }
    if (error.name === 'ReferenceError') {
      return 'high';
    }
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'medium';
    }
    return 'high';
  };

  private getErrorCategory = (error: Error): string => {
    if (error.name === 'ChunkLoadError') return 'Bundle Loading';
    if (error.name === 'TypeError') return 'Type Error';
    if (error.name === 'ReferenceError') return 'Reference Error';
    if (error.name === 'SyntaxError') return 'Syntax Error';
    if (error.message.includes('Network')) return 'Network Error';
    if (error.message.includes('Validation')) return 'Validation Error';
    return 'Unknown Error';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId, retryCount } = this.state;
      const severity = error ? this.getErrorSeverity(error) : 'high';
      const category = error ? this.getErrorCategory(error) : 'Unknown';

      const severityColors = {
        low: 'bg-green-100 text-green-800 border-green-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        high: 'bg-orange-100 text-orange-800 border-orange-200',
        critical: 'bg-red-100 text-red-800 border-red-200'
      };

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-800 mb-2">
                Oops! Something went wrong
              </CardTitle>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge className={severityColors[severity]}>
                  {severity.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {category}
                </Badge>
                <Badge variant="outline">
                  Retry #{retryCount}
                </Badge>
              </div>
              <p className="text-gray-600">
                We encountered an unexpected error while rendering the form. 
                This might be due to a configuration issue or a temporary problem.
              </p>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Error Details</TabsTrigger>
                  <TabsTrigger value="recovery">Recovery Options</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">What happened?</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      The form encountered an error while trying to render. This could be due to:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Invalid form configuration</li>
                      <li>Missing or corrupted field components</li>
                      <li>Network connectivity issues</li>
                      <li>Browser compatibility problems</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Error ID</h3>
                    <code className="text-sm bg-white px-2 py-1 rounded border">
                      {errorId}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      Please include this ID when reporting the issue.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-4">
                  {error && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Error Message</h3>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <code className="text-sm text-red-800">
                            {error.message}
                          </code>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Error Stack</h3>
                        <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                          <pre>{error.stack}</pre>
                        </div>
                      </div>
                      
                      {errorInfo && (
                        <div>
                          <h3 className="font-semibold mb-2">Component Stack</h3>
                          <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                            <pre>{errorInfo.componentStack}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="recovery" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold">Quick Actions</h3>
                      
                      <Button
                        onClick={this.handleRetry}
                        className="w-full"
                        disabled={retryCount >= 3}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                        {retryCount >= 3 && ' (Max retries reached)'}
                      </Button>
                      
                      <Button
                        onClick={this.handleReset}
                        variant="outline"
                        className="w-full"
                      >
                        <Bug className="w-4 h-4 mr-2" />
                        Reset Form
                      </Button>
                      
                      <Button
                        onClick={this.handleGoHome}
                        variant="outline"
                        className="w-full"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Go to Home
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="font-semibold">Advanced Options</h3>
                      
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="w-full"
                      >
                        Reload Page
                      </Button>
                      
                      <Button
                        onClick={() => {
                          localStorage.clear();
                          sessionStorage.clear();
                          window.location.reload();
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Clear Storage & Reload
                      </Button>
                      
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(`
Error ID: ${errorId}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
                          `);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Copy Error Details
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      Still having issues?
                    </h4>
                    <p className="text-sm text-yellow-700">
                      If the problem persists, please contact support with the Error ID above.
                      We'll investigate and fix the issue as soon as possible.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for error boundary functionality
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError
  };
};

/**
 * Error reporting service interface
 */
export interface ErrorReportingService {
  captureException(error: Error, context?: any): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  setUser(user: { id: string; email?: string }): void;
  setTag(key: string, value: string): void;
}

/**
 * Default error reporting service (no-op)
 */
export const defaultErrorReportingService: ErrorReportingService = {
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  setTag: () => {}
};

