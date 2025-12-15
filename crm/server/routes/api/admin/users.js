import express from 'express';
const router = express.Router();
import auth from '../../../middleware/auth.js';
import checkRole from '../../../middleware/checkRole.js';
import { checkPermissions } from '../../../middleware/checkPermissions.js';
import tenantMiddleware from '../../../middleware/tenantMiddleware.js';
import userController from '../../../controllers/admin/userController.js';

// Handle OPTIONS preflight requests
router.options('*', (req, res) => {
  res.status(200).end();
});

// All user management routes require authentication and tenant isolation
router.use(auth);
router.use(tenantMiddleware.tenantIsolation());
router.use(tenantMiddleware.validateTenant());

// @route   GET /api/admin/users
// @desc    Get all users for the current tenant
// @access  Users with user management permissions
router.get(
  '/',
  [
    checkPermissions(
      'crm.system.users_read',
      'crm.system.users_read_all',
      'system.users.read',
      'system.users.read_all'
    )
  ],
  userController.getUsers
);

// @route   GET /api/admin/users/:id
// @desc    Get a specific user by ID
// @access  Users with user management permissions
router.get(
  '/:id',
  [
    checkPermissions(
      'crm.system.users_read',
      'crm.system.users_read_all',
      'system.users.read',
      'system.users.read_all'
    )
  ],
  userController.getUser
);

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Users with user management permissions
router.post(
  '/',
  [
    checkPermissions(
      'crm.system.users_create',
      'crm.system.users_create_all',
      'system.users.create',
      'system.users.create_all'
    )
  ],
  userController.createUser
);

// @route   PUT /api/admin/users/:id
// @desc    Update an existing user
// @access  Users with user management permissions
router.put(
  '/:id',
  [
    checkPermissions(
      'crm.system.users_update',
      'crm.system.users_update_all',
      'system.users.update',
      'system.users.update_all'
    )
  ],
  userController.updateUser
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Users with user management permissions
router.delete(
  '/:id',
  [
    checkPermissions(
      'crm.system.users_delete',
      'crm.system.users_delete_all',
      'system.users.delete',
      'system.users.delete_all'
    )
  ],
  userController.deleteUser
);

// @route   POST /api/admin/users/refresh-permissions
// @desc    Bulk refresh permissions for external users
// @access  Users with user management permissions
router.post(
  '/refresh-permissions',
  [
    checkPermissions(
      'crm.system.users_update',
      'crm.system.users_update_all',
      'system.users.update',
      'system.users.update_all'
    )
  ],
  userController.refreshPermissions
);

export default router;
