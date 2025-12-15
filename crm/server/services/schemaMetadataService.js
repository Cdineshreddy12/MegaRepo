import mongoose from "mongoose";

/**
 * Schema Metadata Service
 * Extracts metadata from Mongoose schemas for dynamic form generation
 * Designed to be scalable and non-breaking
 */

// Schema field type mapping
const SCHEMA_TYPE_TO_FORM_TYPE = {
  String: "text",
  Number: "number",
  Date: "date",
  Boolean: "checkbox",
  ObjectId: "entity",
  Array: "multiselect",
  Mixed: "text",
  Buffer: "file",
};

// System fields that should be excluded by default
const SYSTEM_FIELDS = [
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
  "deleted",
  "tenantId", // Backend-only, automatically handled
  "orgCode", // Backend-only, automatically handled
];

/**
 * Extract field metadata from Mongoose schema path
 */
function extractFieldMetadata(path, schemaPath) {
  const fieldInfo = {
    name: path,
    type: "text", // default
    required: false,
    default: undefined,
    validation: {},
    ref: null,
    enum: null,
    nested: null,
    isArray: false,
    isNested: false,
  };

  const schemaType = schemaPath.instance || schemaPath.constructor.name;

  // Determine base type
  if (schemaPath.instance === "String") {
    fieldInfo.type = "text";
    
    // Check field name patterns first (regardless of validators)
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes("email")) {
      fieldInfo.type = "email";
    } else if (lowerPath.includes("phone") || lowerPath.includes("mobile") || lowerPath.includes("telephone")) {
      fieldInfo.type = "phone";
    } else if (lowerPath.includes("url") || lowerPath.includes("website") || lowerPath.includes("web")) {
      fieldInfo.type = "url";
    }
    
    // Also check validators for additional email validation
    if (schemaPath.validators && schemaPath.validators.length > 0) {
      const emailValidator = schemaPath.validators.find(
        (v) => v.validator && v.validator.toString().includes("email")
      );
      if (emailValidator && fieldInfo.type === "text") {
        fieldInfo.type = "email";
      }
    }
  } else if (schemaPath.instance === "Number") {
    fieldInfo.type = "number";
  } else if (schemaPath.instance === "Date") {
    fieldInfo.type = schemaPath.options?.type === Date ? "datetime" : "date";
  } else if (schemaPath.instance === "Boolean") {
    fieldInfo.type = "checkbox";
  } else if (schemaPath.instance === "ObjectId") {
    fieldInfo.type = "entity";
    fieldInfo.ref = schemaPath.options?.ref || null;
  } else if (schemaPath.instance === "Mixed" && schemaPath.options?.ref) {
    // Handle Mixed type with ref (like assignedTo, createdBy, updatedBy)
    fieldInfo.type = "entity";
    fieldInfo.ref = schemaPath.options.ref;
  } else if (schemaPath.instance === "Array") {
    fieldInfo.isArray = true;
    const arrayType = schemaPath.schema?.paths || schemaPath.caster?.instance;
    if (arrayType === "ObjectId") {
      fieldInfo.type = "entity";
      fieldInfo.ref = schemaPath.caster?.options?.ref || null;
    } else {
      fieldInfo.type = "multiselect";
    }
  } else if (schemaPath.schema) {
    // Nested schema
    fieldInfo.isNested = true;
    fieldInfo.type = "object";
    fieldInfo.nested = extractSchemaMetadata(schemaPath.schema);
  }

  // Extract required status
  fieldInfo.required = schemaPath.isRequired || false;

  // Extract default value
  if (schemaPath.defaultValue !== undefined) {
    fieldInfo.default = typeof schemaPath.defaultValue === "function"
      ? schemaPath.defaultValue()
      : schemaPath.defaultValue;
  }

  // Extract enum values
  if (schemaPath.enumValues && schemaPath.enumValues.length > 0) {
    fieldInfo.enum = schemaPath.enumValues;
    if (fieldInfo.type === "text") {
      fieldInfo.type = "select";
    }
  }

  // Extract validation rules
  if (schemaPath.validators && schemaPath.validators.length > 0) {
    schemaPath.validators.forEach((validator) => {
      if (validator.type === "min" || validator.type === "minlength") {
        fieldInfo.validation.min = validator.value;
        if (fieldInfo.type === "text") {
          fieldInfo.validation.minLength = validator.value;
        }
      }
      if (validator.type === "max" || validator.type === "maxlength") {
        fieldInfo.validation.max = validator.value;
        if (fieldInfo.type === "text") {
          fieldInfo.validation.maxLength = validator.value;
        }
      }
      if (validator.type === "regexp" || validator.type === "match") {
        fieldInfo.validation.pattern = validator.value?.toString() || validator.message;
      }
    });
  }

  // Check for min/max in options
  if (schemaPath.options?.min !== undefined) {
    fieldInfo.validation.min = schemaPath.options.min;
  }
  if (schemaPath.options?.max !== undefined) {
    fieldInfo.validation.max = schemaPath.options.max;
  }
  if (schemaPath.options?.minlength !== undefined) {
    fieldInfo.validation.minLength = schemaPath.options.minlength;
  }
  if (schemaPath.options?.maxlength !== undefined) {
    fieldInfo.validation.maxLength = schemaPath.options.maxlength;
  }
  if (schemaPath.options?.match) {
    fieldInfo.validation.pattern = schemaPath.options.match.toString();
  }

  return fieldInfo;
}

/**
 * Extract metadata from a Mongoose schema
 */
