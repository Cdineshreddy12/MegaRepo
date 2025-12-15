import mongoose from "mongoose";
import { getEntityMetadata } from "./schemaMetadataService.js";

/**
 * Schema Form Generator Service
 * Generates form templates from schema metadata
 * Designed to be scalable and work alongside existing form builder
 */

// Mapping of field names to sysConfig categories
// Note: Categories must match exactly with database category names
const SYSCONFIG_FIELD_MAPPING = {
  // Account fields
  zone: "zones", // Note: database uses "zones" (plural)
  status: "account_status",
  accountStatus: "account_status",
  accountType: "account_type",
  
  // Lead fields
  leadStatus: "lead_status",
  leadSource: "lead_sources", // Note: database uses "lead_sources" (plural)
  leadStage: "opportunity_stages", // Using opportunity_stages as lead_stage doesn't exist
  
  // Contact fields
  contactType: "contact_types", // Note: database uses "contact_types" (plural)
  contactStatus: "account_status", // Using account_status as fallback
  
  // Opportunity fields
  opportunityStage: "opportunity_stages", // Note: database uses "opportunity_stages" (plural)
  opportunityStatus: "opportunity_status",
  
  // Common fields
  source: "lead_sources",
  stage: "opportunity_stages",
  type: "account_type",
};

/**
 * Detect if a field should be a sysConfig field based on its name
 */
function detectSysConfigField(fieldName) {
  const lowerName = fieldName.toLowerCase();
  
  // Check direct mapping first
  if (SYSCONFIG_FIELD_MAPPING[fieldName]) {
    return SYSCONFIG_FIELD_MAPPING[fieldName];
  }
  
  // Check pattern matching (use plural forms to match database)
  if (lowerName.includes("zone")) {
    return "zones"; // Database uses "zones" (plural)
  }
  if (lowerName.includes("status")) {
    // Try to infer from context
    if (lowerName.includes("account")) {
      return "account_status";
    } else if (lowerName.includes("lead")) {
      return "lead_status";
    } else if (lowerName.includes("opportunity")) {
      return "opportunity_status";
    } else if (lowerName.includes("invoice")) {
      return "invoice_status";
    } else if (lowerName.includes("sales") || lowerName.includes("order")) {
      return "sales_order_status";
    }
    return "account_status"; // Default fallback
  }
  if (lowerName.includes("source")) {
    return "lead_sources"; // Database uses "lead_sources" (plural)
  }
  if (lowerName.includes("stage")) {
    return "opportunity_stages"; // Database uses "opportunity_stages" (plural)
  }
  if (lowerName.includes("type") || lowerName.includes("category")) {
    if (lowerName.includes("contact")) {
      return "contact_types";
    } else if (lowerName.includes("product")) {
      return "product_categories";
    } else if (lowerName.includes("service")) {
      return "service_types";
    }
    return "account_type"; // Default fallback
  }
  
  return null;
}

/**
 * Generate form field from schema field metadata
 */
