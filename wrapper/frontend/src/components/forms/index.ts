// Main components
export { MultiStepForm } from './MultiStepForm';
export { ProgressIndicator } from './components/ProgressIndicator';
export { AdvancedProgressIndicator } from './components/AdvancedProgressIndicator';
export { CustomProgressIndicator } from './components/CustomProgressIndicator';
export { StepNavigation } from './components/StepNavigation';

// Enhanced components
export { FormErrorBoundary, useFormErrorBoundary } from './components/FormErrorBoundary';
export { EnhancedFormContent } from './components/EnhancedFormContent';
export { PersistenceWrapper } from './components/PersistenceWrapper';
export { ConditionalErrorMessage } from './components/ConditionalErrorMessage';
export { 
  AnimatedFormTransition, 
  FormFieldSkeleton, 
  AnimatedProgressBar, 
  AnimatedStepIndicator,
  AnimatedErrorMessage,
  AnimatedSuccessMessage 
} from './components/AnimatedFormTransition';

export { 
  SimpleAnimatedTransition, 
  SimpleFormFieldSkeleton, 
  SimpleProgressBar, 
  SimpleStepIndicator,
  SimpleErrorMessage,
  SimpleSuccessMessage 
} from './components/SimpleAnimatedTransition';

export { 
  MotionAnimatedTransition, 
  MotionFormFieldSkeleton, 
  MotionProgressBar, 
  MotionStepIndicator,
  MotionErrorMessage,
  MotionSuccessMessage,
  MotionLoadingSpinner
} from './components/MotionAnimatedTransition';

// Context
export { FormProvider, useFormContext } from './contexts/FormContext';

// Hooks
export { useFormAccessibility, useFieldAccessibility } from './hooks/useFormAccessibility';
export { useFormPersistence, useAutoSave } from './hooks/useFormPersistence';
export { 
  useFormPerformance, 
  useVirtualScrolling, 
  useLazyFieldComponents, 
  useFormAnalytics 
} from './hooks/useFormPerformance';

// Field components
export * from './field-components';

// Store exports removed - using React state instead of Zustand

// Types
export * from './types';

// Examples
export { OnboardingFormExample, CustomStyledOnboardingForm, CustomFieldComponentsExample } from './examples/OnboardingFormExample';
export { onboardingFormConfig } from './examples/onboardingConfig';
export * from './examples/validationSchemas';
