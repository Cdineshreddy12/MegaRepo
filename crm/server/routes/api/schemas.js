import express from "express";
const router = express.Router();
import auth from "../../middleware/auth.js";
import tenant from "../../middleware/tenantMiddleware.js";
import {
  getEntityTypes,
  getSchemaMetadata,
  generateFormFromSchema,
  validateFormDataAgainstSchema,
  mapFormData,
  clearSchemaCache,
} from "../../controllers/schemaController.js";

/**
 * Schema Metadata Routes
 * These routes provide schema information for dynamic form generation
 * All routes are optional and don't break existing functionality
 */

// Get all available entity types
router.get(
  "/entity-types",
  auth,
  tenant.validateTenant(),
  getEntityTypes
);

// Get schema metadata for an entity type
router.get(
  "/metadata/:entityType",
  auth,
  tenant.validateTenant(),
  getSchemaMetadata
);

// Generate form template from schema
router.post(
  "/generate-form",
  auth,
  tenant.validateTenant(),
  generateFormFromSchema
);

// Validate form data against schema
router.post(
  "/validate",
  auth,
  tenant.validateTenant(),
  validateFormDataAgainstSchema
);

// Map form data to model structure
router.post(
  "/map-data",
  auth,
  tenant.validateTenant(),
  mapFormData
);

// Clear schema cache
router.delete(
  "/cache/:entityType?",
  auth,
  tenant.validateTenant(),
  clearSchemaCache
);

export default router;

