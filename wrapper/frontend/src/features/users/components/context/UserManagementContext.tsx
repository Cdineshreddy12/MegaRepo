import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { User, Role } from '@/types/user-management';
import { useUsers, useUserMutations } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { useUserFilters } from '../hooks/useUserFilters';

// Types for the context
export interface UserManagementState {
  // UI State
  selectedUsers: Set<string>;
  showInviteModal: boolean;
  showUserModal: boolean;
  showEditModal: boolean;
  showDeleteModal: boolean;
  showRoleAssignModal: boolean;
  showAccessModal: boolean;
  
  // Modal Data
  viewingUser: User | null;
  editingUser: User | null;
  deletingUser: User | null;
  assigningUser: User | null;
  managingAccessUser: User | null;
  
  // Form Data
  editForm: UserEditForm;
  inviteForm: InviteForm;
  selectedRoles: string[];
  
  // Filters
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'pending' | 'inactive';
  roleFilter: string;
  sortBy: 'name' | 'email' | 'created' | 'lastLogin';
  sortOrder: 'asc' | 'desc';
}

export interface UserEditForm {
  name: string;
  email: string;
  title: string;
  department: string;
  isActive: boolean;
  isTenantAdmin: boolean;
}

export interface InviteForm {
  email: string;
  name: string;
  entities: Array<{
    entityId: string;
    roleId: string;
    entityType: string;
    membershipType: string;
  }>;
  primaryEntityId: string;
  message: string;
  invitationType: 'single-entity' | 'multi-entity';
}

// Action types
type UserManagementAction =
  | { type: 'SET_SELECTED_USERS'; payload: Set<string> }
  | { type: 'TOGGLE_USER_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_MODAL_STATE'; payload: { modal: string; isOpen: boolean; data?: any } }
  | { type: 'SET_EDIT_FORM'; payload: Partial<UserEditForm> }
  | { type: 'SET_INVITE_FORM'; payload: Partial<InviteForm> }
  | { type: 'SET_SELECTED_ROLES'; payload: string[] }
  | { type: 'SET_FILTERS'; payload: Partial<Pick<UserManagementState, 'searchQuery' | 'statusFilter' | 'roleFilter' | 'sortBy' | 'sortOrder'>> }
  | { type: 'RESET_FORMS' };

// Initial state
const initialState: UserManagementState = {
  selectedUsers: new Set(),
  showInviteModal: false,
  showUserModal: false,
  showEditModal: false,
  showDeleteModal: false,
  showRoleAssignModal: false,
  showAccessModal: false,
  viewingUser: null,
  editingUser: null,
  deletingUser: null,
  assigningUser: null,
  managingAccessUser: null,
  editForm: {
    name: '',
    email: '',
    title: '',
    department: '',
    isActive: true,
    isTenantAdmin: false
  },
  inviteForm: {
    email: '',
    name: '',
    entities: [],
    primaryEntityId: '',
    message: '',
    invitationType: 'multi-entity' as const
  },
  selectedRoles: [],
  searchQuery: '',
  statusFilter: 'all',
  roleFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc'
};

