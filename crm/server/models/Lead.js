import mongoose from 'mongoose';
import {addressSchema} from './sharedSchema.js';
// Define custom validation for email and phone
const emailValidator = [
  {
    validator: (v) => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(v);
    },
    message: 'Invalid email format',
  },
];

const phoneValidator = [
  {
    validator: (v) => {
      const phoneRegex = /^[\+]?[0-9]{10,15}$/; // Basic international phone number validation
      return phoneRegex.test(v);
    },
    message: 'Invalid phone number format',
  },
];

const LeadStatusHistory = new mongoose.Schema(
  {
    fromStatus: String,
    toStatus: String,
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
const leadSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: emailValidator, // Email validation
    },
    phone: {
      type: String,
      // validate: phoneValidator, // Phone validation
    },

    // Company Information
    companyName: {
      type: String,
      required: true,
      minlength: 2, // Enforcing a minimum length for the company name
    },
    industry: { type: String }, // Default value if not provided
    jobTitle: { type: String },

    // Lead Status
    source: { type: String},
    status: {
      type: String,
      required: true    
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    notes: { type: String, default: '' },

    // Product Information
    product: { type: String, required: true }, // Making product field required

    // Address Information
    address: addressSchema, // Assuming addressSchema is properly validated and defined in sharedSchema

    // Zone Information
    zone: {
      type: String,
      required: true, // Making zone field required
    },

    // Organization Information
    orgCode: { type: String, required: true, index: true },

    // Assignment Information
    createdBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true }, // accepts ObjectId or String
    updatedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User' }, // accepts ObjectId or String
    assignedTo: { type: mongoose.Schema.Types.Mixed, ref: 'User', default: null }, // contact owner (optional) - accepts ObjectId or String
    statusHistory: [LeadStatusHistory]
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Optionally add an index on email and company for better performance
// leadSchema.index({ email: 1 });
// leadSchema.index({ company: 1 });
// leadSchema.index({ assignedTo: 1 })

 const Lead = mongoose.model('Lead', leadSchema);
 export default Lead;