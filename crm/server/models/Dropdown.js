import mongoose from "mongoose";

const dropdownSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        "oem_vendors",
        "currencies",
        "renewal_terms",
        "industries",
        "company_types",
        "company_sizes",
        "contact_types",
        "lead_sources",
        "communication_types",
        "communication_channels",
        "departments",
        "user_statuses",
        "account_status",
        "countries",
        "zones",
        "lead_status",
        "designation",
        "service",
        "opportunity_stages",
        "opportunity_status",
        "ownership_type",
        "sales_order_status",
        "invoice_status",
        "product_categories",
        "warehouse_names"
      ],
    },
    value: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: {
      type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (UUID/Kinde user ID)
      ref: "User",
      required: true,
    },
    updatedBy: { 
      type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (UUID/Kinde user ID)
      ref: "User" 
    },
  },
  {
    timestamps: true,
    versionKey: "_version",
  }
);

// Compound index to ensure unique values within each category
dropdownSchema.index({ category: 1, value: 1 }, { unique: true });

// Index for efficient sorting within categories
dropdownSchema.index({ category: 1, sortOrder: 1 });

// Index for quickly finding active options
dropdownSchema.index({ category: 1, isActive: 1 });

// Pre-save middleware to ensure updatedBy is set when available
dropdownSchema.pre("save", function (next) {
  if (this.isModified() && this._updatedByUser) {
    this.updatedBy = this._updatedByUser;
  }
  next();
});

// Static method to find options by category
dropdownSchema.statics.findByCategory = function (
  category,
  activeOnly = true
) {
  const query = { category };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ sortOrder: 1 });
};

// Static method for bulk operations
dropdownSchema.statics.bulkUpsert = async function (options, userId) {
  const bulkOps = options.map((option) => ({
    updateOne: {
      filter: {
        category: option.category,
        value: option.value,
      },
      update: {
        ...option,
        updatedBy: userId,
      },
      upsert: true,
    },
  }));

  return this.bulkWrite(bulkOps);
};

// Instance method to mark as inactive
dropdownSchema.methods.deactivate = function (userId) {
  this.isActive = false;
  this.updatedBy = userId;
  return this.save();
};

export default mongoose.model("Dropdown", dropdownSchema);
