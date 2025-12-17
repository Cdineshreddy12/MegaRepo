import { useState, useCallback } from 'react';
import { useOnboardingForm } from '../hooks';
import { UserClassification } from './FlowSelector';
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

/**
 * Verify if email is a domain email (not personal email provider)
 */
export const verifyEmailDomain = (email: string): { isDomainEmail: boolean; domain: string | null } => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { isDomainEmail: false, domain: null };
  }
  
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
    'yandex.com', 'zoho.com', 'gmx.com'
  ];
  
  const isPersonalEmail = personalDomains.some(personal => domain.includes(personal));
  
  return {
    isDomainEmail: !isPersonalEmail,
    domain: domain
  };
};

/**
 * Determine GST status from various sources
 */
const determineGSTStatus = (
  urlParams?: URLSearchParams,
  userProfile?: any,
  formData?: any
): boolean | null => {
  // 1. Check URL parameters
  if (urlParams) {
    const gstParam = urlParams.get('gst');
    if (gstParam === 'true') return true;
    if (gstParam === 'false') return false;
  }
  
  // 2. Check user profile
  if (userProfile?.hasExistingBusiness) return true;
  if (userProfile?.isRegisteredBusiness === false) return false;
  if (userProfile?.hasGST) return true;
  
  // 3. Check form data (if available)
  if (formData?.vatGstRegistered) return true;
  if (formData?.gstin) return true;
  
  return null; // Unknown
};

/**
 * Enhanced classification logic
 */
export const determineUserClassification = (
  email?: string,
  userProfile?: any,
  urlParams?: URLSearchParams,
  mobileVerified?: boolean,
  dinVerified?: boolean,
  formData?: any // Optional form data for GST detection
): UserClassification | undefined => {
  // 1. Check if mobile OTP is verified
  if (mobileVerified) {
    return 'mobileOtpVerified';
  }

  // 2. Check if DIN is verified
  if (dinVerified) {
    return 'dinVerification';
  }

  // 3. Check URL parameters for explicit classification
  if (urlParams) {
    const explicitClassification = urlParams.get('classification');
    if (explicitClassification) {
      const validClassifications: UserClassification[] = [
        'enterprise', 'freemium', 'growth', 'aspiringFounder', 
        'corporateEmployee', 'withGST', 'withoutGST', 'withDomainMail', 
        'withoutDomainMail', 'employee', 'founder'
      ];
      if (validClassifications.includes(explicitClassification as UserClassification)) {
        return explicitClassification as UserClassification;
      }
    }
  }

  // 4. Matrix Classification
  if (email) {
    const emailVerification = verifyEmailDomain(email);
    const hasGST = determineGSTStatus(urlParams, userProfile, formData);
    
    if (hasGST !== null) {
      if (hasGST === true && emailVerification.isDomainEmail) return 'corporateEmployee';
      if (hasGST === true && !emailVerification.isDomainEmail) return 'founder';
      if (hasGST === false && emailVerification.isDomainEmail) return 'corporateEmployee';
      if (hasGST === false && !emailVerification.isDomainEmail) return 'aspiringFounder';
    }
    
    return emailVerification.isDomainEmail ? 'withDomainMail' : 'withoutDomainMail';
  }

  const hasGST = determineGSTStatus(urlParams, userProfile, formData);
  if (hasGST === true) return 'withGST';
  if (hasGST === false) return 'withoutGST';

  if (userProfile) {
    if (userProfile.role === 'employee' || userProfile.isEmployee) return 'employee';
    if (userProfile.role === 'founder' || userProfile.isFounder || userProfile.isOwner) return 'founder';
  }

  if (userProfile?.tier) {
    if (userProfile.tier === 'freemium' || userProfile.plan === 'free') return 'freemium';
    if (userProfile.tier === 'growth' || userProfile.plan === 'growth') return 'growth';
    if (userProfile.tier === 'enterprise' || userProfile.plan === 'enterprise') return 'enterprise';
  }

  return 'aspiringFounder';
};

