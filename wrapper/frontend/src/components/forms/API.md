# Multi-Step Form API Documentation

## Overview

The Multi-Step Form is a comprehensive, config-driven form wizard built with React, TypeScript, and shadcn/ui components. It provides a complete solution for creating complex, multi-step forms with validation, persistence, accessibility, and performance optimizations.

## Table of Contents

- [Core Components](#core-components)
- [Field Types](#field-types)
- [Validation System](#validation-system)
- [Hooks](#hooks)
- [Context API](#context-api)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Core Components

### MultiStepForm

The main form component that orchestrates the entire multi-step form experience.

```tsx
import { MultiStepForm } from '@/components/forms';

<MultiStepForm
  config={formConfig}
  onSubmit={handleSubmit}
  fieldComponents={customFieldComponents}
  ProgressIndicator={CustomProgressIndicator}
  StepNavigation={CustomStepNavigation}
  initialValues={initialValues}
  debug={false}
  className="custom-form"
  children={<CustomFormContent />}
  persistence={{
    type: 'localStorage',
    key: 'my-form',
    debounceMs: 500,
    persistOnChange: true,
    persistOnStepChange: true,
    clearOnSubmit: true
  }}
  animations={true}
  accessibility={true}
/>
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config` | `FormConfig` | ✅ | - | Form configuration object |
| `onSubmit` | `(values: FormValues) => void \| Promise<void>` | ✅ | - | Submit handler function |
| `fieldComponents` | `Partial<Record<FieldType, Component>>` | ❌ | `{}` | Custom field components |
| `ProgressIndicator` | `Component` | ❌ | `ProgressIndicator` | Custom progress indicator |
| `StepNavigation` | `Component` | ❌ | `StepNavigation` | Custom step navigation |
| `initialValues` | `FormValues` | ❌ | `{}` | Initial form values |
| `debug` | `boolean` | ❌ | `false` | Show debug information |
| `className` | `string` | ❌ | - | Custom CSS classes |
| `children` | `ReactNode` | ❌ | - | Children components |
| `persistence` | `PersistenceOptions` | ❌ | `{ type: 'localStorage' }` | Persistence configuration |
| `animations` | `boolean` | ❌ | `true` | Enable animations |
| `accessibility` | `boolean` | ❌ | `true` | Enable accessibility features |

### ProgressIndicator

Visual progress indicator showing current step and completion status.

```tsx
import { ProgressIndicator } from '@/components/forms';

<ProgressIndicator
  currentStep={0}
  totalSteps={3}
  stepTitles={['Step 1', 'Step 2', 'Step 3']}
  stepSubSteps={{ 0: ['Basic', 'Details'], 1: ['Settings', 'Options'] }}
  showStepNumbers={true}
  onStepClick={handleStepClick}
/>
```

### StepNavigation

Navigation controls for moving between steps.

```tsx
import { StepNavigation } from '@/components/forms';

<StepNavigation
  currentStep={0}
  totalSteps={3}
  isCurrentStepValid={true}
  isSubmitting={false}
  allowBack={true}
  onNext={handleNext}
  onPrev={handlePrev}
  onSubmit={handleSubmit}
/>
```

## Field Types

### Basic Fields

#### TextField
```tsx
{
  id: 'firstName',
  label: 'First Name',
  type: 'text',
  placeholder: 'Enter your first name',
  required: true,
  minLength: 2,
  maxLength: 50,
  pattern: '^[a-zA-Z]+$',
  helpText: 'Enter your legal first name',
  className: 'col-span-1'
}
```

#### EmailField
```tsx
{
  id: 'email',
  label: 'Email Address',
  type: 'email',
  placeholder: 'Enter your email',
  required: true,
  helpText: 'We\'ll use this for important updates',
  className: 'col-span-2'
}
```

#### PasswordField
```tsx
{
  id: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true,
  minLength: 8,
  maxLength: 128,
  helpText: 'Must contain uppercase, lowercase, and number',
  className: 'col-span-2'
}
```

#### NumberField
```tsx
{
  id: 'age',
  label: 'Age',
  type: 'number',
  placeholder: 'Enter your age',
  required: true,
  min: 18,
  max: 100,
  step: 1,
  helpText: 'Must be between 18 and 100',
  className: 'col-span-1'
}
```

#### TextareaField
```tsx
{
  id: 'bio',
  label: 'Biography',
  type: 'textarea',
  placeholder: 'Tell us about yourself',
  required: false,
  rows: 4,
  minLength: 10,
  maxLength: 500,
  helpText: 'Optional: Share your story',
  className: 'col-span-2'
}
```

#### DateField
```tsx
{
  id: 'birthDate',
  label: 'Date of Birth',
  type: 'date',
  required: true,
  min: '1900-01-01',
  max: '2023-12-31',
  helpText: 'Format: YYYY-MM-DD',
  className: 'col-span-1'
}
```

### Selection Fields

#### SelectField
```tsx
{
  id: 'country',
  label: 'Country',
  type: 'select',
  placeholder: 'Choose your country',
  required: true,
  options: [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' }
  ],
  helpText: 'Select your country of residence',
  className: 'col-span-1'
}
```

#### RadioField
```tsx
{
  id: 'gender',
  label: 'Gender',
  type: 'radio',
  required: true,
  options: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ],
  direction: 'horizontal',
  helpText: 'Select your gender identity',
  className: 'col-span-2'
}
```

#### CheckboxField
```tsx
{
  id: 'newsletter',
  label: 'Newsletter',
  type: 'checkbox',
  checkboxLabel: 'Subscribe to our newsletter',
  required: false,
  helpText: 'Receive updates about new features',
  className: 'col-span-2'
}
```

#### SwitchField
```tsx
{
  id: 'notifications',
  label: 'Notifications',
  type: 'switch',
  switchLabel: 'Enable push notifications',
  required: false,
  helpText: 'Get real-time updates',
  className: 'col-span-2'
}
```

### Advanced Fields

#### UrlField
```tsx
{
  id: 'website',
  label: 'Website',
  type: 'url',
  placeholder: 'https://example.com',
  required: false,
  helpText: 'Your personal or business website',
  className: 'col-span-2'
}
```

#### TelField
```tsx
{
  id: 'phone',
  label: 'Phone Number',
  type: 'tel',
  placeholder: '+1 (555) 123-4567',
  required: true,
  pattern: '^[\\+]?[1-9][\\d]{0,15}$',
  helpText: 'Include country code for international numbers',
  className: 'col-span-2'
}
```

#### SearchField
```tsx
{
  id: 'search',
  label: 'Search',
  type: 'search',
  placeholder: 'Search...',
  required: false,
  helpText: 'Search for specific items',
  className: 'col-span-2'
}
```

#### ColorField
```tsx
{
  id: 'themeColor',
  label: 'Theme Color',
  type: 'color',
  defaultValue: '#3B82F6',
  required: false,
  helpText: 'Choose your preferred theme color',
  className: 'col-span-1'
}
```

#### RangeField
```tsx
{
  id: 'priceRange',
  label: 'Price Range',
  type: 'range',
  min: 0,
  max: 1000,
  step: 10,
  multiple: true,
  required: false,
  helpText: 'Select your budget range',
  className: 'col-span-2'
}
```

#### FileField
```tsx
{
  id: 'avatar',
  label: 'Profile Picture',
  type: 'file',
  accept: 'image/*',
  maxSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 1,
  multiple: false,
  required: false,
  helpText: 'Upload a profile picture (max 5MB)',
  className: 'col-span-2'
}
```

## Validation System

### Basic Validation

```tsx
import { z } from 'zod';

const formConfig: FormConfig = {
  steps: [
    {
      id: 'step1',
      title: 'Personal Information',
      fields: [
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validation: z.string().email('Invalid email address')
        }
      ]
    }
  ]
};
```

### Cross-Field Validation

```tsx
import { CrossFieldValidation } from '@/components/forms/validation/CrossFieldValidation';

const formConfig: FormConfig = {
  steps: [
    {
      id: 'step1',
      title: 'Account Setup',
      fields: [
        {
          id: 'password',
          label: 'Password',
          type: 'password',
          required: true
        },
        {
          id: 'confirmPassword',
          label: 'Confirm Password',
          type: 'password',
          required: true
        }
      ],
      validation: CrossFieldValidation.passwordConfirmation('password', 'confirmPassword')
    }
  ]
};
```

### Async Validation

```tsx
import { AsyncValidation } from '@/components/forms/validation/CrossFieldValidation';

const formConfig: FormConfig = {
  steps: [
    {
      id: 'step1',
      title: 'Account Setup',
      fields: [
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validation: z.string().email().refine(
            async (email) => await AsyncValidation.emailUnique(email),
            'Email already exists'
          )
        }
      ]
    }
  ]
};
```

### Custom Validation Patterns

```tsx
import { ValidationPatterns } from '@/components/forms/validation/EnhancedValidation';

const formConfig: FormConfig = {
  steps: [
    {
      id: 'step1',
      title: 'Personal Information',
      fields: [
        {
          id: 'zipCode',
          label: 'ZIP Code',
          type: 'text',
          required: true,
          validation: ValidationPatterns.zipCode
        },
        {
          id: 'phone',
          label: 'Phone Number',
          type: 'tel',
          required: true,
          validation: ValidationPatterns.phone
        }
      ]
    }
  ]
};
```

## Hooks

### useFormContext

Access form state and methods from any child component.

```tsx
import { useFormContext } from '@/components/forms';

function CustomComponent() {
  const {
    currentStep,
    totalSteps,
    isCurrentStepValid,
    methods,
    nextStep,
    prevStep,
    goToStep,
    handleFieldChange,
    handleFieldBlur,
    validateCurrentStep,
    handleSubmit,
    debug
  } = useFormContext();

  return (
    <div>
      <p>Step {currentStep + 1} of {totalSteps}</p>
      <button onClick={nextStep} disabled={!isCurrentStepValid}>
        Next
      </button>
    </div>
  );
}
```

### useFormAccessibility

Enhanced accessibility features.

```tsx
import { useFormAccessibility } from '@/components/forms';

function CustomForm() {
  const { focusFirstField, focusNextField, announceStepChange } = useFormAccessibility();

  return (
    <div>
      <button onClick={focusFirstField}>Focus First Field</button>
      <button onClick={focusNextField}>Focus Next Field</button>
    </div>
  );
}
```

### useFormPersistence

Form state persistence.

```tsx
import { useFormPersistence } from '@/components/forms';

function CustomForm() {
  const { saveFormData, loadFormData, clearFormData, restoreFormData } = useFormPersistence({
    type: 'localStorage',
    key: 'my-form',
    debounceMs: 500
  });

  return (
    <div>
      <button onClick={saveFormData}>Save Form</button>
      <button onClick={loadFormData}>Load Form</button>
      <button onClick={clearFormData}>Clear Form</button>
    </div>
  );
}
```

### useFormPerformance

Performance optimizations and analytics.

```tsx
import { useFormPerformance } from '@/components/forms';

function CustomForm() {
  const {
    formValues,
    validationState,
    debouncedSetValue,
    validateField,
    batchUpdateFields,
    getFormAnalytics
  } = useFormPerformance();

  return (
    <div>
      <p>Form Values: {JSON.stringify(formValues)}</p>
      <p>Is Valid: {validationState.isValid ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## Context API

### FormContext

The form context provides access to form state and methods throughout the component tree.

```tsx
import { FormProvider, useFormContext } from '@/components/forms';

function App() {
  return (
    <FormProvider value={formContextValue}>
      <MultiStepForm config={config} onSubmit={handleSubmit} />
    </FormProvider>
  );
}

function CustomComponent() {
  const formContext = useFormContext();
  // Use form context...
}
```

## Examples

### Basic Form

```tsx
import { MultiStepForm } from '@/components/forms';

const basicConfig: FormConfig = {
  title: 'Basic Form',
  steps: [
    {
      id: 'step1',
      title: 'Personal Info',
      fields: [
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }
      ]
    }
  ]
};

function BasicForm() {
  const handleSubmit = (values: FormValues) => {
    console.log('Form submitted:', values);
  };

  return (
    <MultiStepForm
      config={basicConfig}
      onSubmit={handleSubmit}
    />
  );
}
```

### Advanced Form with Custom Components

```tsx
import { MultiStepForm, CustomProgressIndicator, CustomStepNavigation } from '@/components/forms';

const advancedConfig: FormConfig = {
  title: 'Advanced Form',
  steps: [
    {
      id: 'step1',
      title: 'Account Setup',
      fields: [
        {
          id: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          validation: z.string().min(3).refine(
            async (username) => await checkUsernameAvailability(username),
            'Username already taken'
          )
        },
        {
          id: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          validation: z.string().min(8).regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase, and number'
          )
        }
      ]
    }
  ]
};

function AdvancedForm() {
  const handleSubmit = async (values: FormValues) => {
    try {
      await submitToAPI(values);
      toast.success('Form submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit form');
    }
  };

  return (
    <MultiStepForm
      config={advancedConfig}
      onSubmit={handleSubmit}
      ProgressIndicator={CustomProgressIndicator}
      StepNavigation={CustomStepNavigation}
      persistence={{
        type: 'localStorage',
        key: 'advanced-form',
        persistOnChange: true
      }}
      animations={true}
      accessibility={true}
      debug={true}
    />
  );
}
```

## Best Practices

### 1. Form Configuration

- Keep form configurations in separate files
- Use descriptive field IDs and labels
- Group related fields in the same step
- Provide helpful placeholder text and help text

### 2. Validation

- Use appropriate validation patterns
- Provide clear error messages
- Implement cross-field validation when needed
- Use async validation for API-dependent checks

### 3. Performance

- Use memoization for expensive calculations
- Implement debounced validation for real-time feedback
- Consider virtual scrolling for large forms
- Optimize re-renders with proper dependency arrays

### 4. Accessibility

- Always provide labels for form fields
- Use proper ARIA attributes
- Implement keyboard navigation
- Test with screen readers

### 5. Error Handling

- Implement error boundaries
- Provide fallback UI for errors
- Log errors for debugging
- Show user-friendly error messages

## Troubleshooting

### Common Issues

#### Form not validating
- Check that validation schemas are properly configured
- Ensure required fields are marked correctly
- Verify field types match validation expectations

#### State not persisting
- Check persistence configuration
- Verify localStorage/sessionStorage is available
- Ensure persistence key is unique

#### Accessibility issues
- Verify ARIA attributes are properly set
- Test keyboard navigation
- Check screen reader compatibility

#### Performance issues
- Use React DevTools Profiler to identify bottlenecks
- Implement proper memoization
- Consider virtual scrolling for large forms

### Debug Mode

Enable debug mode to see detailed form state information:

```tsx
<MultiStepForm
  config={config}
  onSubmit={handleSubmit}
  debug={true}
/>
```

This will show:
- Current form values
- Validation state
- Error messages
- Performance metrics
- Accessibility status

### Getting Help

- Check the console for error messages
- Use React DevTools to inspect component state
- Review the validation schemas
- Test with different browsers and devices

