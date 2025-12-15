import express from 'express';
const router = express.Router();
import invoiceController from '../../controllers/invoiceController.js';
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';

router.post('/', tenant.validateTenant(), requirePermissions(['crm.invoices.create'], false), invoiceController.createInvoice);
router.get('/', tenant.validateTenant(), requirePermissions(['crm.invoices.read'], false), invoiceController.getInvoices);
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.invoices.read'], false), invoiceController.getInvoice);
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.invoices.update'], false), invoiceController.updateInvoice);
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.invoices.delete'], false), invoiceController.deleteInvoice);
router.post('/:id/payment', tenant.validateTenant(), requirePermissions(['crm.invoices.update'], false), invoiceController.recordPayment);

export default router;