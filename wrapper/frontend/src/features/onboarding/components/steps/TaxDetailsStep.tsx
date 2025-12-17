import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData, COUNTRIES, STATES } from '../../schemas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UserClassification } from '../FlowSelector';
import { getStateFieldConfig, getCountryConfig } from '../../config/countryConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { memo } from 'react';

interface TaxDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  userClassification?: UserClassification;
}

export const TaxDetailsStep = memo(({ form, userClassification }: TaxDetailsStepProps) => {
  // Use useWatch hook to prevent unnecessary re-renders
  const taxRegistered = useWatch({ control: form.control, name: 'taxRegistered' });
  const vatGstRegistered = useWatch({ control: form.control, name: 'vatGstRegistered' });
  const businessDetailsCountry = useWatch({ control: form.control, name: 'businessDetails.country' as any });
  const rootCountry = useWatch({ control: form.control, name: 'country' });
  const mailingAddressSame = useWatch({ control: form.control, name: 'mailingAddressSameAsRegistered' });
  
  const country = businessDetailsCountry || rootCountry || 'IN';
  
  // Get country config and state field config
  const countryConfig = getCountryConfig(country);
  const stateFieldConfig = getStateFieldConfig(country);

  // Helper to determine tax labels based on country
  const labels = {
    taxId: countryConfig.taxSystem.idLabel,
    vatId: countryConfig.taxSystem.vatLabel,
    companyId: 'Company Registration Number'
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          {userClassification && (
            <Badge
              variant="outline"
              className="bg-white/50 text-slate-600 border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm"
            >
              {userClassification.replace(/([A-Z])/g, ' $1').trim()}
            </Badge>
          )}
          <Badge variant="outline" className="bg-white/50 text-slate-600 border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
            {COUNTRIES.find(c => c.id === country)?.name || country}
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3 drop-shadow-sm">
          Tax & Compliance Details
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed max-w-2xl font-light">
          Configure your tax registration status and address details for billing compliance.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Registration Status Switches */}
        <div className="glass-card p-8 rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-6">
          <FormField
            control={form.control}
            name="taxRegistered"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4 bg-white/70 backdrop-blur-sm">
                <div className="space-y-0.5 flex-1 pr-4">
                    <FormLabel className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      Tax Registered <span className="text-slate-400 font-normal">(Optional)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-slate-900 text-white">
                          <p className="font-semibold mb-1">Optional Field</p>
                          <p>Indicates if your organization is registered for tax purposes in your country. Required for tax-compliant invoicing and reporting.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                  <FormDescription className="text-sm text-slate-500">
                    Is your organization registered for tax in {COUNTRIES.find(c => c.id === country)?.name}?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vatGstRegistered"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4 bg-white/70 backdrop-blur-sm">
                <div className="space-y-0.5 flex-1 pr-4">
                    <FormLabel className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      VAT/GST Registered <span className="text-slate-400 font-normal">(Optional)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-slate-900 text-white">
                          <p className="font-semibold mb-1">Optional Field</p>
                          <p>Indicates if you have a VAT (Value Added Tax), GST (Goods & Services Tax), or Sales Tax registration number. Enables tax-compliant invoicing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                  <FormDescription className="text-sm text-slate-500">
                    Do you have a VAT, GST, or Sales Tax registration?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Conditional Tax Fields */}
        {(taxRegistered || vatGstRegistered) && (
          <div className="glass-card p-8 rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-6">
            <h3 className="text-lg font-semibold text-slate-900">Registration Numbers</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {taxRegistered && (
                <>
                  {country === 'IN' && (
                    <FormField
                      control={form.control}
                      name="panNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            {labels.taxId} <span className="text-slate-400 font-normal">(Optional)</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-slate-900 text-white">
                                <p className="font-semibold mb-1">Optional Field</p>
                                <p>Permanent Account Number (PAN) is a 10-character alphanumeric identifier issued by the Income Tax Department of India. Required for tax compliance and financial transactions.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              key={`pan-${country}`}
                              placeholder={`Enter ${labels.taxId}`}
                              onChange={(e) => {
                                field.onChange(e);
                              }}
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {(country === 'US' || country === 'OTHER') && (
                    <FormField
                      control={form.control}
                      name="einNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            {labels.taxId} <span className="text-slate-400 font-normal">(Optional)</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-slate-900 text-white">
                                <p className="font-semibold mb-1">Optional Field</p>
                                <p>Employer Identification Number (EIN) is a 9-digit number issued by the IRS for tax purposes. Required for businesses operating in the US.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              key={`ein-${country}`}
                              placeholder={`Enter ${labels.taxId}`}
                              onChange={(e) => {
                                field.onChange(e);
                              }}
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {vatGstRegistered && (
                <>
                  {country === 'IN' && (
                    <FormField
                      control={form.control}
                      name="gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            {labels.vatId} <span className="text-slate-400 font-normal">(Optional)</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-slate-900 text-white">
                                <p className="font-semibold mb-1">Optional Field</p>
                                <p>GST Identification Number (GSTIN) is a 15-character alphanumeric code for businesses registered under GST in India. Required for GST-compliant invoicing and tax filing.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              key="gstin-input"
                              placeholder={`Enter ${labels.vatId}`} 
                              className="font-mono uppercase"
                              onBlur={field.onBlur}
                              onChange={(e) => {
                                field.onChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {(country !== 'IN') && (
                    <FormField
                      control={form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            {labels.vatId} <span className="text-slate-400 font-normal">(Optional)</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-slate-900 text-white">
                                <p className="font-semibold mb-1">Optional Field</p>
                                <p>VAT registration number issued by your country's tax authority. Required for VAT-compliant invoicing and tax reporting in countries with VAT systems.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              key={`vat-${country}`}
                              placeholder={`Enter ${labels.vatId}`}
                              onChange={(e) => {
                                field.onChange(e);
                              }}
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
          </div>
          </div>
        )}

        {/* Address Section */}
        <div className="glass-card p-8 rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-6">
          <h3 className="text-lg font-semibold text-slate-900">Billing Address</h3>

          <FormField
            control={form.control}
            name="billingAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Street Address <span className="text-red-500">*</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white">
                      <p className="font-semibold mb-1">Mandatory Field</p>
                      <p>The registered business address used for legal documents, invoices, and tax compliance. Must match your business registration address.</p>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    key="billing-address-textarea"
                    className="resize-none" 
                    placeholder="Registered business address"
                    rows={3}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e);
                      // Also sync to billingStreet for compatibility
                      form.setValue('billingStreet' as any, e.target.value, { shouldValidate: false });
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="billingCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    City <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="font-semibold mb-1">Mandatory Field</p>
                        <p>The city where your business is registered. Required for address validation, tax jurisdiction determination, and compliance.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      key="billing-city-input"
                      placeholder="City"
                      onChange={(e) => {
                        field.onChange(e);
                      }}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billingZip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Postal/ZIP Code <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="font-semibold mb-1">Mandatory Field</p>
                        <p>Postal or ZIP code for your registered business address. Required for accurate address validation, shipping, and tax calculations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      key="billing-zip-input"
                      placeholder="ZIP/Postal Code"
                      onChange={(e) => {
                        field.onChange(e);
                      }}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Conditional State Field - Only show for countries with states */}
          {stateFieldConfig.visible && (
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    {stateFieldConfig.label} {stateFieldConfig.required && <span className="text-red-500">*</span>}
                    {!stateFieldConfig.required && <span className="text-slate-400 font-normal">(Optional)</span>}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="font-semibold mb-1">{stateFieldConfig.required ? 'Mandatory' : 'Optional'} Field</p>
                        <p>State or province where your business is registered. Required for tax jurisdiction, compliance, and regional regulations in countries with state-level taxation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    // Also set incorporationState
                    form.setValue('incorporationState' as any, value, { shouldValidate: false });
                    form.setValue('billingState' as any, value, { shouldValidate: false });
                  }} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${stateFieldConfig.label.toLowerCase()}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {STATES.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Mailing Address Toggle */}
          <FormField
            control={form.control}
            name="mailingAddressSameAsRegistered"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4 bg-white/70 backdrop-blur-sm">
                <div className="space-y-0.5 flex-1 pr-4">
                  <FormLabel className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Mailing Address <span className="text-slate-400 font-normal">(Optional)</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="font-semibold mb-1">Optional Field</p>
                        <p>If your mailing address differs from your registered business address, enable this to enter a separate mailing address for correspondence and document delivery.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormDescription className="text-sm text-slate-500">
                    Same as billing/registered address?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value !== false} // Default to true if undefined
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Mailing Address Fields (Conditional) */}
          {mailingAddressSame === false && (
            <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <h4 className="font-medium text-sm text-slate-700">Mailing Address Details</h4>
              <FormField
                control={form.control}
                name="mailingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mailingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mailingZip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal/ZIP</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mailingState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mailingCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}, (prevProps, nextProps) => {
  // Only re-render if form control changes or userClassification changes
  return prevProps.userClassification === nextProps.userClassification &&
         prevProps.form.control === nextProps.form.control;
});
