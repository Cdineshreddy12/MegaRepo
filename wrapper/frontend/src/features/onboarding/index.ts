/**
 * 🚀 **ONBOARDING FEATURE**
 * Centralized onboarding feature module
 * Exports all onboarding pages, components, and guards
 */

// Pages
export { default as OnboardingPage } from './pages/Onboarding';

// Components
export { OnboardingForm } from './components/OnboardingForm';
export { FlowSelector, type UserClassification } from './components/FlowSelector';
export { MultiStepForm } from './components/MultiStepForm';
export { OnboardingLayout } from './components/OnboardingLayout';
export { StepRenderer } from './components/StepRenderer';

// Steps
export { AdminDetailsStep } from './components/steps/AdminDetailsStep';
export { BusinessDetailsStep } from './components/steps/BusinessDetailsStep';
export { CompanyTypeStep } from './components/steps/CompanyTypeStep';
export { PersonalDetailsStep } from './components/steps/PersonalDetailsStep';
export { ReviewStep } from './components/steps/ReviewStep';
export { StateStep } from './components/steps/StateStep';
export { TaxDetailsStep } from './components/steps/TaxDetailsStep';
export { TeamStep } from './components/steps/TeamStep';

// Guards
export { OnboardingPageGuard } from './components/OnboardingPageGuard';
export { OnboardingGuard } from './components/OnboardingGuard';

// Utilities
export { determineUserClassification } from './components/OnboardingForm';

