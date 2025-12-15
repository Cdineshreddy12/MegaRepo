import { z } from "zod";

const TicketsFormSchema = z.object({
  // Account & Assignment Details
  accountId: z.string().min(1, "Account Name is required"), // Dropdown from existing values
  oem: z.string().min(1, "OEM is required"), // Dropdown from existing values
  assignedTo: z.string().min(1, "Assigned To is required"), // Dropdown from users
  regionOwner: z.string().optional().nullable(), // Autofill based on Region
  zone: z.enum(["east", "west", "north", "south"]), // Geographic zone

  // Product & Sales Information
  productName: z.string().min(1, "Product Name is required"),
  type: z.enum(["pre_sales", "post_sales_service", "post_sales_support"]), // Type of sales
  salesDescription: z.string().optional(), // Additional sales info

  // Effort & Technical Details
  effortEstimatedManDays: z.number().nonnegative("Effort must be a non-negative number"), // Effort estimation
  technicalTeamDescription: z.string().optional(), // Notes for the technical team

  // Support Information
  typeOfSupport: z.enum(["standard", "premium", "enterprise"]), // Support type
  supportLevel: z.enum(["l1", "l2", "l3", "sme", "consultant"]), // Support level

  // Status
  status: z.enum(["new", "open", "in_progress", "completed", "closed"]).default("new"), // Ticket status
});

export default TicketsFormSchema;
