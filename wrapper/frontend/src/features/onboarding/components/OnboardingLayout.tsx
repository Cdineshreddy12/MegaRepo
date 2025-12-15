import { StepIndicator } from './StepIndicator';
import { NavigationButtons } from './NavigationButtons';
import { StepRenderer } from './StepRenderer';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { UserClassification } from './FlowSelector';

interface OnboardingLayoutProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  stepsConfig: StepConfig[];
  currentStep: number;
  canProceed: () => boolean;
  canSubmit: () => boolean;
  getStepStatus: (stepNumber: number) => 'completed' | 'active' | 'error' | 'upcoming';
  onPrev: () => void;
  onNext: () => void;
  onCompanyTypeSelect: (typeId: string) => void;
  onStateSelect: (stateId: string) => void;
  onAddTeamMember: () => void;
  onUpdateTeamMember: (id: number, field: keyof import('../schemas').TeamMember, value: string) => void;
  onRemoveTeamMember: (id: number) => void;
  onEditStep?: (stepNumber: number) => void;
  onStepClick?: (stepNumber: number) => void;
  userClassification?: UserClassification;
}

export const OnboardingLayout = ({
  form,
  stepsConfig,
  currentStep,
  canProceed,
  canSubmit,
  getStepStatus,
  onPrev,
  onNext,
  onCompanyTypeSelect,
  onStateSelect,
  onAddTeamMember,
  onUpdateTeamMember,
  onRemoveTeamMember,
  onEditStep,
  onStepClick,
  userClassification
}: OnboardingLayoutProps) => {
  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex flex-col w-80 bg-white border-r border-gray-200">
        <StepIndicator
          stepsConfig={stepsConfig}
          currentStep={currentStep}
          getStepStatus={getStepStatus}
          onStepClick={onStepClick}
          className='p-8 flex-1'
        />
        
        {/* Decorative elements */}
        <div className="relative bg-gradient-to-tr from-blue-100 to-white clip-diagonal h-64 overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/30 to-indigo-100/30"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10">
            <div className="relative w-full h-full">
              {/* Subtle floating elements */}
              <div className="absolute top-4 left-4 w-6 h-6 bg-blue-200 rounded-full opacity-60"></div>
              <div className="absolute top-8 right-8 w-4 h-4 bg-indigo-200 rounded-full opacity-40"></div>
              <div className="absolute bottom-8 left-8 w-3 h-3 bg-blue-300 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Step Indicator - Shown on mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            Step {currentStep} of {stepsConfig.length}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / stepsConfig.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <StepRenderer
            currentStep={currentStep}
            stepsConfig={stepsConfig}
            form={form}
            onCompanyTypeSelect={onCompanyTypeSelect}
            onStateSelect={onStateSelect}
            onAddTeamMember={onAddTeamMember}
            onUpdateTeamMember={onUpdateTeamMember}
            onRemoveTeamMember={onRemoveTeamMember}
            onEditStep={onEditStep}
            userClassification={userClassification}
          />
        </div>

        <div className="flex-shrink-0">
          <NavigationButtons
            currentStep={currentStep}
            stepsConfig={stepsConfig}
            canProceed={canProceed}
            canSubmit={canSubmit}
            onPrev={onPrev}
            onNext={onNext}
            className='p-4 sm:p-6 lg:p-8 border-t border-gray-200 bg-white'
          />
        </div>
      </div>
    </div>
  );
};
