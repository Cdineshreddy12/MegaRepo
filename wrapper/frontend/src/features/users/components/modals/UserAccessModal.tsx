import React, { useState, useMemo } from 'react';
import { X, Building, Check, Search, Shield, User, ChevronRight, MapPin, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRoles } from '@/hooks/useSharedQueries';
import { useOrganizationHierarchy } from '@/hooks/useOrganizationHierarchy';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { User as UserType, UserOrganization } from '@/types/user-management';
import api, { invitationAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { OrganizationAssignmentConfirmationModal, RoleAssignmentConfirmationModal } from '@/components/common/ConfirmationModal';

interface Entity {
  entityId: string;
  entityName: string;
  entityType: string;
  hierarchyPath?: string;
  fullHierarchyPath?: string;
  parentEntityId?: string | null;
  displayName?: string;
  hierarchyLevel?: number;
  children?: Entity[];
}

interface UserAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

export const UserAccessModal: React.FC<UserAccessModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const { tenantId } = useOrganizationAuth();
  const { hierarchy, loading: hierarchyLoading } = useOrganizationHierarchy(tenantId);
  const { data: rolesData = [], isLoading: rolesLoading } = useRoles();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);
  // Local state to track user with immediate updates
  const [localUser, setLocalUser] = useState(user);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'organization' | 'role';
    action: 'assign' | 'deassign';
    entityName?: string;
    roleName?: string;
    callback: () => void;
  } | null>(null);

  // Update local user when prop changes
  React.useEffect(() => {
    setLocalUser(user);
  }, [user]);

  // Flatten hierarchy to show all entities (organizations, locations, etc.)
  const hierarchyEntities = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) {
      return [];
    }

    const flatten = (entities: any[], level = 0): any[] => {
      let result: any[] = [];
      const seenIds = new Set<string>();

      entities.forEach(entity => {
        if (!entity || !entity.entityId || seenIds.has(entity.entityId)) {
          return;
        }

        seenIds.add(entity.entityId);
        result.push({
          ...entity,
          displayLevel: level,
          hierarchyPath: entity.hierarchyPath || entity.fullHierarchyPath || entity.entityName,
          entityType: entity.entityType || 'organization'
        });

        if (entity.children && Array.isArray(entity.children) && entity.children.length > 0) {
          const childResults = flatten(entity.children, level + 1);
          result = result.concat(childResults);
        }
      });
      return result;
    };

    return flatten(hierarchy);
  }, [hierarchy]);

  // Filter entities by search term
  const filteredEntities = useMemo(() => {
    if (!searchTerm) {
      return hierarchyEntities;
    }
    
    const filtered = hierarchyEntities.filter(e => {
      if (!e || !e.entityName) return false;
      const nameMatch = e.entityName.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = e.entityType?.toLowerCase().includes(searchTerm.toLowerCase());
      const pathMatch = (e.hierarchyPath || e.fullHierarchyPath || '').toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || typeMatch || pathMatch;
    });
    
    return filtered;
  }, [hierarchyEntities, searchTerm]);

  // Get user's current organization assignments
  const userOrganizations = useMemo(() => {
    return localUser?.organizations || [];
  }, [localUser]);

  const assignedEntityIds = useMemo(() => {
    return new Set(userOrganizations.map(org => org.entityId || org.organizationId));
  }, [userOrganizations]);

  // Handle organization assignment - now handled inline with role selector

  const performAssignOrganization = async (entityId: string, entityType: string, roleId?: string) => {
    if (!localUser) return;

    setAssigning(true);
    try {
      console.log('🔄 Assigning organization:', { userId: localUser.userId, entityId, roleId });
      const response = await invitationAPI.assignOrganizationToUser(localUser.userId, {
        entityId,
        roleId: roleId || undefined,
        membershipType: 'direct',
        isPrimary: false
      });

      console.log('✅ Organization assignment response:', response.data);

      if (response.data.success) {
        // Find the entity name from hierarchy
        const entity = hierarchyEntities.find(e => e.entityId === entityId);
        const entityName = entity?.entityName || response.data.data?.organizationName || 'Unknown';
        
        // Update local user state immediately
        const newOrganization = {
          membershipId: response.data.data.membershipId,
          assignmentId: response.data.data.membershipId,
          organizationId: entityId,
          entityId: entityId,
          organizationName: entityName,
          entityName: entityName,
          entityType: entityType,
          membershipType: response.data.data.membershipType || 'direct',
          membershipStatus: 'active',
          accessLevel: 'member',
          roleId: roleId || null,
          isPrimary: response.data.data.isPrimary || false
        };

        setLocalUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            organizations: [...(prev.organizations || []), newOrganization]
          };
        });

        toast.success('Organization assigned successfully');
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
        setConfirmationModal(null); // Close modal on success
      } else {
        throw new Error(response.data.message || 'Failed to assign organization');
      }
    } catch (error: any) {
      console.error('❌ Error assigning organization:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to assign organization');
      // Keep modal open on error so user can retry
    } finally {
      setAssigning(false);
    }
  };

  // Handle organization deassignment with confirmation
  const handleDeassignOrganization = (membershipId: string, orgName: string) => {
    if (!localUser) return;

    setConfirmationModal({
      isOpen: true,
      type: 'organization',
      action: 'deassign',
      entityName: orgName,
      callback: () => performDeassignOrganization(membershipId)
    });
  };

  const performDeassignOrganization = async (membershipId: string) => {
    if (!localUser) return;

    setAssigning(true);
    try {
      console.log('🔄 Removing organization:', { userId: localUser.userId, membershipId });
      const response = await invitationAPI.removeOrganizationFromUser(localUser.userId, membershipId);

      console.log('✅ Organization removal response:', response.data);

      if (response.data.success) {
        // Update local user state immediately
        setLocalUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            organizations: (prev.organizations || []).filter(org => 
              org.membershipId !== membershipId && org.assignmentId !== membershipId
            )
          };
        });

        toast.success('Organization removed successfully');
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
        setConfirmationModal(null); // Close modal on success
      } else {
        throw new Error(response.data.message || 'Failed to remove organization');
      }
    } catch (error: any) {
      console.error('❌ Error removing organization:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to remove organization');
      // Keep modal open on error so user can retry
    } finally {
      setAssigning(false);
    }
  };

  // Handle role assignment with confirmation
  const handleAssignRole = (roleId: string, roleName: string) => {
    if (!localUser) return;

    setConfirmationModal({
      isOpen: true,
      type: 'role',
      action: 'assign',
      roleName,
      callback: () => performAssignRole(roleId)
    });
  };

  const performAssignRole = async (roleId: string) => {
    if (!localUser) return;

    setAssigning(true);
    try {
      const currentRoleIds = localUser.roles?.map(r => r.roleId) || [];

      if (currentRoleIds.includes(roleId)) {
        toast.error('User already has this role');
        setConfirmationModal(null);
        return;
      }

      console.log('🔄 Assigning role:', { userId: localUser.userId, roleId, currentRoleIds });
      const response = await api.post(`/tenants/current/users/${localUser.userId}/assign-roles`, {
        roleIds: [...currentRoleIds, roleId]
      });

      console.log('✅ Role assignment response:', response.data);

      if (response.data.success) {
        toast.success('Role assigned successfully');
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
        setConfirmationModal(null); // Close modal on success
      } else {
        throw new Error(response.data.message || 'Failed to assign role');
      }
    } catch (error: any) {
      console.error('❌ Error assigning role:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to assign role');
      // Keep modal open on error so user can retry
    } finally {
      setAssigning(false);
    }
  };

  // Handle role deassignment with confirmation
  const handleDeassignRole = (roleId: string, roleName: string) => {
    if (!localUser) return;

    setConfirmationModal({
      isOpen: true,
      type: 'role',
      action: 'deassign',
      roleName,
      callback: () => performDeassignRole(roleId)
    });
  };

  const performDeassignRole = async (roleId: string) => {
    if (!localUser) return;

    setAssigning(true);
    try {
      console.log('🔄 Removing role:', { userId: localUser.userId, roleId });
      const response = await api.delete(`/admin/users/${localUser.userId}/roles/${roleId}`);

      console.log('✅ Role removal response:', response.data);

      if (response.data.success) {
        toast.success('Role removed successfully');
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
        setConfirmationModal(null); // Close modal on success
      } else {
        throw new Error(response.data.message || 'Failed to remove role');
      }
    } catch (error: any) {
      console.error('❌ Error removing role:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to remove role');
      // Keep modal open on error so user can retry
    } finally {
      setAssigning(false);
    }
  };

  const isEntitySelected = (entityId: string) => {
    return assignedEntityIds.has(entityId);
  };

  const getSelectedEntityRole = (entityId: string) => {
    const org = userOrganizations.find(o => (o.entityId || o.organizationId) === entityId);
    return org?.roleId || 'none';
  };

  const handleEntityRoleChange = (entityId: string, roleId: string) => {
    if (!localUser) return;

    const org = userOrganizations.find(o => (o.entityId || o.organizationId) === entityId);
    if (!org) return;

    const roleName = roleId === 'none' ? 'No Role' : rolesData.find(r => r.roleId === roleId)?.roleName || 'Unknown Role';

    setConfirmationModal({
      isOpen: true,
      type: 'role',
      action: roleId === 'none' && org.roleId ? 'deassign' : 'assign',
      roleName,
      callback: () => performEntityRoleChange(org.membershipId, roleId)
    });
  };

  const performEntityRoleChange = async (membershipId: string, roleId: string) => {
    if (!localUser) return;

    // Handle "none" value to clear the role
    const finalRoleId = roleId === 'none' ? null : roleId;

    setAssigning(true);
    try {
      console.log('🔄 Updating organization role:', { userId: localUser.userId, membershipId, roleId: finalRoleId });
      const response = await invitationAPI.updateUserOrganizationRole(localUser.userId, membershipId, {
        roleId: finalRoleId
      });

      console.log('✅ Organization role update response:', response.data);

      if (response.data.success) {
        // Update local user state immediately
        setLocalUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            organizations: (prev.organizations || []).map(org =>
              org.membershipId === membershipId || org.assignmentId === membershipId
                ? { ...org, roleId: finalRoleId }
                : org
            )
          };
        });

        toast.success('Role updated successfully');
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
        setConfirmationModal(null); // Close modal on success
      } else {
        throw new Error(response.data.message || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('❌ Error updating organization role:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update role');
      // Keep modal open on error so user can retry
    } finally {
      setAssigning(false);
    }
  };

  const userRoleIds = useMemo(() => {
    return new Set(localUser?.roles?.map(r => r.roleId) || []);
  }, [localUser]);

  const availableRoles = rolesData.filter(role => !userRoleIds.has(role.roleId));

  if (!localUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Manage Access: {localUser.name || localUser.email}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Assign roles and organizations to this user
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Panel: Organizations */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Building className="w-4 h-4" /> Organizations & Locations
                  </h3>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search entities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                {hierarchyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm">Loading organization structure...</p>
                  </div>
                ) : filteredEntities.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl">
                    <Building className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No organizations or locations found.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredEntities.map((entity) => {
                        const selected = isEntitySelected(entity.entityId);
                        const isLocation = entity.entityType === 'location';
                        const assignment = userOrganizations.find(o => (o.entityId || o.organizationId) === entity.entityId);
                        
                        return (
                          <div 
                            key={entity.entityId}
                            onClick={(e) => {
                              // Don't toggle if clicking on the role select or select trigger
                              if ((e.target as HTMLElement).closest('[role="combobox"]') || 
                                  (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]') ||
                                  (e.target as HTMLElement).tagName === 'BUTTON' ||
                                  (e.target as HTMLElement).closest('button')) {
                                return;
                              }
                              if (assigning) return;
                              
                              if (selected && assignment) {
                                handleDeassignOrganization(assignment.membershipId, entity.entityName);
                              } else {
                                // Assign without role (user can add role later)
                                setConfirmationModal({
                                  isOpen: true,
                                  type: 'organization',
                                  action: 'assign',
                                  entityName: entity.entityName,
                                  callback: () => performAssignOrganization(entity.entityId, entity.entityType, undefined)
                                });
                              }
                            }}
                            className={`
                              p-3 flex items-center gap-3 transition-colors cursor-pointer
                              ${selected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}
                              ${assigning ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <div 
                              className="flex-shrink-0 flex items-center gap-1"
                              style={{ marginLeft: `${entity.displayLevel * 20}px` }}
                            >
                              {entity.displayLevel > 0 && (
                                <div className="w-4 flex items-center justify-center">
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                </div>
                              )}
                              <div 
                                className={`
                                  w-5 h-5 rounded border flex items-center justify-center transition-colors pointer-events-none
                                  ${selected 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }
                                `}
                              >
                                {selected && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isLocation ? (
                                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                )}
                                <span className={`text-sm font-medium truncate ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {entity.entityName}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] h-5 px-1.5 uppercase tracking-wider ${
                                    isLocation 
                                      ? 'bg-green-50 text-green-700 border-green-200' 
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {entity.entityType}
                                </Badge>
                                {assignment?.isPrimary && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {entity.fullHierarchyPath || entity.hierarchyPath || entity.entityName}
                              </div>
                            </div>

                            {selected ? (
                              <div 
                                className="flex-shrink-0 w-40"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Select
                                  value={getSelectedEntityRole(entity.entityId)}
                                  onValueChange={(value) => handleEntityRoleChange(entity.entityId, value)}
                                  disabled={rolesLoading || rolesData.length === 0 || assigning}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder={rolesLoading ? "Loading..." : rolesData.length === 0 ? "No roles" : "Select Role"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rolesData.length === 0 ? (
                                      <SelectItem value="no-roles" disabled>No roles available</SelectItem>
                                    ) : (
                                      <>
                                        <SelectItem value="none">No role</SelectItem>
                                        {rolesData.map((role: any) => (
                                          <SelectItem key={role.roleId} value={role.roleId}>
                                            {role.roleName}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div 
                                className="flex-shrink-0 w-40"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value && value !== '' && value !== 'select-role') {
                                      // Assign organization with selected role
                                      setConfirmationModal({
                                        isOpen: true,
                                        type: 'organization',
                                        action: 'assign',
                                        entityName: entity.entityName,
                                        callback: () => performAssignOrganization(entity.entityId, entity.entityType, value)
                                      });
                                    }
                                  }}
                                  disabled={rolesLoading || rolesData.length === 0 || assigning}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder={rolesLoading ? "Loading..." : rolesData.length === 0 ? "No roles" : "Select Role"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rolesData.length === 0 ? (
                                      <SelectItem value="no-roles" disabled>No roles available</SelectItem>
                                    ) : (
                                      <>
                                        <SelectItem value="select-role">Select Role</SelectItem>
                                        {rolesData.map((role: any) => (
                                          <SelectItem key={role.roleId} value={role.roleId}>
                                            {role.roleName}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Right Panel: Roles */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900/30 border-l p-6 flex flex-col overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Roles
                </h3>

                {/* Current Roles */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Assigned Roles</Label>
                  {user.roles && user.roles.length > 0 ? (
                    <div className="space-y-2">
                      {user.roles.map(role => (
                        <div 
                          key={role.roleId}
                          className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-medium">{role.roleName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeassignRole(role.roleId, role.roleName)}
                            disabled={assigning}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 italic p-2">No roles assigned</div>
                  )}
                </div>

                {/* Available Roles */}
                {availableRoles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Available Roles</Label>
                    <div className="space-y-2">
                      {availableRoles.map(role => (
                        <Button
                          key={role.roleId}
                          variant="outline"
                          className="w-full justify-start h-auto p-2"
                          onClick={() => handleAssignRole(role.roleId, role.roleName)}
                          disabled={assigning}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          <span className="text-sm">{role.roleName}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>

      {/* Confirmation Modals */}
      {confirmationModal && confirmationModal.type === 'organization' && (
        <OrganizationAssignmentConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => {
            if (!assigning) {
              setConfirmationModal(null);
            }
          }}
          onConfirm={async () => {
            try {
              await confirmationModal.callback();
              // Don't close immediately - let the callback handle success/error
              // The modal will close when assigning becomes false
            } catch (error) {
              console.error('Error in confirmation callback:', error);
            }
          }}
          organizationName={confirmationModal.entityName || ''}
          userName={localUser.name || localUser.email}
          action={confirmationModal.action}
          loading={assigning}
        />
      )}

      {confirmationModal && confirmationModal.type === 'role' && (
        <RoleAssignmentConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => {
            if (!assigning) {
              setConfirmationModal(null);
            }
          }}
          onConfirm={async () => {
            try {
              await confirmationModal.callback();
              // Don't close immediately - let the callback handle success/error
              // The modal will close when assigning becomes false
            } catch (error) {
              console.error('Error in confirmation callback:', error);
            }
          }}
          roleName={confirmationModal.roleName || ''}
          userName={localUser.name || localUser.email}
          action={confirmationModal.action}
          loading={assigning}
        />
      )}
    </Dialog>
  );
};

