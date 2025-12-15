import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserCog, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Entity {
  entityId: string;
  entityName: string;
  entityType?: string;
  responsiblePersonId?: string;
}

interface EditResponsiblePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Entity | null;
  onSuccess?: () => void;
  makeRequest?: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export const EditResponsiblePersonModal: React.FC<EditResponsiblePersonModalProps> = ({
  isOpen,
  onClose,
  entity,
  onSuccess,
  makeRequest,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentResponsiblePerson, setCurrentResponsiblePerson] = useState<User | null>(null);
  const [loadingResponsiblePerson, setLoadingResponsiblePerson] = useState(false);

  // Load users and current responsible person when modal opens
  useEffect(() => {
    if (isOpen && entity) {
      console.log('🔄 Modal opened for entity:', entity);
      console.log('📋 Entity responsiblePersonId:', entity.responsiblePersonId);
      loadUsers();
      loadCurrentResponsiblePerson();
      setSelectedUserId(entity.responsiblePersonId || 'none');
    }
  }, [isOpen, entity]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading users for responsible person selection...');

      const endpoint = '/tenants/current/users';
      const options = {
        method: 'GET' as const,
        headers: { 'X-Application': 'crm' }
      };

      const response = makeRequest
        ? await makeRequest(endpoint, options)
        : await api.get(endpoint, { headers: options.headers });

      console.log('📋 Users API response:', response);

      if (response.success) {
        const userList = response.data || [];
        console.log('✅ Loaded users:', userList.length);
        setUsers(userList);
      } else {
        console.log('❌ Users API response not successful:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentResponsiblePerson = async () => {
    if (!entity?.entityId) return;

    try {
      setLoadingResponsiblePerson(true);
      console.log('🔄 Loading current responsible person for entity:', entity.entityId);
      const endpoint = `/admin/entities/${entity.entityId}/responsible-person`;
      const response = makeRequest
        ? await makeRequest(endpoint, { method: 'GET' })
        : await api.get(endpoint);

      console.log('📋 Current responsible person response:', response);

      if (response.success && response.data) {
        console.log('✅ Current responsible person loaded:', response.data);
        setCurrentResponsiblePerson(response.data);
      } else {
        console.log('ℹ️ No current responsible person found');
        setCurrentResponsiblePerson(null);
      }
    } catch (error) {
      console.error('Failed to load current responsible person:', error);
      setCurrentResponsiblePerson(null);
    } finally {
      setLoadingResponsiblePerson(false);
    }
  };

  const handleSave = async () => {
    if (!entity) return;

    try {
      setSaving(true);
      const payload = { userId: selectedUserId === 'none' ? null : selectedUserId };
      console.log('🔄 Updating responsible person:', {
        entityId: entity.entityId,
        payload,
        url: `/admin/entities/${entity.entityId}/responsible-person`
      });

      const endpoint = `/admin/entities/${entity.entityId}/responsible-person`;
      const options = {
        method: 'PATCH' as const,
        body: JSON.stringify(payload)
      };

      const response = makeRequest
        ? await makeRequest(endpoint, options)
        : await api.patch(endpoint, payload);

      console.log('📤 API Response:', response);

      if (response.success) {
        toast.success('Responsible person updated successfully');
        // Reload current responsible person after update
        await loadCurrentResponsiblePerson();
        onSuccess?.();
        // Close after a brief delay to show the updated info
        setTimeout(() => onClose(), 500);
      } else {
        console.log('❌ API returned success=false:', response);
        toast.error(response.message || 'Failed to update responsible person');
      }
    } catch (error: any) {
      console.error('❌ Failed to update responsible person:', error);
      console.error('❌ Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to update responsible person');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Edit Responsible Person
          </DialogTitle>
          <DialogDescription>
            Change the responsible person for <strong>{entity?.entityName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Responsible Person */}
          {loadingResponsiblePerson ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Loading current responsible person...
                  </p>
                </div>
              </div>
            </div>
          ) : currentResponsiblePerson ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Current Responsible Person:
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {getInitials(currentResponsiblePerson.name)}
                </div>
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {currentResponsiblePerson.name}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {currentResponsiblePerson.email}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No responsible person currently assigned
              </p>
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="responsible-person">Select Responsible Person</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="responsible-person">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No responsible person</SelectItem>
                  {users.length === 0 ? (
                    <SelectItem value="loading" disabled>Loading users...</SelectItem>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                        {user.id === currentResponsiblePerson?.userId && " ✓"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Note:</strong> The responsible person will have administrative access to this{' '}
              {entity?.entityType || 'entity'} and all its child entities. They can manage users,
              view reports, and configure settings within their scope.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || loadingResponsiblePerson}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserCog className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditResponsiblePersonModal;

