import { formatDate } from "@/utils/format";
import * as z from "zod";

// Schema for individual invoice payment history
const PaymentHistorySchema = z.object({
  amount: z.number().optional(),
  date: z.preprocess(
    (val) => (val === undefined || val === null || val === '') ? undefined : val,
    z.union([z.date(), z.string()]).pipe(z.coerce.date()).optional()
  ),
  method: z.string().optional(),
  reference: z.string().optional(),
});

// Main schema for the entire invoice form
const InvoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice Number is required"),
  salesOrderId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  oem: z.string().min(1, "OEM is required"),
  // Dates - Accept both Date objects (from DatePicker) and strings (from API)
  issueDate: z.union([z.date(), z.string()])
    .pipe(z.coerce.date())
    .refine(
      (date) => date instanceof Date && !isNaN(date.getTime()),
      { message: "Issue Date is required" }
    ),
  dueDate: z.union([z.date(), z.string()])
    .pipe(z.coerce.date())
    .refine(
      (date) => date instanceof Date && !isNaN(date.getTime()),
      { message: "Due Date is required" }
    ),
  subtotal: z.number().optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().optional(),
  amountPaid: z.number().min(0).optional(),
  balance: z.number().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentHistory: z.array(PaymentHistorySchema).optional(),
});

export type InvoiceFormValues = z.infer<typeof InvoiceFormSchema>;
export default InvoiceFormSchema;
