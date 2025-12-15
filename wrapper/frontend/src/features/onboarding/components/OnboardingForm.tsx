import { useState, useCallback } from 'react';
import { useOnboardingForm } from '../hooks';
import { FlowSelector, UserClassification } from './FlowSelector';
import { FlowHeader } from './FlowHeader';
import { MultiStepForm } from './MultiStepForm';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { SuccessMessage } from './SuccessMessage';
import { useToast } from './Toast';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { useRateLimit } from '../hooks/useRateLimit';
import { sanitizeFormData } from '../utils/sanitization';
import { existingBusinessData, newBusinessData } from '../schemas';
import { getFlowConfig } from '../config/flowConfigs';

// Example function to determine user classification
// This would typically be called with user data from your authentication system
// Enhanced classification logic based on user journey flowchart
export const determineUserClassification = (
  email?: string,
  userProfile?: any,
  urlParams?: URLSearchParams,
  mobileVerified?: boolean,
  dinVerified?: boolean
): UserClassification | undefined => {
  // 1. Check if mobile OTP is verified (from flowchart)
  if (mobileVerified) {
    return 'mobileOtpVerified';
  }

  // 2. Check if DIN is verified (from flowchart)
  if (dinVerified) {
    return 'dinVerification';
  }

  // 3. Email domain analysis (With Domain Mail vs Without Domain Mail)
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();

    // Professional/Corporate domains (NOT personal email providers)
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com'];
    const isPersonalEmail = personalDomains.some(personal => domain?.includes(personal));

    if (!isPersonalEmail && domain) {
      return 'withDomainMail'; // Professional domain email
    } else {
      return 'withoutDomainMail'; // Personal email
    }
  }

  // 4. Business registration status (With GST vs Without GST)
  if (urlParams) {
    if (urlParams.get('gst') === 'true') return 'withGST';
    if (urlParams.get('gst') === 'false') return 'withoutGST';
  }

  // 5. Check user profile for business status
  if (userProfile?.hasExistingBusiness) {
    return 'withGST'; // Existing business typically has GST
  }

  if (userProfile?.isRegisteredBusiness === false) {
    return 'withoutGST'; // Explicitly not registered
  }

  // 6. User role analysis (Employee vs Founder)
  if (userProfile) {
    if (userProfile.role === 'employee' || userProfile.isEmployee) {
      return 'employee';
    }
    if (userProfile.role === 'founder' || userProfile.isFounder || userProfile.isOwner) {
      return 'founder';
    }
  }

  // 7. Check URL parameters for specific classifications
  if (urlParams) {
    const classification = urlParams.get('classification');
    if (classification === 'enterprise') return 'enterprise';
    if (classification === 'freemium') return 'freemium';
    if (classification === 'growth') return 'growth';
    if (classification === 'aspiringFounder') return 'aspiringFounder';
    if (classification === 'corporateEmployee') return 'corporateEmployee';
  }

  // 8. Tier-based classification
  if (userProfile?.tier) {
    if (userProfile.tier === 'freemium' || userProfile.plan === 'free') return 'freemium';
    if (userProfile.tier === 'growth' || userProfile.plan === 'growth') return 'growth';
    if (userProfile.tier === 'enterprise' || userProfile.plan === 'enterprise') return 'enterprise';
  }

  return undefined; // Let the flow selection determine
};