function generateFormField(schemaField, options = {}) {
  const {
    fieldOverrides = {},
    sectionId = "section-1",
    order = 0,
  } = options;

  const override = fieldOverrides[schemaField.name] || {};

  // Generate field ID
  const fieldId = override.id || `field-${schemaField.name}`;

  // Determine form field type
  let formFieldType = schemaField.type;
  let sysConfigCategory = null;
  
  // Handle special cases
  if (schemaField.type === "entity" && schemaField.ref) {
    formFieldType = "entity";
  } else if (schemaField.enum && schemaField.type === "text") {
    formFieldType = "select";
  } else if (schemaField.isArray && schemaField.type === "entity") {
    formFieldType = "entity";
  } else if (schemaField.type === "text" && !schemaField.enum) {
    // Check if this should be a sysConfig field
    sysConfigCategory = detectSysConfigField(schemaField.name);
    if (sysConfigCategory) {
      formFieldType = "sysConfig";
    }
  }

  // Build form field
  const formField = {
    id: fieldId,
    name: schemaField.name, // Preserve original field name for grouping logic
    type: override.type || formFieldType,
    label: override.label || formatFieldLabel(schemaField.name),
    placeholder: override.placeholder || `Enter ${formatFieldLabel(schemaField.name).toLowerCase()}...`,
    required: override.required !== undefined ? override.required : schemaField.required,
    defaultValue: override.defaultValue !== undefined ? override.defaultValue : schemaField.default,
    order: override.order !== undefined ? override.order : order,
    readOnly: override.readOnly !== undefined ? override.readOnly : false,
    validation: {
      ...schemaField.validation,
      ...(override.validation || {}),
    },
    metadata: {
      ...(override.metadata || {}),
      ...(schemaField.ref ? { entityType: schemaField.ref.toLowerCase() } : {}),
      ...(schemaField.isArray ? { multiple: true } : {}),
      // Add sysConfig category if detected
      ...(sysConfigCategory ? { category: sysConfigCategory } : {}),
    },
    // Also store category at field level for backward compatibility
    ...(sysConfigCategory ? { category: sysConfigCategory } : {}),
  };

  // Add options for select/enum fields
  if (schemaField.enum && formFieldType === "select") {
    formField.options = override.options || schemaField.enum;
  }

  // Handle nested fields
  if (schemaField.nested && schemaField.nested.fields) {
    formField.metadata.nestedFields = schemaField.nested.fields.map((nestedField, idx) =>
      generateFormField(nestedField, {
        ...options,
        sectionId: `${sectionId}-nested`,
        order: idx,
      })
    );
  }

  return formField;
}

/**
 * Format field name to label (e.g., "companyName" -> "Company Name")
 */
