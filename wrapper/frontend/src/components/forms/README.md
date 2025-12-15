# Multi-Step Form Wizard

A comprehensive, config-driven multi-step form wizard built with React, TypeScript, and shadcn/ui components.

## Features

- ✅ **Config-driven design** - Define forms using JSON configuration
- ✅ **Type-safe** - Full TypeScript support with Zod validation
- ✅ **Reusable components** - Modular field components for all input types
- ✅ **Progress tracking** - Visual progress indicator and step navigation
- ✅ **Form state management** - Zustand store for persistent form state
- ✅ **Validation** - Per-step and per-field validation with error handling
- ✅ **Conditional rendering** - Show/hide fields based on previous values
- ✅ **Accessibility** - ARIA labels, keyboard navigation, and screen reader support
- ✅ **Responsive design** - Mobile-friendly with Tailwind CSS
- ✅ **Customizable** - Replace default components with custom implementations

## Quick Start

```tsx
import { MultiStepForm, onboardingFormConfig } from '@/components/forms';

function MyForm() {
  const handleSubmit = async (values) => {
    console.log('Form submitted:', values);
    // Handle form submission
  };

  return (
    <MultiStepForm
      config={onboardingFormConfig}
      onSubmit={handleSubmit}
    />
  );
}
```

## Configuration

### Basic Form Configuration

```tsx
const formConfig: FormConfig = {
  title: 'My Multi-Step Form',
  description: 'Fill out this form step by step',
  showStepNumbers: true,
  allowBackNavigation: true,
  autoSave: true,
  steps: [
    // Step configurations...
  ]
};
```

### Step Configuration

```tsx
const step: FormStep = {
  id: 'personal-info',
  title: 'Personal Information',
  description: 'Tell us about yourself',
  fields: [
    // Field configurations...
  ]
};
```

### Field Configuration

```tsx
const field: FormField = {
  id: 'firstName',
  label: 'First Name',
  type: 'text',
  placeholder: 'Enter your first name',
  required: true,
  validation: z.string().min(2, 'Name must be at least 2 characters'),
  helpText: 'This will be displayed on your profile'
};
```

## Supported Field Types

| Type | Component | Description |
|------|-----------|-------------|
| `text` | TextField | Single-line text input |
| `email` | TextField | Email input with validation |
| `password` | TextField | Password input |
| `textarea` | TextareaField | Multi-line text input |
| `number` | NumberField | Numeric input with min/max |
| `date` | DateField | Date picker input |
| `select` | SelectField | Dropdown selection |
| `radio` | RadioField | Radio button group |
| `checkbox` | CheckboxField | Single checkbox |
| `switch` | SwitchField | Toggle switch |
| `file` | FileField | File upload input |

## Advanced Features

### Conditional Rendering

```tsx
const field: FormField = {
  id: 'newsletter',
  type: 'checkbox',
  label: 'Subscribe to newsletter',
  conditional: {
    watch: 'email', // Watch this field
    value: true,    // Show when email is truthy
    operator: 'equals'
  }
};
```

### Custom Validation

```tsx
const field: FormField = {
  id: 'phone',
  type: 'text',
  label: 'Phone Number',
  validation: z.string()
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number')
    .min(10, 'Phone number too short')
};
```

### Custom Field Components

```tsx
import { CustomTextField } from './CustomTextField';

<MultiStepForm
  config={formConfig}
  onSubmit={handleSubmit}
  fieldComponents={{
    text: CustomTextField,
    email: CustomEmailField
  }}
/>
```

## API Reference

### MultiStepForm Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `FormConfig` | Form configuration object |
| `onSubmit` | `(values: any) => void` | Submit handler |
| `fieldComponents` | `Partial<Record<FieldType, Component>>` | Custom field components |
| `ProgressIndicator` | `Component` | Custom progress indicator |
| `StepNavigation` | `Component` | Custom step navigation |
| `initialValues` | `Record<string, any>` | Initial form values |
| `debug` | `boolean` | Show debug information |
| `className` | `string` | Custom CSS classes |

### Form State Management

```tsx
import { useFormState, useFormValues, useFormErrors } from '@/components/forms';

function MyComponent() {
  const { currentStep, values, errors, setValue } = useFormState();
  const formValues = useFormValues();
  const formErrors = useFormErrors();
  
  // Use form state...
}
```

## Examples

### Basic Onboarding Form

```tsx
import { OnboardingFormExample } from '@/components/forms';

function App() {
  return <OnboardingFormExample />;
}
```

### Custom Styled Form

```tsx
import { CustomStyledOnboardingForm } from '@/components/forms';

function App() {
  return <CustomStyledOnboardingForm />;
}
```

### Form with Custom Components

```tsx
import { CustomFieldComponentsExample } from '@/components/forms';

function App() {
  return <CustomFieldComponentsExample />;
}
```

## Styling

The form uses Tailwind CSS classes and can be customized by:

1. **Passing custom className props**
2. **Overriding component styles**
3. **Using custom field components**
4. **Modifying the default theme**

## Accessibility

- All form fields have proper labels and ARIA attributes
- Keyboard navigation is fully supported
- Screen reader announcements for errors and progress
- Focus management between steps
- High contrast support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- TypeScript 4.5+
- react-hook-form 7+
- zod 3+
- zustand 4+
- shadcn/ui components
- Tailwind CSS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
