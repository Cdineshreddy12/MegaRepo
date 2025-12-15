import express from 'express';
const router = express.Router();
import opportunityController from '../../controllers/opportunityController.js';
const { createOpportunity, getOpportunities, getOpportunity, updateOpportunity, updateOpportunityStage, deleteOpportunity } = opportunityController;
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';

router.post('/', tenant.validateTenant(), requirePermissions(['crm.opportunities.create'], false), createOpportunity);
router.post('/from-form', tenant.validateTenant(), requirePermissions(['crm.opportunities.create'], false), createOpportunity); // Alias for form submissions
router.get('/', tenant.validateTenant(), requirePermissions(['crm.opportunities.read'], false), getOpportunities);
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.opportunities.read'], false), getOpportunity);
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.opportunities.update'], false), updateOpportunity);
router.put('/:id/stage', tenant.validateTenant(), requirePermissions(['crm.opportunities.update'], false), updateOpportunityStage);
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.opportunities.delete'], false), deleteOpportunity);

export default router;