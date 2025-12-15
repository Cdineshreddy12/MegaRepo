import express from 'express';
const router = express.Router();
import auth from '../../middleware/auth.js';
import { check } from 'express-validator';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';
import {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  getAccountContacts
} from '../../controllers/accountController.js';

console.log('createAccount type:', typeof createAccount);
console.log('createAccount:', createAccount);

// Test the check middleware
const companyNameCheck = check('companyName', 'Company name is required').not().isEmpty();
console.log('companyNameCheck type:', typeof companyNameCheck);

// Test auth and tenant middlewares
console.log('auth type:', typeof auth);
console.log('tenant type:', typeof tenant);

// @route   POST /api/accounts
// @desc    Create a new account
// @access  Private
router.post(
  '/',
  tenant.validateTenant(),
  requirePermissions(['crm.accounts.create'], false), // ANY of these permissions
  companyNameCheck,
  createAccount
);

// @route   GET /api/accounts
// @desc    Get all accounts (filtered by user's zone)
// @access  Private
router.get('/', tenant.validateTenant(), (req, res, next) => {
  console.log('🔍 ACCOUNTS ROUTE HIT - path:', req.path, 'method:', req.method);
  console.log('🔍 ACCOUNTS ROUTE - req.tenant:', req.tenant);
  console.log('🔍 ACCOUNTS ROUTE - req.user:', req.user);
  next();
}, getAccounts);

// @route   GET /api/accounts/:id
// @desc    Get account by ID (if in user's zone)
// @access  Private
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.accounts.read'], false), getAccount);

// @route   GET /api/accounts/:accountId/contacts
// @desc    Get all contacts for a specific account
// @access  Private
router.get('/:accountId/contacts', tenant.validateTenant(), requirePermissions(['crm.accounts.read'], false), getAccountContacts);

// @route   PUT /api/accounts/:id
// @desc    Update account (if in user's zone)
// @access  Private
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.accounts.update'], false), updateAccount);

// @route   DELETE /api/accounts/:id
// @desc    Delete account (if in user's zone)
// @access  Private
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.accounts.delete'], false), deleteAccount);

export default router;