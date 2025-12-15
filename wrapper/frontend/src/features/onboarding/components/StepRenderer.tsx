import { memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { CompanyTypeStep } from './steps/CompanyTypeStep';
import { StateStep } from './steps/StateStep';
import { BusinessDetailsStep } from './steps/BusinessDetailsStep';
import { TeamStep } from './steps/TeamStep';
import { PersonalDetailsStep } from './steps/PersonalDetailsStep';
import { TaxDetailsStep } from './steps/TaxDetailsStep';
import { AdminDetailsStep } from './steps/AdminDetailsStep';
import { ReviewStep } from './steps/ReviewStep';
import { UserClassification } from './FlowSelector';

interface StepRendererProps {
  currentStep: number;
  stepsConfig: StepConfig[];
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onCompanyTypeSelect: (typeId: string) => void;
  onStateSelect: (stateId: string) => void;
  onAddTeamMember: () => void;
  onUpdateTeamMember: (id: number, field: keyof import('../schemas').TeamMember, value: string) => void;
  onRemoveTeamMember: (id: number) => void;
  onEditStep?: (stepNumber: number) => void;
  userClassification?: UserClassification;
}

export const StepRenderer = memo(({
  currentStep,
  stepsConfig,
  form,
  onCompanyTypeSelect,
  onStateSelect,
  onAddTeamMember,
  onUpdateTeamMember,
  onRemoveTeamMember,
  onEditStep,
  userClassification
}: StepRendererProps) => {
  const currentStepConfig = stepsConfig.find(step => step.number === currentStep);
  
  
  if (!currentStepConfig) {
    return <div>Step not found</div>;
  }

  // Render step based on step ID instead of hardcoded numbers
  switch (currentStepConfig.id) {
    case 'companyType':
      return (
        <CompanyTypeStep
          selectedType={form.watch('companyType')}
          onSelect={onCompanyTypeSelect}
          userClassification={userClassification}
        />
      );
    case 'state':
      return (
        <StateStep
          selectedState={form.watch('state')}
          onSelect={onStateSelect}
          userClassification={userClassification}
        />
      );
    case 'businessDetails':
      return <BusinessDetailsStep form={form} userClassification={userClassification} />;
    case 'team':
      return (
        <TeamStep
          form={form}
          onAddMember={onAddTeamMember}
          onUpdateMember={onUpdateTeamMember}
          onRemoveMember={onRemoveTeamMember}
          userClassification={userClassification}
        />
      );
    case 'personalDetails':
      return <PersonalDetailsStep form={form} userClassification={userClassification} />;
    case 'taxDetails':
      return <TaxDetailsStep form={form} userClassification={userClassification} />;
    case 'adminDetails':
      return <AdminDetailsStep form={form} userClassification={userClassification} />;
    case 'review':
      return <ReviewStep form={form} onEditStep={onEditStep} userClassification={userClassification} />;
    default:
      return <div>Unknown step: {currentStepConfig.id}</div>;
  }
});
