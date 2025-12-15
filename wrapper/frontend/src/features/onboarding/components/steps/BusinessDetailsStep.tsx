import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData, BUSINESS_TYPES } from '../../schemas';
import { Badge } from '@/components/ui/badge';
import { UserClassification } from '../FlowSelector';

interface BusinessDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  userClassification?: UserClassification;
}

export const BusinessDetailsStep = ({ form, userClassification }: BusinessDetailsStepProps) => {
  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Tell us about your startup vision',
          description: 'Share your company details and what makes your business unique.',
          placeholder: 'Describe your innovative solution or business idea'
        };
      case 'corporateEmployee':
        return {
          title: 'Company Information',
          description: 'Provide details about the organization you represent.',
          placeholder: 'Describe your role and department within the organization'
        };
      case 'withGST':
        return {
          title: 'GST Registered Business Details',
          description: 'Enter your registered business information for compliance.',
          placeholder: 'Describe your GST-registered business activities'
        };
      case 'withoutGST':
        return {
          title: 'Business Information',
          description: 'Tell us about your business - GST registration is optional.',
          placeholder: 'Describe your business activities and services'
        };
      case 'freemium':
        return {
          title: 'Basic Company Setup',
          description: 'Get started with essential business information.',
          placeholder: 'Briefly describe what your business does'
        };
      case 'enterprise':
        return {
          title: 'Enterprise Business Profile',
          description: 'Complete your comprehensive business profile setup.',
          placeholder: 'Describe your enterprise operations and market presence'
        };
      default:
        return {
          title: 'Business details',
          description: 'Provide details about your business.',
          placeholder: 'Describe what your business does'
        };
    }
  };

  const personalizedContent = getPersonalizedContent();

  // Get personalized business types based on classification
  const getPersonalizedBusinessTypes = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return ['Technology', 'E-commerce', 'SaaS', 'Mobile App', 'Digital Services'];
      case 'corporateEmployee':
        return ['Enterprise', 'Corporate', 'Professional Services', 'Consulting', 'B2B'];
      case 'freemium':
        return ['Small Business', 'Freelance', 'Personal Use', 'Startup'];
      case 'enterprise':
        return ['Large Corporation', 'Multinational', 'Enterprise', 'B2B Services', 'Manufacturing'];
      default:
        return BUSINESS_TYPES;
    }
  };

  const personalizedBusinessTypes = getPersonalizedBusinessTypes();

  // Show GST field only for GST-registered businesses
  const showGSTField = userClassification === 'withGST';

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
        <FormField
          control={form.control}
          name="businessDetails.companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                  placeholder="Enter your company name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessDetails.businessType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Business Type *
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {personalizedBusinessTypes.map((type) => (
                    <SelectItem key={type} value={type} className="hover:bg-blue-50">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessDetails.description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400 resize-none"
                  placeholder={personalizedContent.placeholder}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Show GST field only for GST-registered businesses */}
        {showGSTField && (
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
                    placeholder="Enter your GSTIN number"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-gray-500 mt-1">
                  Your GST number will be verified for compliance
                </p>
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
};
