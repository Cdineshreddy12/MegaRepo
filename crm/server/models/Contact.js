import mongoose from 'mongoose';
import { addressSchema } from './sharedSchema.js';

const contactSchema = new mongoose.Schema({
  orgCode: { type: String, required: false, index: true }, // Organization code for multi-tenant isolation (optional for backward compatibility)
  assignedTo: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true }, // contact owner - accepts ObjectId or String
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String},
  jobTitle: String,
  email: {
    type: String,
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please fill a valid email address']
  },
  secondaryEmail: { 
    type: String, 
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please fill a valid email address'],
    lowercase: true
  },
  contactImage: {
    url: String,
    publicId: String
  },
  businessCard: {
    url: String,
    publicId: String
  },
  phone: {
    type: String,
  },
  alternatePhone: {
    type: String,
  },
  department: String,
  contactType: String,
  leadSource: String,
  linkedinUrl: { type: String, match: [/^https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9_-]+$/, 'Invalid LinkedIn URL'] },
  address: addressSchema,
  isPrimaryContact: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true }, // accepts ObjectId or String
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User' }, // accepts ObjectId or String
  description: { type: String, trim: true },
  deleted: { type: Boolean, default: false }, // Soft delete support
}, {
  timestamps: true
});

// Create indexes for commonly searched fields
contactSchema.index({ accountId: 1, email: 1, phone: 1 });
contactSchema.index({ orgCode: 1, accountId: 1 }); // Index for orgCode filtering

export default mongoose.model('Contact', contactSchema);
