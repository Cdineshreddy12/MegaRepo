/**
 * 🛡️ **ROLES FEATURE**
 * Centralized roles feature module
 * Exports all role routes and services
 */

// Routes
export { default as rolesRoutes } from './routes/roles.js';
export { default as customRolesRoutes } from './routes/custom-roles.js';

// Services
export { default as customRoleService } from './services/custom-role-service.js';
export { default as permissionMatrixService } from './services/permission-matrix-service.js';
