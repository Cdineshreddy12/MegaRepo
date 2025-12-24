/**
 * 🚀 **ONBOARDING FEATURE - OPTIMIZED VERSION**
 * Performance-optimized onboarding feature module
 * Exports optimized components for better performance
 */

// Pages
export { default as OnboardingPage } from './pages/OnboardingOptimized';

// Components
export { OnboardingFormOptimized } from './components/OnboardingFormOptimized';
export { FlowSelector, type UserClassification } from './components/FlowSelector';
export { MultiStepFormOptimized } from './components/MultiStepFormOptimized';
export { OnboardingLayoutOptimized } from './components/OnboardingLayoutOptimized';
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
export { determineUserClassification } from './components/OnboardingFormOptimized';