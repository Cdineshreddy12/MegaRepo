import React, { useState, useEffect, useMemo } from 'react';
import { MultiStepForm, CustomProgressIndicator } from '@/components/forms';
import { FormConfig, StepNavigationProps } from '@/components/forms/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { toast } from 'sonner';

/**
 * Demo page showcasing different progress indicators using context
 */
const OnboardingPage: React.FC = () => {
    const { user, isLoading: isKindeLoading } = useKindeAuth();
    const { theme, setTheme } = useTheme();
    const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [userEmail, setUserEmail] = useState('');

    // Force light theme for onboarding page
    useEffect(() => {
        const originalTheme = theme;
        if (theme !== 'light') {
            console.log('🔅 Forcing light theme for onboarding page');
            setTheme('light');
        }

        // Restore original theme when component unmounts
        return () => {
            if (originalTheme !== 'light') {
                console.log('🔄 Restoring original theme:', originalTheme);
                setTheme(originalTheme);
            }
        };
    }, []); // Empty dependency array - only run on mount/unmount

    // Auto-populate from Kinde user data and set authentication status
    useEffect(() => {
        console.log('🔍 Onboarding: useEffect triggered', {
            user: !!user,
            userEmail: user?.email,
            userId: user?.id,
            userKeys: user ? Object.keys(user) : 'no user',
        });

        if (user) {
            console.log('📋 Full Kinde user object:', user);

            // Try multiple email field variations
            const possibleEmailFields = ['email', 'preferred_email', 'email_address', 'mail', 'user_email'];
            let foundEmail = null;

            for (const field of possibleEmailFields) {
                if ((user as any)[field]) {
                    foundEmail = (user as any)[field];
                    console.log(`✅ Found email in field '${field}':`, foundEmail);
                    break;
                }
            }

            if (foundEmail) {
                console.log('✅ Setting email in form:', foundEmail);
                setUserEmail(foundEmail);
                setIsUserAuthenticated(true);
                setIsLoadingUser(false);
            } else {
                console.log('❌ No email found in any expected field');
                console.log('Available fields:', Object.keys(user));
                setIsUserAuthenticated(false);
                setIsLoadingUser(false);
            }
        } else {
            console.log('❌ No user object from Kinde yet');
            setIsUserAuthenticated(false);
            // Only stop loading if Kinde is done loading, otherwise keep waiting
            if (!isKindeLoading) {
                setIsLoadingUser(false);
            }
        }
    }, [user, isKindeLoading]);

    const demoConfig: FormConfig = {
        title: 'Context Demo',
        description: 'Showcasing different progress indicators with context access',
        steps: [
            {
                id: 'company-info',
                title: 'Company Information',
                description: 'Tell us about your company',
                showProgress: true,
                fields: [
                    {
                        id: 'legalCompanyName',
                        label: 'Legal Company Name',
                        type: 'text',
                        placeholder: 'Enter your legal company name',
                        required: true,
                        className: 'col-span-2',
                        helpText: 'The official registered name of your company'
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
                            { value: '201-1000', label: '201-1000 employees' },
                            { value: '1000+', label: '1000+ employees' },
                        ],
                        className: 'col-span-1'
                    },
                    {
                        id: 'businessType',
                        label: 'Business Type',
                        type: 'select',
                        placeholder: 'Select your business type',
                        required: true,
                        options: [
                            { value: 'technology', label: 'Technology & Software' },
                            { value: 'healthcare', label: 'Healthcare & Medical' },
                            { value: 'finance', label: 'Finance & Banking' },
                            { value: 'retail', label: 'Retail & E-commerce' },
                            { value: 'manufacturing', label: 'Manufacturing & Industrial' },
                            { value: 'consulting', label: 'Consulting & Professional Services' },
                            { value: 'education', label: 'Education & Training' },
                            { value: 'real-estate', label: 'Real Estate' },
                            { value: 'hospitality', label: 'Hospitality & Tourism' },
                            { value: 'non-profit', label: 'Non-Profit & NGO' },
                            { value: 'other', label: 'Other' },
                        ],
                        className: 'col-span-1'
                    },
                    {
                        id: 'hasGstin',
                        label: 'GST Registration',
                        type: 'switch',
                        switchLabel: 'I have a GSTIN (Goods and Services Tax Identification Number)',
                        required: false,
                        className: 'col-span-2',
                        helpText: ' is your company GST registered ?'
                    },
                    {
                        id: 'gstin',
                        label: 'GSTIN',
                        type: 'text',
                        placeholder: '22AAAAA0000A1Z6',
                        required: false,
                        className: 'col-span-1',
                        helpText: 'GST Identification Number (15 digits)',
                        conditional: {
                            watch: 'hasGstin',
                            value: true
                        }
                    }
                ]
            },
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
                        placeholder: isLoadingUser ? 'Loading your email...' : 'Enter your email address',
                        required: true,
                        disabled: isUserAuthenticated && userEmail ? true : false,
                        defaultValue: userEmail,
                        className: 'col-span-2',
                        helpText: isLoadingUser
                            ? 'Loading your email from authentication...'
                            : isUserAuthenticated && userEmail
                                ? 'Email securely loaded from your authentication'
                                : 'Please enter your email address'
                    },

                ]
            },

            {
                id: 'preferences',
                title: 'Preferences',
                description: 'Configure your preferences',
                showProgress: true,
                fields: [
                    {
                        id: 'country',
                        label: 'Country',
                        type: 'select',
                        placeholder: 'Choose your country',
                        required: true,
                        options: [
                            { value: 'US', label: 'United States' },
                            { value: 'CA', label: 'Canada' },
                            { value: 'GB', label: 'United Kingdom' },
                            { value: 'AU', label: 'Australia' },
                        ],
                        className: 'col-span-1'
                    },
                    {
                        id: 'timezone',
                        label: 'Timezone',
                        type: 'select',
                        placeholder: 'Select your timezone',
                        required: true,
                        options: [
                            { value: 'PST', label: 'Pacific Standard Time (PST)' },
                            { value: 'EST', label: 'Eastern Standard Time (EST)' },
                            { value: 'GMT', label: 'Greenwich Mean Time (GMT)' },
                        ],
                        className: 'col-span-1'
                    },
                    {
                        id: 'currency',
                        label: 'Preferred Currency',
                        type: 'select',
                        placeholder: 'Select your currency',
                        required: true,
                        options: [
                            { value: 'USD', label: 'USD - US Dollar ($)' },
                            { value: 'EUR', label: 'EUR - Euro (€)' },
                            { value: 'GBP', label: 'GBP - British Pound (£)' },
                            { value: 'INR', label: 'INR - Indian Rupee (₹)' },
                            { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
                            { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
                            { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
                            { value: 'CNY', label: 'CNY - Chinese Yuan (¥)' },
                        ],
                        className: 'col-span-2',
                        helpText: 'This will be used for displaying prices and financial data'
                    },
                ]
            },
            {
                id: 'final-step',
                title: 'Confirmation',
                description: 'Review and confirm your information',
                showProgress: true,
                fields: [
                    {
                        id: 'termsText',
                        label: 'Terms and Conditions',
                        type: 'textarea',
                        required: false,
                        disabled: true,
                        defaultValue: `Terms and Conditions:

1. Acceptance of Terms: By accessing and using our service, you accept and agree to be bound by the terms and provisions of this agreement.

2. Service Description: We provide business management software including CRM, HR, and financial tools.

3. User Responsibilities: You are responsible for maintaining the confidentiality of your account and password.

4. Data Privacy: We collect and process personal data in accordance with our Privacy Policy to provide our services.

5. Intellectual Property: All content, features, and functionality are owned by us and are protected by copyright laws.

6. Limitation of Liability: Our service is provided "as is" without warranties of any kind.

7. Termination: Either party may terminate this agreement at any time.

By checking the box below, you acknowledge that you have read, understood, and agree to these terms and conditions.`,
                        rows: 8,
                        className: 'col-span-2 text-slate-900',
                        helpText: 'Please read the terms and conditions carefully before proceeding.'
                    },
                    {
                        id: 'termsAccepted',
                        label: 'Agreement',
                        type: 'checkbox',
                        checkboxLabel: 'I have read and agree to the Terms and Conditions and Privacy Policy',
                        required: true,
                        className: 'col-span-2',
                        helpText: 'You must agree to the terms and conditions to continue with the onboarding process.'
                    }
                ]
            }
        ]
    };

    const handleSubmit = async (values: Record<string, any>) => {
        try {
            console.log('🚀 Submitting frontend onboarding form:', values);

            // Prepare the data for the backend API
            const onboardingData = {
                legalCompanyName: values.legalCompanyName,
                companySize: values.companySize,
                businessType: values.businessType,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                hasGstin: values.hasGstin || false,
                gstin: values.hasGstin ? values.gstin : undefined,
                country: values.country,
                timezone: values.timezone,
                currency: values.currency,
                termsAccepted: values.termsAccepted
            };

            console.log('📡 Sending data to backend:', onboardingData);

            // Import API and make the request
            const { api } = await import('@/lib/api');
            const response = await api.post('/onboarding/onboard-frontend', onboardingData);

            if (response.data.success) {
                console.log('✅ Onboarding completed successfully:', response.data);

                // Check if user is already onboarded
                if (response.data.data?.alreadyOnboarded) {
                    toast.success('You have already completed onboarding. Redirecting to dashboard...', {
                        duration: 3000
                    });
                    setTimeout(() => {
                        const redirectUrl = response.data.data.redirectTo || '/dashboard';
                        console.log('🔗 Redirecting already onboarded user to:', redirectUrl);
                        window.location.href = redirectUrl;
                    }, 1500);
                    return;
                }

                // Handle redirect URL if provided
                if (response.data.data.redirectUrl) {
                    console.log('🔗 Redirecting to:', response.data.data.redirectUrl);
                    window.location.href = response.data.data.redirectUrl;
                } else {
                    // Fallback to dashboard
                    window.location.href = '/dashboard';
                }

                toast.success('🎉 Organization setup completed successfully!');
            } else {
                throw new Error(response.data.message || 'Onboarding failed');
            }

        } catch (error: any) {
            console.error('❌ Onboarding submission failed:', error);

            // Handle duplicate email error - redirect to dashboard
            if (error.response?.status === 409 || error.response?.data?.code === 'EMAIL_ALREADY_ASSOCIATED') {
                const errorMessage = error.response?.data?.message || 'This email is already associated with an organization';
                toast.error(errorMessage, {
                    duration: 5000,
                    description: 'Redirecting you to the dashboard...'
                });
                
                // Redirect to dashboard after showing toast
                setTimeout(() => {
                    const redirectUrl = error.response?.data?.redirectTo || '/dashboard';
                    console.log('🔗 Redirecting to dashboard:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 2000);
                return;
            }

            // Handle other errors with clear messages
            if (error.response?.status === 400) {
                const errorMessage = error.response?.data?.message || 'Invalid data provided. Please check your input and try again.';
                toast.error(errorMessage, { duration: 5000 });
            } else if (error.response?.status === 500) {
                toast.error('Server error occurred. Please try again in a moment.', { duration: 5000 });
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                toast.error('Network error. Please check your connection and try again.', { duration: 5000 });
            } else {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.';
                toast.error(errorMessage, { duration: 5000 });
            }
        }
    };



    // Initial form values with auto-populated email
    const initialValues = useMemo(() => ({
        email: userEmail || ''
    }), [userEmail]);

    // Key to force re-mount when email loads (so form gets correct initial values)
    const formKey = `onboarding-form-${userEmail ? 'with-email' : 'loading'}`;

    // Show loading while determining authentication status
    if (isLoadingUser || isKindeLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Card>
                <CardContent className="p-0">
                    <MultiStepForm
                        key={formKey}
                        config={demoConfig}
                        onSubmit={handleSubmit}
                        ProgressIndicator={CustomProgressIndicator}
                        initialValues={initialValues}
                    // StepNavigation={CustomStepNavigation}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default OnboardingPage;
