import mongoose from "mongoose";
import { withBaseSchemaOptions } from "../utils/withBaseSchemaOptions.js";

// Widget configuration schema
const widgetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ["metric", "chart", "table", "custom"],
    required: true
  },
  title: { type: String, required: true },
  description: String,
  
  // Position in grid layout
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    w: { type: Number, default: 3 },
    h: { type: Number, default: 2 }
  },
  
  // Data source configuration
  config: {
    dataSource: {
      type: String,
      enum: ["formSubmissions", "entities", "custom"],
      default: "formSubmissions"
    },
    entityType: String,
    formTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate"
    },
    formulaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnalyticsFormula"
    },
    filters: mongoose.Schema.Types.Mixed,
    aggregation: mongoose.Schema.Types.Mixed,
    chartType: {
      type: String,
      enum: ["line", "bar", "pie", "area", "table", "number"]
    },
    dateRange: {
      type: {
        type: String,
        enum: ["custom", "today", "yesterday", "last7days", "last30days", "last90days", "thisMonth", "lastMonth", "thisYear"]
      },
      startDate: Date,
      endDate: Date
    }
  },
  
  // Display settings
  displaySettings: {
    showTrend: { type: Boolean, default: false },
    showComparison: { type: Boolean, default: false },
    comparisonPeriod: String,
    color: String,
    format: String
  },
  
  order: { type: Number, default: 0 }
}, { _id: false });

// Permissions schema
const permissionsSchema = new mongoose.Schema({
  canView: [mongoose.Schema.Types.Mixed], // User IDs or role IDs
  canEdit: [mongoose.Schema.Types.Mixed],
  canDelete: [mongoose.Schema.Types.Mixed]
}, { _id: false });

const baseDashboardViewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    tenantId: { type: String, required: true, index: true },
    orgCode: { type: String, index: true },
    
    // View scope (user-specific, role-specific, or organization-wide)
    userId: { type: String, index: true, sparse: true }, // User-specific view
    roleId: { type: String, index: true, sparse: true }, // Role-specific view
    
    // View configuration
    isDefault: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    
    // Widgets configuration
    widgets: [widgetSchema],
    
    // Industry context
    industry: String,
    
    // Permissions
    permissions: {
      type: permissionsSchema,
      default: () => ({})
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
    
    // Status
    isActive: { type: Boolean, default: true, index: true },
    tags: [String]
  },
  {
    timestamps: true,
  }
);

// Indexes
baseDashboardViewSchema.index({ tenantId: 1, userId: 1 });
baseDashboardViewSchema.index({ tenantId: 1, orgCode: 1 });
baseDashboardViewSchema.index({ tenantId: 1, roleId: 1 });
baseDashboardViewSchema.index({ tenantId: 1, isDefault: 1 });
baseDashboardViewSchema.index({ tenantId: 1, isActive: 1 });
baseDashboardViewSchema.index({ createdBy: 1 });

const dashboardViewSchema = withBaseSchemaOptions(baseDashboardViewSchema);

export default mongoose.model("DashboardView", dashboardViewSchema);

