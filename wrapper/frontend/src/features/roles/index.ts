/**
 * 🚀 **ROLES FEATURE**
 * Centralized roles and permissions feature module
 * Exports all role management components and utilities
 */

// Components
export { RoleManagementDashboard } from './RoleManagementDashboard'
export { ApplicationModuleRoleBuilder } from './ApplicationModuleRoleBuilder'

// Forms
export { RoleForm } from './forms/RoleForm'

// Components
export { BulkActions } from './components/BulkActions'
export { DeleteRoleModal } from './components/DeleteRoleModal'
export { EnhancedPermissionSummary } from './components/EnhancedPermissionSummary'
export { RoleDetailsModal } from './components/RoleDetailsModal'
export { RoleEmptyState } from './components/RoleEmptyState'
export { RoleFilters } from './components/RoleFilters'
export { RoleLoadingState } from './components/RoleLoadingState'
export { RoleRow } from './components/RoleRow'
export { RoleTableHeader } from './components/RoleTableHeader'

// Hooks
export { useRoles, useRole, useRoleMutations } from './hooks/useRoleQueries'

// Utils
export {
  getPermissionSummary,
  getPermissionTypeColor,
  getPermissionTypeTextColor,
  formatRoleDate,
  canEditRole,
  canDeleteRole
} from './utils/permissionUtils'