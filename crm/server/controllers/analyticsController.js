/**
 * Analytics Controller
 * Handles analytics API endpoints
 */

import AnalyticsFormula from "../models/AnalyticsFormula.js";
import DashboardView from "../models/DashboardView.js";
import FormTemplate from "../models/FormTemplate.js";
import { getEffectiveUser } from "../utils/authHelpers.js";
import analyticsCalculationService from "../services/analytics/analyticsCalculationService.js";
import analyticsAiService from "../services/analytics/analyticsAiService.js";
import industryAnalyticsService from "../services/analytics/industryAnalyticsService.js";
import formulaExecutor from "../services/analytics/formulaExecutor.js";

/**
 * Generate formula from natural language description
 * POST /api/analytics/generate-formula
 */
export const generateFormula = async (req, res) => {
  try {
    const user = await getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    // Try multiple sources for orgCode: query param (entityId), body, tenant, user, or user's first entity
    let orgCode = req.query.entityId || req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    
    // If still no orgCode, try to get it from user's entities
    if (!orgCode && req.user?.entities && Array.isArray(req.user.entities) && req.user.entities.length > 0) {
      orgCode = req.user.entities[0]?.orgCode;
      console.log('📋 Using orgCode from user entities in generateFormula:', orgCode);
    }
    
    // If still no orgCode, try to get it from organizationAssignments
    if (!orgCode && req.user?.organizationAssignments && Array.isArray(req.user.organizationAssignments) && req.user.organizationAssignments.length > 0) {
      orgCode = req.user.organizationAssignments[0]?.entityId;
      console.log('📋 Using orgCode from organizationAssignments in generateFormula:', orgCode);
    }
    
    // Try multiple ways to get userId
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    const { description, formTemplateId, industry } = req.body;

    if (!description || !formTemplateId) {
      return res.status(400).json({
        success: false,
        message: "Description and formTemplateId are required"
      });
    }

    const result = await analyticsCalculationService.generateFormulaFromDescription(
      description,
      formTemplateId,
      tenantId,
      orgCode,
      userId,
      industry
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error generating formula:", error);
    res.status(500).json({
      success: false,
      message: "Error generating formula",
      error: error.message
    });
  }
};

/**
 * Calculate analytics using formula
 * POST /api/analytics/calculate
 */
export const calculateAnalytics = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    // Try multiple sources for orgCode: query param (entityId), body, tenant, user, or user's first entity
    let orgCode = req.query.entityId || req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    
    // If still no orgCode, try to get it from user's entities
    if (!orgCode && req.user?.entities && Array.isArray(req.user.entities) && req.user.entities.length > 0) {
      orgCode = req.user.entities[0]?.orgCode;
      console.log('📋 Using orgCode from user entities:', orgCode);
    }
    
    // If still no orgCode, try to get it from organizationAssignments
    if (!orgCode && req.user?.organizationAssignments && Array.isArray(req.user.organizationAssignments) && req.user.organizationAssignments.length > 0) {
      orgCode = req.user.organizationAssignments[0]?.entityId;
      console.log('📋 Using orgCode from organizationAssignments:', orgCode);
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { formulaId, filters = {}, dateRange = {} } = req.body;

    if (!formulaId) {
      return res.status(400).json({
        success: false,
        message: "Formula ID is required"
      });
    }

    console.log('🔍 calculateAnalytics - orgCode resolved:', orgCode, 'from:', {
      query: req.query.entityId,
      body: req.body.orgCode,
      tenant: req.tenant?.orgCode,
      user: req.user?.orgCode,
      entities: req.user?.entities?.[0]?.orgCode,
      assignments: req.user?.organizationAssignments?.[0]?.entityId
    });

    const result = await analyticsCalculationService.calculate(
      formulaId,
      filters,
      dateRange,
      tenantId,
      orgCode
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error calculating analytics:", error);
    
    // Check if it's a division by zero error
    if (error.message && error.message.includes('Division by zero')) {
      return res.status(400).json({
        success: false,
        message: "Cannot calculate formula",
        error: error.message,
        errorType: "division_by_zero",
        suggestion: "Please ensure all denominator fields have non-zero values in your data."
      });
    }
    
    // Check if it's a validation error
    if (error.message && (error.message.includes('empty') || error.message.includes('invalid'))) {
      return res.status(400).json({
        success: false,
        message: "Invalid formula or data",
        error: error.message,
        errorType: "validation_error"
      });
    }
    
    // Generic error
    res.status(500).json({
      success: false,
      message: "Error calculating analytics",
      error: error.message
    });
  }
};

/**
 * Get all formulas
 * GET /api/analytics/formulas
 */
export const getFormulas = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    // Try multiple sources for orgCode: query param (entityId), query.orgCode, tenant, user, or user's first entity
    let orgCode = req.query.entityId || req.query.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    
    // If still no orgCode, try to get it from user's entities
    if (!orgCode && req.user?.entities && Array.isArray(req.user.entities) && req.user.entities.length > 0) {
      orgCode = req.user.entities[0]?.orgCode;
    }
    
    // If still no orgCode, try to get it from organizationAssignments
    if (!orgCode && req.user?.organizationAssignments && Array.isArray(req.user.organizationAssignments) && req.user.organizationAssignments.length > 0) {
      orgCode = req.user.organizationAssignments[0]?.entityId;
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const query = { tenantId, isActive: true };

    if (orgCode) {
      query.$or = [
        { orgCode },
        { orgCode: { $exists: false } },
        { orgCode: null }
      ];
    }

    if (req.query.formTemplateId) {
      query.formTemplateId = req.query.formTemplateId;
    }

    if (req.query.industry) {
      query.industry = req.query.industry;
    }

    const formulas = await AnalyticsFormula.find(query)
      .populate('formTemplateId', 'name entityType sections')
      .sort({ createdAt: -1 });

    // Always calculate previews if orgCode is available (default behavior)
    // This ensures formulas with orgCode: null can still show previews using current user's orgCode
    const includePreview = req.query.includePreview !== 'false'; // Default to true unless explicitly false
    let formulasWithPreview = formulas;

    if (includePreview && orgCode) {
      formulasWithPreview = await Promise.all(
        formulas.map(async (formula) => {
          try {
            // Always use the resolved orgCode from request context, not formula.orgCode
            // This allows formulas with orgCode: null to still calculate previews
            const preview = await analyticsCalculationService.calculatePreview(
              formula,
              tenantId,
              orgCode // Use resolved orgCode from request, not formula.orgCode
            );
            const formulaObj = formula.toJSON();
            formulaObj.preview = preview;
            // Format formula with human-readable field labels
            if (formula.formTemplateId && formula.formTemplateId.sections) {
              formulaObj.formula = analyticsCalculationService.formatFormulaWithLabels(
                formula.formula,
                formula.variableMappings,
                formula.formTemplateId
              );
              formulaObj.originalFormula = formula.formula; // Keep original formula with field IDs
            }
            return formulaObj;
          } catch (error) {
            console.warn(`Failed to calculate preview for formula ${formula._id}:`, error.message);
            const formulaObj = formula.toJSON();
            formulaObj.preview = {
              value: 0,
              formatted: 'N/A',
              message: `Preview unavailable: ${error.message}`,
              error: true
            };
            // Format formula with human-readable field labels
            if (formula.formTemplateId && formula.formTemplateId.sections) {
              formulaObj.formula = analyticsCalculationService.formatFormulaWithLabels(
                formula.formula,
                formula.variableMappings,
                formula.formTemplateId
              );
              formulaObj.originalFormula = formula.formula; // Keep original formula with field IDs
            }
            return formulaObj;
          }
        })
      );
    } else {
      formulasWithPreview = formulas.map(f => {
        const formulaObj = f.toJSON();
        // Format formula with human-readable field labels
        if (f.formTemplateId && f.formTemplateId.sections) {
          formulaObj.formula = analyticsCalculationService.formatFormulaWithLabels(
            f.formula,
            f.variableMappings,
            f.formTemplateId
          );
          formulaObj.originalFormula = f.formula; // Keep original formula with field IDs
        }
        return formulaObj;
      });
    }

    res.json({
      success: true,
      data: formulasWithPreview
    });
  } catch (error) {
    console.error("Error fetching formulas:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching formulas",
      error: error.message
    });
  }
};

