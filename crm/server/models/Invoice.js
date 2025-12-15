import mongoose from 'mongoose';
import { schema as productOrderSchema } from './productOrder.js';

// Terms Schema (matching your quotation structure)
const termsSchema = new mongoose.Schema({
  prices: String,
  boq: String,
  paymentTerms: String,
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }, // Reference to original quotation
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  
  // OEM field (from your quotation schema)
  oem: {
    type: String,
    required: true,
  },
  
  // Contact and CRM information (from form design)
  contact: { type: String, trim: true },
  crm: { type: String, trim: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  
  // Dates
  issueDate: { type: Date, default: Date.now },
  invoiceDate: { type: Date, default: Date.now }, // Alias for issueDate
  dueDate: { type: Date, required: true },
  
  // Billing and Shipping (from form design)
  shippingMethod: {
    type: String,
    enum: ['Courier', 'Self Pickup', 'Logistics Partner'],
    default: 'Courier'
  },
  paymentMethod: { type: String, trim: true },
  freightCharges: { type: Number, default: 0, min: 0 },
  
  // Currency and Exchange (matching your quotation schema)
  quoteCurrency: { type: String, default: 'INR' }, // Matching your quotation field name
  currencyRate: { type: Number, default: 1.00 }, // Matching your quotation field name
  
  // Invoiced Items
  items: [productOrderSchema],
  
  // Financial totals (matching your quotation schema structure)
  subtotal: { type: Number, required: true, default: 0, min: 0 },
  gstTotal: { type: Number, default: 0, min: 0 }, // Matching your quotation schema
  discounts: { type: Number, default: 0, min: 0 }, // From form design
  total: { type: Number, required: true, default: 0, min: 0 }, // Matching your quotation schema
  totalDue: { type: Number, default: 0, min: 0 }, // Alias for total
  
  // Payment tracking
  amountPaid: { type: Number, default: 0, min: 0 },
  balance: { type: Number, default: 0 },
  
  // Terms (matching your quotation structure)
  terms: termsSchema,
  
  // Notes and instructions (enhanced from form design)
  invoiceNotes: String, // From form design
  additionalInstructions: String, // From form design
  notes: String, // Your existing field
  renewalTerm: String, // From your quotation schema
  
  // Payment history (your existing field)
  paymentHistory: [{
    amount: Number,
    date: Date,
    method: String,
    reference: String
  }],
  
  // User tracking (matching your quotation schema)
  // Support both ObjectId and UUID strings for external users
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Pre-save middleware for invoice calculations (matching your quotation logic)
invoiceSchema.pre('save', function() {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  // Calculate total GST
  this.gstTotal = this.items.reduce((sum, item) => sum + (item.gst || 0), 0);
  
  // Calculate total amount (subtotal + gst + freight - discounts)
  this.total = this.subtotal + this.gstTotal + (this.freightCharges || 0) - (this.discounts || 0);
  this.totalDue = this.total;
  
  // Calculate balance
  this.balance = this.total - (this.amountPaid || 0);
});

// Virtual for remaining balance
invoiceSchema.virtual('remainingBalance').get(function() {
  return this.total - (this.amountPaid || 0);
});

// Virtual to check if invoice is overdue
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && new Date() > this.dueDate;
});

// Indexes for performance
invoiceSchema.index({ salesOrderId: 1 });
invoiceSchema.index({ quotationId: 1 });
invoiceSchema.index({ accountId: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ invoiceDate: -1 });

export default mongoose.model('Invoice', invoiceSchema);