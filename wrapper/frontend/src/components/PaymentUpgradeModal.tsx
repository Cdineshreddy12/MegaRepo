import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface PaymentUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: string;
  onUpgradeComplete: (data: any) => void;
  isProcessingPayment?: boolean;
  paymentError?: string | null;
}

interface UpgradeFormData {
  // Required fields
  selectedPlan: string;
  gstin: string;

  // Company Profile
  legalCompanyName: string;
  industry: string;
  companyType: string;
  ownership: string;
  annualRevenue: string;
  numberOfEmployees: string;
  tickerSymbol: string;
  website: string;
  description: string;
  foundedDate: string;

  // Contact & Address
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  phone: string;
  fax: string;

  // Localization
  defaultLanguage: string;
  defaultLocale: string;
  defaultCurrency: string;
  multiCurrencyEnabled: boolean;
  advancedCurrencyManagement: boolean;
  defaultTimeZone: string;
  firstDayOfWeek: string;
}

const initialFormData: UpgradeFormData = {
  selectedPlan: '',
  gstin: '',

  // Company Profile
  legalCompanyName: '',
  industry: '',
  companyType: '',
  ownership: '',
  annualRevenue: '',
  numberOfEmployees: '',
  tickerSymbol: '',
  website: '',
  description: '',
  foundedDate: '',

  // Contact & Address
  billingStreet: '',
  billingCity: '',
  billingState: '',
  billingZip: '',
  billingCountry: '',
  shippingStreet: '',
  shippingCity: '',
  shippingState: '',
  shippingZip: '',
  shippingCountry: '',
  phone: '',
  fax: '',

  // Localization
  defaultLanguage: 'en',
  defaultLocale: 'en-US',
  defaultCurrency: 'INR',
  multiCurrencyEnabled: false,
  advancedCurrencyManagement: false,
  defaultTimeZone: 'Asia/Kolkata',
  firstDayOfWeek: '1'
};

