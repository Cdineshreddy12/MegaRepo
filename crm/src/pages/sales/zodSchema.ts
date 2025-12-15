import { AddressSchema } from "@/lib/zodSchema";
import { z } from "zod";

// Order Item Schema (aligned with your quotation item structure)
const orderItemSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["product", "service"]).default("product"),
  status: z.enum(["new", "renewal"]).default("new"),
  sku: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be non-negative").default(0),
  unitPrice: z.number().min(0, "Unit price must be non-negative").default(0),
  gst: z.number().min(0, "GST must be non-negative").default(0), // Matching quotation schema
  total: z.number().min(0, "Total must be non-negative").default(0), // Matching quotation schema
});

// Terms Schema (aligned with your quotation structure)
const termsSchema = z.object({
  prices: z.string().optional(),
  boq: z.string().optional(),
  paymentTerms: z.string().optional(),
});

// Main SalesOrder Schema (aligned with enhanced Mongoose schema)
const SalesOrderFormSchema = z.object({
  // Basic Order Information
  orderNumber: z.string().min(1, "Order number is required"),
  accountId: z.string().min(1, "Account selection is required"),
  id: z.string().optional(), // For updates
  
  // Contact and References
  primaryContactId: z.string().min(1, "Primary contact is required"),
  opportunityId: z.string().nullable().default(null),
  quotationId: z.string().nullable().default(null), // Reference to accepted quotation
  
  // Status
  status: z.enum(["draft", "pending", "approved", "completed", "cancelled"]).default("draft"),
  
  // OEM (required field from quotation schema)
  oem: z.string().min(1, "OEM is required"),
  
  // Dates - Accept both Date objects (from DatePicker) and strings (from API)
  orderDate: z.union([z.date(), z.string()])
    .pipe(z.coerce.date())
    .refine(
      (date) => date instanceof Date && !isNaN(date.getTime()),
      { message: "Order date is required" }
    ),
  deliveryDate: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      return val;
    },
    z.union([z.date(), z.string()]).pipe(z.coerce.date()).optional()
  ),
  expectedDeliveryDate: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      return val;
    },
    z.union([z.date(), z.string()]).pipe(z.coerce.date()).optional()
  ),
  
  // Contact and CRM (from form design)
  contact: z.string().optional(),
  crm: z.string().optional(),
  
  // Shipping and Payment Information
  shippingMethod: z.enum(["Courier", "Self Pickup", "Logistics Partner"]).default("Courier"),
  freightTerms: z.string().optional(),
  
  // Currency and Exchange - transform to uppercase to handle case-insensitive input
  quoteCurrency: z.string()
    .transform((val) => val ? val.toUpperCase() : "INR")
    .pipe(z.enum(["INR", "USD", "EUR", "GBP"]))
    .default("INR"),
  currencyRate: z.number().min(0.01, "Currency rate must be positive").default(1.00),
  
  // Items (required, at least one item)
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  
  // Financial totals (aligned with quotation schema)
  subtotal: z.number().min(0).default(0),
  gstTotal: z.number().min(0).default(0), // Matching quotation schema
  freightCharges: z.number().min(0).default(0),
  total: z.number().min(0).default(0), // Matching quotation schema
  
  // Terms (aligned with quotation structure)
  terms: termsSchema.optional(),
  
  // Additional fields
  renewalTerm: z.string().optional(),
  notes: z.string().optional(),
  
  // Addresses
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  
})
.refine(
  (data) => {
    if (data.deliveryDate && data.orderDate) {
      // After coercion, both should be Date objects
      return data.deliveryDate >= data.orderDate;
    }
    return true;
  },
  {
    message: "Delivery date must be after order date",
    path: ["deliveryDate"],
  }
)
.refine(
  (data) => {
    if (data.expectedDeliveryDate && data.orderDate) {
      // After coercion, both should be Date objects
      return data.expectedDeliveryDate >= data.orderDate;
    }
    return true;
  },
  {
    message: "Expected delivery date must be after order date",
    path: ["expectedDeliveryDate"],
  }
);

// Schema for creating order from quotation
export const CreateOrderFromQuotationSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID is required"),
  orderNumber: z.string().min(1, "Order number is required"),
  expectedDeliveryDate: z.string().optional().pipe(z.coerce.date()).optional(),
  shippingMethod: z.enum(["Courier", "Self Pickup", "Logistics Partner"]).default("Courier"),
  freightCharges: z.number().min(0).default(0),
  freightTerms: z.string().optional(),
  additionalNotes: z.string().optional(),
});

// Schema for updating order status
export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["draft", "pending", "approved", "completed", "cancelled"]),
  updatedBy: z.string().min(1, "Updated by user ID is required"),
  notes: z.string().optional(),
});

// Schema for order search/filter
export const OrderFilterSchema = z.object({
  accountId: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "completed", "cancelled"]).optional(),
  oem: z.string().optional(),
  quoteCurrency: z.enum(["INR", "USD", "EUR", "GBP"]).optional(),
  dateFrom: z.string().optional().pipe(z.coerce.date()).optional(),
  dateTo: z.string().optional().pipe(z.coerce.date()).optional(),
  quotationId: z.string().optional(),
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateTo) >= new Date(data.dateFrom);
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["dateTo"],
  }
);

// Type exports
export type SalesOrderFormValues = z.infer<typeof SalesOrderFormSchema>;
export type CreateOrderFromQuotationValues = z.infer<typeof CreateOrderFromQuotationSchema>;
export type UpdateOrderStatusValues = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderFilterValues = z.infer<typeof OrderFilterSchema>;

export default SalesOrderFormSchema;