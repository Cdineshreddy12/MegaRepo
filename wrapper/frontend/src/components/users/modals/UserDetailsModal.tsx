import React from 'react';
import { X, Mail, Building2 } from 'lucide-react';
import { PearlButton } from '@/components/ui/pearl-button';

interface User {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  department?: string;
  title?: string;
  invitedBy?: string;
  invitedAt?: string;
  invitationAcceptedAt?: string;
  lastLoginAt?: string;
  roles?: any[];
  avatar?: string;
  invitationStatus?: string;
  userType?: string;
  originalData?: any;
  invitationId?: string;
}

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  generateInvitationUrl: (user: User) => string | null;
  copyInvitationUrl: (user: User) => Promise<void>;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  generateInvitationUrl,
  copyInvitationUrl
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
              style={{
                background: user.avatar ? `url(${user.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              {!user.avatar && (user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name || 'Unnamed User'}</h2>
              <p className="text-sm text-gray-600">{user.email || 'No email provided'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Role Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Account Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.invitationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {user.invitationStatus === 'pending' ? 'Pending Invitation' :
                     user.isActive ? 'Active' : 'Setup Required'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role:</span>
                  <span className="text-gray-900">
                    {user.roles && user.roles.length > 0
                      ? user.roles.map(role => role.roleName).join(', ')
                      : 'No roles assigned'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Activity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invited:</span>
                  <span className="text-gray-900">{user.invitedAt ? new Date(user.invitedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Login:</span>
                  <span className="text-gray-900">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Onboarding:</span>
                  <span className={user.onboardingCompleted ? 'text-green-600' : 'text-orange-600'}>
                    {user.onboardingCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invitation URL Section - Show prominently for pending invitations */}
          {user.invitationStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Invitation URL
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-blue-800">
                  Share this URL with {user.name || user.email} to complete their invitation:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generateInvitationUrl(user) || 'No invitation URL available'}
                    readOnly
                    className="flex-1 px-3 py-2 border border-blue-300 rounded bg-white text-sm font-mono"
                  />
                  <PearlButton
                    onClick={() => copyInvitationUrl(user)}
                    className="px-3 py-2 text-sm"
                    size="sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Copy
                  </PearlButton>
                </div>
                <p className="text-xs text-blue-600">
                  The user can click this link to accept the invitation and join your organization.
                </p>
              </div>
            </div>
          )}

          {/* Assigned Roles */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Assigned Roles</h3>
            {user.roles && user.roles.length > 0 ? (
              <div className="space-y-2">
                {user.roles.map(role => (
                  <div key={role.roleId} className="flex items-center gap-3 p-2 bg-white rounded border">
                    <span style={{ color: role.color }}>{role.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{role.roleName}</div>
                      <div className="text-sm text-gray-600">{role.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No roles assigned</p>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <PearlButton className="text-sm" size="sm">
                Edit User
              </PearlButton>
              <PearlButton className="text-sm" variant="secondary" size="sm">
                Reset Password
              </PearlButton>
              {!user.onboardingCompleted && (
                <PearlButton className="text-sm" variant="outline" size="sm">
                  Resend Invite
                </PearlButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
