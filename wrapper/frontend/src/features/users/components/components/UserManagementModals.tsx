import { InviteUserModal } from '../InviteUserModal';
import UserDetailsModal from '../UserDetailsModal';
import { EditUserModal } from '../EditUserModal';
import { DeleteUserModal } from '../DeleteUserModal';
import { RoleAssignmentModal } from '../RoleAssignmentModal';
import { UserAccessModal } from '../modals/UserAccessModal';
import { useUserManagement } from '../context/UserManagementContext';
import { useUserActions } from '../hooks/useUserActions';

/**
 * Modals component for User Management Dashboard
 * 
 * Features:
 * - Centralized modal management
 * - All user-related modals in one place
 * - Proper state management
 */
export function UserManagementModals() {
  const { 
    state, 
    actions, 
    roles, 
    userMutations,
    dispatch
  } = useUserManagement();
  
  const { 
    generateInvitationUrl, 
    copyInvitationUrl 
  } = useUserActions();
  
  // Modal fetches its own hierarchy data, so we don't need to fetch it here
  
  // Modal handlers
  const handleInviteUser = () => {
    if (!state.inviteForm.email || !state.inviteForm.name || state.inviteForm.entities.length === 0) {
      return;
    }
    
    // Extract roleIds from entities
    const roleIds = state.inviteForm.entities
      .map((e: any) => e.roleId)
      .filter((id: string) => id && id.trim() !== '');
    
    userMutations.inviteUser.mutate({
      email: state.inviteForm.email,
      name: state.inviteForm.name,
      roleIds: roleIds.length > 0 ? roleIds : undefined,
      message: state.inviteForm.message,
      entities: state.inviteForm.entities,
      primaryEntityId: state.inviteForm.primaryEntityId
    }, {
      onSuccess: () => {
        actions.closeModal('invite');
        actions.resetForms();
      }
    });
  };
  
  const handleSaveUserEdit = () => {
    if (!state.editingUser) return;
    
    userMutations.updateUser.mutate({
      userId: state.editingUser.userId,
      userData: state.editForm
    }, {
      onSuccess: () => {
        actions.closeModal('edit');
      }
    });
  };
  
  const handleDeleteUser = () => {
    if (!state.deletingUser) return;
    
    userMutations.deleteUser.mutate(state.deletingUser.userId, {
      onSuccess: () => {
        actions.closeModal('delete');
      }
    });
  };
  
  const handleSaveRoleAssignment = () => {
    if (!state.assigningUser) return;
    
    // Filter out any invalid role IDs before sending to backend
    const validRoleIds = state.selectedRoles.filter(roleId => 
      roleId && 
      roleId !== 'unknown' && 
      typeof roleId === 'string' && 
      roleId.trim() !== ''
    );
    
    if (validRoleIds.length === 0) {
      return;
    }
    
    userMutations.assignRoles.mutate({
      userId: state.assigningUser.userId,
      roleIds: validRoleIds
    }, {
      onSuccess: () => {
        actions.closeModal('roleAssign');
      }
    });
  };

  const handleDeassignRole = async (userId: string, roleId: string) => {
    userMutations.deassignRole.mutate(
      { userId, roleId },
      {
        onSuccess: () => {
          // Update selectedRoles to remove the deassigned role
          const updatedRoles = state.selectedRoles.filter(id => id !== roleId);
          dispatch({ type: 'SET_SELECTED_ROLES', payload: updatedRoles });
        }
      }
    );
  };
  
  return (
    <>
      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={state.showInviteModal}
        onClose={() => actions.closeModal('invite')}
        roles={roles}
        inviteForm={state.inviteForm}
        setInviteForm={(form) => dispatch({ type: 'SET_INVITE_FORM', payload: form })}
        onInvite={handleInviteUser}
        // Modal fetches its own hierarchy data via hook, so we don't need to pass it
      />
      
      {/* User Details Modal */}
      <UserDetailsModal
        user={state.viewingUser}
        isOpen={state.showUserModal}
        onClose={() => actions.closeModal('user')}
        generateInvitationUrl={generateInvitationUrl}
        copyInvitationUrl={copyInvitationUrl}
      />
      
      {/* Role Assignment Modal */}
      <RoleAssignmentModal
        isOpen={state.showRoleAssignModal}
        onClose={() => actions.closeModal('roleAssign')}
        user={state.assigningUser}
        roles={roles}
        selectedRoles={state.selectedRoles}
        setSelectedRoles={(roles) => dispatch({ type: 'SET_SELECTED_ROLES', payload: roles })}
        onSave={handleSaveRoleAssignment}
        onDeassignRole={handleDeassignRole}
      />
      
      {/* Edit User Modal */}
      <EditUserModal
        isOpen={state.showEditModal}
        onClose={() => actions.closeModal('edit')}
        user={state.editingUser}
        editForm={state.editForm}
        setEditForm={(form) => dispatch({ type: 'SET_EDIT_FORM', payload: form })}
        onSave={handleSaveUserEdit}
      />
      
      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={state.showDeleteModal}
        onClose={() => actions.closeModal('delete')}
        user={state.deletingUser}
        onDelete={handleDeleteUser}
      />
      
      {/* User Access Management Modal */}
      <UserAccessModal
        isOpen={state.showAccessModal}
        onClose={() => actions.closeModal('access')}
        user={state.managingAccessUser}
      />
    </>
  );
}
