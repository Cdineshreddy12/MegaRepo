import { memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { BusinessDetailsStep } from './steps/BusinessDetailsStep';
import { TaxDetailsStep } from './steps/TaxDetailsStep';
import { AdminDetailsStep } from './steps/AdminDetailsStep';
import { ReviewStep } from './steps/ReviewStep';
import { UserClassification } from './FlowSelector';
import { AlertTriangle } from 'lucide-react';

interface StepRendererProps {
  currentStep: number;
  stepsConfig: StepConfig[];
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onEditStep?: (stepNumber: number) => void;
  userClassification?: UserClassification;
}

export const StepRenderer = memo(({
  currentStep,
  stepsConfig,
  form,
  onEditStep,
  userClassification
}: StepRendererProps) => {
  const currentStepConfig = stepsConfig.find(step => step.number === currentStep);
  
  if (!currentStepConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-slate-300" />
        </div>
        <p className="font-medium">Step configuration not found</p>
      </div>
    );
  }

  // Render step content directly without wrapper to prevent unnecessary re-renders
  switch (currentStepConfig.id) {
    case 'businessDetails':
      return <BusinessDetailsStep form={form} userClassification={userClassification} />;
    case 'taxDetails':
      return <TaxDetailsStep form={form} userClassification={userClassification} />;
    case 'adminDetails':
      return <AdminDetailsStep form={form} userClassification={userClassification} />;
    case 'review':
      return <ReviewStep form={form} onEditStep={onEditStep} userClassification={userClassification} />;
    default:
      return <div>Unknown step: {currentStepConfig.id}</div>;
  }
}, (prevProps, nextProps) => {
  // Only re-render if currentStep, userClassification, or form control changes
  return prevProps.currentStep === nextProps.currentStep &&
         prevProps.userClassification === nextProps.userClassification &&
         prevProps.form.control === nextProps.form.control &&
         prevProps.stepsConfig === nextProps.stepsConfig;
});
