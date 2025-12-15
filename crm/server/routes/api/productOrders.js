import express from 'express';
const router = express.Router();
import productOrderController from '../../controllers/productOrderController.js';
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';

router.post('/', 
  tenant.validateTenant(), 
  requirePermissions(['crm.product_orders.create'], false), 
  productOrderController.createProductOrder
);

router.get('/', 
  tenant.validateTenant(), 
  requirePermissions(['crm.product_orders.read'], false), 
  productOrderController.getProductOrders
);

router.get('/:id', 
  tenant.validateTenant(), 
  requirePermissions(['crm.product_orders.read'], false), 
  productOrderController.getProductOrder
);

router.put('/:id', 
  tenant.validateTenant(), 
  requirePermissions(['crm.product_orders.update'], false), 
  productOrderController.updateProductOrder
);

router.delete('/:id', 
  tenant.validateTenant(), 
  requirePermissions(['crm.product_orders.delete'], false), 
  productOrderController.deleteProductOrder
);

export default router;

