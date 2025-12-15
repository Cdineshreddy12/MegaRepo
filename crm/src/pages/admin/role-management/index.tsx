import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { roleService, type Role } from '@/services/api/roleService';

const RoleManagement = () => {
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Fetch roles from API
  const {
    data: rolesResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles(),
    staleTime: 30000, // 30 seconds
  });

  const roles = rolesResponse?.data || [];

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      try {
        // For now, we'll just show an alert since delete is event-driven
        alert('Role deletion is handled via events. Please use the appropriate event-driven mechanism.');
      } catch (error) {
        console.error('Failed to delete role:', error);
        alert('Failed to delete role. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading roles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center space-y-2">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="text-red-600">Failed to load roles</span>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Role Management</h2>
          <p className="text-sm text-gray-600">
            {rolesResponse?.count || 0} roles total
          </p>
        </div>
        <button
          onClick={handleCreateRole}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700"
        >
          <Plus size={20} className="mr-2" />
          Add Role
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {roles.map((role) => (
            <li key={role.roleId} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className={`h-6 w-6 ${role.isActive ? 'text-green-400' : 'text-gray-400'}`} />
                  <div className="ml-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">{role.roleName}</h3>
                      {!role.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{role.description}</p>
                    <p className="text-xs text-gray-400">
                      Priority: {role.priority || 0} • Permissions: {role.permissions?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    title="Edit Role"
                  >
                    <Edit2 size={16} />
                  </button>
                  {role.roleName !== 'Super Admin' && (
                    <button
                      onClick={() => handleDeleteRole(role.roleId)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-red-600 bg-white hover:bg-red-50"
                      title="Delete Role"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {role.permissions?.slice(0, 10).map((permission, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      title={permission}
                    >
                      {permission.length > 30 ? `${permission.substring(0, 30)}...` : permission}
                    </span>
                  ))}
                  {role.permissions && role.permissions.length > 10 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      +{role.permissions.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {roles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first role.
            </p>
            <div className="mt-6">
              <button
                onClick={handleCreateRole}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
              >
                <Plus size={20} className="mr-2" />
                Add Role
              </button>
            </div>
          </div>
        )}
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-primary mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Event-Driven Role Management
                  </h4>
                  <div className="mt-1 text-sm text-yellow-700">
                    <p>
                      Role creation and updates are handled through events in this system.
                      Please use the appropriate event-driven mechanism to {editingRole ? 'update' : 'create'} roles.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {editingRole && (
              <div className="bg-gray-50 rounded-md p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Role Details</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500">Role ID</dt>
                    <dd className="text-gray-900">{editingRole.roleId}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Name</dt>
                    <dd className="text-gray-900">{editingRole.roleName}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Status</dt>
                    <dd className="text-gray-900">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        editingRole.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {editingRole.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Permissions</dt>
                    <dd className="text-gray-900">{editingRole.permissions?.length || 0} permissions</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Available API Endpoints</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>GET /api/roles</strong> - Fetch all roles</p>
                <p><strong>GET /api/roles/:roleId</strong> - Fetch specific role</p>
                <p><strong>GET /api/roles/my-roles</strong> - Fetch current user's roles</p>
                <p><strong>GET /api/roles/stats</strong> - Get role statistics</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                }}
                className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;