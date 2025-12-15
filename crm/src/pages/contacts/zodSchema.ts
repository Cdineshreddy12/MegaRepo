import { z } from "zod";

// Replace the phoneRegex import with an inline regex pattern
// You can update this regex to match your specific phone number format requirements
const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10,14}$/;

const ContactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Email must be valid"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(phoneRegex, "Phone number format is not valid"),
  alternatePhone: z
    .string()
    .regex(phoneRegex, "Phone number format is not valid")
    .optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  contactType: z.string().optional(),
  leadSource: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  assignedTo: z.string().min(1, "Contact Owner is required"),
  // createdBy is handled automatically by the backend, so we don't validate it in the form
  createdBy: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }),
  contactImage: z.any().optional(),
  businessCard: z.any().optional(),
});

export default ContactFormSchema;