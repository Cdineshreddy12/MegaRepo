/**
 * Navigation Buttons Component
 */

import React from 'react';
import { Button } from '@/components/ui/button';

interface NavigationButtonsProps {
  currentStep: number;
  stepsConfig: Array<{ number: number }>;
  canProceed: () => boolean;
  canSubmit: () => boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  className?: string;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentStep,
  stepsConfig,
  canProceed,
  canSubmit,
  onPrev,
  onNext,
  onSubmit,
  className = '',
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === stepsConfig.length;

  return (
    <div className={`flex justify-between mt-6 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={isFirstStep}
      >
        Previous
      </Button>
      
      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit()}
        >
          Submit
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed()}
        >
          Next
        </Button>
      )}
    </div>
  );
};

