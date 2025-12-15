import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../../schemas';
import { Badge } from '@/components/ui/badge';
import { UserClassification } from '../FlowSelector';

interface PersonalDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  userClassification?: UserClassification;
}

export const PersonalDetailsStep = ({ form, userClassification }: PersonalDetailsStepProps) => {
  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Your founder profile',
          description: 'Share your personal information as the company founder.',
          placeholder: 'Tell us about yourself and your entrepreneurial background'
        };
      case 'corporateEmployee':
        return {
          title: 'Professional Profile',
          description: 'Provide your professional information and contact details.',
          placeholder: 'Describe your role and professional experience'
        };
      case 'withDomainMail':
        return {
          title: 'Professional Contact Information',
          description: 'Enter your business contact details.',
          placeholder: 'Your professional background and contact information'
        };
      case 'freemium':
        return {
          title: 'Personal Information',
          description: 'Basic personal details to get started.',
          placeholder: 'Brief information about yourself'
        };
      case 'enterprise':
        return {
          title: 'Executive Profile',
          description: 'Complete your executive profile for enterprise access.',
          placeholder: 'Your executive background and leadership experience'
        };
      default:
        return {
          title: 'Personal details',
          description: 'Provide your personal information.',
          placeholder: 'Tell us about yourself'
        };
    }
  };

  const personalizedContent = getPersonalizedContent();

  // Determine if phone number is required based on classification
  const isPhoneRequired = userClassification === 'withGST' || userClassification === 'enterprise';

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="personalDetails.firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your first name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="personalDetails.lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your last name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="personalDetails.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
                {userClassification === 'withDomainMail' && (
                  <span className="text-xs text-green-600 ml-2">(Professional email detected)</span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </FormControl>
              <FormMessage />
              {userClassification === 'withDomainMail' && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Professional domain email will be used for business communications
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number {isPhoneRequired ? '*' : '(Optional)'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </FormControl>
              <FormMessage />
              {isPhoneRequired && (
                <p className="text-sm text-blue-600 mt-1">
                  Phone number required for {userClassification === 'withGST' ? 'GST verification' : 'enterprise access'}
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Address {userClassification === 'withGST' ? '*' : '(Optional)'}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={userClassification === 'withGST' ? 'Enter your registered business address' : 'Enter your full address'}
                />
              </FormControl>
              <FormMessage />
              {userClassification === 'withGST' && (
                <p className="text-sm text-blue-600 mt-1">
                  Business address required for GST registration compliance
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Show professional background for enterprise users */}
        {userClassification === 'enterprise' && (
          <FormField
            control={form.control}
            name="personalDetails.background"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Background
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your professional experience and leadership background"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-gray-500 mt-1">
                  This helps us customize your enterprise experience
                </p>
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
};
