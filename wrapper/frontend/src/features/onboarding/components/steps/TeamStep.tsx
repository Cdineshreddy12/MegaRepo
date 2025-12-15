import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData, TeamMember } from '../../schemas';
import { UserClassification } from '../FlowSelector';

interface TeamStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onAddMember: () => void;
  onUpdateMember: (id: number, field: keyof TeamMember, value: string) => void;
  onRemoveMember: (id: number) => void;
  userClassification?: UserClassification;
}

export const TeamStep = ({ form, onAddMember, onUpdateMember, onRemoveMember, userClassification }: TeamStepProps) => {
  const team = form.watch('team');

  // Get personalized content based on user classification
  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Build your startup team',
          description: 'Add co-founders and key team members to your startup.',
          placeholder: 'Co-founder, CTO, Head of Marketing, etc.',
          maxMembers: 5,
          showSuggestions: true
        };
      case 'corporateEmployee':
        return {
          title: 'Add team members',
          description: 'Include colleagues and department members in your corporate setup.',
          placeholder: 'Manager, Team Lead, Department Head, etc.',
          maxMembers: 10,
          showSuggestions: true
        };
      case 'enterprise':
        return {
          title: 'Enterprise team configuration',
          description: 'Set up your enterprise team structure with multiple departments.',
          placeholder: 'Executive, Department Head, Manager, etc.',
          maxMembers: 20,
          showSuggestions: true
        };
      default:
        return {
          title: 'Team members',
          description: 'Add team members who will be part of your company.',
          placeholder: 'Full Name',
          maxMembers: 5,
          showSuggestions: false
        };
    }
  };

  const personalizedContent = getPersonalizedContent();

  // Get role suggestions based on classification
  const getRoleSuggestions = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return ['Co-founder', 'CTO', 'Head of Marketing', 'Lead Developer', 'Product Manager'];
      case 'corporateEmployee':
        return ['Department Head', 'Team Lead', 'Senior Manager', 'Project Manager', 'Specialist'];
      case 'enterprise':
        return ['Executive Director', 'VP of Operations', 'Department Head', 'Senior Manager', 'Team Lead'];
      default:
        return ['Manager', 'Team Lead', 'Senior', 'Associate', 'Analyst'];
    }
  };

  const roleSuggestions = getRoleSuggestions();

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
      <div className="max-w-3xl">
        {team.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-4">No team members added yet</p>
            <Button
              type="button"
              onClick={onAddMember}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </Button>

            {/* Show role suggestions for personalized experience */}
            {personalizedContent.showSuggestions && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-3">Suggested roles:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {roleSuggestions.slice(0, 3).map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {team.map((member, index) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">
                    {userClassification === 'aspiringFounder' ? 'Team Member' :
                     userClassification === 'corporateEmployee' ? 'Colleague' :
                     userClassification === 'enterprise' ? 'Staff Member' :
                     'Team Member'} {index + 1}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMember(member.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="text"
                    value={member.name}
                    onChange={(e) => onUpdateMember(member.id, 'name', e.target.value)}
                    placeholder="Full Name"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Input
                    type="text"
                    value={member.role}
                    onChange={(e) => onUpdateMember(member.id, 'role', e.target.value)}
                    placeholder={personalizedContent.placeholder}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => onUpdateMember(member.id, 'email', e.target.value)}
                    placeholder="Email"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Show role suggestions when role field is empty */}
                {personalizedContent.showSuggestions && !member.role && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {roleSuggestions.slice(0, 4).map((role) => (
                        <Button
                          key={role}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateMember(member.id, 'role', role)}
                          className="text-xs h-6 px-2"
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Show member limit warning */}
            {team.length >= personalizedContent.maxMembers && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  You've reached the maximum of {personalizedContent.maxMembers} team members for your plan.
                  {userClassification === 'freemium' && ' Upgrade to add more members.'}
                </p>
              </div>
            )}

            <Button
              type="button"
              onClick={onAddMember}
              disabled={team.length >= personalizedContent.maxMembers}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Member</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
