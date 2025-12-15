import express from 'express';
const router = express.Router();
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';
import { check } from 'express-validator';
import { createContact, getContacts, getContact, updateContact, deleteContact, getContactsByAccount, setPrimaryContact } from '../../controllers/contactController.js';

// @route   POST /api/contacts
// @desc    Create a new contact
// @access  Private
router.post(
  '/',
  tenant.validateTenant(),
  requirePermissions(['crm.contacts.create'], false),
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('phone', 'Phone number is required').not().isEmpty(),
    check('accountId', 'Account is required').not().isEmpty(),
    check('assignedTo', 'Contact owner is required').not().isEmpty()
  ],
  createContact
);

// @route   GET /api/contacts
// @desc    Get all contacts
// @access  Private
router.get('/', tenant.validateTenant(), requirePermissions(['crm.contacts.read'], false), getContacts);

// @route   GET /api/contacts/account/:accountId
// @desc    Get all contacts for a specific account
// @access  Private
router.get('/account/:accountId', tenant.validateTenant(), requirePermissions(['crm.contacts.read'], false), getContactsByAccount);

// @route   GET /api/contacts/:id
// @desc    Get contact by ID
// @access  Private
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.contacts.read'], false), getContact);

// @route   PUT /api/contacts/:id
// @desc    Update contact
// @access  Private
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.contacts.update'], false), updateContact);

// @route   PUT /api/contacts/:contactId/set-primary
// @desc    Set a contact as primary for an account
// @access  Private
router.put('/:contactId/set-primary', tenant.validateTenant(), requirePermissions(['crm.contacts.update'], false), setPrimaryContact);

// @route   DELETE /api/contacts/:id
// @desc    Delete contact
// @access  Private
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.contacts.delete'], false), deleteContact);

export default router;