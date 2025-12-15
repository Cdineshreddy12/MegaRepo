import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    // Check if it's an atob error (Base64 decoding error)
    if (error.message.includes('atob') || error.message.includes('InvalidCharacterError')) {
      console.warn('⚠️ Base64 decoding error detected, this is likely a JWT token parsing issue');
      console.warn('⚠️ The error will be handled gracefully by the authentication system');
      
      // Don't show error boundary for atob errors, let auth system handle it
      this.setState({ hasError: false });
      return;
    }
    
    // For other errors, update state to show fallback UI
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-red-900 mb-4">Something went wrong</h1>
              <p className="text-red-700 mb-4">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {this.state.error && (
                <details className="text-left max-w-md mx-auto">
                  <summary className="cursor-pointer text-red-600 font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
