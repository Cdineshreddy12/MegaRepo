import express from "express";
const router = express.Router();
import {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    adjustStockLevel,
    recordProductMovement,
    getProductMovements,
    getProductMovement,
    updateProductMovement,
    deleteProductMovement,
    createSerialNumber,
    getSerialNumber,
    getSerialNumbers,
    updateSerialNumber,
    deleteSerialNumber,
} from "../../controllers/inventoryController.js";
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';

// IMPORTANT: Specific routes MUST come BEFORE generic /:id routes

// Create a new product
router.post("/", tenant.validateTenant(), requirePermissions(['crm.inventory.create'], false), createProduct);

// Get all products
router.get("/", tenant.validateTenant(), requirePermissions(['crm.inventory.read'], false), getProducts);

// MOVEMENTS ROUTES (specific routes first)
router.post("/movements", tenant.validateTenant(), requirePermissions(['crm.inventory.update'], false), recordProductMovement);
router.get("/movements", tenant.validateTenant(), requirePermissions(['crm.inventory.read'], false), getProductMovements);
router.get("/movements/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.read'], false), getProductMovement); // Get movements for a specific product
router.put("/movements/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.update'], false), updateProductMovement);
router.delete("/movements/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.delete'], false), deleteProductMovement);

// SERIAL NUMBERS ROUTES (specific routes first)
router.post("/serial-numbers", tenant.validateTenant(), requirePermissions(['crm.inventory.create'], false), createSerialNumber);
router.get("/serial-numbers", tenant.validateTenant(), requirePermissions(['crm.inventory.read'], false), getSerialNumbers);
router.get("/serial-numbers/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.read'], false), getSerialNumber);
router.put("/serial-numbers/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.update'], false), updateSerialNumber);
router.delete("/serial-numbers/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.delete'], false), deleteSerialNumber);

// PRODUCT ROUTES WITH :id (generic routes MUST come last)
router.get("/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.read'], false), getProduct);
router.put("/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.update'], false), updateProduct);
router.delete("/:id", tenant.validateTenant(), requirePermissions(['crm.inventory.delete'], false), deleteProduct);

// Adjust stock level for a product
router.post("/:id/adjust-stock", tenant.validateTenant(), requirePermissions(['crm.inventory.update'], false), adjustStockLevel);

export default router;