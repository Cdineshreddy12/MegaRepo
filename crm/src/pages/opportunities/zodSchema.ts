import { z } from "zod";

// Schema for services array items
const ServiceSchema = z.object({
  serviceType: z.string().optional(),
  // Updated to use transform for proper decimal handling
  serviceRevenue: z.coerce
    .number()
    .min(0)
    .transform(val => parseFloat(val.toFixed(2)))
    .optional(),
});

// Main opportunity form schema
const OpportunityFormSchema = z.object({
  name: z.string().min(1, "Opportunity name is required"),
  accountId: z.string().min(1, "Account is required"),
  primaryContactId: z.string().optional(),
  oem: z.string().min(1, "OEM is required"),
  description: z.string().optional(),
  
  stage: z.string().min(1, "Stage is required"),
  status: z.string().min(1, "Status is required"),
  
  type: z.string().min(1, "Opportunity type is required"),
  
  // Updated to use transform for proper decimal handling
  revenue: z.coerce
    .number()
    .min(0, "Revenue must be greater than or equal to 0")
    .transform(val => parseFloat(val.toFixed(2))),
  
  // Updated to use transform for proper decimal handling
  profitability: z.coerce
    .number()
    .min(0, "Profitability must be greater than or equal to 0")
    .max(100, "Profitability cannot exceed 100%")
    .transform(val => parseFloat(val.toFixed(2))),
  
  // Updated to use transform for proper decimal handling
  expectedProfit: z.coerce
    .number()
    .transform(val => parseFloat(val.toFixed(2)))
    .optional(),
  
  // Updated to use transform for proper decimal handling
  expense: z.coerce
    .number()
    .transform(val => parseFloat(val.toFixed(2)))
    .optional(),
  
  // Optional services array
  services: z.array(ServiceSchema).optional().default([]),
  
  // Optional dates
  expectedCloseDate: z.any().optional(),
  actualCloseDate: z.any().optional(),
  
  nextStep: z.string().optional(),
  competition: z.string().optional(),
  decisionCriteria: z.string().optional(),
  
  assignedTo: z.string(),
  
  // Additional fields related to ID and metadata
  id: z.string().optional(),
  _id: z.string().optional(),
});

export default OpportunityFormSchema;