import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';

const AccessDenied: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 mb-4">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex items-center justify-center text-sm text-gray-500">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Insufficient permissions
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
