import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPermissionSummary } from '../utils/permissionUtils';

interface EnhancedPermissionSummaryProps {
  permissions: Record<string, any>;
  roleName: string;
  restrictions?: Record<string, any>;
  isSystemRole: boolean;
  userCount: number;
}

// Normalize permissions - convert JSON strings to objects
const normalizePermissions = (permissions: any): Record<string, any> | string[] => {
  if (typeof permissions === 'string') {
    try {
      return JSON.parse(permissions);
    } catch (error) {
      console.error('Failed to parse permissions JSON string:', error);
      return {};
    }
  }
  return permissions;
};

export function EnhancedPermissionSummary({
  permissions,
  roleName,
  restrictions,
  isSystemRole,
  userCount,
}: EnhancedPermissionSummaryProps) {
  // Normalize permissions before calculating summary
  const normalizedPermissions = normalizePermissions(permissions);
  const permissionSummary = getPermissionSummary(normalizedPermissions);

  return (
    <div className="space-y-6">
      {/* Permission Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permission Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{permissionSummary.total}</div>
              <div className="text-sm text-gray-600">Total Permissions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{permissionSummary.applicationCount}</div>
              <div className="text-sm text-gray-600">Applications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{permissionSummary.moduleCount}</div>
              <div className="text-sm text-gray-600">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{userCount}</div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permission Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Administrative Permissions</span>
              <Badge variant="destructive">{permissionSummary.admin}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Write Permissions</span>
              <Badge variant="secondary">{permissionSummary.write}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Read Permissions</span>
              <Badge variant="outline">{permissionSummary.read}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Details */}
      {Object.keys(permissionSummary.moduleDetails).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Module Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(permissionSummary.moduleDetails).map(([module, operations]) => (
                <div key={module} className="border rounded-lg p-3">
                  <div className="font-medium text-gray-900 mb-2">{module}</div>
                  <div className="flex flex-wrap gap-1">
                    {operations.map((operation, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {operation}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restrictions */}
      {restrictions && Object.keys(restrictions).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(restrictions).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm font-medium">{key}:</span>
                  <span className="text-sm text-gray-600">{String(value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Role Notice */}
      {isSystemRole && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-900">
                This is a system role with predefined permissions
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
