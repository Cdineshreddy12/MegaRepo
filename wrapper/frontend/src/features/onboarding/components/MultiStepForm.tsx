import React from 'react';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { useStepNavigation, useTeamManagement } from '../hooks';
import { OnboardingLayout } from './OnboardingLayout';
import { UserClassification } from './FlowSelector';

interface MultiStepFormProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  stepsConfig: StepConfig[];
  onSubmit: (data: newBusinessData | existingBusinessData) => void;
  onCompanyTypeSelect?: (typeId: string) => void;
  onStateSelect?: (stateId: string) => void;
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
  onCompanyTypeSelect,
  onStateSelect,
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
  
  // Use external currentStep if provided, otherwise use internal
  const currentStep = externalCurrentStep ?? internalCurrentStep;
  const { addTeamMember, updateTeamMember, removeTeamMember } = useTeamManagement(form);

  const handleCompanyTypeSelect = async (typeId: string) => {
    form.setValue('companyType', typeId, { shouldValidate: false, shouldDirty: true });
    onCompanyTypeSelect?.(typeId);
  };

  const handleStateSelect = async (stateId: string) => {
    form.setValue('state', stateId, { shouldValidate: false, shouldDirty: true });
    onStateSelect?.(stateId);
  };

  const handleEditStep = (stepNumber: number) => {
    // Navigate to the specified step
    goToStep(stepNumber);
    onStepChange?.(stepNumber);
    onEditStep?.(stepNumber);
  };

  const handleStepClick = (stepNumber: number) => {
    // Navigate to the specified step
    goToStep(stepNumber);
    onStepChange?.(stepNumber);
    onStepClick?.(stepNumber);
  };

  const handleNext = async () => {
    await nextStep();
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
            onCompanyTypeSelect={handleCompanyTypeSelect}
            onStateSelect={handleStateSelect}
            onAddTeamMember={addTeamMember}
            onUpdateTeamMember={updateTeamMember}
            onRemoveTeamMember={removeTeamMember}
            onEditStep={handleEditStep}
            onStepClick={handleStepClick}
            userClassification={userClassification}
          />
        </form>
      </Form>
    </div>
  );
};
