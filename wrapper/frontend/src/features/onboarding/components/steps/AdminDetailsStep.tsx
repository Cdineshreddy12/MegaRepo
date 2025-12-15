import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../../schemas';
import { Badge } from '@/components/ui/badge';
import { UserClassification } from '../FlowSelector';

interface AdminDetailsStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  userClassification?: UserClassification;
}

export const AdminDetailsStep = ({ form, userClassification }: AdminDetailsStepProps) => {
  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Your Admin Account Setup',
          description: 'Set up your administrator account as the company founder.',
          emailPlaceholder: 'founder@yourcompany.com',
          mobilePlaceholder: '+1 (555) 123-4567',
          websitePlaceholder: 'https://www.yourcompany.com',
          showDomainIntegration: false
        };
      case 'corporateEmployee':
        return {
          title: 'Corporate Admin Setup',
          description: 'Configure your administrator access for the corporate environment.',
          emailPlaceholder: 'admin@company.com',
          mobilePlaceholder: '+1 (555) 123-4567',
          websitePlaceholder: 'https://www.company.com',
          showDomainIntegration: true
        };
      case 'withDomainMail':
        return {
          title: 'Professional Admin Setup',
          description: 'Complete your professional administrator account configuration.',
          emailPlaceholder: 'admin@yourdomain.com',
          mobilePlaceholder: '+1 (555) 123-4567',
          websitePlaceholder: 'https://www.yourdomain.com',
          showDomainIntegration: true
        };
      case 'enterprise':
        return {
          title: 'Enterprise Administrator Profile',
          description: 'Set up your enterprise administrator account with advanced features.',
          emailPlaceholder: 'admin@enterprise.com',
          mobilePlaceholder: '+1 (555) 123-4567',
          websitePlaceholder: 'https://www.enterprise.com',
          showDomainIntegration: true
        };
      default:
        return {
          title: 'Admin Details',
          description: 'Provide administrator contact and account details.',
          emailPlaceholder: 'admin@company.com',
          mobilePlaceholder: '+1 (555) 123-4567',
          websitePlaceholder: 'https://www.company.com',
          showDomainIntegration: false
        };
    }
  };

  const personalizedContent = getPersonalizedContent();

  // Determine if mobile verification is needed
  const requiresMobileVerification = userClassification === 'withGST' || userClassification === 'enterprise';

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
            name="adminEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email *
                  {userClassification === 'withDomainMail' && (
                    <span className="text-xs text-green-600 ml-2">(Professional domain detected)</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                    placeholder={personalizedContent.emailPlaceholder}
                  />
                </FormControl>
                <FormMessage />
                {personalizedContent.showDomainIntegration && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Professional domain integration available
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adminMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Mobile {requiresMobileVerification ? '*' : '(Optional)'}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                    placeholder={personalizedContent.mobilePlaceholder}
                  />
                </FormControl>
                <FormMessage />
                {requiresMobileVerification && (
                  <p className="text-sm text-blue-600 mt-1">
                    Mobile verification required for {userClassification === 'withGST' ? 'GST compliance' : 'enterprise access'}
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                Company Website *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ease-out hover:border-gray-400"
                  placeholder={personalizedContent.websitePlaceholder}
                />
              </FormControl>
              <FormMessage />
              {personalizedContent.showDomainIntegration && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Domain integration will be configured automatically
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Domain Integration Benefits - Show for domain mail users */}
        {personalizedContent.showDomainIntegration && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Domain Integration Benefits</h4>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Professional email with custom domain
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Enhanced brand credibility
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Business communications setup
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Admin Features */}
        {userClassification === 'enterprise' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">Enterprise Admin Features</h4>
            <div className="space-y-2 text-sm text-purple-700">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Multi-factor authentication setup
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Advanced security configurations
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Enterprise support access
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Important Note</h4>
          <p className="text-sm text-blue-700">
            The administrator email will be used for account management and important notifications.
            Make sure this email is accessible and monitored regularly.
            {personalizedContent.showDomainIntegration && ' Professional domain emails provide better deliverability.'}
          </p>
        </div>
      </div>
    </div>
  );
};
