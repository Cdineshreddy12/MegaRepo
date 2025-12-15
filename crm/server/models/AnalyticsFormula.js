import mongoose from "mongoose";
import { withBaseSchemaOptions } from "../utils/withBaseSchemaOptions.js";

// Variable mapping schema
const variableMappingSchema = new mongoose.Schema({
  variableName: { type: String, required: true }, // Variable name in formula (e.g., "revenue")
  fieldId: { type: String, required: true }, // Actual form field ID (e.g., "field_totalAmount")
  fieldType: { 
    type: String, 
    enum: ["number", "date", "text", "boolean", "select", "multiselect", "calculated", "email", "phone", "url", "textarea", "checkbox", "radio"],
    required: true 
  },
  aggregation: {
    type: String,
    enum: ["SUM", "AVG", "COUNT", "MIN", "MAX", "DISTINCT", "NONE"],
    default: "NONE"
  },
  description: String
}, { _id: false });

// Filter schema
const filterSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  operator: {
    type: String,
    enum: ["equals", "notEquals", "greaterThan", "lessThan", "greaterThanOrEqual", 
           "lessThanOrEqual", "contains", "notContains", "in", "notIn", "isEmpty", "isNotEmpty"],
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  logicalOperator: {
    type: String,
    enum: ["AND", "OR"],
    default: "AND"
  }
}, { _id: false });

const baseAnalyticsFormulaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    tenantId: { type: String, required: true, index: true },
    orgCode: { type: String, index: true },
    
    // Formula definition
    formula: { type: String, required: true }, // e.g., "SUM(field_revenue) * 0.15"
    formulaType: {
      type: String,
      enum: ["simple", "aggregated", "pipelined", "conditional"],
      default: "simple"
    },
    
    // Field mappings
    variableMappings: [variableMappingSchema],
    
    // Filters
    filters: [filterSchema],
    
    // Output configuration
    outputType: {
      type: String,
      enum: ["number", "percentage", "currency", "date", "text"],
      default: "number"
    },
    displayFormat: String, // e.g., "$0,0.00", "0.00%"
    
    // Related form template
    formTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
      index: true
    },
    
    // Industry context
    industry: String, // e.g., "sales", "healthcare", "manufacturing"
    
    // Pipelined aggregation configuration
    pipeline: {
      type: mongoose.Schema.Types.Mixed,
      default: null
      // Structure: [{ stage: "group", by: "field_status", aggregations: {...} }, ...]
    },
    
    // Validation
    validation: {
      syntaxValid: { type: Boolean, default: false },
      fieldsValid: { type: Boolean, default: false },
      lastValidated: Date,
      errorMessage: String
    },
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User"
    },
    
    // Usage tracking
    usageCount: { type: Number, default: 0 },
    lastUsed: Date,
    
    // Status
    isActive: { type: Boolean, default: true, index: true },
    tags: [String]
  },
  {
    timestamps: true,
  }
);

// Indexes
baseAnalyticsFormulaSchema.index({ tenantId: 1, formTemplateId: 1 });
baseAnalyticsFormulaSchema.index({ tenantId: 1, industry: 1 });
baseAnalyticsFormulaSchema.index({ tenantId: 1, isActive: 1 });
baseAnalyticsFormulaSchema.index({ createdBy: 1 });

const analyticsFormulaSchema = withBaseSchemaOptions(baseAnalyticsFormulaSchema);

export default mongoose.model("AnalyticsFormula", analyticsFormulaSchema);