/**
 * Get single formula
 * GET /api/analytics/formulas/:id
 */
export const getFormula = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const formulaId = req.params.id;

    const formula = await AnalyticsFormula.findOne({
      _id: formulaId,
      tenantId,
      isActive: true
    }).populate('formTemplateId', 'name entityType sections');

    if (!formula) {
      return res.status(404).json({
        success: false,
        message: "Formula not found"
      });
    }

    // Format formula with human-readable field labels
    const formattedFormula = analyticsCalculationService.formatFormulaWithLabels(
      formula.formula,
      formula.variableMappings,
      formula.formTemplateId
    );

    const formulaData = formula.toJSON();
    formulaData.formula = formattedFormula; // Use formatted formula with human-readable labels
    formulaData.originalFormula = formula.formula; // Keep original formula with field IDs

    res.json({
      success: true,
      data: formulaData
    });
  } catch (error) {
    console.error("Error fetching formula:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching formula",
      error: error.message
    });
  }
};

/**
 * Create formula manually
 * POST /api/analytics/formulas
 */
export const createFormula = async (req, res) => {
  try {
    const user = await getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    // Try multiple sources for orgCode: query param (entityId), body, tenant, user, or user's first entity
    let orgCode = req.query.entityId || req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    
    // If still no orgCode, try to get it from user's entities
    if (!orgCode && req.user?.entities && Array.isArray(req.user.entities) && req.user.entities.length > 0) {
      orgCode = req.user.entities[0]?.orgCode;
      console.log('📋 Using orgCode from user entities in createFormula:', orgCode);
    }
    
    // If still no orgCode, try to get it from organizationAssignments
    if (!orgCode && req.user?.organizationAssignments && Array.isArray(req.user.organizationAssignments) && req.user.organizationAssignments.length > 0) {
      orgCode = req.user.organizationAssignments[0]?.entityId;
      console.log('📋 Using orgCode from organizationAssignments in createFormula:', orgCode);
    }
    
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    const formulaData = {
      ...req.body,
      tenantId,
      orgCode,
      createdBy: userId,
      updatedBy: userId
    };

    // Validate formula syntax
    const validation = formulaExecutor.validateFormula(formulaData.formula);
    formulaData.validation = {
      syntaxValid: validation.valid,
      fieldsValid: true, // TODO: Add field validation
      lastValidated: new Date(),
      errorMessage: validation.error || null
    };

    const formula = new AnalyticsFormula(formulaData);
    await formula.save();

    // Load form template for formatting
    const FormTemplate = (await import("../../models/FormTemplate.js")).default;
    const formTemplate = await FormTemplate.findById(formulaData.formTemplateId);

    // Calculate preview if orgCode is available
    let preview = null;
    if (orgCode) {
      try {
        preview = await analyticsCalculationService.calculatePreview(formula, tenantId, orgCode);
      } catch (previewError) {
        console.warn('Preview calculation failed:', previewError.message);
        preview = {
          value: 0,
          formatted: 'N/A',
          message: 'Preview unavailable: ' + previewError.message
        };
      }
    } else {
      preview = {
        value: 0,
        formatted: 'N/A',
        message: 'Organization context required for preview'
      };
    }

    const responseData = formula.toJSON();
    if (preview) {
      responseData.preview = preview;
    }

    // Format formula with human-readable field labels
    if (formTemplate && formTemplate.sections) {
      responseData.formula = analyticsCalculationService.formatFormulaWithLabels(
        formula.formula,
        formula.variableMappings,
        formTemplate
      );
      responseData.originalFormula = formula.formula; // Keep original formula with field IDs
    }

    res.status(201).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Error creating formula:", error);
    res.status(500).json({
      success: false,
      message: "Error creating formula",
      error: error.message
    });
  }
};

