import mongoose from 'mongoose';
import { schema as productOrderSchema } from './productOrder.js';

const termsSchema = new mongoose.Schema({
  prices: String,
  boq: String,
  paymentTerms: String,
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, required: true, unique: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    default: 'draft'
  },
  oem: {
    type: String,
    required: true,
  },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  issueDate: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  quoteCurrency: { type: String, default: 'INR' },
  items: [productOrderSchema], // Using the aligned orderItemSchema
  subtotal: { type: Number, required: true, default: 0 },
  gstTotal: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  terms: termsSchema,
  notes: String,
  currencyRate: { type: Number, default: 1.00 },
  renewalTerm: String,
  createdBy: { 
    type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (UUID)
    ref: 'User',
    required: true
  },
  updatedBy: { 
    type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (UUID)
    ref: 'User'
  },
}, {
  timestamps: true
});

// Pre-save middleware for quote calculations (matching your existing logic)
quotationSchema.pre('save', function() {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  // Calculate total GST
  this.gstTotal = this.items.reduce((sum, item) => sum + (item.gst || 0), 0);
  
  // Calculate total amount
  this.total = this.subtotal + this.gstTotal;
});

// Virtual to check if quote is expired
quotationSchema.virtual('isExpired').get(function() {
  return this.status !== 'accepted' && new Date() > this.validUntil;
});

// Virtual to check days remaining
quotationSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const validDate = new Date(this.validUntil);
  const diffTime = validDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Indexes for performance
quotationSchema.index({ status: 1 });
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ accountId: 1 });
quotationSchema.index({ contactId: 1 });


export default mongoose.model('Quotation', quotationSchema);
