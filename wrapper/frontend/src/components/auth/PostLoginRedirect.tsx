import React from 'react';
import { usePostLoginRedirect } from '@/hooks/usePostLoginRedirect';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserCheck, Users } from 'lucide-react';

export const PostLoginRedirect: React.FC = () => {
  const { isRedirecting } = usePostLoginRedirect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center space-y-6 p-8">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <div className="absolute inset-0 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Setting up your experience...
            </h2>
            <p className="text-gray-600">
              {isRedirecting 
                ? "We're preparing your workspace" 
                : "Checking your account status"
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>Powered by Kinde Authentication</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 