// Reducer
function userManagementReducer(state: UserManagementState, action: UserManagementAction): UserManagementState {
  switch (action.type) {
    case 'SET_SELECTED_USERS':
      return { ...state, selectedUsers: action.payload };
    
    case 'TOGGLE_USER_SELECTION':
      const newSelection = new Set(state.selectedUsers);
      if (newSelection.has(action.payload)) {
        newSelection.delete(action.payload);
      } else {
        newSelection.add(action.payload);
      }
      return { ...state, selectedUsers: newSelection };
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedUsers: new Set() };
    
    case 'SET_MODAL_STATE':
      const { modal, isOpen, data } = action.payload;
      const modalState = { ...state };
      
      // Reset all modals to false first
      modalState.showInviteModal = false;
      modalState.showUserModal = false;
      modalState.showEditModal = false;
      modalState.showDeleteModal = false;
      modalState.showRoleAssignModal = false;
      modalState.showAccessModal = false;
      
      // Set the specific modal
      if (isOpen) {
        switch (modal) {
          case 'invite':
            modalState.showInviteModal = true;
            break;
          case 'user':
            modalState.showUserModal = true;
            modalState.viewingUser = data;
            break;
          case 'edit':
            modalState.showEditModal = true;
            modalState.editingUser = data;
            if (data) {
              modalState.editForm = {
                name: data.name || '',
                email: data.email || '',
                title: data.title || '',
                department: data.department || '',
                isActive: data.isActive,
                isTenantAdmin: data.isTenantAdmin
              };
            }
            break;
          case 'delete':
            modalState.showDeleteModal = true;
            modalState.deletingUser = data;
            break;
          case 'roleAssign':
            modalState.showRoleAssignModal = true;
            modalState.assigningUser = data;
            if (data) {
              const validRoleIds = data.roles
                ?.filter((role: any) => role.roleId && role.roleId !== 'unknown' && typeof role.roleId === 'string')
                ?.map((r: any) => r.roleId) || [];
              modalState.selectedRoles = validRoleIds;
            }
            break;
          case 'access':
            modalState.showAccessModal = true;
            modalState.managingAccessUser = data;
            break;
        }
      }
      
      return modalState;
    
    case 'SET_EDIT_FORM':
      return { ...state, editForm: { ...state.editForm, ...action.payload } };
    
    case 'SET_INVITE_FORM':
      return { ...state, inviteForm: { ...state.inviteForm, ...action.payload } };
    
    case 'SET_SELECTED_ROLES':
      return { ...state, selectedRoles: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, ...action.payload };
    
    case 'RESET_FORMS':
      return {
        ...state,
        editForm: initialState.editForm,
        inviteForm: initialState.inviteForm,
        selectedRoles: []
      };
    
    default:
      return state;
  }
}

// Context
const UserManagementContext = createContext<{
  state: UserManagementState;
  dispatch: React.Dispatch<UserManagementAction>;
  // Data
  users: User[];
  roles: Role[];
  filteredUsers: User[];
  isLoading: boolean;
  error: any;
  // Mutations
  userMutations: ReturnType<typeof useUserMutations>;
  // Actions
  actions: {
    openModal: (modal: string, data?: any) => void;
    closeModal: (modal: string) => void;
    toggleUserSelection: (userId: string) => void;
    clearSelection: () => void;
    setFilters: (filters: Partial<Pick<UserManagementState, 'searchQuery' | 'statusFilter' | 'roleFilter' | 'sortBy' | 'sortOrder'>>) => void;
    resetForms: () => void;
  };
} | null>(null);

// Provider component
export function UserManagementProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userManagementReducer, initialState);
  
  // Data fetching
  const { data: users = [], error: usersError, isLoading: usersLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const userMutations = useUserMutations();
  
  // Filtered users
  const filteredUsers = useUserFilters({
    users,
    searchQuery: state.searchQuery,
    statusFilter: state.statusFilter,
    roleFilter: state.roleFilter,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder
  });
  
  // Memoized actions
  const actions = useMemo(() => ({
    openModal: (modal: string, data?: any) => {
      dispatch({ type: 'SET_MODAL_STATE', payload: { modal, isOpen: true, data } });
    },
    closeModal: (modal: string) => {
      dispatch({ type: 'SET_MODAL_STATE', payload: { modal, isOpen: false } });
    },
    toggleUserSelection: (userId: string) => {
      dispatch({ type: 'TOGGLE_USER_SELECTION', payload: userId });
    },
    clearSelection: () => {
      dispatch({ type: 'CLEAR_SELECTION' });
    },
    setFilters: (filters: Partial<Pick<UserManagementState, 'searchQuery' | 'statusFilter' | 'roleFilter' | 'sortBy' | 'sortOrder'>>) => {
      dispatch({ type: 'SET_FILTERS', payload: filters });
    },
    resetForms: () => {
      dispatch({ type: 'RESET_FORMS' });
    }
  }), []);
  
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    users,
    roles,
    filteredUsers,
    isLoading: usersLoading,
    error: usersError,
    userMutations,
    actions
  }), [state, users, roles, filteredUsers, usersLoading, usersError, userMutations, actions]);
  
  return (
    <UserManagementContext.Provider value={contextValue}>
      {children}
    </UserManagementContext.Provider>
  );
}

// Custom hook to use the context
export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (!context) {
    throw new Error('useUserManagement must be used within a UserManagementProvider');
  }
  return context;
}