export const OnboardingForm = () => {
  const [selectedFlow, setSelectedFlow] = useState<'newBusiness' | 'existingBusiness' | null>(null);
  const [isFlowSelected, setIsFlowSelected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userClassification, setUserClassification] = useState<UserClassification | undefined>();

  const form = useOnboardingForm(selectedFlow || 'newBusiness');
  const { addToast } = useToast();
  const { isRateLimited, recordAttempt, getTimeUntilReset } = useRateLimit({
    maxAttempts: 3,
    windowMs: 60000 // 1 minute
  });
  
  const flowConfig = selectedFlow ? getFlowConfig(selectedFlow) : null;

  // Form persistence
  const { clearFormData, hasPersistedData } = useFormPersistence(
    form, 
    selectedFlow || 'newBusiness', 
    currentStep
  );

  const handleFlowSelect = useCallback((flowId: 'newBusiness' | 'existingBusiness') => {
    setSelectedFlow(flowId);
    setIsFlowSelected(true);
    setCurrentStep(1);
    setIsSubmitted(false); // Reset success state
    form.reset(); // Reset form when changing flows

    // Determine user classification based on user journey flowchart
    // This follows the decision tree: Business Registration -> GST -> Domain Mail -> Role -> Tier
    let classification: UserClassification | undefined;

    // Use the enhanced classification function with user context
    classification = determineUserClassification(
      undefined, // userEmail - would come from auth
      undefined, // userProfile - would come from user context
      new URLSearchParams(window.location.search) // URL parameters for testing
    );

    // Flow-specific defaults based on user journey
    if (!classification) {
      if (flowId === 'newBusiness') {
        // New business path - could be founder or employee
        classification = 'aspiringFounder'; // Default for new business founders
      } else {
        // Existing business path - typically GST registered
        classification = 'withGST'; // Default for existing businesses
      }
    }

    // Alternative: Use the helper function with actual user data
    // classification = determineUserClassification(
    //   userEmail, // from authentication
    //   userProfile, // from user context
    //   new URLSearchParams(window.location.search), // URL parameters
    //   mobileVerified, // mobile OTP status
    //   dinVerified // DIN verification status
    // );

    // Example classifications you can test (matches the flowchart):
    // classification = 'withDomainMail'; // Professional domain email
    // classification = 'withoutDomainMail'; // Personal email
    // classification = 'withGST'; // GST registered business
    // classification = 'withoutGST'; // Non-GST business
    // classification = 'employee'; // Employee path
    // classification = 'founder'; // Founder path
    // classification = 'dinVerification'; // DIN verified
    // classification = 'mobileOtpVerified'; // Mobile OTP verified
    // classification = 'freemium'; // Freemium tier
    // classification = 'growth'; // Growth tier
    // classification = 'enterprise'; // Enterprise tier

    setUserClassification(classification);
  }, [form]);

  const handleSubmit = useCallback(async (data: newBusinessData | existingBusinessData) => {
    // Check rate limiting
    if (isRateLimited) {
      const remainingTime = Math.ceil(getTimeUntilReset() / 1000);
      addToast(`Too Many Attempts: Please wait ${remainingTime} seconds before trying again.`, {
        type: 'error',
        duration: 5000
      });
      return;
    }

    setIsSubmitting(true);
    recordAttempt();
    
    try {
      // Sanitize form data before submission
      const sanitizedData = sanitizeFormData(data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear persisted data on successful submission
      clearFormData();
      
      // Set success state to show success message
      setIsSubmitted(true);
      
      addToast(`Company Created Successfully! Your ${selectedFlow} company has been created and is ready to use.`, {
        type: 'success',
        duration: 5000
      });

      console.log('Form submitted:', sanitizedData);
      console.log('Selected flow:', selectedFlow);
      
    } catch (error) {
      console.error('Submission error:', error);
      addToast('There was an error submitting your form. Please try again.', {
        type: 'error',
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFlow, addToast, clearFormData, form, setIsSubmitting, isRateLimited, recordAttempt, getTimeUntilReset]);

  const handleBackToFlowSelection = useCallback(() => {
    setIsFlowSelected(false);
    setSelectedFlow(null);
    setCurrentStep(1);
    form.reset();
  }, [form, setIsFlowSelected, setSelectedFlow, setCurrentStep]);

  const handleError = useCallback((error: Error, errorInfo: any) => {
    console.error('Onboarding Error:', error, errorInfo);
    addToast('An unexpected error occurred. Please refresh the page and try again.', {
      type: 'error',
      duration: 10000
    });
  }, [addToast]);

  // Show success message after company creation
  if (isSubmitted) {
    return (
      <SuccessMessage />
    );
  }

  if (!isFlowSelected) {
  return (
    <ErrorBoundary onError={handleError}>
      <FlowSelector
        onFlowSelect={handleFlowSelect}
        selectedFlow={selectedFlow || undefined}
        userClassification={userClassification}
      />
      {hasPersistedData && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            You have unsaved progress. Your form data will be restored when you select a flow.
          </p>
        </div>
      )}
    </ErrorBoundary>
  );
};

/**
 * USER JOURNEY FLOWCHART-BASED ONBOARDING SYSTEM
 *
 * The onboarding system now follows the comprehensive user journey flowchart.
 * Here's how the classification system works:
 *
 * 🎯 USER JOURNEY FLOW:
 * 1. User Information → Mobile OTP Verification
 * 2. Registered Business? (Yes/No Toggle)
 * 3. With GST vs Without GST paths
 * 4. With Domain Mail vs Without Domain Mail paths
 * 5. Employee vs Founder role selection
 * 6. DIN Number Verification (for founders)
 * 7. Tier Selection: Freemium → Growth → Enterprise
 * 8. Account Type Assignment
 * 9. Feature Access based on profile
 *
 * 🔍 CLASSIFICATION LOGIC:
 * 1. Check mobile OTP verification status
 * 2. Check DIN verification status
 * 3. Email domain analysis (Professional vs Personal)
 * 4. Business registration status (GST vs Non-GST)
 * 5. User role analysis (Employee vs Founder)
 * 6. Tier-based classification
 * 7. Account type determination
 *
 * 📋 CLASSIFICATION TYPES (Following Flowchart):
 *    - 'mobileOtpVerified': Mobile OTP verified users
 *    - 'dinVerification': DIN verified business owners
 *    - 'withDomainMail': Professional domain email users
 *    - 'withoutDomainMail': Personal email users
 *    - 'withGST': GST registered businesses
 *    - 'withoutGST': Non-GST businesses
 *    - 'employee': Employee onboarding path
 *    - 'founder': Founder/owner path
 *    - 'freemium': Freemium tier users
 *    - 'growth': Growth tier users
 *    - 'enterprise': Enterprise tier users
 *    - 'aspiringFounder': New entrepreneurs
 *    - 'corporateEmployee': Corporate professionals
 *
 * 🚀 PERSONALIZATION FEATURES:
 *    - Dynamic greetings and descriptions based on journey stage
 *    - Personalized form fields and requirements
 *    - Different business type suggestions per user type
 *    - Conditional field visibility (GST fields, domain integration, etc.)
 *    - Customized step flows based on user classification
 *    - Tailored help text and guidance per journey path
 *    - Role-based feature access and permissions
 *
 * 🧪 TESTING CLASSIFICATIONS:
 * Add these URL parameters to test different user journey paths:
 *    - ?gst=true → 'withGST' (GST registered business)
 *    - ?gst=false → 'withoutGST' (Non-GST business)
 *    - ?classification=employee → 'employee' path
 *    - ?classification=founder → 'founder' path
 *    - ?classification=dinVerification → DIN verified path
 *    - ?classification=mobileOtpVerified → Mobile OTP verified path
 *    - ?classification=freemium → Freemium tier
 *    - ?classification=growth → Growth tier
 *    - ?classification=enterprise → Enterprise tier
 *
 * 📱 EMAIL-BASED CLASSIFICATION:
 *    - Gmail/Yahoo/Hotmail → 'withoutDomainMail' (Personal email)
 *    - Company domains → 'withDomainMail' (Professional email)
 *    - Corporate domains → 'withDomainMail' + 'corporateEmployee'
 *
 * 🎯 EXAMPLE USAGE:
 * ```typescript
 * // Test different user journey paths
 * const testEmail = 'admin@mycompany.com'; // → 'withDomainMail'
 * const testParams = new URLSearchParams('gst=false'); // → 'withoutGST'
 * const classification = determineUserClassification(testEmail, null, testParams);
 * ```
 */

  if (!flowConfig) {
    return (
      <ErrorBoundary onError={handleError}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Configuration Error</h2>
            <p className="text-gray-600 mb-4">Flow configuration not found</p>
            <button
              onClick={handleBackToFlowSelection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Flow Selection
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          message="Submitting your form..."
        />
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <div className="relative">
        <FlowHeader
          title={flowConfig?.name}
          description={flowConfig?.description}
        />

        <MultiStepForm
          form={form}
          stepsConfig={flowConfig.steps}
          onSubmit={handleSubmit}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          userClassification={userClassification}
        />
      </div>
    </ErrorBoundary>
  );
};
