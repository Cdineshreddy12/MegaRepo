import React, { useCallback, useMemo, useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { useStepNavigation } from '../hooks';
import { OnboardingLayoutOptimized } from './OnboardingLayoutOptimized';
import { UserClassification } from './FlowSelector';
import { useToast } from './Toast';
import { formatValidationErrors } from '../utils/validationHelpers';

interface MultiStepFormProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  stepsConfig: StepConfig[];
  onSubmit: (data: newBusinessData | existingBusinessData) => void;
  onEditStep?: (stepNumber: number) => void;
  onStepClick?: (stepNumber: number) => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  className?: string;
  userClassification?: UserClassification;
}

export const MultiStepFormOptimized: React.FC<MultiStepFormProps> = ({
  form,
  stepsConfig,
  onSubmit,
  onEditStep,
  onStepClick,
  currentStep: externalCurrentStep,
  onStepChange,
  className,
  userClassification
}) => {
  const {
    currentStep: internalCurrentStep,
    nextStep,
    prevStep,
    canProceed,
    canSubmit,
    getStepStatus,
    goToStep
  } = useStepNavigation(form, stepsConfig, userClassification, externalCurrentStep); // FIXED: Pass external step as initial

  const { addToast } = useToast();
  // FIXED: Use external step if provided, otherwise use internal
  const currentStep = externalCurrentStep ?? internalCurrentStep;
  
  // FIXED: Sync internal step when external step changes
  useEffect(() => {
    if (externalCurrentStep && externalCurrentStep !== internalCurrentStep) {
      goToStep(externalCurrentStep);
    }
  }, [externalCurrentStep, internalCurrentStep, goToStep]);

  const handleEditStep = useCallback((stepNumber: number) => {
    goToStep(stepNumber);
    onStepChange?.(stepNumber);
    onEditStep?.(stepNumber);
  }, [goToStep, onStepChange, onEditStep]);

  const handleStepClick = useCallback((stepNumber: number) => {
    goToStep(stepNumber);
    onStepChange?.(stepNumber);
    onStepClick?.(stepNumber);
  }, [goToStep, onStepChange, onStepClick]);

  // ENHANCED: Improved validation error handling with better user feedback
  const handleValidationError = useCallback((errors: any, stepNumber: number) => {
    const { message, fields } = formatValidationErrors(errors);

    if (fields.length > 0) {
      const firstField = fields[0];

      // Enhanced error message with field-specific guidance
      const enhancedMessage = fields.length === 1
        ? `${firstField.displayName} is required or invalid`
        : `Please fix ${fields.length} validation errors to continue`;

      addToast(enhancedMessage, {
        type: 'error',
        duration: 8000,
        action: {
          label: `Go to ${firstField.displayName}`,
          onClick: () => {
            goToStep(firstField.stepNumber);
            onStepChange?.(firstField.stepNumber);
          },
        },
      });

      // Auto-navigate after delay with visual feedback
      setTimeout(() => {
        goToStep(firstField.stepNumber);
        onStepChange?.(firstField.stepNumber);

        // Additional toast for navigation feedback
        addToast(`Navigated to ${firstField.displayName}`, {
          type: 'info',
          duration: 2000,
        });
      }, 1000);
    } else {
      // Fallback for general errors
      addToast('Please review and fix the form errors', {
        type: 'error',
        duration: 6000,
      });
    }
  }, [goToStep, onStepChange, addToast]);

  const handleNext = useCallback(async () => {
    // FIXED: Only change step if validation passes
    const success = await nextStep(handleValidationError);
    if (success) {
      onStepChange?.(currentStep + 1);
    }
    // If validation fails, nextStep already shows errors via handleValidationError
  }, [nextStep, handleValidationError, onStepChange, currentStep]);

  const handlePrev = useCallback(() => {
    prevStep();
    onStepChange?.(currentStep - 1);
  }, [prevStep, onStepChange, currentStep]);

  const handleSubmit = useCallback((data: newBusinessData | existingBusinessData) => {
    onSubmit(data);
  }, [onSubmit]);

  const formSubmitHandler = useMemo(() => {
    return form.handleSubmit(handleSubmit);
  }, [form, handleSubmit]);

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <OnboardingLayoutOptimized
            form={form}
            stepsConfig={stepsConfig}
            currentStep={currentStep}
            canProceed={canProceed}
            canSubmit={canSubmit}
            getStepStatus={getStepStatus}
            onPrev={handlePrev}
            onNext={handleNext}
            onSubmit={formSubmitHandler}
            onEditStep={handleEditStep}
            onStepClick={handleStepClick}
            userClassification={userClassification}
          />
        </form>
      </Form>
    </div>
  );
};