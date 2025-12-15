import express from 'express';
const router = express.Router();
import multer from 'multer';
import bulkController from '../../controllers/BulkUploadController.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Middleware to check permissions based on model name
const checkModelPermissions = (action) => {
  return (req, res, next) => {
    const modelName = req.params.modelName;
    // Convert model name to permission format (e.g., "Account" -> "accounts")
    const permissionModule = modelName.toLowerCase() + 's'; // Add 's' for plural
    const requiredPermission = `crm.${permissionModule}.${action}`;

    console.log(`🔍 Checking permission for ${action} on ${permissionModule}: ${requiredPermission}`);

    // Use requirePermissions middleware
    requirePermissions([requiredPermission], false)(req, res, next);
  };
};

// Get template for a model
router.get('/:modelName/template', tenant.validateTenant(), checkModelPermissions('read'), bulkController.generateTemplate);

// Upload and process file
router.post('/:modelName/upload', tenant.validateTenant(), checkModelPermissions('create'), upload.single('file'), bulkController.bulkUpload);

// Export data
router.get('/:modelName/export', tenant.validateTenant(), checkModelPermissions('read'), bulkController.exportData);

export default router;