function formatFieldLabel(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Group fields into logical sections
 */
function groupFieldsIntoSections(fields, groupingStrategy = "auto") {
  if (groupingStrategy === "none" || fields.length <= 5) {
    return [
      {
        id: "section-1",
        title: "Form Fields",
        description: "",
        order: 0,
        fields: fields.map((field, idx) => ({
          ...field,
          order: idx,
        })),
      },
    ];
  }

  // Auto-grouping strategy
  const sections = [];
  const sectionMap = new Map();

  fields.forEach((field, idx) => {
    // Determine section based on field name patterns
    let sectionKey = "general";
    // Use field.name if available, otherwise fall back to field.id or field.label
    const fieldName = (field.name || field.id || field.label || "").toLowerCase();

    if (fieldName.includes("address") || fieldName.includes("billing") || fieldName.includes("shipping")) {
      sectionKey = "address";
    } else if (
      fieldName.includes("contact") ||
      fieldName.includes("email") ||
      fieldName.includes("phone") ||
      fieldName.includes("name")
    ) {
      sectionKey = "contact";
    } else if (
      fieldName.includes("company") ||
      fieldName.includes("account") ||
      fieldName.includes("organization")
    ) {
      sectionKey = "company";
    } else if (fieldName.includes("status") || fieldName.includes("type") || fieldName.includes("stage")) {
      sectionKey = "status";
    } else if (fieldName.includes("product") || fieldName.includes("item") || fieldName.includes("quantity")) {
      sectionKey = "products";
    } else if (fieldName.includes("financial") || fieldName.includes("revenue") || fieldName.includes("amount")) {
      sectionKey = "financial";
    }

    if (!sectionMap.has(sectionKey)) {
      const sectionTitle = formatFieldLabel(sectionKey);
      sectionMap.set(sectionKey, {
        id: `section-${sectionKey}`,
        title: sectionTitle,
        description: "",
        order: sectionMap.size,
        fields: [],
      });
    }

    sectionMap.get(sectionKey).fields.push({
      ...field,
      order: sectionMap.get(sectionKey).fields.length,
    });
  });

  return Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
}

/**
 * Generate form template from schema metadata
 */
export function generateFormTemplateFromSchema(entityType, options = {}) {
  const {
    includeFields = null,
    excludeFields = ["createdAt", "updatedAt"], // Keep createdBy and updatedBy, exclude timestamps
    fieldOverrides = {},
    groupingStrategy = "auto",
    templateName = null,
    templateDescription = null,
    addCustomFields = [],
  } = options;

  // Get schema metadata - exclude system fields but include createdBy/updatedBy
  const schemaMetadata = getEntityMetadata(entityType, {
    excludeSystemFields: true,
    excludeFields: [...excludeFields, "tenantId", "orgCode"], // Always exclude tenantId and orgCode
    includeFields,
  });

  // Generate form fields
  const formFields = schemaMetadata.fields.map((schemaField, idx) => {
    const field = generateFormField(schemaField, {
      fieldOverrides,
      order: idx,
    });
    
    // Mark createdBy and updatedBy as read-only
    // assignedTo is editable (user can assign to someone)
    if (schemaField.name === "createdBy" || schemaField.name === "updatedBy") {
      field.readOnly = true;
      field.metadata = {
        ...field.metadata,
        autoPopulated: true,
        readOnly: true,
      };
    } else if (schemaField.name === "assignedTo") {
      // Ensure assignedTo is properly configured as user field
      field.type = field.type === "entity" && schemaField.ref === "User" ? "user" : field.type;
      field.metadata = {
        ...field.metadata,
        entityType: "user",
      };
    }
    
    return field;
  });

  // Add custom fields
  const allFields = [...formFields, ...addCustomFields];

  // Group fields into sections
  const sections = groupFieldsIntoSections(allFields, groupingStrategy);

  // Build form template
  const template = {
    name: templateName || `${formatFieldLabel(entityType)} Form`,
    description: templateDescription || `Auto-generated form for ${entityType}`,
    entityType,
    isActive: true,
    sections,
    settings: {
      submitButtonText: "Submit",
      allowMultipleSubmissions: true,
      requireAuthentication: true,
      allowDraft: true,
    },
    permissions: {},
    tags: [entityType, "schema-generated"],
    metadata: {
      generatedFromSchema: true,
      schemaVersion: "1.0",
      generatedAt: new Date().toISOString(),
    },
  };

  return template;
}

/**
 * Generate Zod schema from form template (for validation)
 */
export function generateZodSchemaFromTemplate(template) {
  // This would generate a Zod schema from the template
  // For now, return a placeholder
  // In production, this would use zod-to-json-schema or similar
  return {
    type: "object",
    properties: template.sections.reduce((acc, section) => {
      section.fields.forEach((field) => {
        acc[field.id] = {
          type: field.type,
          required: field.required,
          ...(field.validation || {}),
        };
      });
      return acc;
    }, {}),
  };
}

/**
 * Map form data to model data structure
 */
export function mapFormDataToModel(entityType, formData, options = {}) {
  const { preserveExtraFields = false } = options;

  // Get schema metadata to understand field structure
  const schemaMetadata = getEntityMetadata(entityType, {
    excludeSystemFields: false,
  });

  const modelData = {};

  // Map form fields to model fields
  Object.keys(formData).forEach((formFieldId) => {
    // Try to find corresponding schema field
    // Form field ID might be "field-companyName" or just "companyName"
    const fieldName = formFieldId.replace(/^field-/, "");
    const schemaField = schemaMetadata.fields.find((f) => f.name === fieldName);

    if (schemaField) {
      // Map based on schema field type
      let value = formData[formFieldId];

      // Type conversion
      if (schemaField.type === "number" && typeof value === "string") {
        value = value ? Number(value) : undefined;
      } else if (schemaField.type === "date" && typeof value === "string") {
        value = value ? new Date(value) : undefined;
      } else if (schemaField.type === "boolean" && typeof value !== "boolean") {
        value = Boolean(value);
      } else if (schemaField.type === "entity" && value) {
        // Convert to ObjectId if needed
        if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
          value = new mongoose.Types.ObjectId(value);
        }
      }

      modelData[fieldName] = value;
    } else if (preserveExtraFields) {
      // Preserve fields not in schema
      modelData[fieldName] = formData[formFieldId];
    }
  });

  return modelData;
}

export default {
  generateFormTemplateFromSchema,
  generateZodSchemaFromTemplate,
  mapFormDataToModel,
  generateFormField,
  formatFieldLabel,
  groupFieldsIntoSections,
};

