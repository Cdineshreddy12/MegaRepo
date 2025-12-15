/**
 * Flow Configuration for Onboarding
 */

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

export const getFlowConfig = (flowId: 'newBusiness' | 'existingBusiness'): FlowConfig | null => {
  const configs: Record<string, FlowConfig> = {
    newBusiness: {
      id: 'newBusiness',
      name: 'New Business',
      description: 'Onboard a new business',
      steps: [
        { id: 'companyType', number: 1, title: 'Company Type' },
        { id: 'state', number: 2, title: 'State' },
        { id: 'businessDetails', number: 3, title: 'Business Details' },
        { id: 'team', number: 4, title: 'Team' },
        { id: 'personalDetails', number: 5, title: 'Personal Details' },
        { id: 'taxDetails', number: 6, title: 'Tax Details' },
        { id: 'adminDetails', number: 7, title: 'Admin Details' },
        { id: 'review', number: 8, title: 'Review' },
      ],
    },
    existingBusiness: {
      id: 'existingBusiness',
      name: 'Existing Business',
      description: 'Onboard an existing business',
      steps: [
        { id: 'companyType', number: 1, title: 'Company Type' },
        { id: 'state', number: 2, title: 'State' },
        { id: 'businessDetails', number: 3, title: 'Business Details' },
        { id: 'team', number: 4, title: 'Team' },
        { id: 'personalDetails', number: 5, title: 'Personal Details' },
        { id: 'taxDetails', number: 6, title: 'Tax Details' },
        { id: 'adminDetails', number: 7, title: 'Admin Details' },
        { id: 'review', number: 8, title: 'Review' },
      ],
    },
  };

  return configs[flowId] || null;
};

export const flowConfigs = {
  newBusiness: getFlowConfig('newBusiness'),
  existingBusiness: getFlowConfig('existingBusiness'),
};

// Export default for convenience
export default { flowConfigs, getFlowConfig };