function extractSchemaMetadata(schema) {
  const metadata = {
    fields: [],
    requiredFields: [],
    optionalFields: [],
  };

  if (!schema || !schema.paths) {
    return metadata;
  }

  Object.keys(schema.paths).forEach((pathName) => {
    // Skip system fields
    if (SYSTEM_FIELDS.includes(pathName)) {
      return;
    }

    const schemaPath = schema.paths[pathName];
    const fieldInfo = extractFieldMetadata(pathName, schemaPath);

    metadata.fields.push(fieldInfo);

    if (fieldInfo.required) {
      metadata.requiredFields.push(pathName);
    } else {
      metadata.optionalFields.push(pathName);
    }
  });

  return metadata;
}

/**
 * Schema Registry - Maps entity types to their models
 * This is extensible and can be populated dynamically
 */
class SchemaRegistry {
  constructor() {
    this.registry = new Map();
    this.metadataCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Register a schema for an entity type
   */
  register(entityType, model) {
    if (!model || !model.schema) {
      throw new Error(`Invalid model for entity type: ${entityType}`);
    }
    this.registry.set(entityType, model);
    // Invalidate cache
    this.metadataCache.delete(entityType);
    this.cacheExpiry.delete(entityType);
  }

  /**
   * Get metadata for an entity type (with caching)
   */
  getMetadata(entityType, options = {}) {
    const {
      excludeSystemFields = true,
      excludeFields = [],
      includeFields = null,
      refreshCache = false,
    } = options;

    // Check cache first
    if (!refreshCache && this.metadataCache.has(entityType)) {
      const expiry = this.cacheExpiry.get(entityType);
      if (expiry && Date.now() < expiry) {
        const cached = this.metadataCache.get(entityType);
        return this.filterFields(cached, { excludeSystemFields, excludeFields, includeFields });
      }
    }

    // Get model from registry
    const model = this.registry.get(entityType);
    if (!model) {
      throw new Error(`Entity type "${entityType}" not found in registry`);
    }

    // Extract metadata
    const metadata = extractSchemaMetadata(model.schema);
    metadata.entityType = entityType;
    metadata.modelName = model.modelName;

    // Cache metadata
    this.metadataCache.set(entityType, metadata);
    this.cacheExpiry.set(entityType, Date.now() + this.cacheTTL);

    return this.filterFields(metadata, { excludeSystemFields, excludeFields, includeFields });
  }

  /**
   * Filter fields based on options
   */
  filterFields(metadata, options) {
    const { excludeSystemFields, excludeFields, includeFields } = options;
    let fields = [...metadata.fields];

    // Exclude system fields
    if (excludeSystemFields) {
      fields = fields.filter((field) => !SYSTEM_FIELDS.includes(field.name));
    }

    // Exclude specific fields
    if (excludeFields.length > 0) {
      fields = fields.filter((field) => !excludeFields.includes(field.name));
    }

    // Include only specific fields
    if (includeFields && includeFields.length > 0) {
      fields = fields.filter((field) => includeFields.includes(field.name));
    }

    return {
      ...metadata,
      fields,
      requiredFields: fields.filter((f) => f.required).map((f) => f.name),
      optionalFields: fields.filter((f) => !f.required).map((f) => f.name),
    };
  }

  /**
   * Clear cache for an entity type
   */
  clearCache(entityType) {
    if (entityType) {
      this.metadataCache.delete(entityType);
      this.cacheExpiry.delete(entityType);
    } else {
      this.metadataCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get all registered entity types
   */
  getRegisteredTypes() {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if entity type is registered
   */
  isRegistered(entityType) {
    return this.registry.has(entityType);
  }
}

// Create singleton instance
const schemaRegistry = new SchemaRegistry();

/**
 * Initialize schema registry with all CRM models
 * This is called once at startup
 */
export async function initializeSchemaRegistry() {
  try {
    // Dynamically import models
    const Account = (await import("../models/Account.js")).default;
    const Contact = (await import("../models/Contact.js")).default;
    const Lead = (await import("../models/Lead.js")).default;
    const Opportunity = (await import("../models/Opportunity.js")).default;
    const Quotation = (await import("../models/Quotation.js")).default;
    const SalesOrder = (await import("../models/SalesOrder.js")).default;
    const Invoice = (await import("../models/Invoice.js")).default;
    const Ticket = (await import("../models/Ticket.js")).default;

    // Register models
    schemaRegistry.register("account", Account);
    schemaRegistry.register("contact", Contact);
    schemaRegistry.register("lead", Lead);
    schemaRegistry.register("opportunity", Opportunity);
    schemaRegistry.register("quotation", Quotation);
    schemaRegistry.register("salesOrder", SalesOrder);
    schemaRegistry.register("invoice", Invoice);
    schemaRegistry.register("ticket", Ticket);

    console.log("✅ Schema registry initialized with", schemaRegistry.getRegisteredTypes().length, "entity types");
  } catch (error) {
    console.error("❌ Error initializing schema registry:", error);
    throw error;
  }
}

/**
 * Get schema metadata service
 */
export function getSchemaMetadataService() {
  return schemaRegistry;
}

/**
 * Extract metadata for an entity type
 */
export function getEntityMetadata(entityType, options = {}) {
  return schemaRegistry.getMetadata(entityType, options);
}

/**
 * Get all available entity types
 */
export function getAvailableEntityTypes() {
  return schemaRegistry.getRegisteredTypes();
}

export default {
  initializeSchemaRegistry,
  getSchemaMetadataService,
  getEntityMetadata,
  getAvailableEntityTypes,
  SchemaRegistry,
};

