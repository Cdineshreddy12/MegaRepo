/**
 * Flow Header Component
 */

import React from 'react';

interface FlowHeaderProps {
  title?: string;
  description?: string;
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-6">
      {title && <h2 className="text-2xl font-bold mb-2">{title}</h2>}
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  );
};

