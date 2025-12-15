import { z } from "zod";
import ContactFormSchema from "./zodSchema";

export type ContactFormValues = z.infer<typeof ContactFormSchema>

export interface ContactFormValues {
    assignedTo: string;
    accountId: string;
    createdBy?: string; // Added createdBy field (optional in form context)
    contactImage: any | null;
    businessCard: any | null;
    firstName: string;
    lastName: string;
    email: string;
    secondaryEmail?: string;
    phone: string;
    alternatePhone?: string;
    jobTitle?: string;
    department?: string;
    contactType?: string;
    leadSource?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  }