export const OnboardingForm = () => {
  const [selectedFlow] = useState<'newBusiness' | 'existingBusiness'>('newBusiness');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [userClassification] = useState<UserClassification | undefined>(() => {
    const classification = determineUserClassification(
      undefined, 
      undefined, 
      new URLSearchParams(window.location.search) 
    );
    return classification || 'aspiringFounder';
  });

  const form = useOnboardingForm(selectedFlow);
  const { addToast } = useToast();
  const { isRateLimited, recordAttempt, getTimeUntilReset } = useRateLimit({
    maxAttempts: 3,
    windowMs: 60000 
  });
  
  const flowConfig = getFlowConfig(selectedFlow);

  const { clearFormData } = useFormPersistence(
    form, 
    selectedFlow, 
    currentStep
  );

  const handleSubmit = useCallback(async (data: newBusinessData | existingBusinessData) => {
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
      const sanitizedData = sanitizeFormData(data);
      const businessDetails = sanitizedData.businessDetails || {};
      const billingAddressStr = typeof sanitizedData.billingAddress === 'string' 
        ? sanitizedData.billingAddress 
        : '';
      
      const submissionData = {
        companyName: businessDetails.companyName || sanitizedData.companyName || sanitizedData.businessName,
        businessType: businessDetails.businessType || sanitizedData.businessType,
        companySize: businessDetails.organizationSize || sanitizedData.organizationSize,
        organizationSize: businessDetails.organizationSize || sanitizedData.organizationSize,
        country: businessDetails.country || sanitizedData.country,
        companyType: sanitizedData.companyType,
        state: sanitizedData.state,
        
        taxRegistered: sanitizedData.taxRegistered || false,
        vatGstRegistered: sanitizedData.vatGstRegistered || false,
        hasGstin: !!sanitizedData.gstin || sanitizedData.vatGstRegistered,
        gstin: sanitizedData.gstin || null,
        panNumber: sanitizedData.panNumber || null,
        einNumber: sanitizedData.einNumber || null,
        vatNumber: sanitizedData.vatNumber || null,
        cinNumber: sanitizedData.cinNumber || null,
        
        billingStreet: sanitizedData.billingStreet || billingAddressStr.split('\n')[0] || null,
        billingCity: sanitizedData.billingCity || null,
        billingState: sanitizedData.billingState || sanitizedData.state || null,
        billingZip: sanitizedData.billingZip || null,
        billingCountry: sanitizedData.billingCountry || businessDetails.country || sanitizedData.country || null,
        incorporationState: sanitizedData.state || sanitizedData.incorporationState || null,
        
        mailingAddressSameAsRegistered: sanitizedData.mailingAddressSameAsRegistered !== undefined 
          ? sanitizedData.mailingAddressSameAsRegistered 
          : true,
        mailingStreet: sanitizedData.mailingAddress || sanitizedData.mailingStreet || null,
        mailingCity: sanitizedData.mailingCity || null,
        mailingState: sanitizedData.mailingState || null,
        mailingZip: sanitizedData.mailingZip || null,
        mailingCountry: sanitizedData.mailingCountry || null,
        
        adminEmail: sanitizedData.adminEmail,
        billingEmail: sanitizedData.billingEmail || null,
        supportEmail: sanitizedData.supportEmail || null,
        contactJobTitle: sanitizedData.contactJobTitle || null,
        preferredContactMethod: sanitizedData.preferredContactMethod || sanitizedData.contactPreferredContactMethod || null,
        phone: sanitizedData.adminMobile || sanitizedData.adminPhone || sanitizedData.phone || null,
        contactDirectPhone: sanitizedData.contactDirectPhone || null,
        contactMobilePhone: sanitizedData.contactMobilePhone || null,
        
        contactSalutation: sanitizedData.contactSalutation || null,
        contactMiddleName: sanitizedData.contactMiddleName || null,
        contactDepartment: sanitizedData.contactDepartment || null,
        contactAuthorityLevel: sanitizedData.contactAuthorityLevel || null,
        
        firstName: sanitizedData.firstName || sanitizedData.personalDetails?.firstName,
        lastName: sanitizedData.lastName || sanitizedData.personalDetails?.lastName,
        email: sanitizedData.email || sanitizedData.personalDetails?.email || sanitizedData.adminEmail,
        
        industry: sanitizedData.industry || null,
        
        defaultLanguage: sanitizedData.defaultLanguage || 'en',
        defaultLocale: sanitizedData.defaultLocale || 'en-US',
        defaultCurrency: sanitizedData.defaultCurrency || 'USD',
        defaultTimeZone: sanitizedData.defaultTimeZone || 'America/New_York',
        
        termsAccepted: sanitizedData.termsAccepted || false,
        
        website: sanitizedData.website || null,
        
        taxRegistrationDetails: {
          ...(sanitizedData.panNumber && { pan: sanitizedData.panNumber }),
          ...(sanitizedData.einNumber && { ein: sanitizedData.einNumber }),
          ...(sanitizedData.gstin && { gstin: sanitizedData.gstin }),
          ...(sanitizedData.vatNumber && { vat: sanitizedData.vatNumber }),
          ...(sanitizedData.cinNumber && { cin: sanitizedData.cinNumber }),
          country: businessDetails.country || sanitizedData.country || 'IN',
        },
      };

      console.log('🚀 Submitting onboarding data:', submissionData);
      
      // Call the /onboard-frontend endpoint with ALL fields
      const { default: api } = await import('@/lib/api');
      const response = await api.post('/onboarding/onboard-frontend', {
        // Company Information
        legalCompanyName: submissionData.companyName,
        companyType: submissionData.companyType,
        companySize: submissionData.companySize || submissionData.organizationSize,
        businessType: submissionData.businessType,
        industry: submissionData.industry,
        website: submissionData.website,
        
        // Admin/Contact Information
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        email: submissionData.email || submissionData.adminEmail,
        adminEmail: submissionData.adminEmail,
        adminMobile: submissionData.phone,
        supportEmail: submissionData.supportEmail,
        billingEmail: submissionData.billingEmail,
        
        // Contact Details
        contactSalutation: submissionData.contactSalutation,
        contactMiddleName: submissionData.contactMiddleName,
        contactJobTitle: submissionData.contactJobTitle,
        contactDepartment: submissionData.contactDepartment,
        contactAuthorityLevel: submissionData.contactAuthorityLevel,
        preferredContactMethod: submissionData.preferredContactMethod,
        contactDirectPhone: submissionData.contactDirectPhone,
        contactMobilePhone: submissionData.contactMobilePhone,
        
        // Tax & Compliance
        taxRegistered: submissionData.taxRegistered,
        vatGstRegistered: submissionData.vatGstRegistered,
        hasGstin: submissionData.hasGstin || false,
        gstin: submissionData.gstin,
        panNumber: submissionData.panNumber,
        einNumber: submissionData.einNumber,
        vatNumber: submissionData.vatNumber,
        cinNumber: submissionData.cinNumber,
        taxRegistrationDetails: submissionData.taxRegistrationDetails,
        
        // Address Information
        country: submissionData.country || 'IN',
        state: submissionData.state,
        incorporationState: submissionData.incorporationState,
        billingStreet: submissionData.billingStreet,
        billingCity: submissionData.billingCity,
        billingState: submissionData.billingState,
        billingZip: submissionData.billingZip,
        billingCountry: submissionData.billingCountry,
        mailingAddressSameAsRegistered: submissionData.mailingAddressSameAsRegistered,
        mailingStreet: submissionData.mailingStreet,
        mailingCity: submissionData.mailingCity,
        mailingState: submissionData.mailingState,
        mailingZip: submissionData.mailingZip,
        mailingCountry: submissionData.mailingCountry,
        
        // Localization
        timezone: submissionData.defaultTimeZone,
        currency: submissionData.defaultCurrency,
        defaultLanguage: submissionData.defaultLanguage,
        defaultLocale: submissionData.defaultLocale,
        
        // Terms
        termsAccepted: submissionData.termsAccepted
      });

      if (response.data.success) {
        clearFormData();
        setIsSubmitted(true);
        
        addToast(`Company Created Successfully! Your ${selectedFlow} company has been created.`, {
          type: 'success',
          duration: 5000
        });
      } else {
        throw new Error(response.data.message || 'Onboarding failed');
      }

    } catch (error: any) {
      console.error('Submission error:', error);
      
      // Handle API error responses
      let errorMessage = 'There was an error submitting your form. Please try again.';
      let errorFields: any[] = [];
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Check for validation errors
        if (errorData.errors) {
          const { formatValidationErrors } = await import('../utils/validationHelpers');
          const formatted = formatValidationErrors(errorData.errors);
          errorMessage = formatted.message;
          errorFields = formatted.fields;
        } 
        // Check for error message
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Check for error field
        else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : errorData.error.message || errorMessage;
        }
      } 
      // Handle network errors
      else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show toast with error message
      if (errorFields.length > 0) {
        const firstField = errorFields[0];
        addToast(errorMessage, {
          type: 'error',
          duration: 6000,
          action: {
            label: 'Go to Field',
            onClick: () => {
              // Navigate to step with error
              setCurrentStep(firstField.stepNumber);
              // Scroll to field after navigation
              setTimeout(() => {
                const fieldElement = document.querySelector(`[name="${firstField.fieldPath}"]`);
                if (fieldElement) {
                  fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  (fieldElement as HTMLElement).focus();
                }
              }, 300);
            },
          },
        });
      } else {
        addToast(errorMessage, {
          type: 'error',
          duration: 6000
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFlow, addToast, clearFormData, form, setIsSubmitting, isRateLimited, recordAttempt, getTimeUntilReset, setCurrentStep]);

  const handleError = useCallback((error: Error, errorInfo: any) => {
    console.error('Onboarding Error:', error, errorInfo);
    addToast('An unexpected error occurred. Please refresh the page and try again.', {
      type: 'error',
      duration: 10000
    });
  }, [addToast]);

  if (isSubmitted) {
    return <SuccessMessage />;
  }

  if (!flowConfig) {
    return (
      <ErrorBoundary onError={handleError}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Configuration Error</h2>
            <p className="text-gray-600 mb-4">Flow configuration not found</p>
            <button
              onClick={() => {
                setCurrentStep(1);
                form.reset();
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Submitting your form..." />
      </div>
    );
  }

  if (!flowConfig.steps || flowConfig.steps.length === 0) {
    return (
      <ErrorBoundary onError={handleError}>
        <div className="h-screen w-full overflow-hidden flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Form</h2>
            <p className="text-gray-600">Preparing your onboarding experience...</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <div className="h-screen w-full overflow-hidden">
        <MultiStepForm
          form={form}
          stepsConfig={flowConfig.steps || []}
          onSubmit={handleSubmit}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          userClassification={userClassification}
        />
      </div>
    </ErrorBoundary>
  );
};
