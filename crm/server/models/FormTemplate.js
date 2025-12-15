import mongoose from "mongoose";
import { withBaseSchemaOptions } from "../utils/withBaseSchemaOptions.js";

// Field Schema
const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      "text",
      "textarea",
      "number",
      "email",
      "phone",
      "url",
      "password",
      "select",
      "multiselect",
      "radio",
      "checkbox",
      "date",
      "datetime",
      "time",
      "file",
      "image",
      "boolean",
      "entity",
      "user",
      "organization",
      "sysConfig",
      "signature",
      "rating",
      "slider",
      "color",
      "address",
      "repeater",
      "html",
      "divider",
      "calculated"
    ]
  },
  label: { type: String, required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  defaultValue: mongoose.Schema.Types.Mixed,
  options: [String], // For select, radio, checkbox
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    customMessage: String
  },
  conditionalLogic: {
    dependsOn: String, // Field ID
    condition: {
      type: String,
      enum: ["equals", "notEquals", "contains", "notContains", "greaterThan", "lessThan", "isEmpty", "isNotEmpty"]
    },
    value: mongoose.Schema.Types.Mixed,
    show: { type: Boolean, default: true }
  },
  metadata: {
    category: String, // For sysConfig fields
    helpText: String,
    fieldGroup: String,
    entityType: String, // For entity fields
    multiple: Boolean, // For file uploads, entity selects
    accept: String, // For file uploads (e.g., "image/*", ".pdf")
    maxSize: Number, // For file uploads in bytes
    readOnly: Boolean // For read-only fields
  },
  calculation: {
    formula: String, // Formula expression (e.g., "field-annualRevenue * field-profitabilityMargin / 100")
    format: {
      type: String,
      enum: ["number", "currency", "percentage"],
      default: "number"
    },
    decimalPlaces: { type: Number, default: 2, min: 0, max: 10 }
  },
  readOnly: Boolean, // For read-only fields like calculated fields
  order: { type: Number, default: 0 }
}, { _id: false });

// Section Schema
const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  order: { type: Number, default: 0 },
  fields: [fieldSchema],
  metadata: {
    hidden: Boolean, // Hide section from form view
    columns: {
      type: Number,
      enum: [1, 2, 3, 4, 6, 12]
      // No default - allow undefined for backward compatibility
    }, // Grid columns (default: 1 in frontend, uses 12-column grid)
    spacing: {
      type: String,
      enum: ["compact", "normal", "loose"]
    }, // Section spacing
    collapsible: Boolean, // Allow section to be collapsed
    collapsedByDefault: Boolean, // Start collapsed
    className: String, // Custom CSS classes
    order: Number // Display order (lower numbers appear first)
  },
  conditionalLogic: {
    dependsOn: String,
    condition: {
      type: String,
      enum: ["equals", "notEquals", "contains", "notContains", "greaterThan", "lessThan", "isEmpty", "isNotEmpty"]
    },
    value: mongoose.Schema.Types.Mixed,
    show: { type: Boolean, default: true }
  }
}, { _id: false });

// Form Settings Schema
const formSettingsSchema = new mongoose.Schema({
  submitButtonText: { type: String, default: "Submit" },
  allowMultipleSubmissions: { type: Boolean, default: true },
  requireAuthentication: { type: Boolean, default: true },
  redirectUrl: String,
  notificationEmails: [String],
  autoAssignTo: mongoose.Schema.Types.Mixed, // User ID or role
  successMessage: { type: String, default: "Form submitted successfully!" },
  errorMessage: { type: String, default: "An error occurred. Please try again." },
  allowDraft: { type: Boolean, default: true },
  autoSave: { type: Boolean, default: false },
  autoSaveInterval: { type: Number, default: 30000 } // milliseconds
}, { _id: false });

// Permissions Schema
const permissionsSchema = new mongoose.Schema({
  canView: [mongoose.Schema.Types.Mixed], // Role IDs or user IDs
  canEdit: [mongoose.Schema.Types.Mixed],
  canSubmit: [mongoose.Schema.Types.Mixed],
  canDelete: [mongoose.Schema.Types.Mixed]
}, { _id: false });

const baseFormTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    tenantId: { type: String, required: true, index: true },
    orgCode: { type: String, index: true }, // Optional: organization-specific forms
    entityType: {
      type: String,
      enum: ["lead", "account", "contact", "opportunity", "quotation", "ticket", "custom", null],
      default: null
    },
    isActive: { type: Boolean, default: true, index: true },
    isPublic: { type: Boolean, default: false }, // Can be used by other tenants
    
    // Form structure
    sections: [sectionSchema],
    
    // Form settings
    settings: {
      type: formSettingsSchema,
      default: () => ({})
    },
    
    // Permissions
    permissions: {
      type: permissionsSchema,
      default: () => ({})
    },
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (Kinde user ID)
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User"
    },
    version: { type: Number, default: 1 },
    tags: [String],
    
    // Related entity configuration
    autoCreateEntity: { type: Boolean, default: false },
    entityMapping: mongoose.Schema.Types.Mixed, // Map form fields to entity fields
    
    // Workflow integration
    workflowTriggers: [{
      event: { type: String, enum: ["onSubmit", "onStatusChange"] },
      workflowId: String,
      conditions: mongoose.Schema.Types.Mixed
    }]
  },
  {
    timestamps: true,
  }
);

// Indexes
baseFormTemplateSchema.index({ tenantId: 1, isActive: 1 });
baseFormTemplateSchema.index({ tenantId: 1, orgCode: 1 });
baseFormTemplateSchema.index({ entityType: 1, isActive: 1 });
baseFormTemplateSchema.index({ entityType: 1, isDefault: 1 });
baseFormTemplateSchema.index({ tenantId: 1, entityType: 1, isDefault: 1 });
baseFormTemplateSchema.index({ createdBy: 1 });
baseFormTemplateSchema.index({ tags: 1 });

const formTemplateSchema = withBaseSchemaOptions(baseFormTemplateSchema);

export default mongoose.model("FormTemplate", formTemplateSchema);

