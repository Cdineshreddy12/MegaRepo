import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from './PermissionButton';

interface PermissionTableProps {
  module: string;
  data: any[];
  columns: Array<{
    key: string;
    header: string;
    render?: (value: any, row: any) => React.ReactNode;
    permission?: string; // Optional permission check for column visibility
  }>;
  actions?: Array<{
    key: string;
    label: string;
    action: string;
    permission: string;
    onClick: (row: any) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }>;
  className?: string;
}

export const PermissionTable: React.FC<PermissionTableProps> = ({
  module,
  data,
  columns,
  actions = [],
  className = ''
}) => {
  const { hasModulePermission } = usePermissions();
  
  // Filter columns based on permissions
  const visibleColumns = columns.filter(column => {
    if (!column.permission) return true;
    return hasModulePermission(module, column.permission);
  });
  
  // Filter actions based on permissions
  const visibleActions = actions.filter(action => {
    return hasModulePermission(module, action.permission);
  });

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
            {visibleActions.length > 0 && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {visibleColumns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
              {visibleActions.length > 0 && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex space-x-2">
                    {visibleActions.map((action) => (
                      <PermissionButton
                        key={action.key}
                        module={module}
                        action={action.permission}
                        onClick={() => action.onClick(row)}
                        variant={action.variant}
                        size={action.size}
                      >
                        {action.label}
                      </PermissionButton>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Convenience component for common table actions
export const TableActions: React.FC<{
  module: string;
  row: any;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onExport?: (row: any) => void;
}> = ({ module, row, onView, onEdit, onDelete, onExport }) => {
  const actions = [];
  
  if (onView) {
    actions.push({
      key: 'view',
      label: 'View',
      action: 'read',
      permission: 'read',
      onClick: onView,
      variant: 'outline' as const,
      size: 'sm' as const
    });
  }
  
  if (onEdit) {
    actions.push({
      key: 'edit',
      label: 'Edit',
      action: 'update',
      permission: 'update',
      onClick: onEdit,
      variant: 'secondary' as const,
      size: 'sm' as const
    });
  }
  
  if (onDelete) {
    actions.push({
      key: 'delete',
      label: 'Delete',
      action: 'delete',
      permission: 'delete',
      onClick: onDelete,
      variant: 'destructive' as const,
      size: 'sm' as const
    });
  }
  
  if (onExport) {
    actions.push({
      key: 'export',
      label: 'Export',
      action: 'export',
      permission: 'export',
      onClick: onExport,
      variant: 'ghost' as const,
      size: 'sm' as const
    });
  }
  
  return (
    <div className="flex space-x-2">
      {actions.map((action) => (
        <PermissionButton
          key={action.key}
          module={module}
          action={action.permission}
          onClick={() => action.onClick(row)}
          variant={action.variant}
          size={action.size}
        >
          {action.label}
        </PermissionButton>
      ))}
    </div>
  );
};
