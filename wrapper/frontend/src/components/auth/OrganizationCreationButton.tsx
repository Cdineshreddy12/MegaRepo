import React from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Button } from '../ui/button';
import { Building2, Plus } from 'lucide-react';

interface OrganizationCreationButtonProps {
  size?: 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  children?: React.ReactNode;
}

export const OrganizationCreationButton: React.FC<OrganizationCreationButtonProps> = ({
  size = 'default',
  variant = 'default',
  className = '',
  children
}) => {
  const { login, isLoading } = useKindeAuth();

  const handleCreateOrg = () => {
    console.log('🏢 OrganizationCreationButton: Starting organization creation flow');
    
    // Use Kinde's built-in organization creation
    login({
      isCreateOrg: true,
      app_state: {
        redirectTo: '/onboarding',
        action: 'create_organization'
      }
    });
  };

  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        <span className="ml-2">Loading...</span>
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleCreateOrg}
      variant={variant}
      size={size}
      className={className}
    >
      <Plus className="h-4 w-4 mr-2" />
      <Building2 className="h-4 w-4 mr-2" />
      {children || 'Create Organization'}
    </Button>
  );
};

export default OrganizationCreationButton;
