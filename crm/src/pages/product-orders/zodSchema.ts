import * as z from "zod";

// Schema for individual product order items
const ProductOrderItemSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.union([
    z.number().min(0),
    z.string().transform((val) => (val === "" ? 0 : Number(val)))
  ]),
  unitPrice: z.union([
    z.number().min(0),
    z.string().transform((val) => (val === "" ? 0 : Number(val)))
  ]),
  gst: z.union([
    z.number().min(0).max(100),
    z.string().transform((val) => (val === "" ? 0 : Number(val)))
  ])
});

// Main schema for the entire product order form
const ProductOrderFormSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "Order Number is required"),
  srdar: z.string().optional(),
  accountId: z.union([
    z.string().min(1, "Account is required"),
    z.object({
      _id: z.string().min(1, "Account is required")
    })
  ]),
  contact: z.string().optional(),
  status: z.string().optional(),
  shippingMethod: z.string().optional(),
  freightTerms: z.string().optional(),
  currency: z.string().optional(),
  exchangeRate: z.union([
    z.number().min(0),
    z.string().transform((val) => (val === "" ? 0 : Number(val)))
  ]).optional(),
  expectedDeliveryDate: z.union([
    z.date(),
    z.string().min(1, "Expected Delivery Date is required")
  ]).transform((val) => {
    if (val instanceof Date) {
      return val.toISOString();
    }
    return val;
  }),
  items: z.array(ProductOrderItemSchema).min(1, "At least one item is required"),
  paymentTerms: z.string().optional(),
  priceTerms: z.string().optional(),
  boq: z.string().optional(),
  otherTerms: z.string().optional(),
  freightCharges: z.union([
    z.number().min(0),
    z.string().transform((val) => (val === "" ? 0 : Number(val)))
  ]).optional(),
  subtotal: z.number().optional(),
  gstTotal: z.number().optional(),
  total: z.number().optional()
});

export default ProductOrderFormSchema;