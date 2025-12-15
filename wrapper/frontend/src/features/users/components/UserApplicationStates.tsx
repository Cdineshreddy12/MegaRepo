import { RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading user classification...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <RefreshCw className="h-8 w-8 animate-spin" />
      <span className="ml-2">{message}</span>
    </div>
  );
}

interface ErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function ErrorState({ 
  error, 
  onRetry, 
  title = 'Failed to load data',
  description = 'There was an error loading the user application data.'
}: ErrorStateProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Application Access</h1>
          <p className="text-gray-600 mt-1">
            Manage user access to applications and synchronize users across systems
          </p>
        </div>
      </div>

      {/* Error Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {error.message}
                </p>
              </div>
            )}
            
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ 
  title = 'No data available',
  description = 'No user application data was found.',
  action
}: EmptyStateProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Application Access</h1>
          <p className="text-gray-600 mt-1">
            Manage user access to applications and synchronize users across systems
          </p>
        </div>
      </div>

      {/* Empty State Card */}
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          {action}
        </CardContent>
      </Card>
    </div>
  );
}
