import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { COMPANY_TYPES } from '../../schemas';
import { UserClassification } from '../FlowSelector';

interface CompanyTypeStepProps {
  selectedType: string;
  onSelect: (typeId: string) => void;
  userClassification?: UserClassification;
}

export const CompanyTypeStep = ({ selectedType, onSelect, userClassification }: CompanyTypeStepProps) => {
  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Choose your startup structure',
          description: 'Select the legal structure that best fits your startup vision and growth plans.',
          recommended: 'llc' // Recommend LLC for startups
        };
      case 'corporateEmployee':
        return {
          title: 'Corporate Structure Selection',
          description: 'Choose the company structure that aligns with your corporate requirements.',
          recommended: 'corporation' // Recommend corporation for corporate
        };
      case 'enterprise':
        return {
          title: 'Enterprise Structure Setup',
          description: 'Select the appropriate legal structure for your enterprise organization.',
          recommended: 'corporation'
        };
      default:
        return {
          title: 'Choose company type',
          description: 'Select the type of company you want to incorporate.',
          recommended: 'llc'
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
      <div className="space-y-4 max-w-lg">
        {COMPANY_TYPES.map((type) => {
          const isRecommended = type.id === personalizedContent.recommended;
          const isSelected = selectedType === type.id;

          return (
            <Button
              key={type.id}
              type="button"
              variant="outline"
              onClick={() => onSelect(type.id)}
              className={`w-full p-6 h-auto border-2 rounded-xl text-left transition-colors duration-200 ease-out justify-start ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : isRecommended
                    ? 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold text-lg transition-colors duration-150 ${
                    isSelected ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {type.name}
                  </h3>
                  {isRecommended && !isSelected && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className={`mt-1 transition-colors duration-150 ${
                  isSelected ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {type.description}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
