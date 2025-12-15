import { AddressSchema, CreditTerm, Invoicing, Phone, Zone, GST } from "@/lib/zodSchema";
import { z } from "zod";

// Account schema
export const AccountFormSchema = z.object({
    // **Account Identification**
    companyName: z.string().min(1, "Please enter company name"),
    phone: Phone,
    email: z.union([
      z.string().email("Invalid email format"),
      z.literal(""),
      z.null(),
      z.undefined()
    ]).optional(),
    website: z.union([
      z.string().url("Invalid URL format"),
      z.literal(""),
      z.null(),
      z.undefined()
    ]).optional(),
    status: z.enum(["active", "inactive", "pending", "suspended"]).default("active").optional(), // Extended status
    description: z.string().optional(),
  
    parentAccount: z.string().optional(),
    accountType: z.string().optional(),
    segment: z.string().optional(),
  
    // **Address & Location**
    billingAddress: AddressSchema.optional(),
    sameAsBilling: z.boolean().optional(),
    shippingAddress: AddressSchema.optional(),
    zone: Zone,
    
    // **Financial & Business Information**
    // Updated to accept either the enum values or a string
    ownershipType: z.union([
      z.enum(["public", "private", "government", "non_profit"]),
      z.string()
    ]).nullable().optional(),
    
    industry: z.string().optional(),
    employeesCount: z.number().min(1).optional(), // Enforce at least one employee
    annualRevenue: z.number().min(0).optional(),
    gstNo: GST,
    creditTerm: CreditTerm,
  
    // **Assigned and Invoicing**
    assignedTo: z.string().optional().nullable(),
    invoicing: Invoicing.nullable().optional(),
  });
  
export default AccountFormSchema