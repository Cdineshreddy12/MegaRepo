import mongoose from "mongoose";
import { withBaseSchemaOptions } from "../utils/withBaseSchemaOptions.js";

// Attachment Schema
const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  size: Number,
  mimeType: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const baseFormSubmissionSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
      index: true
    },
    tenantId: { type: String, required: true, index: true },
    orgCode: { type: String, index: true },
    
    // Submission data - flexible JSON structure
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ["draft", "submitted", "reviewed", "approved", "rejected"],
      default: "draft",
      index: true
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User"
    },
    reviewNotes: String,
    
    // Related entities (optional linking)
    relatedEntityType: {
      type: String,
      enum: ["lead", "account", "contact", "opportunity", "quotation", "ticket", null],
      default: null
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    
    // Metadata
    submittedBy: {
      type: mongoose.Schema.Types.Mixed, // User ID
      ref: "User",
      index: true
    },
    ipAddress: String,
    userAgent: String,
    
    // File attachments
    attachments: [attachmentSchema],
    
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Version tracking
    formVersion: Number, // Version of form template when submitted
    
    // Notifications
    notificationsSent: [{
      type: { type: String, enum: ["email", "sms", "inApp"] },
      recipient: String,
      sentAt: Date,
      status: { type: String, enum: ["sent", "failed"] }
    }]
  },
  {
    timestamps: true,
  }
);

// Indexes
baseFormSubmissionSchema.index({ templateId: 1, submittedAt: -1 });
baseFormSubmissionSchema.index({ tenantId: 1, status: 1 });
baseFormSubmissionSchema.index({ tenantId: 1, submittedAt: -1 });
baseFormSubmissionSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
baseFormSubmissionSchema.index({ submittedBy: 1 });
baseFormSubmissionSchema.index({ orgCode: 1, submittedAt: -1 });

const formSubmissionSchema = withBaseSchemaOptions(baseFormSubmissionSchema);

export default mongoose.model("FormSubmission", formSubmissionSchema);