/**
 * Update formula
 * PUT /api/analytics/formulas/:id
 */
export const updateFormula = async (req, res) => {
  try {
    const user = await getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    const formulaId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    const formula = await AnalyticsFormula.findOne({
      _id: formulaId,
      tenantId
    });

    if (!formula) {
      return res.status(404).json({
        success: false,
        message: "Formula not found"
      });
    }

    // Update formula
    Object.assign(formula, req.body);
    formula.updatedBy = userId;

    // Re-validate if formula changed
    if (req.body.formula) {
      const validation = formulaExecutor.validateFormula(req.body.formula);
      formula.validation = {
        syntaxValid: validation.valid,
        fieldsValid: formula.validation?.fieldsValid || true,
        lastValidated: new Date(),
        errorMessage: validation.error || null
      };
    }

    await formula.save();

    res.json({
      success: true,
      data: formula
    });
  } catch (error) {
    console.error("Error updating formula:", error);
    res.status(500).json({
      success: false,
      message: "Error updating formula",
      error: error.message
    });
  }
};

/**
 * Delete formula
 * DELETE /api/analytics/formulas/:id
 */
export const deleteFormula = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const formulaId = req.params.id;

    const formula = await AnalyticsFormula.findOneAndUpdate(
      { _id: formulaId, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!formula) {
      return res.status(404).json({
        success: false,
        message: "Formula not found"
      });
    }

    res.json({
      success: true,
      message: "Formula deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting formula:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting formula",
      error: error.message
    });
  }
};

