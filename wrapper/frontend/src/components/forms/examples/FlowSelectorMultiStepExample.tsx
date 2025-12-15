import React, { useState } from 'react';
import { FlowSelector, FlowConfig } from '../components/FlowSelector';
import { MultiStepForm } from '../MultiStepForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building2, 
  ShoppingCart, 
  CreditCard, 
  FileText, 
  Settings,
  Zap,
  Shield,
  Globe,
  Smartphone,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { FormConfig } from '../types';

/**
 * Different flow configurations that determine the form structure
 */
const flowConfigurations: FlowConfig[] = [
  {
    id: 'personal',
    name: 'Personal Account',
    description: 'Perfect for individuals and personal use',
    icon: <User className="w-6 h-6 text-blue-600" />,
    data: { 
      type: 'personal', 
      features: ['basic', 'support'],
      formConfig: 'personal' 
    }
  },
  {
    id: 'business',
    name: 'Business Account',
    description: 'Ideal for small to medium businesses',
    icon: <Building2 className="w-6 h-6 text-green-600" />,
    data: { 
      type: 'business', 
      features: ['advanced', 'analytics', 'support'],
      formConfig: 'business' 
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced features for large organizations',
    icon: <Shield className="w-6 h-6 text-purple-600" />,
    data: { 
      type: 'enterprise', 
      features: ['premium', 'analytics', 'priority-support', 'custom'],
      formConfig: 'enterprise' 
    }
  }
];

/**
 * Form configurations based on selected flow
 */
const getFormConfigForFlow = (flowId: string): FormConfig => {
  const baseConfig: FormConfig = {
    title: 'Complete Your Setup',
    description: 'Fill in the details to get started',
    showStepNumbers: true,
    allowBackNavigation: true,
    autoSave: true,
    steps: []
  };

  switch (flowId) {
    case 'personal':
      return {
        ...baseConfig,
        title: 'Personal Account Setup',
        description: 'Tell us about yourself to get started',
        steps: [
          {
            id: 'personal-info',
            title: 'Personal Information',
            description: 'Basic details about you',
            showProgress: true,
            fields: [
              {
                id: 'firstName',
                label: 'First Name',
                type: 'text',
                placeholder: 'Enter your first name',
                required: true,
                className: 'col-span-1'
              },
              {
                id: 'lastName',
                label: 'Last Name',
                type: 'text',
                placeholder: 'Enter your last name',
                required: true,
                className: 'col-span-1'
              },
              {
                id: 'email',
                label: 'Email Address',
                type: 'email',
                placeholder: 'Enter your email',
                required: true,
                helpText: 'We\'ll use this for important updates',
                className: 'col-span-2'
              },
              {
                id: 'phone',
                label: 'Phone Number',
                type: 'tel',
                placeholder: 'Enter your phone number',
                required: true,
                className: 'col-span-2'
              }
            ]
          },
          {
            id: 'preferences',
            title: 'Preferences',
            description: 'Set up your account preferences',
            showProgress: true,
            fields: [
              {
                id: 'newsletter',
                label: 'Subscribe to Newsletter',
                type: 'switch',
                required: false,
                className: 'col-span-2'
              },
              {
                id: 'notifications',
                label: 'Email Notifications',
                type: 'switch',
                required: false,
                className: 'col-span-2'
              }
            ]
          }
        ]
      };

    case 'business':
      return {
        ...baseConfig,
        title: 'Business Account Setup',
        description: 'Set up your business account with advanced features',
        steps: [
          {
            id: 'company-info',
            title: 'Company Information',
            description: 'Tell us about your business',
            showProgress: true,
            fields: [
              {
                id: 'companyName',
                label: 'Company Name',
                type: 'text',
                placeholder: 'Enter your company name',
                required: true,
                className: 'col-span-2'
              },
              {
                id: 'industry',
                label: 'Industry',
                type: 'select',
                placeholder: 'Select your industry',
                required: true,
                options: [
                  { value: 'technology', label: 'Technology' },
                  { value: 'healthcare', label: 'Healthcare' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'retail', label: 'Retail' },
                  { value: 'other', label: 'Other' }
                ],
                className: 'col-span-2'
              },
              {
                id: 'companySize',
                label: 'Company Size',
                type: 'select',
                placeholder: 'Select company size',
                required: true,
                options: [
                  { value: '1-10', label: '1-10 employees' },
                  { value: '11-50', label: '11-50 employees' },
                  { value: '51-200', label: '51-200 employees' },
                  { value: '200+', label: '200+ employees' }
                ],
                className: 'col-span-2'
              }
            ]
          },
          {
            id: 'contact-info',
            title: 'Contact Information',
            description: 'Primary contact details',
            showProgress: true,
            fields: [
              {
                id: 'contactName',
                label: 'Contact Person',
                type: 'text',
                placeholder: 'Enter contact person name',
                required: true,
                className: 'col-span-1'
              },
              {
                id: 'contactEmail',
                label: 'Contact Email',
                type: 'email',
                placeholder: 'Enter contact email',
                required: true,
                className: 'col-span-1'
              },
              {
                id: 'contactPhone',
                label: 'Contact Phone',
                type: 'tel',
                placeholder: 'Enter contact phone',
                required: true,
                className: 'col-span-2'
              }
            ]
          },
          {
            id: 'business-preferences',
            title: 'Business Preferences',
            description: 'Configure your business account settings',
            showProgress: true,
            fields: [
              {
                id: 'billingCycle',
                label: 'Billing Cycle',
                type: 'select',
                placeholder: 'Select billing cycle',
                required: true,
                options: [
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annually', label: 'Annually' }
                ],
                className: 'col-span-2'
              },
              {
                id: 'analytics',
                label: 'Enable Analytics',
                type: 'switch',
                required: false,
                className: 'col-span-2'
              }
            ]
          }
        ]
      };

    case 'enterprise':
      return {
        ...baseConfig,
        title: 'Enterprise Account Setup',
        description: 'Configure your enterprise solution with premium features',
        steps: [
          {
            id: 'organization-info',
            title: 'Organization Details',
            description: 'Tell us about your organization',
            showProgress: true,
            fields: [
              {
                id: 'orgName',
                label: 'Organization Name',
                type: 'text',
                placeholder: 'Enter organization name',
                required: true,
                className: 'col-span-2'
              },
              {
                id: 'orgType',
                label: 'Organization Type',
                type: 'select',
                placeholder: 'Select organization type',
                required: true,
                options: [
                  { value: 'corporation', label: 'Corporation' },
                  { value: 'nonprofit', label: 'Non-profit' },
                  { value: 'government', label: 'Government' },
                  { value: 'educational', label: 'Educational' }
                ],
                className: 'col-span-2'
              },
              {
                id: 'employees',
                label: 'Number of Employees',
                type: 'number',
                placeholder: 'Enter number of employees',
                required: true,
                min: 1,
                className: 'col-span-2'
              }
            ]
          },
          {
            id: 'admin-contact',
            title: 'Administrator Contact',
            description: 'Primary administrator details',
            showProgress: true,
            fields: [
              {
                id: 'adminName',
                label: 'Administrator Name',
                type: 'text',
                placeholder: 'Enter administrator name',
                required: true,
                className: 'col-span-1'
              },
              {
                id: 'adminEmail',
                label: 'Administrator Email',
                type: 'email',
                placeholder: 'Enter administrator email',
                required: true,
                className: 'col-span-1'
              },
              {
                id: 'adminPhone',
                label: 'Administrator Phone',
                type: 'tel',
                placeholder: 'Enter administrator phone',
                required: true,
                className: 'col-span-2'
              }
            ]
          },
          {
            id: 'enterprise-features',
            title: 'Enterprise Features',
            description: 'Configure enterprise-specific features',
            showProgress: true,
            fields: [
              {
                id: 'sso',
                label: 'Single Sign-On (SSO)',
                type: 'switch',
                required: false,
                className: 'col-span-2'
              },
              {
                id: 'apiAccess',
                label: 'API Access',
                type: 'switch',
                required: false,
                className: 'col-span-2'
              },
              {
                id: 'customDomain',
                label: 'Custom Domain',
                type: 'text',
                placeholder: 'Enter custom domain (optional)',
                required: false,
                className: 'col-span-2'
              },
              {
                id: 'prioritySupport',
                label: 'Priority Support',
                type: 'switch',
                required: false,
                className: 'col-span-2'
              }
            ]
          }
        ]
      };

    default:
      return baseConfig;
  }
};

/**
 * Main component showing FlowSelector integration with MultiStepForm
 */
export const FlowSelectorMultiStepExample: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<FlowConfig | null>(null);
  const [currentStep, setCurrentStep] = useState<'flow-selection' | 'form-completion'>('flow-selection');
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFlowSelect = (flow: FlowConfig) => {
    setSelectedFlow(flow);
    setCurrentStep('form-completion');
    toast.success(`Selected: ${flow.name}. Proceeding to form...`);
  };

  const handleFormSubmit = async (values: Record<string, any>) => {
    try {
      // Simulate API call
      console.log('Form submitted with values:', {
        flowType: selectedFlow?.id,
        flowData: selectedFlow?.data,
        formValues: values
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      toast.success(`${selectedFlow?.name} account created successfully!`);
      
      // Reset to flow selection
      setCurrentStep('flow-selection');
      setSelectedFlow(null);
      setFormData({});
      
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleBackToFlowSelection = () => {
    setCurrentStep('flow-selection');
    setSelectedFlow(null);
  };

  if (currentStep === 'flow-selection') {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-4">Choose Your Account Type</h1>
            <p className="text-lg max-w-2xl mx-auto">
              Select the type of account that best fits your needs. Each option comes with different features and capabilities.
            </p>
          </div>

          <FlowSelector
            flows={flowConfigurations}
            onSelect={handleFlowSelect}
            title="Select Account Type"
            description="Choose the account type that best matches your requirements"
            variant="grid"
            maxColumns={3}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'form-completion' && selectedFlow) {
    const formConfig = getFormConfigForFlow(selectedFlow.id);

    return (
      <div className="min-h-screen">
        <div className="container mx-auto">
          {/* Header with flow info and back button */}
          <div className="border-b border-gray-200">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToFlowSelection}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Selection
                  </Button>
                  <div className="flex items-center gap-3">
                    {selectedFlow.icon}
                    <div>
                      <h2 className="text-xl font-semibold">{selectedFlow.name}</h2>
                      <p className="text-sm text-gray-600">{selectedFlow.description}</p>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {selectedFlow.data?.type?.toUpperCase()}
                </Badge>
            </div>
          </div>

          {/* Form */}
              <MultiStepForm
                config={formConfig}
                onSubmit={handleFormSubmit}
                initialValues={formData}
                debug={false}
              />
        </div>
      </div>
    );
  }

  return null;
};

export default FlowSelectorMultiStepExample;
