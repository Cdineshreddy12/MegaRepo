import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoBoxProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Information box component for displaying helpful information
 */
export const InfoBox: React.FC<InfoBoxProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg',
      className
    )}>
      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-blue-800 leading-relaxed">
        {children}
      </p>
    </div>
  );
};