/**
 * Validate formula syntax
 * POST /api/analytics/formulas/validate
 */
export const validateFormula = async (req, res) => {
  try {
    const { formula, formTemplateId } = req.body;

    if (!formula) {
      return res.status(400).json({
        success: false,
        message: "Formula is required"
      });
    }

    // Basic syntax validation
    const validation = formulaExecutor.validateFormula(formula);

    // AI validation if form template provided
    let aiValidation = null;
    if (formTemplateId) {
      const formTemplate = await FormTemplate.findById(formTemplateId);
      if (formTemplate) {
        try {
          aiValidation = await analyticsAiService.validateAndFixFormula(formula, formTemplate);
        } catch (error) {
          console.error("AI validation error:", error);
        }
      }
    }

    res.json({
      success: true,
      data: {
        syntaxValid: validation.valid,
        error: validation.error,
        aiValidation: aiValidation
      }
    });
  } catch (error) {
    console.error("Error validating formula:", error);
    res.status(500).json({
      success: false,
      message: "Error validating formula",
      error: error.message
    });
  }
};

/**
 * Map formula variables to fields using AI
 * POST /api/analytics/map-fields
 */
export const mapFields = async (req, res) => {
  try {
    const { formula, formTemplateId } = req.body;

    if (!formula || !formTemplateId) {
      return res.status(400).json({
        success: false,
        message: "Formula and formTemplateId are required"
      });
    }

    const formTemplate = await FormTemplate.findById(formTemplateId);
    if (!formTemplate) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    const mappings = await analyticsAiService.mapFormulaToFields(formula, formTemplate);

    res.json({
      success: true,
      data: mappings
    });
  } catch (error) {
    console.error("Error mapping fields:", error);
    res.status(500).json({
      success: false,
      message: "Error mapping fields",
      error: error.message
    });
  }
};

/**
 * Suggest metrics for form template
 * POST /api/analytics/suggest-metrics
 */
export const suggestMetrics = async (req, res) => {
  try {
    const { formTemplateId, industry } = req.body;

    if (!formTemplateId) {
      return res.status(400).json({
        success: false,
        message: "Form template ID is required"
      });
    }

    const formTemplate = await FormTemplate.findById(formTemplateId);
    if (!formTemplate) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    // Detect industry if not provided
    let detectedIndustry = industry;
    if (!detectedIndustry) {
      detectedIndustry = industryAnalyticsService.detectIndustry(formTemplate);
    }

    // Get AI suggestions
    const aiSuggestions = await analyticsAiService.suggestMetrics(formTemplate, detectedIndustry);

    // Get industry-specific metrics
    const industryMetrics = industryAnalyticsService.getRecommendedMetrics(detectedIndustry);

    res.json({
      success: true,
      data: {
        industry: detectedIndustry,
        aiSuggestions,
        industryMetrics,
        recommendedFields: industryAnalyticsService.getIndustryTemplate(detectedIndustry)?.recommendedFields || []
      }
    });
  } catch (error) {
    console.error("Error suggesting metrics:", error);
    res.status(500).json({
      success: false,
      message: "Error suggesting metrics",
      error: error.message
    });
  }
};

/**
 * Generate pipeline aggregation
 * POST /api/analytics/generate-pipeline
 */
export const generatePipeline = async (req, res) => {
  try {
    const { description, formTemplateId } = req.body;

    if (!description || !formTemplateId) {
      return res.status(400).json({
        success: false,
        message: "Description and formTemplateId are required"
      });
    }

    const formTemplate = await FormTemplate.findById(formTemplateId);
    if (!formTemplate) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    const pipeline = await analyticsAiService.generatePipeline(description, formTemplate);

    res.json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    console.error("Error generating pipeline:", error);
    res.status(500).json({
      success: false,
      message: "Error generating pipeline",
      error: error.message
    });
  }
};

