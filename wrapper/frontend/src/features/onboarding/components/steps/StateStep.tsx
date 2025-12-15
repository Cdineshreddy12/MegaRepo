import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STATES } from '../../schemas';
import { UserClassification } from '../FlowSelector';

interface StateStepProps {
  selectedState: string;
  onSelect: (stateId: string) => void;
  userClassification?: UserClassification;
}

export const StateStep = ({ selectedState, onSelect, userClassification }: StateStepProps) => {
  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Choose your incorporation state',
          description: 'Select the state that best suits your startup needs and growth plans.',
          recommended: 'delaware' // Recommend Delaware for startups
        };
      case 'corporateEmployee':
        return {
          title: 'Select incorporation state',
          description: 'Choose the state for your corporate entity registration.',
          recommended: 'delaware' // Recommend Delaware for corporations
        };
      case 'enterprise':
        return {
          title: 'Enterprise Incorporation State',
          description: 'Select the optimal state for your enterprise registration.',
          recommended: 'delaware'
        };
      default:
        return {
          title: 'Choose the state',
          description: 'Select the state in which you want to incorporate your new company.',
          recommended: 'delaware'
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
      <div className="flex space-x-8">
        {STATES.map((state) => {
          const isRecommended = state.id === personalizedContent.recommended;
          const isSelected = selectedState === state.id;

          return (
            <Button
              key={state.id}
              type="button"
              variant="outline"
              onClick={() => onSelect(state.id)}
              className={`w-40 h-40 border-2 rounded-xl text-center transition-colors duration-200 ease-out flex flex-col items-center justify-center space-y-4 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : isRecommended
                    ? 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
              }`}
            >
              <div className="w-12 h-12 flex items-center justify-center">
                {state.id === 'delaware' ? (
                  <div className="relative">
                    <div className="w-8 h-10 bg-blue-500 rounded-t"></div>
                    <div className="absolute top-1 left-1 w-2 h-2 bg-white"></div>
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white"></div>
                    <div className="absolute top-4 left-1 w-2 h-2 bg-white"></div>
                    <div className="absolute top-4 right-1 w-2 h-2 bg-white"></div>
                    <div className="absolute top-7 left-1 w-6 h-2 bg-white"></div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-blue-500"></div>
                    <div className="absolute -top-4 left-2 w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-blue-400"></div>
                    <div className="absolute -top-2 -left-2 w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-blue-300"></div>
                  </div>
                )}
              </div>
              <span className={`text-sm font-medium tracking-wide transition-colors duration-150 ${
                isSelected ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {state.name}
              </span>
              {isRecommended && !isSelected && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 mt-1">
                  Recommended
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Show recommendation info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Why Delaware?</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>• Business-friendly legal system</div>
          <div>• Established corporate law precedents</div>
          <div>• Privacy protection for owners</div>
          <div>• Recognized nationwide</div>
        </div>
      </div>
    </div>
  );
};
