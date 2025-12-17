import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Palette, 
  Globe, 
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Languages,
  Calendar
} from 'lucide-react';
import { 
  CONTACT_SALUTATIONS, 
  CONTACT_AUTHORITY_LEVELS, 
  CONTACT_METHODS,
  COUNTRIES,
  CURRENCIES,
  LANGUAGES,
  LOCALES,
  TIMEZONES
} from '@/features/onboarding/schemas';
import { api } from '@/lib/api';
import { useToast } from '@/features/onboarding/components/Toast';

interface AccountSettingsData {
  // Company Information
  legalCompanyName?: string;
  logoUrl?: string;
  
  // Contact Details
  billingEmail?: string;
  supportEmail?: string;
  contactSalutation?: string;
  contactMiddleName?: string;
  contactDepartment?: string;
  contactJobTitle?: string;
  contactDirectPhone?: string;
  contactMobilePhone?: string;
  contactPreferredContactMethod?: string;
  contactAuthorityLevel?: string;
  preferredContactMethod?: string;
  
  // Mailing Address
  mailingAddressSameAsRegistered: boolean;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  mailingCountry?: string;
  
  // Banking & Financial Information
  bankName?: string;
  bankBranch?: string;
  accountHolderName?: string;
  accountNumber?: string;
  accountType?: string;
  bankAccountCurrency?: string;
  swiftBicCode?: string;
  iban?: string;
  routingNumberUs?: string;
  sortCodeUk?: string;
  ifscCodeIndia?: string;
  bsbNumberAustralia?: string;
  paymentTerms?: string;
  creditLimit?: number;
  preferredPaymentMethod?: string;
  
  // Tax & Compliance
  taxResidenceCountry?: string;
  taxExemptStatus?: boolean;
  taxExemptionCertificateNumber?: string;
  taxExemptionExpiryDate?: string;
  withholdingTaxApplicable?: boolean;
  withholdingTaxRate?: number;
  taxTreatyCountry?: string;
  w9StatusUs?: string;
  w8FormTypeUs?: string;
  reverseChargeMechanism?: boolean;
  vatGstRateApplicable?: string;
  regulatoryComplianceStatus?: string;
  industrySpecificLicenses?: string;
  dataProtectionRegistration?: string;
  professionalIndemnityInsurance?: boolean;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  taxRegistrationDetails?: {
    pan?: string;
    ein?: string;
    vat?: string;
    cin?: string;
  };
  
  // Localization
  defaultLanguage?: string;
  defaultLocale?: string;
  defaultCurrency?: string;
  defaultTimeZone?: string;
  fiscalYearStartMonth?: number;
  fiscalYearEndMonth?: number;
  fiscalYearStartDay?: number;
  fiscalYearEndDay?: number;
  
  // Branding
  primaryColor?: string;
  customDomain?: string;
  brandingConfig?: Record<string, any>;
  
  // For conditional logic
  billingCountry?: string;
  vatGstRegistered?: boolean;
  taxRegistered?: boolean;
}

