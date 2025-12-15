/**
 * Step Indicator Component
 */

import React from 'react';

interface StepIndicatorProps {
  steps: Array<{ number: number; title: string }>;
  currentStep: number;
  getStepStatus: (stepNumber: number) => 'completed' | 'active' | 'error' | 'upcoming';
  onStepClick?: (stepNumber: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  stepsConfig,
  currentStep,
  getStepStatus,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-8 ${className}`}>
      {stepsConfig.map((step, index) => {
        const status = getStepStatus(step.number);
        const isClickable = onStepClick && (status === 'completed' || status === 'active');
        
        return (
          <React.Fragment key={step.number}>
            <div
              className={`flex flex-col items-center ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => isClickable && onStepClick?.(step.number)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  status === 'completed'
                    ? 'bg-green-500 text-white'
                    : status === 'active'
                    ? 'bg-blue-500 text-white'
                    : status === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {status === 'completed' ? '✓' : step.number}
              </div>
              <span className="mt-2 text-sm text-center max-w-[100px]">{step.title}</span>
            </div>
            {index < stepsConfig.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

