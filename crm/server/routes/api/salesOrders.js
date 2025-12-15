import express from 'express';
const router = express.Router();
import salesOrderController from '../../controllers/salesOrderController.js';
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';

router.post('/', tenant.validateTenant(), requirePermissions(['crm.sales_orders.create'], false), salesOrderController.createSalesOrder);
router.get('/', tenant.validateTenant(), requirePermissions(['crm.sales_orders.read'], false), salesOrderController.getSalesOrders);
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.sales_orders.read'], false), salesOrderController.getSalesOrder);
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.sales_orders.update'], false), salesOrderController.updateSalesOrder);
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.sales_orders.delete'], false), salesOrderController.deleteSalesOrder);

export default router;