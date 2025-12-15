import mongoose from "mongoose";
import { addressSchema } from "./sharedSchema.js";
import { withBaseSchemaOptions } from "../utils/withBaseSchemaOptions.js";

const baseAccountSchema = new mongoose.Schema(
  {
    orgCode: { type: String, required: true, index: true },
    companyName: { type: String, required: true },
    phone: String,
    email: String,
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    description: String,
    website: String,
    status: {
      type: String,
    },
    parentAccount: String,
    accountType: {
      type: String,
    },
    segment: {
      type: String,
    },
    ownershipType: {
      type: String,
      enum: ["public", "private", "government", "non_profit"],
    },
    annualRevenue: Number,
    employeesCount: Number,
    industry: {
      type: String,
    },
    zone: {
      type: String,
    },
    invoicing: {
      type: String,
      enum: ["email", "hard_copy", "online_portal"],
    },
    creditTerm: {
      type: String,
      enum: [
        "21_days",
        "30_days",
        "45_days",
        "60_days",
        "90_days",
        "120_days",
        "100%_advance",
        " on_delivery",
        "pdc_cheque",
      ],
    },
    gstNo: String, // Not shown in UI but stored
    assignedTo: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null }, // Accept both ObjectId and String (UUID)
    createdBy: { 
      type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (Kinde user ID)
      ref: "User",
      required: true
    },
    updatedBy: { 
      type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (Kinde user ID)
      ref: "User"
    },
    // Store custom fields from form templates that don't match standard Account fields
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Store the template ID used to create this account
    formTemplateId: String,
  },
  {
    timestamps: true,
  }
);

const accountSchema = withBaseSchemaOptions(baseAccountSchema);

export default mongoose.model("Account", accountSchema);
