import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../../schemas';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { UserClassification } from '../FlowSelector';

interface TaxDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  userClassification?: UserClassification;
}

export const TaxDetailsStep = ({ form, userClassification }: TaxDetailsStepProps) => {
  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'withGST':
        return {
          title: 'GST Registration & Compliance',
          description: 'Complete your GST registration details for full compliance.',
          showGSTField: true,
          showTaxExemptions: true,
          showAdvancedFields: true
        };
      case 'withoutGST':
        return {
          title: 'Tax Information (Optional)',
          description: 'Basic tax information - GST registration is not required.',
          showGSTField: false,
          showTaxExemptions: false,
          showAdvancedFields: false
        };
      case 'enterprise':
        return {
          title: 'Tax & Compliance Setup',
          description: 'Complete tax registration for enterprise compliance.',
          showGSTField: true,
          showTaxExemptions: true,
          showAdvancedFields: true
        };
      case 'corporateEmployee':
        return {
          title: 'Corporate Tax Information',
          description: 'Enter corporate tax details for compliance.',
          showGSTField: true,
          showTaxExemptions: true,
          showAdvancedFields: true
        };
      default:
        return {
          title: 'Tax Details',
          description: 'Provide your tax registration and compliance details.',
          showGSTField: true,
          showTaxExemptions: false,
          showAdvancedFields: false
        };
    }
  };

  const personalizedContent = getPersonalizedContent();

  return (
    <div>
      <div className="mb-6">
        {userClassification && (
          <Badge
            variant="secondary"
            className="mb-4 px-3 py-1 text-sm"
          >
            {userClassification.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </Badge>
        )}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        {personalizedContent.title}
      </h1>
      <p className="text-gray-600 text-lg mb-12">
        {personalizedContent.description}
      </p>

      <div className="space-y-6 max-w-2xl">
        {/* GST Field - Show only for relevant classifications */}
        {personalizedContent.showGSTField && (
          <div className="grid grid-cols-[1fr_120px] gap-2 items-end">
            <FormField
              control={form.control}
              name="gstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN Number *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                      placeholder="Enter GSTIN number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="max-w-full" variant="outline">
              Verify GSTIN
            </Button>
          </div>
        )}

        {/* Incorporation State */}
        <FormField
          control={form.control}
          name="incorporationState"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Incorporation State *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                  placeholder="Enter incorporation state"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tax Exemptions - Show only for relevant classifications */}
        {personalizedContent.showTaxExemptions && (
          <FormField
            control={form.control}
            name="taxExemptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Exemptions or Special Considerations
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400 resize-none"
                    placeholder="Describe any tax exemptions, special considerations, or compliance requirements"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-gray-500 mt-1">
                  This information helps us provide accurate tax compliance guidance
                </p>
              </FormItem>
            )}
          />
        )}

        {/* Billing Address */}
        <FormField
          control={form.control}
          name="billingAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Billing Address *
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400 resize-none"
                  placeholder="Enter your company's billing address"
                />
              </FormControl>
              <FormMessage />
              {personalizedContent.showGSTField && (
                <p className="text-sm text-blue-600 mt-1">
                  This address should match your GST registration records
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Advanced Tax Fields - Show only for enterprise */}
        {personalizedContent.showAdvancedFields && userClassification === 'enterprise' && (
          <>
            <FormField
              control={form.control}
              name="panNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                      placeholder="Enter PAN number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cinNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                    CIN Number (Corporate Identity Number)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                      placeholder="Enter CIN number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Tax Compliance Checklist - Show for GST users */}
        {personalizedContent.showGSTField && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Tax Compliance Checklist</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                GST registration certificate ready for upload
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Business address matches GST registration
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Tax compliance documents prepared
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
