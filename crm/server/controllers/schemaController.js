import {
  getEntityMetadata,
  getAvailableEntityTypes,
  getSchemaMetadataService,
} from "../services/schemaMetadataService.js";
import {
  generateFormTemplateFromSchema,
  mapFormDataToModel,
} from "../services/schemaFormGeneratorService.js";
import FormTemplate from "../models/FormTemplate.js";
import { getEffectiveUser } from "../utils/authHelpers.js";

/**
 * Get all available entity types
 */
export const getEntityTypes = async (req, res) => {
  try {
    const entityTypes = getAvailableEntityTypes();
    res.json({
      success: true,
      data: entityTypes.map((type) => ({
        value: type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
      })),
    });
  } catch (error) {
    console.error("Error fetching entity types:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching entity types",
      error: error.message,
    });
  }
};

/**
 * Get schema metadata for an entity type
 */
export const getSchemaMetadata = async (req, res) => {
  try {
    const { entityType } = req.params;
    const {
      excludeFields = [],
      includeFields = null,
      excludeSystemFields = true,
    } = req.query;

    const excludeFieldsArray = Array.isArray(excludeFields)
      ? excludeFields
      : excludeFields
      ? excludeFields.split(",")
      : [];

    const includeFieldsArray =
      includeFields && includeFields !== "null"
        ? Array.isArray(includeFields)
          ? includeFields
          : includeFields.split(",")
        : null;

    const metadata = getEntityMetadata(entityType, {
      excludeSystemFields: excludeSystemFields === "true",
      excludeFields: excludeFieldsArray,
      includeFields: includeFieldsArray,
    });

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error("Error fetching schema metadata:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching schema metadata",
      error: error.message,
    });
  }
};

/**
 * Generate form template from schema
 */
export const generateFormFromSchema = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const {
      entityType,
      templateName,
      templateDescription,
      includeFields = null,
      excludeFields = ["createdAt", "updatedAt"], // Keep createdBy and updatedBy, exclude timestamps
      fieldOverrides = {},
      groupingStrategy = "auto",
      addCustomFields = [],
      saveTemplate = false, // Whether to save to database
    } = req.body;

    if (!entityType) {
      return res.status(400).json({
        success: false,
        message: "Entity type is required",
      });
    }

    // Generate form template
    const formTemplate = generateFormTemplateFromSchema(entityType, {
      includeFields: Array.isArray(includeFields) ? includeFields : includeFields?.split(","),
      excludeFields: Array.isArray(excludeFields) ? excludeFields : excludeFields?.split(","),
      fieldOverrides,
      groupingStrategy,
      templateName,
      templateDescription,
      addCustomFields,
    });

    // If saveTemplate is true, save to database
    if (saveTemplate) {
      const templateData = {
        ...formTemplate,
        tenantId,
        orgCode,
        createdBy: user?.userId || user?.id || user?._id,
        updatedBy: user?.userId || user?.id || user?._id,
      };

      const template = new FormTemplate(templateData);
      await template.save();

      return res.status(201).json({
        success: true,
        data: template,
        message: "Form template generated and saved successfully",
      });
    }

    // Return template without saving
    res.json({
      success: true,
      data: formTemplate,
      message: "Form template generated successfully",
    });
  } catch (error) {
    console.error("Error generating form from schema:", error);
    res.status(500).json({
      success: false,
      message: "Error generating form from schema",
      error: error.message,
    });
  }
};

/**
 * Validate form data against schema
 */
export const validateFormDataAgainstSchema = async (req, res) => {
  try {
    const { entityType, formData } = req.body;

    if (!entityType || !formData) {
      return res.status(400).json({
        success: false,
        message: "Entity type and form data are required",
      });
    }

    // Get schema metadata
    const metadata = getEntityMetadata(entityType, {
      excludeSystemFields: false,
    });

    const errors = [];

    // Validate each field
    metadata.fields.forEach((field) => {
      const fieldName = field.name;
      const value = formData[fieldName] || formData[`field-${fieldName}`];

      // Required field validation
      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({
          field: fieldName,
          message: `${formatFieldLabel(fieldName)} is required`,
        });
      }

      // Type-specific validation
      if (value !== undefined && value !== null && value !== "") {
        // String length validation
        if (field.type === "text" && typeof value === "string") {
          if (field.validation.minLength && value.length < field.validation.minLength) {
            errors.push({
              field: fieldName,
              message: `${formatFieldLabel(fieldName)} must be at least ${field.validation.minLength} characters`,
            });
          }
          if (field.validation.maxLength && value.length > field.validation.maxLength) {
            errors.push({
              field: fieldName,
              message: `${formatFieldLabel(fieldName)} must be at most ${field.validation.maxLength} characters`,
            });
          }
        }

        // Number validation
        if (field.type === "number") {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push({
              field: fieldName,
              message: `${formatFieldLabel(fieldName)} must be a valid number`,
            });
          } else {
            if (field.validation.min !== undefined && numValue < field.validation.min) {
              errors.push({
                field: fieldName,
                message: `${formatFieldLabel(fieldName)} must be at least ${field.validation.min}`,
              });
            }
            if (field.validation.max !== undefined && numValue > field.validation.max) {
              errors.push({
                field: fieldName,
                message: `${formatFieldLabel(fieldName)} must be at most ${field.validation.max}`,
              });
            }
          }
        }

        // Enum validation
        if (field.enum && !field.enum.includes(value)) {
          errors.push({
            field: fieldName,
            message: `${formatFieldLabel(fieldName)} must be one of: ${field.enum.join(", ")}`,
          });
        }
      }
    });

    res.json({
      success: errors.length === 0,
      errors,
      message:
        errors.length === 0
          ? "Form data is valid"
          : `${errors.length} validation error(s) found`,
    });
  } catch (error) {
    console.error("Error validating form data:", error);
    res.status(500).json({
      success: false,
      message: "Error validating form data",
      error: error.message,
    });
  }
};

/**
 * Map form data to model structure
 */
export const mapFormData = async (req, res) => {
  try {
    const { entityType, formData } = req.body;

    if (!entityType || !formData) {
      return res.status(400).json({
        success: false,
        message: "Entity type and form data are required",
      });
    }

    const modelData = mapFormDataToModel(entityType, formData, {
      preserveExtraFields: false,
    });

    res.json({
      success: true,
      data: modelData,
    });
  } catch (error) {
    console.error("Error mapping form data:", error);
    res.status(500).json({
      success: false,
      message: "Error mapping form data",
      error: error.message,
    });
  }
};

/**
 * Clear schema metadata cache
 */
export const clearSchemaCache = async (req, res) => {
  try {
    const { entityType } = req.params;
    const schemaService = getSchemaMetadataService();
    schemaService.clearCache(entityType);

    res.json({
      success: true,
      message: entityType
        ? `Cache cleared for ${entityType}`
        : "All schema cache cleared",
    });
  } catch (error) {
    console.error("Error clearing schema cache:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing schema cache",
      error: error.message,
    });
  }
};

// Helper function
function formatFieldLabel(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

