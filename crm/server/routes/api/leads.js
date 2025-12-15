import express from 'express';
const router = express.Router();
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';
import { check } from 'express-validator';
import leadController from '../../controllers/leadController.js';
const { createLead, getLeads, getLead, updateLead, deleteLead, updateLeadStatus } = leadController;

// @route   POST /api/leads
// @desc    Create a new lead
// @access  Private
router.post(
  '/',
  tenant.validateTenant(),
  requirePermissions(['crm.leads.create'], false),
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('companyName', 'Company name is required').not().isEmpty(),
    check('status', 'Status is required').not().isEmpty()
  ],
  createLead
);

// @route   GET /api/leads
// @desc    Get all leads
// @access  Private
router.get('/', tenant.validateTenant(), requirePermissions(['crm.leads.read'], false), getLeads);

// @route   GET /api/leads/:id
// @desc    Get lead by ID
// @access  Private
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.leads.read'], false), getLead);

// @route   PUT /api/leads/:id
// @desc    Update lead
// @access  Private
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.leads.update'], false), updateLead);

// @route   PUT /api/leads/:id/status
// @desc    Update lead status
// @access  Private
router.put('/:id/status', tenant.validateTenant(), requirePermissions(['crm.leads.update'], false), updateLeadStatus);

// @route   DELETE /api/leads/:id
// @desc    Delete lead
// @access  Private
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.leads.delete'], false), deleteLead);

export default router;