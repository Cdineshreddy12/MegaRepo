import { z } from "zod";

export const AddressSchema = z.object({
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export const Zone = z.enum(['east', 'west', 'north', 'south','North','South','EAST','WEST']).default('east')
export const Invoicing = z.enum(['email', 'hard_copy', 'online_portal']).default('email')
export const CreditTerm = z.union([
  z.enum([
    "21_days",
    "30_days",
    "45_days",
    "60_days",
    "90_days",
    "120_days",
    "100%_advance",
    "on_delivery",
    "pdc_cheque",
  ]),
  // Allow any string value (for system config compatibility)
  z.string(),
  z.literal(""),
  z.null(),
  z.undefined()
]).nullable().optional()

export const Phone = z.union([
  z.string().refine((val) => {
    // Allow empty strings, null, undefined (optional field)
    if (!val || val === null || val === undefined || val === "" || val.trim() === "") return true;
    
    // react-phone-number-input returns E164 format (e.g., "+919876543210")
    // Or it might be a plain string
    
    // Remove spaces, dashes, parentheses for validation
    const cleaned = val.replace(/[\s\-\(\)]/g, '');
    
    // Extract only digits (including the + prefix for E164)
    const digits = cleaned.replace(/[^\d+]/g, '');
    const digitCount = digits.replace(/\+/g, '').length;
    
    // E164 format: starts with + followed by country code and number
    // Or plain number format
    // Basic validation: should have at least 7 digits (very lenient for international formats)
    // Maximum 15 digits (E164 standard)
    return digitCount >= 7 && digitCount <= 15;
  }, { message: "Invalid phone number format. Please enter a valid phone number" }),
  z.literal(""),
  z.null(),
  z.undefined()
]).optional().nullable()

// GST validation schema
export const GST = z.union([
  z.string().refine((val) => {
    // Allow empty strings, null, undefined (optional field)
    if (!val || val === null || val === undefined || val === "" || val.trim() === "") return true;
    
    // Remove spaces and convert to uppercase
    const cleaned = val.trim().toUpperCase().replace(/\s/g, '');
    
    // Indian GST format: 15 characters
    // Format: XXAAAAA0000A1Z5
    // Example: 27AABCU9603R1ZM
    
    // Basic format check: must be exactly 15 characters
    if (cleaned.length !== 15) return false;
    
    // Check format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    return gstRegex.test(cleaned);
  }, { message: "Invalid GSTIN format. Please enter a valid 15-character GSTIN (e.g., 27AABCU9603R1ZM)" }),
  z.literal(""),
  z.null(),
  z.undefined()
]).optional().nullable()