import { AddressSchema } from "@/lib/zodSchema";
import { z } from "zod";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const LeadFormSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional().nullable().refine((val) => {
    if (val && !phoneRegex.test(val)) {
      return false;
    }
    return true;
  }, { message: "Invalid phone number format" }),

  // Company Information
  companyName: z.string().min(1, { message: "Company name is required" }),
  industry: z.string().optional().nullable(),
  jobTitle: z.string().min(1, { message: "Job title is required" }),

  // Lead Status
  source: z.enum([
    "website",
    "referral",
    "trade_show",
    "social_media",
    "email_campaign",
  ], { message: "Invalid source selected" }),
  status: z.enum(["new", "contacted", "qualified", "unqualified"], { message: "Invalid status" }),
  score: z.number()
    .min(0, { message: "Score cannot be less than 0" })
    .max(100, { message: "Score cannot exceed 100" }),
  notes: z.string().optional().nullable(),

  // Product Information
  product: z.string().min(1, "Please provide product"),

  // Address Information (assuming AddressSchema is imported correctly)
  address: AddressSchema.optional().nullable(),

  // Zone Information
  zone: z.enum(['east', 'west', 'north', 'south'], { message: "Invalid zone selected" }),

  // Assignment Information
  assignedTo: z.string().optional().nullable(),
});



export default LeadFormSchema