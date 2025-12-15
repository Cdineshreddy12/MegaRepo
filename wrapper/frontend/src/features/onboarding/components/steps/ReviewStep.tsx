import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  Users, 
  User, 
  FileText, 
  CreditCard, 
  Mail, 
  Phone, 
  Globe,
  CheckCircle,
  Edit
} from 'lucide-react';
import { newBusinessData, existingBusinessData } from '../../schemas';

interface ReviewStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onEditStep?: (stepNumber: number) => void;
  userClassification?: UserClassification;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ form, onEditStep, userClassification }) => {
  const values = form.getValues();
  const isExistingBusiness = 'gstin' in values;

  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Review Your Startup Profile',
          description: 'Confirm your founder information and business vision.',
          badge: 'Startup Founder',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
      case 'corporateEmployee':
        return {
          title: 'Review Your Corporate Profile',
          description: 'Verify your professional information and company setup.',
          badge: 'Corporate Professional',
          badgeColor: 'bg-purple-100 text-purple-800'
        };
      case 'withGST':
        return {
          title: 'Review Your GST-Registered Business',
          description: 'Confirm your tax-compliant business information.',
          badge: 'GST Registered',
          badgeColor: 'bg-green-100 text-green-800'
        };
      case 'withDomainMail':
        return {
          title: 'Review Your Professional Setup',
          description: 'Verify your domain-integrated business profile.',
          badge: 'Professional Domain',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
      case 'enterprise':
        return {
          title: 'Review Your Enterprise Profile',
          description: 'Confirm your comprehensive enterprise business setup.',
          badge: 'Enterprise',
          badgeColor: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          title: 'Review Your Information',
          description: 'Please review all the information you\'ve provided.',
          badge: 'Standard',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const personalizedContent = getPersonalizedContent();

  const handleEditStep = (stepNumber: number) => {
    if (onEditStep) {
      onEditStep(stepNumber);
    }
  };

  const renderSection = (title: string, icon: React.ComponentType<any>, children: React.ReactNode, stepNumber?: number) => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </div>
          {stepNumber && onEditStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditStep(stepNumber)}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="mb-4">
          {userClassification && (
            <Badge
              variant="secondary"
              className={`mb-4 px-4 py-2 text-sm font-medium ${personalizedContent.badgeColor}`}
            >
              {personalizedContent.badge}
            </Badge>
          )}
        </div>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{personalizedContent.title}</h2>
        <p className="text-gray-600">
          {personalizedContent.description} You can edit any section by clicking the "Edit" button.
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Type & State */}
        {renderSection(
          "Company Information",
          Building2,
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Company Type</label>
              <p className="text-gray-900 capitalize">{values.companyType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">State</label>
              <p className="text-gray-900 capitalize">{values.state}</p>
            </div>
          </div>,
          1
        )}

        {/* Business Details */}
        {renderSection(
          "Business Details",
          FileText,
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Company Name</label>
              <p className="text-gray-900 font-medium">{values.businessDetails.companyName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Business Type</label>
              <p className="text-gray-900">{values.businessDetails.businessType}</p>
            </div>
            {values.businessDetails.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{values.businessDetails.description}</p>
              </div>
            )}
          </div>,
          3
        )}

        {/* Tax Details - Only for Existing Business */}
        {isExistingBusiness && (
          renderSection(
            "Tax Details",
            CreditCard,
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">GSTIN</label>
                  <p className="text-gray-900 font-mono">{values.gstin}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Incorporation State</label>
                  <p className="text-gray-900 capitalize">{values.incorporationState}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tax Details</label>
                <p className="text-gray-900">{values.taxDetails}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Billing Address</label>
                <p className="text-gray-900">{values.billingAddress}</p>
              </div>
            </div>,
            4
          )
        )}

        {/* Team Members */}
        {values.team && values.team.length > 0 && (
          renderSection(
            "Team Members",
            Users,
            <div className="space-y-3">
              {values.team.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>,
            isExistingBusiness ? 5 : 4
          )
        )}

        {/* Admin Details - Only for Existing Business */}
        {isExistingBusiness && (
          renderSection(
            "Administrator Details",
            User,
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Email</label>
                  <p className="text-gray-900">{values.adminEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Mobile</label>
                  <p className="text-gray-900">{values.adminMobile}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Website</label>
                <p className="text-gray-900">{values.website}</p>
              </div>
            </div>,
            6
          )
        )}

        {/* Personal Details */}
        {renderSection(
          "Personal Details",
          User,
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <p className="text-gray-900">{values.personalDetails.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <p className="text-gray-900">{values.personalDetails.lastName}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{values.personalDetails.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{values.personalDetails.phone}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900">{values.personalDetails.address}</p>
            </div>
          </div>,
          isExistingBusiness ? 7 : 5
        )}

        {/* Personalized Summary Badge */}
        <div className={`border rounded-lg p-6 text-center ${
          userClassification === 'aspiringFounder' ? 'bg-blue-50 border-blue-200' :
          userClassification === 'corporateEmployee' ? 'bg-purple-50 border-purple-200' :
          userClassification === 'withGST' ? 'bg-green-50 border-green-200' :
          userClassification === 'enterprise' ? 'bg-purple-50 border-purple-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircle className={`w-5 h-5 ${
              userClassification === 'aspiringFounder' ? 'text-blue-600' :
              userClassification === 'corporateEmployee' ? 'text-purple-600' :
              userClassification === 'withGST' ? 'text-green-600' :
              userClassification === 'enterprise' ? 'text-purple-600' :
              'text-blue-600'
            }`} />
            <h3 className={`text-lg font-semibold ${
              userClassification === 'aspiringFounder' ? 'text-blue-900' :
              userClassification === 'corporateEmployee' ? 'text-purple-900' :
              userClassification === 'withGST' ? 'text-green-900' :
              userClassification === 'enterprise' ? 'text-purple-900' :
              'text-blue-900'
            }`}>
              {userClassification === 'aspiringFounder' ? 'Ready to Launch Your Startup' :
               userClassification === 'corporateEmployee' ? 'Corporate Setup Complete' :
               userClassification === 'withGST' ? 'GST-Compliant Business Ready' :
               userClassification === 'enterprise' ? 'Enterprise Profile Complete' :
               'Ready to Submit'}
            </h3>
          </div>
          <p className={`text-sm ${
            userClassification === 'aspiringFounder' ? 'text-blue-700' :
            userClassification === 'corporateEmployee' ? 'text-purple-700' :
            userClassification === 'withGST' ? 'text-green-700' :
            userClassification === 'enterprise' ? 'text-purple-700' :
            'text-blue-700'
          }`}>
            {userClassification === 'aspiringFounder' ?
              'Your startup profile is complete. Click "Submit" to begin your entrepreneurial journey!' :
             userClassification === 'corporateEmployee' ?
              'Your corporate profile is ready. Click "Submit" to activate your business account.' :
             userClassification === 'withGST' ?
              'Your GST-compliant business setup is complete. Click "Submit" to finalize registration.' :
             userClassification === 'enterprise' ?
              'Your enterprise profile is configured. Click "Submit" to activate premium features.' :
              'All required information has been provided. Click "Submit" to complete your onboarding.'}
          </p>
        </div>
      </div>
    </div>
  );
};
