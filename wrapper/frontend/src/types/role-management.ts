import { Role } from './user-management';

// Extended Role interface for dashboard
export interface DashboardRole extends Role {
  userCount?: number;
  isSystemRole: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    icon?: string;
    [key: string]: any;
  };
  restrictions?: Record<string, any>;
}

// Permission summary interface
export interface PermissionSummary {
  total: number;
  admin: number;
  write: number;
  read: number;
  modules: number;
  mainModules: number;
  moduleDetails: Record<string, string[]>;
  moduleNames: string[];
  mainModuleNames: string[];
  applicationCount: number;
  moduleCount: number;
}

// Role filters interface
export interface RoleFilters {
  searchQuery: string;
  typeFilter: 'all' | 'custom' | 'system';
  sortBy: 'name' | 'created' | 'users' | 'modified';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

// Role list response interface
export interface RoleListResponse {
  roles: DashboardRole[];
  total: number;
  pagination: {
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// Role form data interface
export interface RoleFormData {
  roleName: string;
  description: string;
  color: string;
  icon: string;
  permissions: Record<string, any>;
  restrictions?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Bulk action types
export type BulkAction = 'delete' | 'export' | 'deactivate';

// Role table column interface
export interface RoleTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

// Role row actions interface
export interface RoleRowActions {
  onEdit: (role: DashboardRole) => void;
  onView: (role: DashboardRole) => void;
  onClone: (role: DashboardRole) => void;
  onDelete: (role: DashboardRole) => void;
}

// Role selection interface
export interface RoleSelection {
  selectedRoles: Set<string>;
  onToggleSelect: (roleId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}
