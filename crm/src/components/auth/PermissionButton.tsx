import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionButtonProps {
  permission: string;
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  module,
  action,
  children,
  fallback = null,
  className = '',
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default'
}) => {
  const { hasModulePermission } = usePermissions();
  
  const hasPermission = hasModulePermission(module, action);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  // Import Button component dynamically to avoid circular dependencies
  const Button = React.lazy(() => import('@/components/ui/button'));
  
  return (
    <React.Suspense fallback={<div className="h-10 w-20 bg-gray-200 animate-pulse rounded" />}>
      <Button
        className={className}
        onClick={onClick}
        disabled={disabled}
        variant={variant}
        size={size}
      >
        {children}
      </Button>
    </React.Suspense>
  );
};

// Convenience components for common actions
export const CreateButton: React.FC<Omit<PermissionButtonProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionButton module={module} action="create" {...props}>
    {children}
  </PermissionButton>
);

export const EditButton: React.FC<Omit<PermissionButtonProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionButton module={module} action="update" {...props}>
    {children}
  </PermissionButton>
);

export const DeleteButton: React.FC<Omit<PermissionButtonProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionButton module={module} action="delete" {...props}>
    {children}
  </PermissionButton>
);

export const ViewButton: React.FC<Omit<PermissionButtonProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionButton module={module} action="read" {...props}>
    {children}
  </PermissionButton>
);

export const ExportButton: React.FC<Omit<PermissionButtonProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionButton module={module} action="export" {...props}>
    {children}
  </PermissionButton>
);
