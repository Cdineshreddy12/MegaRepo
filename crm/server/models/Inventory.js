import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Product Schema (with stockLevel and relationship with ProductInstance)
const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    brand: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    stockLevel: { type: Number, required: true, default: 0 }, // Current stock level
    minStockLevel: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    warrantyPeriod: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, max: 100 },
    description: { type: String },
    specifications: { type: String },
    orgCode: { type: String, required: true, index: true }, // Organization code for filtering
  },
  { timestamps: true }
);

// Product Instance Schema (with more customer details)
const SerialNumberSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null }, // Reference to Product
    serialNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ['sold', 'available', 'damaged'], default: 'available' },
    customer: { type: Schema.Types.ObjectId, ref: "Account", default: null }, // Reference to Customer
    warrantyStart: { type: Date, required: true },
    warrantyEnd: { type: Date, required: true },
    price: { type: Number, required: true },
    orgCode: { type: String, required: true, index: true }, // Organization code for filtering
  },
  { timestamps: true }
);

// Movement Schema (with additional movement types)
const MovementSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ['inbound', 'outbound', 'transfer', 'adjustment'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    fromLocation: { type: String, required: true },
    toLocation: { type: String, required: true },
    reference: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String },
    orgCode: { type: String, required: true, index: true }, // Organization code for filtering
  },
  { timestamps: true }
);

// Models
const Product = model("Product", ProductSchema);
const SerialNumber = model("SerialNumber", SerialNumberSchema);
const Movement = model("Movement", MovementSchema);

export { Product, SerialNumber, Movement };
