import mongoose from 'mongoose';

// Aligned with your existing quotationItemSchema structure
// This is the ITEM schema used as a subdocument in Quotation, Invoice, SalesOrder, ProductOrder, etc.
const productOrderItemSchema = new mongoose.Schema({
  // productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productId: String, // Assuming productId is a string, adjust if it's an ObjectId
  type: {
    type: String,
    enum: ['product', 'service'], // Matching your quotation schema
    required: true,
    default: 'product'
  },
  status: {
    type: String,
    enum: ['new', 'renewal'], // Matching your quotation schema
    required: true,
    default: 'new'
  },
  sku: { type: String, trim: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  unitPrice: { type: Number, required: true, default: 0, min: 0 },
  gst: { type: Number, default: 0, min: 0 }, // Matching your quotation schema
  total: { type: Number, required: true, default: 0, min: 0 } // Matching your quotation schema
});

// Pre-save middleware to calculate totals for order items
productOrderItemSchema.pre('save', function() {
  const lineTotal = this.quantity * this.unitPrice;
  const gstAmount = lineTotal * (this.gst || 0) / 100;
  this.total = lineTotal + gstAmount;
});

// Export only the schema (this is used as a subdocument schema in Quotation, Invoice, SalesOrder, ProductOrder, etc.)
// Note: This file exports the ITEM schema only, not a model
// The full ProductOrder model is in ProductOrder.js (but on case-insensitive filesystems, this might be the same file)
export const schema = productOrderItemSchema;