export const AccountSettings: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const form = useForm<AccountSettingsData>({
    defaultValues: {
      mailingAddressSameAsRegistered: true,
      taxRegistrationDetails: {},
      brandingConfig: {}
    }
  });

  // Memoize watched values to prevent infinite re-renders
  const mailingAddressSameAsRegistered = form.watch('mailingAddressSameAsRegistered');
  const billingCountry = form.watch('billingCountry');
  const taxRegistered = form.watch('taxRegistered');
  const taxExemptStatus = form.watch('taxExemptStatus');
  const withholdingTaxApplicable = form.watch('withholdingTaxApplicable');
  const vatGstRegistered = form.watch('vatGstRegistered');
  const professionalIndemnityInsurance = form.watch('professionalIndemnityInsurance');
  const fiscalYearStartMonth = form.watch('fiscalYearStartMonth');
  const fiscalYearEndMonth = form.watch('fiscalYearEndMonth');
  const fiscalYearStartDay = form.watch('fiscalYearStartDay');
  const fiscalYearEndDay = form.watch('fiscalYearEndDay');

  // Load existing tenant data - only run once on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadTenantData = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/tenants/current');
        const tenantData = response.data?.data || response.data;
        
        if (!isMounted) return;
        
        form.reset({
          legalCompanyName: tenantData.legalCompanyName || '',
          logoUrl: tenantData.logoUrl || '',
          billingEmail: tenantData.billingEmail || '',
          supportEmail: tenantData.supportEmail || '',
          contactSalutation: tenantData.contactSalutation || '',
          contactMiddleName: tenantData.contactMiddleName || '',
          contactDepartment: tenantData.contactDepartment || '',
          contactJobTitle: tenantData.contactJobTitle || '',
          contactDirectPhone: tenantData.contactDirectPhone || '',
          contactMobilePhone: tenantData.contactMobilePhone || '',
          contactPreferredContactMethod: tenantData.contactPreferredContactMethod || '',
          contactAuthorityLevel: tenantData.contactAuthorityLevel || '',
          preferredContactMethod: tenantData.preferredContactMethod || '',
          mailingAddressSameAsRegistered: tenantData.mailingAddressSameAsRegistered ?? true,
          mailingStreet: tenantData.mailingStreet || '',
          mailingCity: tenantData.mailingCity || '',
          mailingState: tenantData.mailingState || '',
          mailingZip: tenantData.mailingZip || '',
          mailingCountry: tenantData.mailingCountry || '',
          // Banking fields
          bankName: tenantData.bankName || '',
          bankBranch: tenantData.bankBranch || '',
          accountHolderName: tenantData.accountHolderName || '',
          accountNumber: tenantData.accountNumber || '',
          accountType: tenantData.accountType || '',
          bankAccountCurrency: tenantData.bankAccountCurrency || '',
          swiftBicCode: tenantData.swiftBicCode || '',
          iban: tenantData.iban || '',
          routingNumberUs: tenantData.routingNumberUs || '',
          sortCodeUk: tenantData.sortCodeUk || '',
          ifscCodeIndia: tenantData.ifscCodeIndia || '',
          bsbNumberAustralia: tenantData.bsbNumberAustralia || '',
          paymentTerms: tenantData.paymentTerms || '',
          creditLimit: tenantData.creditLimit || undefined,
          preferredPaymentMethod: tenantData.preferredPaymentMethod || '',
          // Tax & Compliance fields
          taxResidenceCountry: tenantData.taxResidenceCountry || '',
          taxExemptStatus: tenantData.taxExemptStatus || false,
          taxExemptionCertificateNumber: tenantData.taxExemptionCertificateNumber || '',
          taxExemptionExpiryDate: tenantData.taxExemptionExpiryDate || '',
          withholdingTaxApplicable: tenantData.withholdingTaxApplicable || false,
          withholdingTaxRate: tenantData.withholdingTaxRate || undefined,
          taxTreatyCountry: tenantData.taxTreatyCountry || '',
          w9StatusUs: tenantData.w9StatusUs || '',
          w8FormTypeUs: tenantData.w8FormTypeUs || '',
          reverseChargeMechanism: tenantData.reverseChargeMechanism || false,
          vatGstRateApplicable: tenantData.vatGstRateApplicable || '',
          regulatoryComplianceStatus: tenantData.regulatoryComplianceStatus || 'Pending',
          industrySpecificLicenses: tenantData.industrySpecificLicenses || '',
          dataProtectionRegistration: tenantData.dataProtectionRegistration || '',
          professionalIndemnityInsurance: tenantData.professionalIndemnityInsurance || false,
          insurancePolicyNumber: tenantData.insurancePolicyNumber || '',
          insuranceExpiryDate: tenantData.insuranceExpiryDate || '',
          taxRegistrationDetails: tenantData.taxRegistrationDetails || {},
          // Localization fields
          defaultLanguage: tenantData.defaultLanguage || 'en',
          defaultLocale: tenantData.defaultLocale || 'en-US',
          defaultCurrency: tenantData.defaultCurrency || 'USD',
          defaultTimeZone: tenantData.defaultTimeZone || 'UTC',
          fiscalYearStartMonth: tenantData.fiscalYearStartMonth || 1,
          fiscalYearEndMonth: tenantData.fiscalYearEndMonth || 12,
          fiscalYearStartDay: tenantData.fiscalYearStartDay || 1,
          fiscalYearEndDay: tenantData.fiscalYearEndDay || 31,
          // Branding fields
          primaryColor: tenantData.primaryColor || '#2563eb',
          customDomain: tenantData.customDomain || '',
          brandingConfig: tenantData.brandingConfig || {},
          // For conditional logic
          billingCountry: tenantData.billingCountry || '',
          vatGstRegistered: tenantData.vatGstRegistered || false,
          taxRegistered: tenantData.taxRegistered || false
        });

        if (tenantData.logoUrl && isMounted) {
          setLogoPreview(tenantData.logoUrl);
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Failed to load tenant data:', error);
        addToast('Failed to load account settings. Please try again.', { type: 'error' });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTenantData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        addToast('Logo must be less than 5MB', { type: 'error' });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        addToast('Please upload an image file', { type: 'error' });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async (data: AccountSettingsData) => {
    try {
      setIsSaving(true);

      // Upload logo if selected - convert to base64 for now
      let logoUrl = data.logoUrl;
      if (logoFile) {
        // Convert file to base64 data URL
        const reader = new FileReader();
        logoUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        
        // TODO: Implement proper file upload endpoint with S3/Cloud Storage
        // const formData = new FormData();
        // formData.append('logo', logoFile);
        // const uploadResponse = await api.post('/tenants/upload-logo', formData, {
        //   headers: { 'Content-Type': 'multipart/form-data' }
        // });
        // logoUrl = uploadResponse.data.logoUrl;
      }

      // Prepare update data - only include fields that have values
      const updateData: Partial<AccountSettingsData> = {
        mailingAddressSameAsRegistered: data.mailingAddressSameAsRegistered ?? true
      };

      // Only include fields that are defined and not empty
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof AccountSettingsData];
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Handle nested objects like taxRegistrationDetails
            if (Object.keys(value).length > 0) {
              updateData[key as keyof AccountSettingsData] = value;
            }
          } else {
            updateData[key as keyof AccountSettingsData] = value;
          }
        }
      });

      if (logoUrl) {
        updateData.logoUrl = logoUrl;
      }

      await api.patch('/tenants/current', updateData);

      addToast('Account settings updated successfully', { type: 'success' });

      // Clear logo file after successful upload
      setLogoFile(null);
      
      // Don't reload - just update form values silently to avoid re-renders
      // The form already has the updated values
    } catch (error: any) {
      console.error('Failed to save account settings:', error);
      addToast(error.response?.data?.message || 'Failed to save account settings. Please try again.', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [logoFile, addToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading account settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your company details, contact information, and branding
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Mail className="h-4 w-4 mr-2" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="mailing">
              <MapPin className="h-4 w-4 mr-2" />
              Mailing
            </TabsTrigger>
            <TabsTrigger value="banking">
              <CreditCard className="h-4 w-4 mr-2" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="tax">
              <FileText className="h-4 w-4 mr-2" />
              Tax & Compliance
            </TabsTrigger>
            <TabsTrigger value="localization">
              <Languages className="h-4 w-4 mr-2" />
              Localization
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
          </TabsList>

          {/* Company Information Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Update your company's legal name and logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="legalCompanyName">Legal Company Name</Label>
                  <Input
                    id="legalCompanyName"
                    {...form.register('legalCompanyName')}
                    placeholder="Enter legal company name"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is your official registered company name (may differ from display name)
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Company Logo</Label>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Company logo"
                          className="w-32 h-32 object-contain border rounded-lg bg-muted p-2"
                        />
                      ) : (
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload your company logo (PNG, JPG, SVG up to 5MB)
                      </p>
                      {logoFile && (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          {logoFile.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Details Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Manage additional contact details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="billingEmail">Billing Email</Label>
                    <Input
                      id="billingEmail"
                      type="email"
                      {...form.register('billingEmail')}
                      placeholder="billing@company.com"
                    />
                    <p className="text-sm text-muted-foreground">
                      Separate email for invoices and billing
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      {...form.register('supportEmail')}
                      placeholder="support@company.com"
                    />
                    <p className="text-sm text-muted-foreground">
                      Email address for customer support
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Primary Contact Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactSalutation">Salutation</Label>
                      <Select
                        value={form.watch('contactSalutation') || ''}
                        onValueChange={(value) => form.setValue('contactSalutation', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_SALUTATIONS.map((salutation) => (
                            <SelectItem key={salutation.id} value={salutation.id}>
                              {salutation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactMiddleName">Middle Name</Label>
                      <Input
                        id="contactMiddleName"
                        {...form.register('contactMiddleName')}
                        placeholder="Middle name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactDepartment">Department</Label>
                      <Input
                        id="contactDepartment"
                        {...form.register('contactDepartment')}
                        placeholder="Department name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactJobTitle">Job Title</Label>
                      <Input
                        id="contactJobTitle"
                        {...form.register('contactJobTitle')}
                        placeholder="e.g., CEO, Manager"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactAuthorityLevel">Authority Level</Label>
                      <Select
                        value={form.watch('contactAuthorityLevel') || ''}
                        onValueChange={(value) => form.setValue('contactAuthorityLevel', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select authority level" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_AUTHORITY_LEVELS.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Phone Numbers</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactDirectPhone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Direct Phone
                      </Label>
                      <Input
                        id="contactDirectPhone"
                        type="tel"
                        {...form.register('contactDirectPhone')}
                        placeholder="+1 555-123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactMobilePhone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Mobile Phone
                      </Label>
                      <Input
                        id="contactMobilePhone"
                        type="tel"
                        {...form.register('contactMobilePhone')}
                        placeholder="+1 555-987-6543"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Preferences</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                      <Select
                        value={form.watch('preferredContactMethod') || ''}
                        onValueChange={(value) => form.setValue('preferredContactMethod', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred method" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_METHODS.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPreferredContactMethod">Contact's Preferred Method</Label>
                      <Select
                        value={form.watch('contactPreferredContactMethod') || ''}
                        onValueChange={(value) => form.setValue('contactPreferredContactMethod', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred method" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_METHODS.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mailing Address Tab */}
          <TabsContent value="mailing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mailing Address</CardTitle>
                <CardDescription>
                  Configure mailing address if different from registered address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="mailingAddressSameAsRegistered" className="text-base font-medium">
                      Mailing address same as registered address
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      If enabled, your mailing address will match your registered business address
                    </p>
                  </div>
                  <Switch
                    id="mailingAddressSameAsRegistered"
                    checked={mailingAddressSameAsRegistered}
                    onCheckedChange={(checked) => form.setValue('mailingAddressSameAsRegistered', checked)}
                  />
                </div>

                {!mailingAddressSameAsRegistered && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="mailingStreet">Street Address</Label>
                        <Input
                          id="mailingStreet"
                          {...form.register('mailingStreet')}
                          placeholder="123 Main Street, Suite 100"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="mailingCity">City</Label>
                          <Input
                            id="mailingCity"
                            {...form.register('mailingCity')}
                            placeholder="City name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mailingState">State/Province</Label>
                          <Input
                            id="mailingState"
                            {...form.register('mailingState')}
                            placeholder="State or province"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="mailingZip">ZIP/Postal Code</Label>
                          <Input
                            id="mailingZip"
                            {...form.register('mailingZip')}
                            placeholder="12345"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mailingCountry">Country</Label>
                          <Select
                            value={form.watch('mailingCountry') || ''}
                            onValueChange={(value) => form.setValue('mailingCountry', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.id} value={country.id}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banking & Financial Information Tab */}
          <TabsContent value="banking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Banking & Financial Information</CardTitle>
                <CardDescription>
                  Configure your bank account details and payment preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="bankName"
                      {...form.register('bankName')}
                      placeholder="Enter bank name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">Bank Branch</Label>
                    <Input
                      id="bankBranch"
                      {...form.register('bankBranch')}
                      placeholder="Branch name/location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="accountHolderName"
                      {...form.register('accountHolderName')}
                      placeholder="Name on bank account"
                    />
                    <p className="text-sm text-muted-foreground">
                      Must match your organization name
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      {...form.register('accountNumber')}
                      placeholder="Enter account number"
                    />
                    <p className="text-sm text-muted-foreground">
                      Account number will be encrypted
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.watch('accountType') || ''}
                      onValueChange={(value) => form.setValue('accountType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountCurrency">Currency <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.watch('bankAccountCurrency') || ''}
                      onValueChange={(value) => form.setValue('bankAccountCurrency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">International Banking Codes</h3>
                  <p className="text-sm text-muted-foreground">
                    Required based on your country and payment needs
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="swiftBicCode">SWIFT/BIC Code</Label>
                      <Input
                        id="swiftBicCode"
                        {...form.register('swiftBicCode')}
                        placeholder="8 or 11 characters"
                        maxLength={11}
                      />
                      <p className="text-sm text-muted-foreground">
                        Required for international payments
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input
                        id="iban"
                        {...form.register('iban')}
                        placeholder="Up to 34 characters"
                        maxLength={34}
                      />
                      <p className="text-sm text-muted-foreground">
                        Required for EU/UK payments
                      </p>
                    </div>

                    {billingCountry === 'US' && (
                      <div className="space-y-2">
                        <Label htmlFor="routingNumberUs">Routing Number (US) <span className="text-red-500">*</span></Label>
                        <Input
                          id="routingNumberUs"
                          {...form.register('routingNumberUs')}
                          placeholder="9 digits"
                          maxLength={9}
                        />
                      </div>
                    )}

                    {billingCountry === 'UK' && (
                      <div className="space-y-2">
                        <Label htmlFor="sortCodeUk">Sort Code (UK) <span className="text-red-500">*</span></Label>
                        <Input
                          id="sortCodeUk"
                          {...form.register('sortCodeUk')}
                          placeholder="XX-XX-XX"
                          maxLength={6}
                        />
                      </div>
                    )}

                    {billingCountry === 'IN' && (
                      <div className="space-y-2">
                        <Label htmlFor="ifscCodeIndia">IFSC Code (India) <span className="text-red-500">*</span></Label>
                        <Input
                          id="ifscCodeIndia"
                          {...form.register('ifscCodeIndia')}
                          placeholder="AAAA0BBBBBB"
                          maxLength={11}
                        />
                      </div>
                    )}

                    {billingCountry === 'AU' && (
                      <div className="space-y-2">
                        <Label htmlFor="bsbNumberAustralia">BSB Number (Australia) <span className="text-red-500">*</span></Label>
                        <Input
                          id="bsbNumberAustralia"
                          {...form.register('bsbNumberAustralia')}
                          placeholder="XXX-XXX"
                          maxLength={6}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.watch('paymentTerms') || ''}
                      onValueChange={(value) => form.setValue('paymentTerms', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net-15">Net 15</SelectItem>
                        <SelectItem value="net-30">Net 30</SelectItem>
                        <SelectItem value="net-45">Net 45</SelectItem>
                        <SelectItem value="net-60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredPaymentMethod">Preferred Payment Method <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.watch('preferredPaymentMethod') || ''}
                      onValueChange={(value) => form.setValue('preferredPaymentMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wire-transfer">Wire Transfer</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.01"
                      {...form.register('creditLimit', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax & Compliance Tab */}
          <TabsContent value="tax" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tax & Compliance Information</CardTitle>
                <CardDescription>
                  Comprehensive tax and regulatory compliance details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Tax Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="taxResidenceCountry">Tax Residence Country <span className="text-red-500">*</span></Label>
                      <Select
                        value={form.watch('taxResidenceCountry') || ''}
                        onValueChange={(value) => form.setValue('taxResidenceCountry', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regulatoryComplianceStatus">Regulatory Compliance Status <span className="text-red-500">*</span></Label>
                      <Select
                        value={form.watch('regulatoryComplianceStatus') || 'Pending'}
                        onValueChange={(value) => form.setValue('regulatoryComplianceStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Compliant">Compliant</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="panNumber">PAN Number (India)</Label>
                      <Input
                        id="panNumber"
                        {...form.register('taxRegistrationDetails.pan')}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="einNumber">EIN Number (USA)</Label>
                      <Input
                        id="einNumber"
                        {...form.register('taxRegistrationDetails.ein')}
                        placeholder="12-3456789"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">VAT Number</Label>
                      <Input
                        id="vatNumber"
                        {...form.register('taxRegistrationDetails.vat')}
                        placeholder="VAT123456789"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cinNumber">CIN Number (India)</Label>
                      <Input
                        id="cinNumber"
                        {...form.register('taxRegistrationDetails.cin')}
                        placeholder="U12345AB2023PTC123456"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tax Exempt Status */}
                {taxRegistered && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Tax Exempt Status</h3>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <Label htmlFor="taxExemptStatus" className="text-base font-medium">
                          Tax Exempt Organization
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Is your organization tax exempt?
                        </p>
                      </div>
                      <Switch
                        id="taxExemptStatus"
                        checked={form.watch('taxExemptStatus') || false}
                        onCheckedChange={(checked) => form.setValue('taxExemptStatus', checked)}
                      />
                    </div>

                    {taxExemptStatus && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="taxExemptionCertificateNumber">
                            Tax Exemption Certificate Number <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="taxExemptionCertificateNumber"
                            {...form.register('taxExemptionCertificateNumber')}
                            placeholder="Certificate number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="taxExemptionExpiryDate">
                            Tax Exemption Expiry Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="taxExemptionExpiryDate"
                            type="date"
                            {...form.register('taxExemptionExpiryDate')}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Withholding Tax */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Withholding Tax</h3>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="withholdingTaxApplicable" className="text-base font-medium">
                        Withholding Tax Applicable
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Is your organization subject to withholding tax?
                      </p>
                    </div>
                    <Switch
                      id="withholdingTaxApplicable"
                      checked={form.watch('withholdingTaxApplicable') || false}
                      onCheckedChange={(checked) => form.setValue('withholdingTaxApplicable', checked)}
                    />
                  </div>

                  {withholdingTaxApplicable && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="withholdingTaxRate">
                          Withholding Tax Rate (%) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="withholdingTaxRate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          {...form.register('withholdingTaxRate', { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxTreatyCountry">Tax Treaty Country</Label>
                        <Select
                          value={form.watch('taxTreatyCountry') || ''}
                          onValueChange={(value) => form.setValue('taxTreatyCountry', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* US-Specific Tax Forms */}
                {form.watch('billingCountry') === 'US' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">US Tax Forms</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="w9StatusUs">W-9 Status</Label>
                        <Select
                          value={form.watch('w9StatusUs') || ''}
                          onValueChange={(value) => form.setValue('w9StatusUs', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="not-required">Not Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-US Entities Doing US Business */}
                {billingCountry && billingCountry !== 'US' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">US Business Forms</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="w8FormTypeUs">W-8 Form Type</Label>
                      <Select
                        value={form.watch('w8FormTypeUs') || ''}
                        onValueChange={(value) => form.setValue('w8FormTypeUs', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select form type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="w8ben">W-8BEN</SelectItem>
                          <SelectItem value="w8bene">W-8BEN-E</SelectItem>
                          <SelectItem value="w8eci">W-8ECI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Separator />

                {/* VAT/GST Specific Fields */}
                {vatGstRegistered && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">VAT/GST Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="reverseChargeMechanism" className="text-base font-medium">
                            Reverse Charge Mechanism
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Applicable for B2B transactions
                          </p>
                        </div>
                        <Switch
                          id="reverseChargeMechanism"
                          checked={form.watch('reverseChargeMechanism') || false}
                          onCheckedChange={(checked) => form.setValue('reverseChargeMechanism', checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vatGstRateApplicable">VAT/GST Rate Applicable</Label>
                        <Select
                          value={form.watch('vatGstRateApplicable') || ''}
                          onValueChange={(value) => form.setValue('vatGstRateApplicable', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select rate" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="reduced">Reduced</SelectItem>
                            <SelectItem value="zero-rated">Zero-rated</SelectItem>
                            <SelectItem value="exempt">Exempt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Compliance & Insurance */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Compliance & Insurance</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="industrySpecificLicenses">Industry-Specific Licenses</Label>
                    <Textarea
                      id="industrySpecificLicenses"
                      {...form.register('industrySpecificLicenses')}
                      placeholder="List any special licenses or certifications..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataProtectionRegistration">Data Protection Registration</Label>
                    <Input
                      id="dataProtectionRegistration"
                      {...form.register('dataProtectionRegistration')}
                      placeholder="GDPR/DPA registration number"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="professionalIndemnityInsurance" className="text-base font-medium">
                        Professional Indemnity Insurance
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Do you have professional indemnity insurance?
                      </p>
                    </div>
                    <Switch
                      id="professionalIndemnityInsurance"
                      checked={form.watch('professionalIndemnityInsurance') || false}
                      onCheckedChange={(checked) => form.setValue('professionalIndemnityInsurance', checked)}
                    />
                  </div>

                  {professionalIndemnityInsurance && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="insurancePolicyNumber">
                          Insurance Policy Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="insurancePolicyNumber"
                          {...form.register('insurancePolicyNumber')}
                          placeholder="Policy number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="insuranceExpiryDate">
                          Insurance Expiry Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="insuranceExpiryDate"
                          type="date"
                          {...form.register('insuranceExpiryDate')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Localization Tab */}
          <TabsContent value="localization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Localization & Regional Settings</CardTitle>
                <CardDescription>
                  Configure language, currency, timezone, and fiscal year settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Select
                      value={form.watch('defaultLanguage') || 'en'}
                      onValueChange={(value) => form.setValue('defaultLanguage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultLocale">Default Locale</Label>
                    <Select
                      value={form.watch('defaultLocale') || 'en-US'}
                      onValueChange={(value) => form.setValue('defaultLocale', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select locale" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALES.map((locale) => (
                          <SelectItem key={locale.id} value={locale.id}>
                            {locale.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select
                      value={form.watch('defaultCurrency') || 'USD'}
                      onValueChange={(value) => form.setValue('defaultCurrency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultTimeZone">Default Timezone</Label>
                    <Select
                      value={form.watch('defaultTimeZone') || 'UTC'}
                      onValueChange={(value) => form.setValue('defaultTimeZone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.id} value={tz.id}>
                            {tz.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Fiscal Year Settings
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fiscalYearStartMonth">Fiscal Year Start Month</Label>
                      <Select
                        value={form.watch('fiscalYearStartMonth')?.toString() || '1'}
                        onValueChange={(value) => form.setValue('fiscalYearStartMonth', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: 1, label: 'January' },
                            { value: 2, label: 'February' },
                            { value: 3, label: 'March' },
                            { value: 4, label: 'April' },
                            { value: 5, label: 'May' },
                            { value: 6, label: 'June' },
                            { value: 7, label: 'July' },
                            { value: 8, label: 'August' },
                            { value: 9, label: 'September' },
                            { value: 10, label: 'October' },
                            { value: 11, label: 'November' },
                            { value: 12, label: 'December' }
                          ].map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fiscalYearStartDay">Fiscal Year Start Day</Label>
                      <Input
                        id="fiscalYearStartDay"
                        type="number"
                        min="1"
                        max="31"
                        {...form.register('fiscalYearStartDay', { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fiscalYearEndMonth">Fiscal Year End Month</Label>
                      <Select
                        value={form.watch('fiscalYearEndMonth')?.toString() || '12'}
                        onValueChange={(value) => form.setValue('fiscalYearEndMonth', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: 1, label: 'January' },
                            { value: 2, label: 'February' },
                            { value: 3, label: 'March' },
                            { value: 4, label: 'April' },
                            { value: 5, label: 'May' },
                            { value: 6, label: 'June' },
                            { value: 7, label: 'July' },
                            { value: 8, label: 'August' },
                            { value: 9, label: 'September' },
                            { value: 10, label: 'October' },
                            { value: 11, label: 'November' },
                            { value: 12, label: 'December' }
                          ].map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fiscalYearEndDay">Fiscal Year End Day</Label>
                      <Input
                        id="fiscalYearEndDay"
                        type="number"
                        min="1"
                        max="31"
                        {...form.register('fiscalYearEndDay', { valueAsNumber: true })}
                        placeholder="31"
                      />
                    </div>
                  </div>

                  {fiscalYearStartMonth && fiscalYearEndMonth && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Fiscal Year: {new Date(2024, (fiscalYearStartMonth || 1) - 1, fiscalYearStartDay || 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {new Date(2024, (fiscalYearEndMonth || 12) - 1, fiscalYearEndDay || 31).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Branding & Customization</CardTitle>
                <CardDescription>
                  Customize your company's visual identity and domain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Brand Color</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="primaryColor"
                      type="color"
                      {...form.register('primaryColor')}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      {...form.register('primaryColor')}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose your primary brand color (used in UI elements)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="customDomain">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Custom Domain
                  </Label>
                  <Input
                    id="customDomain"
                    {...form.register('customDomain')}
                    placeholder="app.yourcompany.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Set up a custom domain for your Zopkit workspace
                  </p>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        After adding your domain, you'll need to configure DNS records. 
                        Our support team will guide you through the process.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
};

export default AccountSettings;

