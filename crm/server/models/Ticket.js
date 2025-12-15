import mongoose from "mongoose";
const { Schema } = mongoose;

const ticketSchema = new Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account Name is required"],
    },
    oem: {
      type: String,
      required: [true, "OEM is required"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned To is required"],
    },
    regionOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  
        default: null,
    },
    zone: {
      type: String,
      enum: ["east", "west", "north", "south"],
      required: true,
    },
    productName: {
      type: String,
      required: [true, "Product Name is required"],
    },
    type: {
      type: String,
      enum: ["pre_sales", "post_sales_service", "post_sales_support"],
      required: true,
    },
    salesDescription: String,
    effortEstimatedManDays: {
      type: Number,
      min: [0, "Effort must be a non-negative number"],
      required: true,
    },
    technicalTeamDescription: String,
    typeOfSupport: {
      type: String,
      enum: ["standard", "premium", "enterprise"],
      required: true,
    },
    supportLevel: {
      type: String,
      enum: ["l1", "l2", "l3", "sme", "consultant"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "open", "in_progress", "completed", "closed"],
      default: "new",
      required: true,
    },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Ticket", ticketSchema);
