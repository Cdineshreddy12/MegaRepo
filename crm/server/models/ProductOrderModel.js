import mongoose from 'mongoose';
import { schema as productOrderItemSchema } from './productOrder.js';

const productOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  srdar: { type: String, trim: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  contact: { type: String, trim: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  status: {
    type: String,
    enum: ['Draft', 'Confirmed', 'In Progress', 'Ready for Delivery', 'Delivered', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  shippingMethod: {
    type: String,
    enum: ['Courier', 'Standard', 'Express', 'Overnight', 'Pickup', 'Air Freight', 'Sea Freight'],
    default: 'Courier'
  },
  freightTerms: { type: String, trim: true },
  currency: { type: String, default: 'INR' },
  exchangeRate: { type: Number, default: 1.00 },
  expectedDeliveryDate: { type: Date, required: true },
  items: [productOrderItemSchema],
  paymentTerms: { type: String, trim: true },
  priceTerms: { type: String, trim: true },
  boq: { type: String, trim: true },
  otherTerms: { type: String, trim: true },
  freightCharges: { type: Number, default: 0, min: 0 },
  subtotal: { type: Number, required: true, default: 0, min: 0 },
  gstTotal: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, default: 0, min: 0 },
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

// Pre-save middleware for order calculations
productOrderSchema.pre('save', function() {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return sum + (quantity * unitPrice);
  }, 0);
  
  // Calculate total GST from items
  this.gstTotal = this.items.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const gstPercent = item.gst || 0;
    const itemSubtotal = quantity * unitPrice;
    return sum + (itemSubtotal * gstPercent / 100);
  }, 0);
  
  // Calculate total amount (subtotal + GST + freight charges)
  this.total = this.subtotal + this.gstTotal + (this.freightCharges || 0);
});

// Indexes for performance
productOrderSchema.index({ status: 1 });
productOrderSchema.index({ expectedDeliveryDate: 1 });
productOrderSchema.index({ accountId: 1 });
productOrderSchema.index({ contactId: 1 });
productOrderSchema.index({ orderNumber: 1 });

export default mongoose.model('ProductOrder', productOrderSchema);

