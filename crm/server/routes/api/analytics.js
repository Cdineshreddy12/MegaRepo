/**
 * Analytics API Routes
 */

import express from "express";
import {
  generateFormula,
  calculateAnalytics,
  getFormulas,
  getFormula,
  createFormula,
  updateFormula,
  deleteFormula,
  validateFormula,
  mapFields,
  suggestMetrics,
  generatePipeline,
  generateInsights,
  getDashboardViews,
  createDashboardView,
  updateDashboardView,
  deleteDashboardView
} from "../../controllers/analyticsController.js";
import tenantMiddleware from "../../middleware/tenantMiddleware.js";

const router = express.Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware.tenantIsolation());
router.use(tenantMiddleware.validateTenant());
router.use(tenantMiddleware.userContext());

// Formula endpoints (specific routes before parameterized routes)
router.post("/generate-formula", generateFormula);
router.post("/calculate", calculateAnalytics);
router.post("/formulas/validate", validateFormula);
router.post("/map-fields", mapFields);
router.post("/suggest-metrics", suggestMetrics);
router.post("/generate-pipeline", generatePipeline);
router.post("/generate-insights", generateInsights);

// Formula CRUD endpoints
router.get("/formulas", getFormulas);
router.post("/formulas", createFormula);
router.get("/formulas/:id", getFormula);
router.put("/formulas/:id", updateFormula);
router.delete("/formulas/:id", deleteFormula);

// Dashboard view endpoints
router.get("/dashboard-views", getDashboardViews);
router.post("/dashboard-views", createDashboardView);
router.put("/dashboard-views/:id", updateDashboardView);
router.delete("/dashboard-views/:id", deleteDashboardView);

export default router;

