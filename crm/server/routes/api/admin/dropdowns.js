import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import dropdownController from '../../../controllers/admin/dropdownController.js';
import { requirePermissions } from '../../../middleware/permissions.js';

// Note: auth, tenantIsolation, validateTenant, and userContext middlewares 
// are applied at the route registration level in server.js

// @route   POST /api/admin/dropdowns
// @desc    Create a new dropdown option
// @access  Users with dropdowns_create permission
router.post(
  '/',
  requirePermissions(['crm.system.dropdowns_create', 'crm.system.dropdowns_manage']),
  [
    check('category', 'Category is required').not().isEmpty(),
    check('value', 'Value is required').not().isEmpty(),
    check('label', 'Label is required').not().isEmpty()
  ],
  dropdownController.createDropdownOption
);

// @route   GET /api/admin/dropdowns
// @desc    Get all dropdown options
// @access  Users with dropdowns_read permission
router.get(
  '/',
  requirePermissions(['crm.system.dropdowns_read', 'crm.system.dropdowns_manage']),
  dropdownController.getDropdownOptions
);

// @route   GET /api/admin/dropdowns/categories
// @desc    Get all dropdown categories
// @access  Users with dropdowns_read permission
router.get(
  '/categories',
  requirePermissions(['crm.system.dropdowns_read', 'crm.system.dropdowns_manage']),
  dropdownController.getDropdownCategories
);

// @route   GET /api/admin/dropdowns/group-by-category
// @desc    Get all dropdown options grouped by category
// @access  Users with dropdowns_read permission
router.get(
  '/group-by-category',
  requirePermissions(['crm.system.dropdowns_read', 'crm.system.dropdowns_manage']),
  dropdownController.getDropdownOptionsGroupByCategory
);

// @route   GET /api/admin/dropdowns/:category
// @desc    Get dropdown options by category
// @access  Users with dropdowns_read permission
router.get(
  '/:category',
  requirePermissions(['crm.system.dropdowns_read', 'crm.system.dropdowns_manage']),
  dropdownController.getDropdownOptionsByCategory
);

// @route   PUT /api/admin/dropdowns/:id
// @desc    Update dropdown option
// @access  Users with dropdowns_update permission
router.put(
  '/:id',
  requirePermissions(['crm.system.dropdowns_update', 'crm.system.dropdowns_manage']),
  dropdownController.updateDropdownOption
);

// @route   DELETE /api/admin/dropdowns/:id
// @desc    Delete dropdown option
// @access  Users with dropdowns_delete permission
router.delete(
  '/:id',
  requirePermissions(['crm.system.dropdowns_delete', 'crm.system.dropdowns_manage']),
  dropdownController.deleteDropdownOption
);



export default router;