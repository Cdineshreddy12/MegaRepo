import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';
import ZopkitLoader from '@/components/ui/ZopkitLoader';

interface PermissionLoadingStateProps {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  currentStep: string;
  progress: number;
  retryCount?: number;
  onRetry?: () => void;
  currentStepIndex?: number;
  totalSteps?: number;
}

export const PermissionLoadingState: React.FC<PermissionLoadingStateProps> = ({
  isLoading,
  error,
  isSuccess,
  currentStep,
  progress,
  retryCount = 0,
  onRetry,
  currentStepIndex = 0,
  totalSteps = 3
}) => {
  const getStepColor = (step: string) => {
    switch (step) {
      case 'authenticating':
        return 'bg-blue-100 text-blue-800';
      case 'fetching_permissions':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing_permissions':
        return 'bg-purple-100 text-purple-800';
      case 'complete':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepDescription = (step: string) => {
    switch (step) {
      case 'authenticating':
        return 'Verifying your authentication token and establishing secure connection...';
      case 'fetching_permissions':
        return 'Connecting to permission service and retrieving your access rights...';
      case 'processing_permissions':
        return 'Configuring your access levels and setting up your dashboard...';
      case 'complete':
        return 'All permissions have been configured successfully!';
      default:
        return 'Setting up your access and permissions...';
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <h3 className="font-semibold text-green-800">Authentication Complete!</h3>
              <p className="text-sm text-green-600">You're now logged into the CRM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Permission Fetch Failed</h3>
              <p className="text-sm text-red-600 mb-3">{error}</p>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500 mb-3">
                  Retry attempt: {retryCount}/3
                </p>
              )}
              {onRetry && retryCount < 3 && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show ZopkitLoader for loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-white">
        <div className="text-center space-y-6">
          <ZopkitLoader 
            message={`${currentStep.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}...`}
            showProgress={true}
            size="lg"
          />
          {/* Progress indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-sky-400 transition-all duration-500 ease-out"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Step details */}
          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
            {getStepDescription(currentStep)}
          </div>
        </div>
      </div>
    );
  }

  // Fallback card view (should not be reached in normal flow)
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-gray-800">Setting Up Your Access</h3>
            <p className="text-sm text-gray-600">Please wait while we configure your permissions</p>
          </div>
          
          <div className="flex items-center justify-center">
            <Badge variant="secondary" className={getStepColor(currentStep)}>
              {Math.round(progress)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionLoadingState;
