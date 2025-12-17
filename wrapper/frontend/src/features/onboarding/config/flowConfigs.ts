/**
 * Flow Configuration for Onboarding
 */

import { Building2, Rocket } from 'lucide-react';

export interface StepConfig {
  id: string;
  number: number;
  title: string;
  description?: string;
}

export interface FlowConfig {
  id: string;
  name: string;
  description: string;
  steps: StepConfig[];
}

// Flow selector configuration (for UI display)
export interface FlowSelectorConfig {
  id: 'newBusiness' | 'existingBusiness';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green';
  steps: StepConfig[];
}

export const getFlowConfig = (flowId: 'newBusiness' | 'existingBusiness'): FlowConfig | null => {
  const configs: Record<string, FlowConfig> = {
    newBusiness: {
      id: 'newBusiness',
      name: 'New Business',
      description: 'Onboard a new business',
      steps: [
        { id: 'businessDetails', number: 1, title: 'Business Details', description: 'Company information and business profile' },
        { id: 'taxDetails', number: 2, title: 'Tax Details', description: 'Tax registration and compliance information' },
        { id: 'adminDetails', number: 3, title: 'Admin Details', description: 'Administrator and contact information' },
        { id: 'review', number: 4, title: 'Review & Submit', description: 'Review all information before submission' },
      ],
    },
    existingBusiness: {
      id: 'existingBusiness',
      name: 'Existing Business',
      description: 'Onboard an existing business',
      steps: [
        { id: 'businessDetails', number: 1, title: 'Business Details', description: 'Company information and business profile' },
        { id: 'taxDetails', number: 2, title: 'Tax Details', description: 'Tax registration and compliance information' },
        { id: 'adminDetails', number: 3, title: 'Admin Details', description: 'Administrator and contact information' },
        { id: 'review', number: 4, title: 'Review & Submit', description: 'Review all information before submission' },
      ],
    },
  };

  return configs[flowId] || null;
};

// Flow configs for selector UI (array format)
export const flowConfigs: FlowSelectorConfig[] = [
  {
    id: 'newBusiness',
    title: 'New Business',
    description: 'Start fresh with a new business setup. Perfect for startups and new ventures.',
    icon: Rocket,
    color: 'blue',
    steps: getFlowConfig('newBusiness')?.steps || [],
  },
  {
    id: 'existingBusiness',
    title: 'Existing Business',
    description: 'Migrate your existing business. Already have GST and business details ready.',
    icon: Building2,
    color: 'green',
    steps: getFlowConfig('existingBusiness')?.steps || [],
  },
];

// Export default for convenience
export default { flowConfigs, getFlowConfig };

