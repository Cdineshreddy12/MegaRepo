import React from 'react';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { useStepNavigation } from '../hooks';
import { OnboardingLayout } from './OnboardingLayout';
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

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
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
  } = useStepNavigation(form, stepsConfig);
  
  const { addToast } = useToast();
  const currentStep = externalCurrentStep ?? internalCurrentStep;

  const handleEditStep = (stepNumber: number) => {
    goToStep(stepNumber);
    onStepChange?.(stepNumber);
    onEditStep?.(stepNumber);
  };

  const handleStepClick = (stepNumber: number) => {
    goToStep(stepNumber);
    onStepChange?.(stepNumber);
    onStepClick?.(stepNumber);
  };

  const handleValidationError = (errors: any, stepNumber: number) => {
    const { message, fields } = formatValidationErrors(errors);
    
    // Show toast with clickable action to navigate to first error field
    if (fields.length > 0) {
      const firstField = fields[0];
      
      const navigateToField = () => {
        // Navigate to the step with the error
        goToStep(firstField.stepNumber);
        onStepChange?.(firstField.stepNumber);
        
        // Scroll to the field after a brief delay
        setTimeout(() => {
          // Try multiple selectors to find the field
          const selectors = [
            `[name="${firstField.fieldPath}"]`,
            `[name="${firstField.fieldPath.replace('businessDetails.', '')}"]`,
            `input[name*="${firstField.fieldPath.split('.').pop()}"]`,
          ];
          
          let fieldElement: HTMLElement | null = null;
          for (const selector of selectors) {
            fieldElement = document.querySelector(selector) as HTMLElement;
            if (fieldElement) break;
          }
          
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fieldElement.focus();
            // Highlight the field
            fieldElement.classList.add('ring-2', 'ring-red-500', 'border-red-500');
            setTimeout(() => {
              fieldElement?.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
            }, 3000);
          }
        }, 300);
      };
      
      addToast(message, {
        type: 'error',
        duration: 6000,
        action: {
          label: 'Go to Field',
          onClick: navigateToField,
        },
      });
      
      // Auto-navigate after a short delay
      setTimeout(navigateToField, 500);
    }
  };

  const handleNext = async () => {
    await nextStep(handleValidationError);
    onStepChange?.(currentStep + 1);
  };

  const handlePrev = () => {
    prevStep();
    onStepChange?.(currentStep - 1);
  };

  const handleSubmit = (data: newBusinessData | existingBusinessData) => {
    onSubmit(data);
  };

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <OnboardingLayout
            form={form}
            stepsConfig={stepsConfig}
            currentStep={currentStep}
            canProceed={canProceed}
            canSubmit={canSubmit}
            getStepStatus={getStepStatus}
            onPrev={handlePrev}
            onNext={handleNext}
            onSubmit={() => form.handleSubmit(handleSubmit)()}
            onEditStep={handleEditStep}
            onStepClick={handleStepClick}
            userClassification={userClassification}
          />
        </form>
      </Form>
    </div>
  );
};
