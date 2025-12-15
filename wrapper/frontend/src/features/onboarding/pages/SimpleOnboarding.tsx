import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { setKindeTokenGetter } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { PearlButton } from '@/components/ui/pearl-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Info, Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface OnboardingFormData {
  companyName: string;
  adminEmail: string;
  adminMobile: string;
  gstin: string;
}

const SimpleOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, getToken } = useKindeAuth();

  // Debug logging for component mount
  useEffect(() => {
    console.log('🚀 SimpleOnboarding component mounted');
    console.log('🔍 Initial Kinde auth state:', {
      user: !!user,
      userEmail: user?.email,
      userId: user?.id,
      userKeys: user ? Object.keys(user) : null
    });
  }, []); // Empty dependency array - only run on mount
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingGSTIN, setIsValidatingGSTIN] = useState(false);
  const [gstinValid, setGstinValid] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<OnboardingFormData>({
    companyName: '',
    adminEmail: '',
    adminMobile: '',
    gstin: ''
  });

  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Auto-fill from Kinde user data and set authentication status
  useEffect(() => {
    console.log('🔍 SimpleOnboarding: useEffect triggered', {
      user: !!user,
      userEmail: user?.email,
      userId: user?.id,
      userKeys: user ? Object.keys(user) : 'no user',
      userStringified: user ? JSON.stringify(user, null, 2) : 'no user'
    });

    if (user) {
      console.log('📋 Full Kinde user object:', user);

      // Try multiple email field variations
      const possibleEmailFields = ['email', 'preferred_email', 'email_address', 'mail', 'user_email'];
      let foundEmail = null;

      for (const field of possibleEmailFields) {
        if (user[field]) {
          foundEmail = user[field];
          console.log(`✅ Found email in field '${field}':`, foundEmail);
          break;
        }
      }

      if (foundEmail) {
        console.log('✅ Setting email in form:', foundEmail);
        setFormData(prev => ({
          ...prev,
          adminEmail: foundEmail
        }));
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
      setIsLoadingUser(true); // Keep loading if no user yet
    }
  }, [user]);

  // Set up Kinde token getter for API calls
  useEffect(() => {
    setKindeTokenGetter(getToken);
  }, [getToken]);

  // Validate GSTIN
  const validateGSTIN = async (gstin: string) => {
    if (!gstin || gstin.length !== 15) return;

    setIsValidatingGSTIN(true);
    try {
      // For now, just check the format. In production, this would call a GSTIN validation API
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const isValid = gstinRegex.test(gstin.toUpperCase());

      setGstinValid(isValid);

      if (isValid) {
        toast.success('GSTIN format is valid');
      } else {
        toast.error('Invalid GSTIN format. Please check and try again.');
      }
    } catch (error) {
      console.error('GSTIN validation failed:', error);
      setGstinValid(null);
      toast.error('Failed to validate GSTIN. Please try again.');
    } finally {
      setIsValidatingGSTIN(false);
    }
  };

  // Handle GSTIN input change
  const handleGSTINChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setFormData(prev => ({ ...prev, gstin: cleaned }));

    // Reset validation
    setGstinValid(null);

    // Auto-validate when complete
    if (cleaned.length === 15) {
      setTimeout(() => validateGSTIN(cleaned), 500);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    console.log('🚀 Handle submit called', {
      user: !!user,
      isUserAuthenticated,
      formDataEmail: formData.adminEmail,
      userEmail: user?.email
    });

    // Check if user is authenticated
    if (!user || !isUserAuthenticated) {
      toast.error('Please log in to continue with onboarding.');
      console.log('❌ User not authenticated:', {
        user: !!user,
        isUserAuthenticated,
        userObject: user
      });
      return;
    }

    // Check if email is available in form data (which should be populated from user)
    if (!formData.adminEmail) {
      toast.error('Unable to retrieve your email from authentication. Please try logging in again.');
      console.log('❌ No email in form data:', {
        formDataEmail: formData.adminEmail,
        userEmail: user?.email,
        userObject: user
      });
      return;
    }

    // Validate required fields
    const requiredFields = ['companyName', 'adminEmail', 'adminMobile', 'gstin'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof OnboardingFormData]?.trim());

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate GSTIN
    if (gstinValid === false) {
      toast.error('Please provide a valid GSTIN number.');
      return;
    }

    if (gstinValid === null && formData.gstin.length === 15) {
      toast.error('Please wait for GSTIN validation to complete.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Starting onboarding with data:', {
        ...formData,
        userEmailFromKinde: user.email,
        userId: user.id,
        userName: `${user.given_name || ''} ${user.family_name || ''}`.trim()
      });

      // Get authentication token
      const token = await getToken();
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('🔑 Got authentication token, making API call...');

      // Ensure the email matches what's from Kinde
      const onboardingData = {
        companyName: formData.companyName.trim(),
        adminEmail: user.email, // Use the email directly from Kinde to ensure consistency
        adminMobile: formData.adminMobile.trim(),
        gstin: formData.gstin.trim().toUpperCase()
      };

      console.log('📡 Sending onboarding data:', onboardingData);
      console.log('🔍 Request headers:', {
        hasAuth: !!token,
        authHeaderLength: `Bearer ${token}`.length
      });

      // Call the main onboarding endpoint with authentication
      const response = await api.post('/onboarding/onboard', onboardingData);

      if (response.data.success) {
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

        toast.success('🎉 Organization setup completed successfully!');

        // Handle redirect URL if provided
        if (response.data.data.redirectUrl) {
          console.log('🔗 Redirecting to:', response.data.data.redirectUrl);
          window.location.href = response.data.data.redirectUrl;
        } else {
          // Fallback to dashboard
          navigate('/dashboard');
        }
      } else {
        throw new Error(response.data.message || 'Onboarding failed');
      }

    } catch (error: any) {
      console.error('❌ Onboarding failed:', error);
      console.error('🔍 Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

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
        setIsLoading(false);
        return;
      }

      // Handle other errors with clear messages
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid data provided. Please check your input and try again.';
        toast.error(errorMessage, { duration: 5000 });
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.', { duration: 5000 });
        console.log('🔄 Authentication failed, consider redirecting to login');
      } else if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || 'Server error occurred. Please try again in a moment.';
        toast.error(errorMessage, { duration: 5000 });
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.', { duration: 5000 });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.';
        toast.error(errorMessage, { duration: 5000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Welcome to Your Workspace</h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">
            Let's get your organization set up in just a few simple steps
          </p>

          {/* Authentication Status */}
          {isLoadingUser ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-blue-700">
                Loading user information...
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  window.location.reload();
                }}
                className="ml-2 text-xs"
              >
                Refresh
              </Button>
            </div>
          ) : isUserAuthenticated ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Signed in as {formData.adminEmail}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full mb-4">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                Authentication required - please sign in
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  window.location.reload();
                }}
                className="ml-2 text-xs"
              >
                Refresh Page
              </Button>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">4 Simple Fields Required</span>
          </div>
        </div>

        {/* Debug Info (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <GlassCard className="mb-4" variant="subtle">
            <div className="p-4">
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                  🔍 Debug Info (Development Only)
                </summary>
                <div className="space-y-1 text-gray-600">
                  <div>User Authenticated: {isUserAuthenticated ? '✅' : '❌'}</div>
                  <div>Loading User: {isLoadingUser ? '✅' : '❌'}</div>
                  <div>User Object: {user ? '✅' : '❌'}</div>
                  <div>User Email: {user?.email || 'Not found'}</div>
                  <div>Form Email: {formData.adminEmail || 'Empty'}</div>
                  <div>User ID: {user?.id || 'Not found'}</div>
                  <div>User Keys: {user ? Object.keys(user).join(', ') : 'No user'}</div>
                </div>
              </details>
            </div>
          </GlassCard>
        )}

        {/* Main Form */}
        <GlassCard variant="purple" className="mb-8">
          <div className="p-6 border-b border-white/10">
            <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
              <Building2 className="w-6 h-6 text-purple-600" />
              <span>Organization Setup</span>
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-muted-foreground">
              Enter your company details to get started. Your organization will be set up automatically.
            </CardDescription>
          </div>
          <div className="p-6 space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                Organization Name <Badge variant="destructive" className="text-xs ml-1">Required</Badge>
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter your organization name"
                maxLength={100}
                disabled={!isUserAuthenticated}
                className={`focus:ring-2 focus:ring-blue-500 ${
                  !isUserAuthenticated ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                1-100 characters
              </p>
            </div>

            {/* Admin Email (Auto-filled from Kinde) */}
            <div className="space-y-2">
              <Label htmlFor="adminEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-500" />
                Admin Email
                {isLoadingUser ? (
                  <Badge variant="outline" className="text-xs ml-1">
                    <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-600 mr-1"></div>
                    Loading...
                  </Badge>
                ) : isUserAuthenticated ? (
                  <Badge variant="secondary" className="text-xs ml-1 bg-green-100 text-green-800">
                    ✓ From Kinde
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs ml-1">
                    Not Available
                  </Badge>
                )}
              </Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                disabled
                className={`bg-gray-50 cursor-not-allowed ${
                  isUserAuthenticated ? 'border-green-200' : 'border-gray-200'
                }`}
                placeholder={isUserAuthenticated ? formData.adminEmail : 'Loading your email...'}
              />
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {isLoadingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                    Loading your email from authentication...
                  </>
                ) : isUserAuthenticated ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Email securely loaded from your Kinde authentication
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    Please sign in to load your email address
                  </>
                )}
              </p>
            </div>

            {/* Admin Mobile */}
            <div className="space-y-2">
              <Label htmlFor="adminMobile" className="flex items-center gap-2">
                📱 Mobile Number <Badge variant="destructive" className="text-xs ml-1">Required</Badge>
              </Label>
              <Input
                id="adminMobile"
                type="tel"
                value={formData.adminMobile}
                onChange={(e) => setFormData(prev => ({ ...prev, adminMobile: e.target.value }))}
                placeholder="+91 9876543210"
                maxLength={15}
                disabled={!isUserAuthenticated}
                className={`focus:ring-2 focus:ring-blue-500 ${
                  !isUserAuthenticated ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Primary contact mobile number
              </p>
            </div>

            {/* GSTIN */}
            <div className="space-y-2">
              <Label htmlFor="gstin" className="flex items-center gap-2">
                🏢 GSTIN <Badge variant="destructive" className="text-xs ml-1">Required</Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => handleGSTINChange(e.target.value)}
                  placeholder="22AAAAA0000A1Z6"
                  maxLength={15}
                  disabled={!isUserAuthenticated}
                  className={`focus:ring-2 focus:ring-blue-500 font-mono uppercase ${
                    !isUserAuthenticated ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* GSTIN validation indicator */}
              {formData.gstin && (
                <div className="flex items-center gap-2 text-sm">
                  {isValidatingGSTIN ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                      <span className="text-gray-500">Validating GSTIN...</span>
                    </>
                  ) : gstinValid === true ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-green-600">Valid GSTIN format</span>
                    </>
                  ) : gstinValid === false ? (
                    <>
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <span className="text-red-600">Invalid GSTIN format</span>
                    </>
                  ) : null}
                </div>
              )}

              <p className="text-xs text-gray-500">
                15-digit GST identification number (format: 22AAAAA0000A1Z6)
              </p>
            </div>

            {/* Info Section */}
            <GlassCard variant="subtle" className="bg-blue-50/80 border-blue-200/50">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Your Kinde organization will be created automatically</li>
                    <li>• Database tenant, user, and subscription will be set up</li>
                    <li>• 1,000 free trial credits will be assigned to your account</li>
                    <li>• Super administrator role with full permissions will be created</li>
                    <li>• You'll be redirected to your personalized login URL</li>
                    <li>• Access your dashboard and start exploring your workspace</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>

        {/* Submit Button */}
        <div className="flex justify-center">
          <PearlButton
            onClick={handleSubmit}
            disabled={isLoading || !isUserAuthenticated || !formData.companyName.trim() || !formData.adminEmail.trim() || !formData.adminMobile.trim() || !formData.gstin.trim() || gstinValid === false}
            className="px-8 py-3"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Setting up your organization...
              </div>
            ) : !isUserAuthenticated ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Please sign in first
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Complete Setup
                <ArrowRight className="h-5 w-5" />
              </div>
            )}
          </PearlButton>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Need help? <a href="mailto:support@yourcompany.com" className="text-blue-600 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleOnboarding;