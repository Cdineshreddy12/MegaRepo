import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from './PermissionButton';

interface PermissionFormProps {
  module: string;
  action: 'create' | 'update' | 'read';
  children: React.ReactNode;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  className?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

export const PermissionForm: React.FC<PermissionFormProps> = ({
  module,
  action,
  children,
  onSubmit,
  onCancel,
  className = '',
  submitLabel = 'Submit',
  cancelLabel = 'Cancel'
}) => {
  const { hasModulePermission } = usePermissions();
  
  const hasPermission = hasModulePermission(module, action);
  
  if (!hasPermission) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg font-medium mb-2">
          Access Denied
        </div>
        <p className="text-gray-600">
          You don't have permission to {action} {module}.
        </p>
      </div>
    );
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      // Collect form data and submit
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      
      <div className="flex justify-end space-x-3 mt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {cancelLabel}
          </button>
        )}
        
        {onSubmit && action !== 'read' && (
          <PermissionButton
            module={module}
            action={action}
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {submitLabel}
          </PermissionButton>
        )}
      </div>
    </form>
  );
};

// Permission-based form field wrapper
export const PermissionField: React.FC<{
  module: string;
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ module, permission, children, fallback = null }) => {
  const { hasModulePermission } = usePermissions();
  
  const hasPermission = hasModulePermission(module, permission);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Convenience components for common form actions
export const CreateForm: React.FC<Omit<PermissionFormProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionForm module={module} action="create" {...props}>
    {children}
  </PermissionForm>
);

export const EditForm: React.FC<Omit<PermissionFormProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionForm module={module} action="update" {...props}>
    {children}
  </PermissionForm>
);

export const ViewForm: React.FC<Omit<PermissionFormProps, 'action'> & { module: string }> = ({
  module,
  children,
  ...props
}) => (
  <PermissionForm module={module} action="read" {...props}>
    {children}
  </PermissionForm>
);
