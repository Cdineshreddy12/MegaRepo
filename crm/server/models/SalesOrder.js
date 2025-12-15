import mongoose from 'mongoose';
import { addressSchema } from "./sharedSchema.js";
import { schema as productOrderSchema } from './productOrder.js';

// Terms Schema (matching your quotation structure)
const termsSchema = new mongoose.Schema({
  prices: String,
  boq: String,
  paymentTerms: String,
});

const salesOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  primaryContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', default: null }, // Made optional by adding default: null
  
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', default: null }, // Reference to accepted quotation
  
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // OEM field (from your quotation schema)
  oem: {
    type: String,
    required: true,
  },
  
  // Dates
  orderDate: { type: Date, default: Date.now },
  deliveryDate: Date,
  expectedDeliveryDate: Date, // From your form design
  
  // Contact and CRM (additional fields from form)
  contact: { type: String, trim: true }, // Contact name/info from form
  crm: { type: String, trim: true }, // CRM reference from form
  
  // Shipping and Payment Information
  shippingMethod: {
    type: String,
    enum: ['Courier', 'Self Pickup', 'Logistics Partner'],
    default: 'Courier'
  },
  freightTerms: { type: String, trim: true },
  
  // Currency and Exchange (matching your quotation schema)
  quoteCurrency: { type: String, default: 'INR' }, // Matching your quotation field name
  currencyRate: { type: Number, default: 1.00 }, // Matching your quotation field name
  
  // Items
  items: [productOrderSchema],
  
  // Financial totals (matching your quotation schema structure)
  subtotal: { type: Number, required: true, default: 0, min: 0 },
  gstTotal: { type: Number, default: 0, min: 0 }, // Matching your quotation schema
  freightCharges: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, default: 0, min: 0 }, // Matching your quotation schema
  
  // Terms (matching your quotation structure)
  terms: termsSchema,
  
  // Additional fields
  renewalTerm: String, // From your quotation schema
  notes: String,
  
  // Addresses (your existing fields)
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  
  // User tracking (matching your quotation schema)
  createdBy: { 
    type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (UUID)
    ref: 'User',
    required: true
  },
  updatedBy: { 
    type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String (UUID)
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Pre-save middleware to calculate order totals (matching your quotation logic)
salesOrderSchema.pre('save', function() {
  // Always recalculate totals from items to ensure consistency
  if (this.items && this.items.length > 0) {
    // Calculate subtotal from items
    const calculatedSubtotal = this.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    
    // Calculate total GST - items have gst as percentage (from productOrder schema)
    const calculatedGstTotal = this.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const subtotal = quantity * unitPrice;
      
      // GST is stored as percentage in the item schema
      const gstPercentage = parseFloat(item.gst) || 0;
      const gstAmount = subtotal * (gstPercentage / 100);
      return sum + gstAmount;
    }, 0);
    
    // Always update totals to ensure consistency
    this.subtotal = calculatedSubtotal;
    this.gstTotal = calculatedGstTotal;
    
    // Calculate total amount
    const freightCharges = parseFloat(this.freightCharges) || 0;
    this.total = this.subtotal + this.gstTotal + freightCharges;
  } else {
    // If no items, set totals to 0 (plus freight charges)
    this.subtotal = 0;
    this.gstTotal = 0;
    const freightCharges = parseFloat(this.freightCharges) || 0;
    this.total = freightCharges;
  }
});

// Indexes for performance
salesOrderSchema.index({ accountId: 1, status: 1 });
salesOrderSchema.index({ orderDate: -1 });
salesOrderSchema.index({ expectedDeliveryDate: 1 });
salesOrderSchema.index({ quotationId: 1 });

export default mongoose.model('SalesOrder', salesOrderSchema);