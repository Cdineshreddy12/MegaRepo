import express from "express";
const router = express.Router();
import auth from "../../middleware/auth.js";
import tenant from "../../middleware/tenantMiddleware.js";
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  setDefaultTemplate,
  submitForm,
  getSubmissions,
  getSubmission,
  updateSubmission,
  deleteSubmission,
  validateFormData,
  getFormAnalytics,
  analyzeFormLayoutSuggestions,
  analyzeFormLayoutFromData,
  applyLayoutSuggestions,
  generateTemplate,
  suggestAlignment
} from "../../controllers/formController.js";

/**
 * Form Template Routes
 */

// Create a new form template
router.post(
  "/templates",
  auth,
  tenant.validateTenant(),
  createTemplate
);

// Get all form templates
router.get(
  "/templates",
  auth,
  tenant.validateTenant(),
  getTemplates
);

// Get a single form template by ID
router.get(
  "/templates/:id",
  auth,
  tenant.validateTenant(),
  getTemplate
);

// Update a form template
router.put(
  "/templates/:id",
  auth,
  tenant.validateTenant(),
  updateTemplate
);

// Delete a form template (soft delete)
router.delete(
  "/templates/:id",
  auth,
  tenant.validateTenant(),
  deleteTemplate
);

// Duplicate a form template
router.post(
  "/templates/:id/duplicate",
  auth,
  tenant.validateTenant(),
  duplicateTemplate
);

// Set a template as default for its entity type
router.put(
  "/templates/:id/set-default",
  auth,
  tenant.validateTenant(),
  setDefaultTemplate
);

// Get form analytics
router.get(
  "/templates/:id/analytics",
  auth,
  tenant.validateTenant(),
  getFormAnalytics
);

/**
 * Form Submission Routes
 */

// Submit form data
router.post(
  "/submissions",
  auth,
  tenant.validateTenant(),
  submitForm
);

// Get all form submissions
router.get(
  "/submissions",
  auth,
  tenant.validateTenant(),
  getSubmissions
);

// Get a single form submission by ID
router.get(
  "/submissions/:id",
  auth,
  tenant.validateTenant(),
  getSubmission
);

// Update a form submission (for drafts or status updates)
router.put(
  "/submissions/:id",
  auth,
  tenant.validateTenant(),
  updateSubmission
);

// Delete a form submission
router.delete(
  "/submissions/:id",
  auth,
  tenant.validateTenant(),
  deleteSubmission
);

// Get submissions for a specific template
router.get(
  "/templates/:templateId/submissions",
  auth,
  tenant.validateTenant(),
  getSubmissions
);

/**
 * Form Rendering & Validation Routes
 */

// Validate form data against template
router.post(
  "/templates/:id/validate",
  auth,
  tenant.validateTenant(),
  validateFormData
);

// Get form structure for rendering (public endpoint for active forms)
router.get(
  "/templates/:id/render",
  tenant.validateTenant(),
  getTemplate
);

/**
 * AI Layout Analysis Routes
 */

// Analyze form layout and get AI suggestions (by template ID)
router.post(
  "/templates/:templateId/analyze-layout",
  auth,
  tenant.validateTenant(),
  analyzeFormLayoutSuggestions
);

// Analyze form layout from template data (POST body)
router.post(
  "/templates/analyze-layout",
  auth,
  tenant.validateTenant(),
  analyzeFormLayoutFromData
);

// Apply layout suggestions to a template
router.post(
  "/templates/:templateId/apply-layout-suggestions",
  auth,
  tenant.validateTenant(),
  applyLayoutSuggestions
);

// Generate complete template from scratch using AI
router.post(
  "/templates/generate",
  auth,
  tenant.validateTenant(),
  generateTemplate
);

// Suggest alignment for selected fields
router.post(
  "/templates/suggest-alignment",
  auth,
  tenant.validateTenant(),
  suggestAlignment
);

export default router;