/**
 * Generate insights from analytics results
 * POST /api/analytics/generate-insights
 */
export const generateInsights = async (req, res) => {
  try {
    const { analyticsResults, historicalData } = req.body;

    if (!analyticsResults) {
      return res.status(400).json({
        success: false,
        message: "Analytics results are required"
      });
    }

    const insights = await analyticsAiService.generateInsights(analyticsResults, historicalData);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({
      success: false,
      message: "Error generating insights",
      error: error.message
    });
  }
};

// Dashboard View endpoints

/**
 * Get dashboard views
 * GET /api/analytics/dashboard-views
 */
export const getDashboardViews = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const orgCode = req.query.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    const userId = req.user?.userId || req.user?.id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const query = { tenantId, isActive: true };

    // Filter by scope
    if (req.query.userId) {
      query.userId = req.query.userId;
    } else if (req.query.roleId) {
      query.roleId = req.query.roleId;
    } else {
      // Show user-specific and public views
      query.$or = [
        { userId },
        { isPublic: true },
        { userId: { $exists: false } }
      ];
    }

    if (orgCode) {
      query.$or = [
        ...(query.$or || []),
        { orgCode },
        { orgCode: { $exists: false } },
        { orgCode: null }
      ];
    }

    const views = await DashboardView.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: views
    });
  } catch (error) {
    console.error("Error fetching dashboard views:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard views",
      error: error.message
    });
  }
};

/**
 * Create dashboard view
 * POST /api/analytics/dashboard-views
 */
export const createDashboardView = async (req, res) => {
  try {
    const user = await getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    // Try multiple sources for orgCode: query param (entityId), body, tenant, user, or user's first entity
    let orgCode = req.query.entityId || req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    
    // If still no orgCode, try to get it from user's entities
    if (!orgCode && req.user?.entities && Array.isArray(req.user.entities) && req.user.entities.length > 0) {
      orgCode = req.user.entities[0]?.orgCode;
      console.log('📋 Using orgCode from user entities in createDashboardView:', orgCode);
    }
    
    // If still no orgCode, try to get it from organizationAssignments
    if (!orgCode && req.user?.organizationAssignments && Array.isArray(req.user.organizationAssignments) && req.user.organizationAssignments.length > 0) {
      orgCode = req.user.organizationAssignments[0]?.entityId;
      console.log('📋 Using orgCode from organizationAssignments in createDashboardView:', orgCode);
    }
    
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    const viewData = {
      ...req.body,
      tenantId,
      orgCode,
      createdBy: userId,
      updatedBy: userId
    };

    const view = new DashboardView(viewData);
    await view.save();

    res.status(201).json({
      success: true,
      data: view
    });
  } catch (error) {
    console.error("Error creating dashboard view:", error);
    res.status(500).json({
      success: false,
      message: "Error creating dashboard view",
      error: error.message
    });
  }
};

/**
 * Update dashboard view
 * PUT /api/analytics/dashboard-views/:id
 */
export const updateDashboardView = async (req, res) => {
  try {
    const user = await getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    const viewId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    const view = await DashboardView.findOne({
      _id: viewId,
      tenantId
    });

    if (!view) {
      return res.status(404).json({
        success: false,
        message: "Dashboard view not found"
      });
    }

    Object.assign(view, req.body);
    view.updatedBy = userId;
    await view.save();

    res.json({
      success: true,
      data: view
    });
  } catch (error) {
    console.error("Error updating dashboard view:", error);
    res.status(500).json({
      success: false,
      message: "Error updating dashboard view",
      error: error.message
    });
  }
};

/**
 * Delete dashboard view
 * DELETE /api/analytics/dashboard-views/:id
 */
export const deleteDashboardView = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const viewId = req.params.id;

    const view = await DashboardView.findOneAndUpdate(
      { _id: viewId, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!view) {
      return res.status(404).json({
        success: false,
        message: "Dashboard view not found"
      });
    }

    res.json({
      success: true,
      message: "Dashboard view deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting dashboard view:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting dashboard view",
      error: error.message
    });
  }
};

