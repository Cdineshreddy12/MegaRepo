/**
 * Success Message Component
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';

interface SuccessMessageProps {
  message?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message = 'Form submitted successfully!',
}) => {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
      <CheckCircle className="w-6 h-6 text-green-600" />
      <p className="text-green-800 font-medium">{message}</p>
    </div>
  );
};

