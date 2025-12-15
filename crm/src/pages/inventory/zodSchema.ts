import { z } from "zod";


// Product Schema
export const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, "SKU must be alphanumeric with optional dashes or underscores")
    .min(1, "SKU must be at least 1 character long"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  basePrice: z.number().positive("Base price must be a positive number"),
  sellingPrice: z.number().positive("Selling price must be a positive number"),
  quantity: z.number().nonnegative("Quantity cannot be negative"),
  stockLevel: z.number().nonnegative("Stock level cannot be negative"),
  minStockLevel: z.number().nonnegative("Minimum stock level cannot be negative"),
  location: z.string().min(1, "Location is required"),
  status: z.enum(['active', 'inactive']).describe("Status must be 'active' or 'inactive'"),
  warrantyPeriod: z.number().nonnegative("Warranty period cannot be negative"),
  taxRate: z.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot exceed 100%"),
  description: z.string().optional(),
  specifications: z.string().optional(),
});

// Product Instance Schema

export const SerialNumberSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  status: z.enum(['sold', 'available', 'damaged']).describe("Status must be 'sold', 'available', or 'damaged'"),
  customer: z.string().min(1, "Required"),
  warrantyStart: z.date().refine((date) => !isNaN(date.getTime()), {
    message: "Invalid warranty start date",
  }),
  warrantyEnd: z.date().refine((date) => !isNaN(date.getTime()), {
    message: "Invalid warranty end date",
  }),
  price: z.number().positive("Price must be a positive number"),
});

// Movement Schema
export const MovementSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  type: z.enum(['inbound', 'outbound', 'transfer', 'adjustment']).describe("Type must be 'inbound', 'outbound', 'transfer', or 'adjustment'"),
  quantity: z.number().nonnegative("Quantity cannot be negative"),
  fromLocation: z.string().min(1, "From location is required"),
  toLocation: z.string().min(1, "To location is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});


export type ProductFormValues = z.infer<typeof ProductSchema>;
export type ProductInstanceFormValues = z.infer<typeof SerialNumberSchema>;
export type MovementFormValues = z.infer<typeof MovementSchema>;