/**
 * Navigation Buttons Component
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { StepConfig } from '../config/flowConfigs';

import { Rocket } from 'lucide-react';

interface NavigationButtonsProps {
  currentStep: number;
  stepsConfig: StepConfig[];
  canProceed: () => boolean;
  canSubmit: () => boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  className?: string;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentStep,
  stepsConfig = [],
  canProceed,
  canSubmit,
  onPrev,
  onNext,
  onSubmit,
  className = '',
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = stepsConfig.length > 0 && currentStep === stepsConfig.length;
  
  // FIXED: Call functions directly - they will be reactive due to useWatch in canProceed
  // The parent component will re-render when form values change, causing this to re-evaluate
  const canProceedNow = canProceed();
  const canSubmitNow = canSubmit();

  return (
    <div className={`flex justify-between items-center gap-4 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={isFirstStep}
        className="px-6 py-2.5 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <span>←</span> Previous
        </span>
      </Button>
      
      <div className="flex flex-col items-center">
        <div className="text-sm font-semibold text-slate-700">
          Step {currentStep} of {stepsConfig.length || 0}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 font-medium">
          {Math.round((currentStep / (stepsConfig.length || 1)) * 100)}% Complete
        </div>
      </div>
      
      {isLastStep ? (
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={!canSubmitNow}
          className="px-8 py-3 min-w-[180px] bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-lg shadow-lg shadow-pink-500/30 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 transition-all duration-300"
        >
          <span className="flex items-center gap-2">
            <span>Launch Workspace</span>
            <Rocket className="w-5 h-5" />
          </span>
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceedNow}
          className="px-8 py-3 min-w-[140px] bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
        >
          <span className="flex items-center gap-2">
            <span>Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </Button>
      )}
    </div>
  );
};

