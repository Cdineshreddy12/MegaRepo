import { z } from "zod";

// Item Schema for Quotation (aligning with Mongoose quotationItemSchema)
const itemsSchema = z.object({
  // Item details: type, status, SKU, description, etc.
  type: z.enum(["product", "service"]),
  status: z.enum(["new", "renewal"]),
  sku: z.string().optional(), // SKU is optional as it is not required in Mongoose
  description: z.string().min(1, "Add description"),
  // Coerce string inputs to numbers for numeric fields
  quantity: z.union([z.string(), z.number()]).pipe(z.coerce.number().min(0, "Quantity must be non-negative")).default(0),
  unitPrice: z.union([z.string(), z.number()]).pipe(z.coerce.number().min(0, "Unit price must be non-negative")).default(0),
  gst: z.union([z.string(), z.number()]).pipe(z.coerce.number().min(0, "GST must be non-negative")).default(0),
  // total: z.number().min(0), // Calculated field, not needed in form validation
});

// Terms Schema (aligning with Mongoose termsSchema)
const termsSchema = z.object({
  prices: z.string().optional(),
  boq: z.string().optional(),
  paymentTerms: z.string().optional(),
});

// Main Quotation Schema (aligning with Mongoose quotationSchema)
export const QuotationFormSchema = z.object({
  // Quotation Information Section
  quotationNumber: z.string().min(1, "Please enter Quotation number"),
  accountId: z.string().min(1, "Choose account"), // Referring to ObjectId for Account
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).default("draft"),

  // OEM and Contact Details
  oem: z.string().min(1, "Select OEM"),
  contactId: z.string().optional(), // Optional, as per Mongoose schema

  // Dates Section: Issue & Validity
  // Accept both Date objects (from DatePicker) and strings (from API)
  issueDate: z.union([z.date(), z.string()]).pipe(z.coerce.date()).refine(
    (date) => date instanceof Date && !isNaN(date.getTime()),
    { message: "Issue date is required" }
  ),
  validUntil: z.union([z.date(), z.string()]).pipe(z.coerce.date())
    .refine(
      (date) => date instanceof Date && !isNaN(date.getTime()),
      { message: "Valid until date is required" }
    )
    .refine(
      (date) => date > new Date(),
      {
        message: "Valid until date must be in the future",
      }
    ),

  // Currency and Financial Information - transform to uppercase to handle case-insensitive input
  quoteCurrency: z.string()
    .transform((val) => val ? val.toUpperCase() : "INR")
    .pipe(z.enum(["INR", "USD", "EUR", "GBP"]))
    .default("INR"),
  // Coerce string inputs to numbers for currencyRate (HTML inputs return strings)
  currencyRate: z.union([z.string(), z.number()]).pipe(z.coerce.number().min(0.01, "Currency rate must be positive")).default(1.00),

  // Pricing and Totals Section (calculated fields - not needed in form validation)
  // subtotal: z.number().min(0).default(0),
  // gstTotal: z.number().default(0),  // GST total field
  // total: z.number().min(0).default(0),

  // Items Section: List of products/services
  items: z.array(itemsSchema).min(1, "At least one item is required"),

  // Terms Section (payment terms, etc.)
  terms: termsSchema,

  // Optional Fields
  notes: z.string().optional(),
  renewalTerm: z.string().optional(),

})
.refine(
  (data) => data.validUntil > data.issueDate,
  {
    message: "Valid until date must be after issue date",
    path: ["validUntil"], // Point the error to the validUntil field
  }
);

// Additional validation schemas for specific use cases

// Schema for updating quotation status
export const QuotationStatusUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  updatedBy: z.string().min(1, "Updated by user ID is required"),
});

// Schema for quotation search/filter
export const QuotationFilterSchema = z.object({
  accountId: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  oem: z.string().optional(),
  quoteCurrency: z.string().default('inr'),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return data.dateTo >= data.dateFrom;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["dateTo"],
  }
);

// Schema for creating order from quotation
export const QuotationToOrderSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID is required"),
  orderNumber: z.string().min(1, "Order number is required"),
  expectedDeliveryDate: z.date().optional(),
  shippingMethod: z.enum(["Courier", "Self Pickup", "Logistics Partner"]).default("Courier"),
  freightCharges: z.number().min(0).default(0),
  additionalNotes: z.string().optional(),
});

export default QuotationFormSchema;