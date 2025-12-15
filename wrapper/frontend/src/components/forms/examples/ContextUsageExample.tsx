import React from 'react';
import { MultiStepForm, useFormContext } from '../index';
import { FormConfig } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Clock, BarChart3 } from 'lucide-react';

/**
 * Example component that uses form context to create custom UI elements
 */
const FormStats: React.FC = () => {
  const { currentStep, totalSteps, methods, isCurrentStepValid, config } = useFormContext();
  
  const formValues = methods.getValues();
  const formErrors = methods.formState.errors;
  
  const totalFields = config.steps.reduce((acc, step) => acc + step.fields.length, 0);
  const completedFields = Object.keys(formValues).filter(key => {
    const value = formValues[key];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  const completionPercentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Form Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{completedFields}</div>
            <div className="text-sm text-gray-500">Fields Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{Object.keys(formErrors).length}</div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{Math.round(completionPercentage)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant={isCurrentStepValid ? "default" : "destructive"}>
            {isCurrentStepValid ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Step Valid
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Has Errors
              </>
            )}
          </Badge>
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Step {currentStep + 1} of {totalSteps}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Custom step indicator that shows field-level progress
 */
const StepProgressIndicator: React.FC = () => {
  const { currentStep, config, methods } = useFormContext();
  
  const currentStepConfig = config.steps[currentStep];
  const formValues = methods.getValues();
  const formErrors = methods.formState.errors;
  
  const completedFields = currentStepConfig.fields.filter(field => {
    const value = formValues[field.id];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  const stepCompletionPercentage = currentStepConfig.fields.length > 0 
    ? (completedFields / currentStepConfig.fields.length) * 100 
    : 0;

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">Current Step Progress</h3>
        <span className="text-sm text-gray-500">{Math.round(stepCompletionPercentage)}%</span>
      </div>
      <Progress value={stepCompletionPercentage} className="h-2 mb-3" />
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {currentStepConfig.fields.map((field) => {
          const value = formValues[field.id];
          const hasError = formErrors[field.id];
          const isCompleted = value !== null && value !== undefined && value !== '';
          
          return (
            <div 
              key={field.id}
              className={`flex items-center space-x-1 p-2 rounded ${
                hasError 
                  ? 'bg-red-100 text-red-700' 
                  : isCompleted 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {hasError ? (
                <AlertCircle className="w-3 h-3" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span className="truncate">{field.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Example form configuration
 */
const exampleConfig: FormConfig = {
  title: 'Context Usage Example',
  description: 'Demonstrating how to use form context in children components',
  steps: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Tell us about yourself',
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
          className: 'col-span-2'
        }
      ]
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Configure your preferences',
      showProgress: true,
      fields: [
        {
          id: 'newsletter',
          label: 'Newsletter',
          type: 'switch',
          switchLabel: 'Subscribe to newsletter',
          required: false,
          className: 'col-span-1'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          type: 'switch',
          switchLabel: 'Enable notifications',
          required: false,
          className: 'col-span-1'
        }
      ]
    }
  ]
};

/**
 * Main example component
 */
export const ContextUsageExample: React.FC = () => {
  const handleSubmit = (values: Record<string, any>) => {
    console.log('Form submitted with values:', values);
    alert('Form submitted successfully! Check the console for values.');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Context Usage Example</h1>
          <p className="text-muted-foreground mt-2">
            Demonstrating how to access form state in children components
          </p>
        </div>
        
        <MultiStepForm
          config={exampleConfig}
          onSubmit={handleSubmit}
          debug={true}
        >
          {/* Custom components that use form context */}
          <div className="px-8 py-6">
            <FormStats />
            <StepProgressIndicator />
          </div>
        </MultiStepForm>
      </div>
    </div>
  );
};
