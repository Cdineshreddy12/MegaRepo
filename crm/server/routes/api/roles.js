import express from 'express';
const router = express.Router();
import {
  getRoles,
  getRoleById,
  getUserRoles,
  getMyRoles,
  getRoleStats,
  migrateRolePermissions
} from '../../controllers/roleController.js';

/**
 * @route   GET /api/roles
 * @desc    Get all roles for a tenant
 * @access  Authenticated users
 */
router.get('/', getRoles);

/**
 * @route   GET /api/roles/stats
 * @desc    Get role statistics for a tenant
 * @access  Authenticated users
 */
router.get('/stats', getRoleStats);

/**
 * @route   GET /api/roles/my-roles
 * @desc    Get current user's roles
 * @access  Authenticated users
 */
router.get('/my-roles', getMyRoles);

/**
 * @route   GET /api/roles/user/:userId
 * @desc    Get roles assigned to a specific user
 * @access  Authenticated users
 */
router.get('/user/:userId', getUserRoles);

/**
 * @route   GET /api/roles/:roleId
 * @desc    Get a specific role by ID
 * @access  Authenticated users
 */
router.get('/:roleId', getRoleById);

/**
 * @route   POST /api/roles/migrate-permissions
 * @desc    Migrate role permissions to standardized structure
 * @access  Authenticated users (admin only)
 */
router.post('/migrate-permissions', migrateRolePermissions);

export default router;
