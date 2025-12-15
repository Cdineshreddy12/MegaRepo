import express from 'express';
const router = express.Router();
import quotationController from '../../controllers/quotationController.js';
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';
const { createQuotation, getQuotations, getQuotation, updateQuotation, deleteQuotation } = quotationController;

router.post('/', tenant.validateTenant(), requirePermissions(['crm.quotations.create'], false), createQuotation);
router.get('/', tenant.validateTenant(), requirePermissions(['crm.quotations.read'], false), getQuotations);
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.quotations.read'], false), getQuotation);
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.quotations.update'], false), updateQuotation);
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.quotations.delete'], false), deleteQuotation);

export default router;