export function PaymentUpgradeModal({
  isOpen,
  onClose,
  selectedPlan,
  onUpgradeComplete,
  isProcessingPayment = false,
  paymentError = null
}: PaymentUpgradeModalProps) {
  const [formData, setFormData] = useState<UpgradeFormData>({
    ...initialFormData,
    selectedPlan
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Using callback pattern for two-step flow (profile completion → payment)

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.gstin.trim()) {
          newErrors.gstin = 'GSTIN is required';
        } else if (formData.gstin.length !== 15) {
          newErrors.gstin = 'GSTIN must be exactly 15 characters';
        }
        break;

      case 2: // Company Profile
        if (!formData.legalCompanyName.trim()) {
          newErrors.legalCompanyName = 'Legal company name is required';
        }
        if (!formData.industry) {
          newErrors.industry = 'Industry is required';
        }
        if (!formData.companyType) {
          newErrors.companyType = 'Company type is required';
        }
        break;

      case 3: // Contact & Address
        if (!formData.billingStreet.trim()) {
          newErrors.billingStreet = 'Billing street address is required';
        }
        if (!formData.billingCity.trim()) {
          newErrors.billingCity = 'Billing city is required';
        }
        if (!formData.billingState.trim()) {
          newErrors.billingState = 'Billing state is required';
        }
        if (!formData.billingZip.trim()) {
          newErrors.billingZip = 'Billing ZIP code is required';
        }
        if (!formData.billingCountry) {
          newErrors.billingCountry = 'Billing country is required';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for callback
      const cleanFormData: UpgradeFormData = {
        ...formData,
        annualRevenue: formData.annualRevenue || '',
        numberOfEmployees: formData.numberOfEmployees || '',
        firstDayOfWeek: formData.firstDayOfWeek || '1'
      };

      // Call the callback instead of making API call directly
      // The callback will handle the two-step process: profile completion → payment
      await onUpgradeComplete(cleanFormData);

      // Don't close modal here - let the parent component handle it after payment completion
      // Reset form for next use (will be done when modal closes)
      // setFormData({ ...initialFormData, selectedPlan });
      // setCurrentStep(1);
      // setErrors({});

    } catch (error) {
      console.error('❌ Form submission error:', error);
      // Show error to user
      setErrors({ submit: 'Failed to submit form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof UpgradeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };



  if (!isOpen) return null;

  const steps = [
    { id: 1, title: 'Basic Information', description: 'GSTIN details' },
    { id: 2, title: 'Company Profile', description: 'Business details' },
    { id: 3, title: 'Contact & Address', description: 'Billing and shipping info' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Complete Your Upgrade</h2>
            <p className="text-gray-600 mt-1">
              We need some additional information to set up your {selectedPlan} plan
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep
                      ? 'bg-green-500 text-white'
                      : step.id === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id < currentStep ? <CheckCircle className="h-4 w-4" /> : step.id}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      step.id <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px ${
                    step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="w-full">
            {currentStep === 1 && <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Provide your GSTIN for tax compliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="gstin">GSTIN *</Label>
                      <Input
                        id="gstin"
                        value={formData.gstin}
                        onChange={(e) => updateFormData('gstin', e.target.value.toUpperCase())}
                        placeholder="22AAAAA0000A1Z6"
                        maxLength={15}
                        className={errors.gstin ? 'border-red-500' : ''}
                      />
                      {errors.gstin && (
                        <p className="text-sm text-red-600 mt-1">{errors.gstin}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Your 15-character GSTIN number
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>}

            {currentStep === 2 && <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Profile</CardTitle>
                  <CardDescription>
                    Tell us about your business to customize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="legalCompanyName">Legal Company Name *</Label>
                      <Input
                        id="legalCompanyName"
                        value={formData.legalCompanyName}
                        onChange={(e) => updateFormData('legalCompanyName', e.target.value)}
                        placeholder="ABC Private Limited"
                        className={errors.legalCompanyName ? 'border-red-500' : ''}
                      />
                      {errors.legalCompanyName && (
                        <p className="text-sm text-red-600 mt-1">{errors.legalCompanyName}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="industry">Industry *</Label>
                      <Select value={formData.industry} onValueChange={(value) => updateFormData('industry', value)}>
                        <SelectTrigger className={errors.industry ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="real-estate">Real Estate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.industry && (
                        <p className="text-sm text-red-600 mt-1">{errors.industry}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyType">Company Type *</Label>
                      <Select value={formData.companyType} onValueChange={(value) => updateFormData('companyType', value)}>
                        <SelectTrigger className={errors.companyType ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select company type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private-limited">Private Limited</SelectItem>
                          <SelectItem value="public-limited">Public Limited</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                          <SelectItem value="llp">Limited Liability Partnership</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.companyType && (
                        <p className="text-sm text-red-600 mt-1">{errors.companyType}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="ownership">Ownership</Label>
                      <Select value={formData.ownership} onValueChange={(value) => updateFormData('ownership', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ownership type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="annualRevenue">Annual Revenue (₹)</Label>
                      <Input
                        id="annualRevenue"
                        type="number"
                        value={formData.annualRevenue}
                        onChange={(e) => updateFormData('annualRevenue', e.target.value)}
                        placeholder="50000000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                      <Input
                        id="numberOfEmployees"
                        type="number"
                        value={formData.numberOfEmployees}
                        onChange={(e) => updateFormData('numberOfEmployees', e.target.value)}
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tickerSymbol">Stock Ticker Symbol</Label>
                      <Input
                        id="tickerSymbol"
                        value={formData.tickerSymbol}
                        onChange={(e) => updateFormData('tickerSymbol', e.target.value)}
                        placeholder="TCS.NS"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">Company Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => updateFormData('website', e.target.value)}
                        placeholder="https://company.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="foundedDate">Founded Date</Label>
                      <Input
                        id="foundedDate"
                        type="date"
                        value={formData.foundedDate}
                        onChange={(e) => updateFormData('foundedDate', e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Company Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        placeholder="Brief description of your company..."
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>}

            {currentStep === 3 && <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact & Address Information</CardTitle>
                  <CardDescription>
                    Provide billing and shipping information for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium mb-4">Billing Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="billingStreet">Street Address *</Label>
                          <Input
                            id="billingStreet"
                            value={formData.billingStreet}
                            onChange={(e) => updateFormData('billingStreet', e.target.value)}
                            placeholder="123 Business Street"
                            className={errors.billingStreet ? 'border-red-500' : ''}
                          />
                          {errors.billingStreet && (
                            <p className="text-sm text-red-600 mt-1">{errors.billingStreet}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="billingCity">City *</Label>
                          <Input
                            id="billingCity"
                            value={formData.billingCity}
                            onChange={(e) => updateFormData('billingCity', e.target.value)}
                            placeholder="Mumbai"
                            className={errors.billingCity ? 'border-red-500' : ''}
                          />
                          {errors.billingCity && (
                            <p className="text-sm text-red-600 mt-1">{errors.billingCity}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="billingState">State *</Label>
                          <Input
                            id="billingState"
                            value={formData.billingState}
                            onChange={(e) => updateFormData('billingState', e.target.value)}
                            placeholder="Maharashtra"
                            className={errors.billingState ? 'border-red-500' : ''}
                          />
                          {errors.billingState && (
                            <p className="text-sm text-red-600 mt-1">{errors.billingState}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="billingZip">ZIP/Postal Code *</Label>
                          <Input
                            id="billingZip"
                            value={formData.billingZip}
                            onChange={(e) => updateFormData('billingZip', e.target.value)}
                            placeholder="400001"
                            className={errors.billingZip ? 'border-red-500' : ''}
                          />
                          {errors.billingZip && (
                            <p className="text-sm text-red-600 mt-1">{errors.billingZip}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="billingCountry">Country *</Label>
                          <Select value={formData.billingCountry} onValueChange={(value) => updateFormData('billingCountry', value)}>
                            <SelectTrigger className={errors.billingCountry ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="United States">United States</SelectItem>
                              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.billingCountry && (
                            <p className="text-sm text-red-600 mt-1">{errors.billingCountry}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-lg font-medium mb-4">Shipping Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="shippingStreet">Street Address</Label>
                          <Input
                            id="shippingStreet"
                            value={formData.shippingStreet}
                            onChange={(e) => updateFormData('shippingStreet', e.target.value)}
                            placeholder="123 Business Street"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shippingCity">City</Label>
                          <Input
                            id="shippingCity"
                            value={formData.shippingCity}
                            onChange={(e) => updateFormData('shippingCity', e.target.value)}
                            placeholder="Mumbai"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shippingState">State</Label>
                          <Input
                            id="shippingState"
                            value={formData.shippingState}
                            onChange={(e) => updateFormData('shippingState', e.target.value)}
                            placeholder="Maharashtra"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shippingZip">ZIP/Postal Code</Label>
                          <Input
                            id="shippingZip"
                            value={formData.shippingZip}
                            onChange={(e) => updateFormData('shippingZip', e.target.value)}
                            placeholder="400001"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shippingCountry">Country</Label>
                          <Select value={formData.shippingCountry} onValueChange={(value) => updateFormData('shippingCountry', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="United States">United States</SelectItem>
                              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Business Phone *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => updateFormData('phone', e.target.value)}
                          placeholder="+91-22-1234-5678"
                          className={errors.phone ? 'border-red-500' : ''}
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="fax">Fax Number</Label>
                        <Input
                          id="fax"
                          value={formData.fax}
                          onChange={(e) => updateFormData('fax', e.target.value)}
                          placeholder="+91-22-1234-5679"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>}


          </div>

          {(Object.keys(errors).length > 0 || paymentError) && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {paymentError || 'Please fix the errors above before proceeding.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
          >
            Previous
          </Button>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </div>

          <Button
            onClick={currentStep === steps.length ? handleSubmit : handleNext}
            disabled={isSubmitting || isProcessingPayment}
          >
            {isProcessingPayment ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Payment...
              </>
            ) : isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting Profile...
              </>
            ) : currentStep === steps.length ? (
              <>
                Complete Upgrade
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
