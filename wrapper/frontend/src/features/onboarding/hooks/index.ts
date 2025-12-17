/**
 * Onboarding Hooks
 */

import { useState, useCallback, useMemo } from 'react';
import { useForm, UseFormReturn, useFormState } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';

export const useOnboardingForm = (_flowType: 'newBusiness' | 'existingBusiness') => {
  return useForm<newBusinessData | existingBusinessData>({
    mode: 'onChange',
    defaultValues: {
      teamMembers: [], // Initialize teamMembers as empty array
      taxRegistered: false,
      vatGstRegistered: false,
      mailingAddressSameAsRegistered: true,
      termsAccepted: false,
      country: 'IN', // Default to India
      businessDetails: {
        country: 'IN', // Default to India
      },
      defaultLanguage: 'en',
      defaultLocale: 'en-IN', // Default to India locale
      defaultCurrency: 'INR', // Default to Indian Rupee
      defaultTimeZone: 'Asia/Kolkata', // Default to India timezone
    },
  });
};

export const useStepNavigation = (
  form: UseFormReturn<newBusinessData | existingBusinessData>,
  stepsConfig: StepConfig[]
) => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Subscribe to form state changes to prevent unnecessary re-renders
  const { errors, isValid } = useFormState({ 
    control: form.control,
    // Only subscribe to errors and isValid, not all form state
  });

  // Helper to check if field has error
  const hasError = useCallback((fieldPath: string, errors: any): boolean => {
    const parts = fieldPath.split('.');
    let errorObj: any = errors;
    for (const part of parts) {
      if (!errorObj || typeof errorObj !== 'object') return false;
      errorObj = errorObj[part];
    }
    return !!errorObj;
  }, []);

  const canProceed = useCallback((): boolean => {
    // Check if current step is valid
    const currentStepId = stepsConfig[currentStep - 1]?.id;
    if (!currentStepId) return false;

    const values = form.getValues();

    // Step-specific validation - Updated for new 5-step structure
    switch (currentStepId) {
      case 'businessDetails':
        const businessDetails = values.businessDetails;
        return !!(
          values.companyType &&
          (businessDetails?.companyName || values.businessName) &&
          (businessDetails?.businessType || values.businessType) &&
          (businessDetails?.country || values.country) &&
          !hasError('companyType', errors) &&
          !hasError('businessDetails.companyName', errors) &&
          !hasError('businessDetails.businessType', errors) &&
          !hasError('businessDetails.country', errors)
        );
      case 'taxDetails':
        // Required: billing address fields (street, city, zip)
        const hasBillingStreet = !!(values.billingAddress || values.billingStreet);
        const hasBillingCity = !!values.billingCity;
        const hasBillingZip = !!values.billingZip;
        const hasBillingAddress = hasBillingStreet && hasBillingCity && hasBillingZip;
        
        // Conditional: State required for countries with states
        const country = values.businessDetails?.country || values.country || 'IN';
        const needsState = ['IN', 'US', 'CA', 'AU'].includes(country);
        const hasState = !needsState || !!values.state;
        
        // Conditional: Tax IDs based on registration status
        if (values.taxRegistered) {
          if (country === 'IN' && values.vatGstRegistered) {
            return hasBillingAddress && hasState && !!values.gstin && !hasError('gstin', errors);
          }
          if (country === 'US' && values.taxRegistered) {
            return hasBillingAddress && hasState && !!values.einNumber && !hasError('einNumber', errors);
          }
        }
        return hasBillingAddress && hasState; // Basic address required
      case 'adminDetails':
        return !!(
          values.firstName &&
          values.lastName &&
          values.adminEmail &&
          values.supportEmail &&
          !hasError('firstName', errors) &&
          !hasError('lastName', errors) &&
          !hasError('adminEmail', errors) &&
          !hasError('supportEmail', errors)
        );
      case 'review':
        // On review step, canProceed should always return true
        // The submit button will be controlled by canSubmit which checks termsAccepted
        return true;
      default:
        // For unknown steps, allow proceeding
        return true;
    }
  }, [form, currentStep, stepsConfig, hasError, errors]);

  const nextStep = useCallback(async (onValidationError?: (errors: any, stepNumber: number) => void) => {
    const currentStepId = stepsConfig[currentStep - 1]?.id;
    const isLastStep = currentStep >= stepsConfig.length;
    
    // Never submit on nextStep - only allow navigation
    if (isLastStep) {
      return; // Don't do anything on last step
    }
    
    if (currentStepId && currentStep < stepsConfig.length) {
      // Check if we can proceed based on step-specific validation
      const canProceedNow = canProceed();
      if (canProceedNow) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Trigger validation to show errors
        const result = await form.trigger();
        if (!result && onValidationError) {
          onValidationError(form.formState.errors, currentStep);
        }
      }
    }
  }, [form, currentStep, stepsConfig, canProceed]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= stepsConfig.length) {
      setCurrentStep(stepNumber);
    }
  }, [stepsConfig.length]);

  const canSubmit = useCallback(() => {
    // Check if all steps are valid AND terms are accepted
    const values = form.getValues();
    return isValid && values.termsAccepted === true;
  }, [form, isValid]);

  const getStepStatus = useCallback((stepNumber: number): 'completed' | 'active' | 'error' | 'upcoming' => {
    if (stepNumber < currentStep) {
      return 'completed';
    } else if (stepNumber === currentStep) {
      // Check if current step has errors
      return Object.keys(errors).length > 0 ? 'error' : 'active';
    } else {
      return 'upcoming';
    }
  }, [currentStep, errors]);

  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    canProceed,
    canSubmit,
    getStepStatus,
  };
};

export const useTeamManagement = (form: UseFormReturn<newBusinessData | existingBusinessData>) => {
  const addTeamMember = useCallback(() => {
    const currentMembers = form.getValues('teamMembers') || [];
    const newMember = {
      id: Date.now(),
      name: '',
      email: '',
      role: '',
      phone: '',
    };
    form.setValue('teamMembers', [...currentMembers, newMember], { shouldValidate: false });
  }, [form]);

  const updateTeamMember = useCallback((
    id: number,
    field: keyof import('../schemas').TeamMember,
    value: string
  ) => {
    const currentMembers = form.getValues('teamMembers') || [];
    const updatedMembers = currentMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    );
    form.setValue('teamMembers', updatedMembers, { shouldValidate: false });
  }, [form]);

  const removeTeamMember = useCallback((id: number) => {
    const currentMembers = form.getValues('teamMembers') || [];
    const updatedMembers = currentMembers.filter(member => member.id !== id);
    form.setValue('teamMembers', updatedMembers, { shouldValidate: false });
  }, [form]);

  return {
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
  };
};

